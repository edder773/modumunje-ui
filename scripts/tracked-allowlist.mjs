const generatedRoots = new Set([".git", "node_modules", "dist"]);

export function assertTrackedPaths(paths, allowedPaths) {
  for (const path of paths) {
    if (generatedRoots.has(path.split("/", 1)[0])) {
      throw new Error(`Export rejected: tracked generated path ${path}`);
    }
    if (!allowedPaths.has(path)) {
      throw new Error(`Export rejected: unknown tracked file ${path}`);
    }
  }
}
