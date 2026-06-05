import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import ts from "typescript";

const sourceRoot = resolve(process.cwd(), "src");

describe("architecture import boundaries", () => {
  it("keeps the geometry core independent from UI modules and libraries", () => {
    const violations = importsIn(resolve(sourceRoot, "geometry")).filter((foundImport) =>
      importsAnyLayer(foundImport, ["app", "document", "rendering", "interaction"]),
    );

    expect(violations).toEqual([]);
  });

  it("keeps documents independent from rendering and UI", () => {
    const violations = importsIn(resolve(sourceRoot, "document")).filter((foundImport) =>
      importsAnyLayer(foundImport, ["app", "rendering", "interaction"]),
    );

    expect(violations).toEqual([]);
  });

  it("keeps rendering independent from React and app code", () => {
    const violations = importsIn(resolve(sourceRoot, "rendering")).filter((foundImport) =>
      importsAnyLayer(foundImport, ["app", "document", "interaction"]),
    );

    expect(violations).toEqual([]);
  });

  it("keeps app modules from importing generated build output", () => {
    const violations = importsIn(resolve(sourceRoot, "app")).filter((foundImport) => {
      return foundImport.specifier.includes("dist") || foundImport.specifier.includes("node_modules");
    });

    expect(violations).toEqual([]);
  });
});

type FoundImport = Readonly<{
  file: string;
  specifier: string;
}>;

function importsAnyLayer(foundImport: FoundImport, layers: readonly string[]): boolean {
  return isUiLibrary(foundImport.specifier) || layers.some((layer) => importsLayer(foundImport, layer));
}

function importsLayer(foundImport: FoundImport, layer: string): boolean {
  if (foundImport.specifier.startsWith(`@/${layer}`)) {
    return true;
  }

  if (!foundImport.specifier.startsWith(".")) {
    return false;
  }

  const absoluteImport = resolve(sourceRoot, foundImport.file, "..", foundImport.specifier);
  const layerRoot = resolve(sourceRoot, layer);
  const relativeToLayer = relative(layerRoot, absoluteImport);

  return relativeToLayer === "" || (!relativeToLayer.startsWith("..") && !relativeToLayer.startsWith("/"));
}

function isUiLibrary(specifier: string): boolean {
  return specifier === "react" || specifier === "react-dom" || specifier === "lucide-react";
}

function importsIn(directory: string): readonly FoundImport[] {
  return sourceFilesIn(directory).flatMap((file) => {
    const text = readFileSync(file, "utf8");
    const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

    return moduleSpecifiersIn(sourceFile).map((specifier) => ({
      file: relative(sourceRoot, file),
      specifier,
    }));
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
