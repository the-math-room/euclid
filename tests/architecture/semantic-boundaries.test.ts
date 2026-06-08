import { describe, expect, it } from "vitest";
import { relative, resolve } from "node:path";
import {
  allSourceFiles,
  appAndPackageProductionSourceFiles,
  authoredConstructionRecordViolationsIn,
  brandedCoordinateCastViolationsIn,
  importsInFile,
  layerRoots,
  namedImportViolationsIn,
  productionSourceFilesIn,
  workspaceRoot,
} from "./sourceAnalysis";

const appStaticContentFiles = new Set([
  relative(workspaceRoot, resolve(layerRoots.app, "lessons/lessons.ts")),
]);

const brandedCastAllowlist = new Set([relative(workspaceRoot, resolve(layerRoots.geometry, "model.ts"))]);

const zodBoundaryAllowlist = new Set([
  relative(workspaceRoot, resolve(layerRoots.assessment, "goalCodec.ts")),
  relative(workspaceRoot, resolve(layerRoots.document, "constructionDecoder.ts")),
  relative(workspaceRoot, resolve(layerRoots.document, "documentDecoder.ts")),
  relative(workspaceRoot, resolve(layerRoots.geometry, "constructionSchemas.ts")),
  relative(workspaceRoot, resolve(layerRoots.lesson, "codec.ts")),
]);

const authoredConstructionKinds = new Set([
  "free-point",
  "line-through",
  "circle-through",
  "circle-three-points",
  "line-line-intersection",
  "line-circle-intersection",
  "circle-circle-intersection",
  "parallel-line",
  "perpendicular-line",
  "midpoint",
]);

describe("architecture semantic boundaries", () => {
  it("keeps raw coordinate branding casts inside the brand constructors", () => {
    const violations = allSourceFiles().flatMap((file) => {
      const relativeFile = relative(workspaceRoot, file);

      if (brandedCastAllowlist.has(relativeFile)) {
        return [];
      }

      return brandedCoordinateCastViolationsIn(file);
    });

    expect(violations).toEqual([]);
  });

  it("keeps app command code from importing construction naming internals", () => {
    const violations = productionSourceFilesIn(layerRoots.app).flatMap((file) =>
      namedImportViolationsIn(
        file,
        "generateNextPointLabel",
        "App command code must not import generateNextPointLabel. Use geometry edit commands instead.",
      ),
    );

    expect(violations).toEqual([]);
  });

  it("keeps app command code from constructing authored geometry records directly", () => {
    const violations = productionSourceFilesIn(layerRoots.app)
      .filter((file) => !appStaticContentFiles.has(relative(workspaceRoot, file)))
      .flatMap((file) => authoredConstructionRecordViolationsIn(file, authoredConstructionKinds));

    expect(violations).toEqual([]);
  });

  it("keeps Zod imports at content and schema parse boundaries", () => {
    const violations = [...appAndPackageProductionSourceFiles()].flatMap((file) => {
      const relativeFile = relative(workspaceRoot, file);

      if (zodBoundaryAllowlist.has(relativeFile)) {
        return [];
      }

      return importsInFile(file)
        .filter((foundImport) => foundImport.specifier === "zod")
        .map((foundImport) => ({
          file: foundImport.file,
          message: "Zod imports belong at explicit content/schema parse boundaries.",
        }));
    });

    expect(violations).toEqual([]);
  });
});
