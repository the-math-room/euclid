import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import ts from "typescript";

const workspaceRoot = process.cwd();
const layerRoots = {
  app: resolve(workspaceRoot, "apps/web/src"),
  document: resolve(workspaceRoot, "packages/document/src"),
  geometry: resolve(workspaceRoot, "packages/geometry/src"),
  rendering: resolve(workspaceRoot, "packages/rendering/src"),
} as const;

type LayerName = keyof typeof layerRoots | "interaction";

type LayerPolicy = Readonly<{
  layer: keyof typeof layerRoots;
  forbiddenLayers: readonly LayerName[];
  forbidsUiLibraries: boolean;
}>;

const layerPolicies: readonly LayerPolicy[] = [
  {
    layer: "geometry",
    forbiddenLayers: ["app", "document", "rendering", "interaction"],
    forbidsUiLibraries: true,
  },
  {
    layer: "document",
    forbiddenLayers: ["app", "rendering", "interaction"],
    forbidsUiLibraries: true,
  },
  {
    layer: "rendering",
    forbiddenLayers: ["app", "document", "interaction"],
    forbidsUiLibraries: true,
  },
];

describe("architecture import boundaries", () => {
  it.each(layerPolicies)("keeps $layer imports within policy", (policy) => {
    const violations = importsIn(layerRoots[policy.layer]).filter((foundImport) =>
      violatesLayerPolicy(foundImport, policy),
    );

    expect(violations).toEqual([]);
  });

  it("keeps app modules from importing generated build output", () => {
    const violations = importsIn(layerRoots.app).filter((foundImport) => {
      return foundImport.specifier.includes("dist") || foundImport.specifier.includes("node_modules");
    });

    expect(violations).toEqual([]);
  });

  it("uses package entrypoints for cross-package imports", () => {
    const packageImports = [
      ...importsIn(layerRoots.app),
      ...importsIn(layerRoots.document),
      ...importsIn(layerRoots.rendering),
    ];
    const violations = packageImports.filter(isDeepPackageImport);

    expect(violations).toEqual([]);
  });

  it("keeps package production code free of ambient effects", () => {
    const packageFiles = [
      ...productionSourceFilesIn(layerRoots.geometry),
      ...productionSourceFilesIn(layerRoots.document),
      ...productionSourceFilesIn(layerRoots.rendering),
    ];
    const violations = packageFiles.flatMap(ambientEffectViolationsIn);

    expect(violations).toEqual([]);
  });

  it("keeps package production code free of module-level mutable state", () => {
    const packageFiles = [
      ...productionSourceFilesIn(layerRoots.geometry),
      ...productionSourceFilesIn(layerRoots.document),
      ...productionSourceFilesIn(layerRoots.rendering),
    ];
    const violations = packageFiles.flatMap(moduleMutableStateViolationsIn);

    expect(violations).toEqual([]);
  });
});

type FoundImport = Readonly<{
  file: string;
  specifier: string;
}>;

type SourceViolation = Readonly<{
  file: string;
  message: string;
}>;

const forbiddenAmbientNames = new Set([
  "Date",
  "fetch",
  "localStorage",
  "sessionStorage",
  "setInterval",
  "setTimeout",
  "window",
  "document",
  "crypto",
  "console",
]);

const forbiddenAmbientProperties = new Set(["Math.random"]);

function violatesLayerPolicy(foundImport: FoundImport, policy: LayerPolicy): boolean {
  return (
    (policy.forbidsUiLibraries && isUiLibrary(foundImport.specifier)) ||
    policy.forbiddenLayers.some((layer) => importsLayer(foundImport, layer))
  );
}

function importsLayer(foundImport: FoundImport, layer: string): boolean {
  if (foundImport.specifier === `@euclid/${layer}` || foundImport.specifier.startsWith(`@euclid/${layer}/`)) {
    return true;
  }

  const layerRoot = layerRoots[layer as keyof typeof layerRoots];
  if (!layerRoot) {
    return false;
  }

  if (!foundImport.specifier.startsWith(".")) {
    return false;
  }

  const absoluteImport = resolve(workspaceRoot, foundImport.file, "..", foundImport.specifier);
  const relativeToLayer = relative(layerRoot, absoluteImport);

  return relativeToLayer === "" || (!relativeToLayer.startsWith("..") && !relativeToLayer.startsWith("/"));
}

function isUiLibrary(specifier: string): boolean {
  return specifier === "react" || specifier === "react-dom" || specifier === "lucide-react";
}

