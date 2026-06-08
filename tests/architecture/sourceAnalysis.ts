import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import ts from "typescript";

export const workspaceRoot = process.cwd();

export const layerRoots = {
  activity: resolve(workspaceRoot, "packages/activity/src"),
  assessment: resolve(workspaceRoot, "packages/assessment/src"),
  app: resolve(workspaceRoot, "apps/web/src"),
  document: resolve(workspaceRoot, "packages/document/src"),
  geometry: resolve(workspaceRoot, "packages/geometry/src"),
  lesson: resolve(workspaceRoot, "packages/lesson/src"),
  rendering: resolve(workspaceRoot, "packages/rendering/src"),
} as const;

export type FoundImport = Readonly<{
  file: string;
  specifier: string;
}>;

export type SourceViolation = Readonly<{
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

export function importsIn(directory: string): readonly FoundImport[] {
  return sourceFilesIn(directory).flatMap(importsInFile);
}

export function importsInFile(file: string): readonly FoundImport[] {
  const sourceFile = parseSourceFile(file);

  return moduleSpecifiersIn(sourceFile).map((specifier) => ({
    file: relative(workspaceRoot, file),
    specifier,
  }));
}

export function namedImportViolationsIn(
  file: string,
  importedName: string,
  message: string,
): readonly SourceViolation[] {
  const sourceFile = parseSourceFile(file);
  const violations: SourceViolation[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) {
      continue;
    }

    const namedBindings = statement.importClause.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) {
      continue;
    }

    if (namedBindings.elements.some((specifier) => specifier.name.text === importedName)) {
      violations.push({
        file: relative(workspaceRoot, file),
        message,
      });
    }
  }

  return violations;
}

export function brandedCoordinateCastViolationsIn(file: string): readonly SourceViolation[] {
  const sourceFile = parseSourceFile(file);
  const violations: SourceViolation[] = [];

  visitDescendants(sourceFile, (node) => {
    if (!ts.isAsExpression(node) || !ts.isTypeReferenceNode(node.type)) {
      return;
    }

    const typeName = node.type.typeName;
    if (!ts.isIdentifier(typeName) || (typeName.text !== "WorldPoint" && typeName.text !== "ScenePoint")) {
      return;
    }

    violations.push({
      file: relative(workspaceRoot, file),
      message: `Raw ${typeName.text} casts are forbidden. Use toWorldPoint/toScenePoint at boundaries.`,
    });
  });

  return violations;
}

export function authoredConstructionRecordViolationsIn(
  file: string,
  authoredConstructionKinds: ReadonlySet<string>,
): readonly SourceViolation[] {
  const sourceFile = parseSourceFile(file);
  const violations: SourceViolation[] = [];

  visitDescendants(sourceFile, (node) => {
    if (!ts.isObjectLiteralExpression(node)) {
      return;
    }

    const kind = stringPropertyValue(node, "kind");
    if (!kind || !authoredConstructionKinds.has(kind)) {
      return;
    }

    if (!hasOwnPropertyNamed(node, "id") || !hasOwnPropertyNamed(node, "label")) {
      return;
    }

    violations.push({
      file: relative(workspaceRoot, file),
      message: `App code must not construct ${kind} records directly. Use geometry edit commands.`,
    });
  });

  return violations;
}

export function ambientEffectViolationsIn(file: string): readonly SourceViolation[] {
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

export function moduleMutableStateViolationsIn(file: string): readonly SourceViolation[] {
  const sourceFile = parseSourceFile(file);
  const violations: SourceViolation[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    if ((statement.declarationList.flags & ts.NodeFlags.Let) !== 0) {
      violations.push({
        file: relative(workspaceRoot, file),
        message: "Module-level let is forbidden in pure production code.",
      });
    }

    if ((statement.declarationList.flags & ts.NodeFlags.Const) !== 0) {
      for (const declaration of statement.declarationList.declarations) {
        if (declaration.initializer && isMutableCollectionCreation(declaration.initializer)) {
          violations.push({
            file: relative(workspaceRoot, file),
            message: "Module-level mutable collections are forbidden in pure production code.",
          });
        }
      }
    }
  }

  return violations;
}

export function wildcardExportViolationsIn(file: string): readonly SourceViolation[] {
  const sourceFile = parseSourceFile(file);
  const violations: SourceViolation[] = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier &&
      statement.exportClause === undefined
    ) {
      violations.push({
        file: relative(workspaceRoot, file),
        message: "Package entrypoints must use explicit named exports.",
      });
    }
  }

  return violations;
}

export function appAndPackageProductionSourceFiles(): readonly string[] {
  return [
    ...productionSourceFilesIn(layerRoots.app),
    ...productionSourceFilesIn(layerRoots.activity),
    ...productionSourceFilesIn(layerRoots.assessment),
    ...productionSourceFilesIn(layerRoots.document),
    ...productionSourceFilesIn(layerRoots.geometry),
    ...productionSourceFilesIn(layerRoots.lesson),
    ...productionSourceFilesIn(layerRoots.rendering),
  ];
}

export function packageProductionSourceFiles(): readonly string[] {
  return [
    ...productionSourceFilesIn(layerRoots.activity),
    ...productionSourceFilesIn(layerRoots.assessment),
    ...productionSourceFilesIn(layerRoots.geometry),
    ...productionSourceFilesIn(layerRoots.document),
    ...productionSourceFilesIn(layerRoots.lesson),
    ...productionSourceFilesIn(layerRoots.rendering),
  ];
}

export function allSourceFiles(): readonly string[] {
  return [
    ...sourceFilesIn(layerRoots.app),
    ...sourceFilesIn(layerRoots.activity),
    ...sourceFilesIn(layerRoots.assessment),
    ...sourceFilesIn(layerRoots.document),
    ...sourceFilesIn(layerRoots.geometry),
    ...sourceFilesIn(layerRoots.lesson),
    ...sourceFilesIn(layerRoots.rendering),
    ...sourceFilesIn(resolve(workspaceRoot, "tests")),
  ];
}

export function productionSourceFilesIn(directory: string): readonly string[] {
  return sourceFilesIn(directory).filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"));
}

export function sourceFilesIn(directory: string): readonly string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      return sourceFilesIn(path);
    }

    return path.endsWith(".ts") || path.endsWith(".tsx") ? [path] : [];
  });
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

function isMutableCollectionCreation(expression: ts.Expression): boolean {
  return (
    ts.isNewExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    (expression.expression.text === "Map" || expression.expression.text === "Set")
  );
}

function stringPropertyValue(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
): string | undefined {
  const property = objectLiteral.properties.find(
    (candidate): candidate is ts.PropertyAssignment =>
      ts.isPropertyAssignment(candidate) && propertyNameFor(candidate.name) === propertyName,
  );

  if (!property || !ts.isStringLiteral(property.initializer)) {
    return undefined;
  }

  return property.initializer.text;
}

function hasOwnPropertyNamed(objectLiteral: ts.ObjectLiteralExpression, propertyName: string): boolean {
  return objectLiteral.properties.some(
    (property) => ts.isPropertyAssignment(property) && propertyNameFor(property.name) === propertyName,
  );
}

function propertyNameFor(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  return undefined;
}
