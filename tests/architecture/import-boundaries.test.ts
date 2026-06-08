import { describe, expect, it } from "vitest";
import { relative, resolve } from "node:path";
import {
  importsIn,
  layerRoots,
  wildcardExportViolationsIn,
  workspaceRoot,
  type FoundImport,
} from "./sourceAnalysis";

type LayerName = keyof typeof layerRoots | "interaction";

type LayerPolicy = Readonly<{
  layer: keyof typeof layerRoots;
  forbiddenLayers: readonly LayerName[];
  forbidsUiLibraries: boolean;
}>;

const layerPolicies: readonly LayerPolicy[] = [
  {
    layer: "activity",
    forbiddenLayers: ["app", "assessment", "document", "lesson", "rendering", "interaction"],
    forbidsUiLibraries: true,
  },
  {
    layer: "assessment",
    forbiddenLayers: ["activity", "app", "document", "lesson", "rendering", "interaction"],
    forbidsUiLibraries: true,
  },
  {
    layer: "geometry",
    forbiddenLayers: ["activity", "app", "assessment", "document", "lesson", "rendering", "interaction"],
    forbidsUiLibraries: true,
  },
  {
    layer: "document",
    forbiddenLayers: ["activity", "app", "assessment", "lesson", "rendering", "interaction"],
    forbidsUiLibraries: true,
  },
  {
    layer: "lesson",
    forbiddenLayers: ["app", "geometry", "rendering", "interaction"],
    forbidsUiLibraries: true,
  },
  {
    layer: "rendering",
    forbiddenLayers: ["activity", "app", "assessment", "document", "lesson", "interaction"],
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
      ...importsIn(layerRoots.activity),
      ...importsIn(layerRoots.assessment),
      ...importsIn(layerRoots.document),
      ...importsIn(layerRoots.lesson),
      ...importsIn(layerRoots.rendering),
    ];
    const violations = packageImports.filter(isDeepPackageImport);

    expect(violations).toEqual([]);
  });

  it("keeps package entrypoint exports explicit", () => {
    const entrypoints = [
      resolve(layerRoots.activity, "index.ts"),
      resolve(layerRoots.assessment, "index.ts"),
      resolve(layerRoots.document, "index.ts"),
      resolve(layerRoots.geometry, "index.ts"),
      resolve(layerRoots.lesson, "index.ts"),
      resolve(layerRoots.rendering, "index.ts"),
    ];
    const violations = entrypoints.flatMap(wildcardExportViolationsIn);

    expect(violations).toEqual([]);
  });
});

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