function isDeepPackageImport(foundImport: FoundImport): boolean {
  if (foundImport.specifier.startsWith("@euclid/") && foundImport.specifier.split("/").length > 2) {
    return true;
  }

  if (!foundImport.specifier.startsWith(".")) {
    return false;
  }

  const absoluteImport = resolve(workspaceRoot, foundImport.file, "..", foundImport.specifier);
  const sourceLayer = layerForPath(resolve(workspaceRoot, foundImport.file));

  return Object.values(layerRoots).some((layerRoot) => {
    if (sourceLayer === layerRoot) {
      return false;
    }

    const relativeToLayer = relative(layerRoot, absoluteImport);

    if (relativeToLayer === "" || relativeToLayer === "index") {
      return false;
    }

    return !relativeToLayer.startsWith("..") && !relativeToLayer.startsWith("/");
  });
}

function layerForPath(path: string): string | undefined {
  return Object.values(layerRoots).find((layerRoot) => {
    const relativeToLayer = relative(layerRoot, path);
    return relativeToLayer === "" || (!relativeToLayer.startsWith("..") && !relativeToLayer.startsWith("/"));
  });
}

function importsIn(directory: string): readonly FoundImport[] {
  return sourceFilesIn(directory).flatMap((file) => {
    const text = readFileSync(file, "utf8");
    const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

    return moduleSpecifiersIn(sourceFile).map((specifier) => ({
      file: relative(workspaceRoot, file),
      specifier,
    }));
  });
}

function ambientEffectViolationsIn(file: string): readonly SourceViolation[] {
  const sourceFile = parseSourceFile(file);
  const violations: SourceViolation[] = [];

  visitDescendants(sourceFile, (node) => {
    if (ts.isIdentifier(node) && forbiddenAmbientNames.has(node.text) && isValueReferenceIdentifier(node)) {
      violations.push({
        file: relative(workspaceRoot, file),
        message: `Forbidden ambient dependency ${node.text}.`,
      });
    }

    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      forbiddenAmbientProperties.has(`${node.expression.text}.${node.name.text}`)
    ) {
      violations.push({
        file: relative(workspaceRoot, file),
        message: `Forbidden ambient dependency ${node.expression.text}.${node.name.text}.`,
      });
    }
  });

  return violations;
}

function isValueReferenceIdentifier(node: ts.Identifier): boolean {
  const parent = node.parent;

  if (
    (ts.isVariableDeclaration(parent) ||
      ts.isParameter(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isTypeAliasDeclaration(parent) ||
      ts.isInterfaceDeclaration(parent) ||
      ts.isFunctionDeclaration(parent)) &&
    parent.name === node
  ) {
    return false;
  }

  if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
    return false;
  }

  if (ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isExportSpecifier(parent)) {
    return false;
  }

  return true;
}

function moduleMutableStateViolationsIn(file: string): readonly SourceViolation[] {
  const sourceFile = parseSourceFile(file);
  const violations: SourceViolation[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    if ((statement.declarationList.flags & ts.NodeFlags.Let) !== 0) {
      violations.push({
        file: relative(workspaceRoot, file),
        message: "Module-level let is forbidden in package production code.",
      });
    }

    if ((statement.declarationList.flags & ts.NodeFlags.Const) !== 0) {
      for (const declaration of statement.declarationList.declarations) {
        if (declaration.initializer && isMutableCollectionCreation(declaration.initializer)) {
          violations.push({
            file: relative(workspaceRoot, file),
            message: "Module-level mutable collections are forbidden in package production code.",
          });
        }
      }
    }
  }

  return violations;
}

function isMutableCollectionCreation(expression: ts.Expression): boolean {
  return (
    ts.isNewExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    (expression.expression.text === "Map" || expression.expression.text === "Set")
  );
}

function parseSourceFile(file: string): ts.SourceFile {
  return ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
}

function visitDescendants(node: ts.Node, visit: (node: ts.Node) => void): void {
  node.forEachChild((child) => {
    visit(child);
    visitDescendants(child, visit);
  });
}

function moduleSpecifiersIn(sourceFile: ts.SourceFile): readonly string[] {
  const specifiers: string[] = [];

  sourceFile.forEachChild((node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }
  });

  return specifiers;
}

function productionSourceFilesIn(directory: string): readonly string[] {
  return sourceFilesIn(directory).filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"));
}

function sourceFilesIn(directory: string): readonly string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      return sourceFilesIn(path);
    }

    return path.endsWith(".ts") || path.endsWith(".tsx") ? [path] : [];
  });
}
