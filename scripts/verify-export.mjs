import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { lstat, readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { assertTrackedPaths } from "./tracked-allowlist.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedOriginalPaths = [
  "src/original/CatalogFieldIcon.tsx",
  "src/original/Modal.tsx",
  "src/original/StudyTopbar.tsx",
  "src/original/catalog-search.ts",
  "src/original/content-diagrams.css",
  "src/original/course-preparation.css",
  "src/original/design-system-base.css",
  "src/original/learning-field-view-model.ts",
  "src/original/public-theory.module.css",
  "src/original/public-theory.ts",
  "src/original/route-status.css",
];
const allowedPaths = new Set([
  ".gitignore",
  ".github/workflows/ci.yml",
  "README.md",
  "SOURCE_MANIFEST.json",
  "THIRD_PARTY_NOTICES.md",
  "index.html",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "scripts/verify-export.mjs",
  "scripts/tracked-allowlist.mjs",
  "src/index.ts",
  "src/demo/App.tsx",
  "src/demo/demo.css",
  "src/demo/main.tsx",
  "tests/ui.test.ts",
  "tests/tracked-allowlist.test.mjs",
  ...expectedOriginalPaths,
]);
const ignoredGeneratedDirectories = new Set([".git", "node_modules", "dist"]);

function fail(message) { throw new Error(`Export rejected: ${message}`); }

async function collectFiles(directory = root) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    const local = relative(root, absolute).split(sep).join("/");
    const metadata = await lstat(absolute);
    if (metadata.isSymbolicLink()) fail(`symbolic link ${local}`);
    if (directory === root && ignoredGeneratedDirectories.has(entry.name)) {
      if (entry.name !== ".git" && !metadata.isDirectory()) fail(`generated path is not a directory: ${local}`);
      if (entry.name === ".git" && !metadata.isDirectory() && !metadata.isFile()) fail(`invalid Git marker: ${local}`);
      continue;
    }
    if (metadata.isDirectory()) {
      if (![...allowedPaths].some((path) => path.startsWith(`${local}/`))) fail(`unknown directory ${local}`);
      files.push(...await collectFiles(absolute));
    } else if (metadata.isFile()) {
      if (!allowedPaths.has(local)) fail(`unknown file ${local}`);
      files.push(local);
    } else fail(`unsupported filesystem entry ${local}`);
  }
  return files;
}

function resolveImport(origin, specifier) {
  const base = resolve(dirname(join(root, origin)), specifier);
  if (base !== root && !base.startsWith(`${root}${sep}`)) fail(`import leaves export: ${origin} -> ${specifier}`);
  const candidates = [base, ...[".ts", ".tsx", ".js", ".mjs", ".css", ".json"].map((suffix) => `${base}${suffix}`),
    ...["index.ts", "index.tsx", "index.js", "index.mjs"].map((suffix) => join(base, suffix))];
  const target = candidates.map((candidate) => relative(root, candidate).split(sep).join("/")).find((path) => allowedPaths.has(path));
  if (!target) fail(`unlisted local import: ${origin} -> ${specifier}`);
}

function allowedExternal(origin, specifier) {
  if (origin.startsWith("src/")) return new Set(["react", "react/jsx-runtime", "react-dom/client"]).has(specifier);
  if (origin.startsWith("tests/")) return new Set(["react", "react-dom/server", "node:assert", "node:child_process", "node:fs", "node:path", "node:test"]).has(specifier);
  if (origin.startsWith("scripts/")) return new Set(["node:child_process", "node:crypto", "node:fs", "node:fs/promises", "node:path", "node:url", "typescript"]).has(specifier);
  return false;
}

function checkImport(origin, specifier) {
  if (specifier.startsWith("./") || specifier.startsWith("../")) resolveImport(origin, specifier);
  else if (!allowedExternal(origin, specifier)) fail(`forbidden external import: ${origin} -> ${specifier}`);
}

function checkSource(origin, content) {
  if (/\.(css)$/u.test(origin)) {
    if (/@import\b|url\s*\(/iu.test(content)) fail(`CSS loads another resource: ${origin}`);
    return;
  }
  if (!/\.(?:tsx?|m?js)$/u.test(origin)) return;
  if (origin.startsWith("src/") && /@backend|@frontend|@shared|(?:^|["'])\/api\/|process\.env|import\.meta\.env|apps\/backend|resources\/content/imu.test(content)) {
    fail(`private application reference in ${origin}`);
  }
  const sourceFile = ts.createSourceFile(origin, content, ts.ScriptTarget.Latest, true,
    extname(origin) === ".tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function inspect(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      if (!ts.isStringLiteral(node.moduleSpecifier)) fail(`nonliteral module specifier in ${origin}`);
      checkImport(origin, node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === "require"))) {
      if (node.arguments.length !== 1 || !ts.isStringLiteral(node.arguments[0])) fail(`computed import in ${origin}`);
      checkImport(origin, node.arguments[0].text);
    }
    ts.forEachChild(node, inspect);
  }
  inspect(sourceFile);
}

const files = await collectFiles();
for (const expected of allowedPaths) if (!files.includes(expected)) fail(`missing file ${expected}`);
if (existsSync(join(root, ".git"))) {
  const topLevel = execFileSync("git", ["-C", root, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  if (resolve(topLevel) !== root) fail("Git root does not match export root");
  const tracked = execFileSync("git", ["-C", root, "ls-files", "--cached", "-z"])
    .toString("utf8").split("\0").filter(Boolean);
  assertTrackedPaths(tracked, allowedPaths);
}
const manifest = JSON.parse(await readFile(join(root, "SOURCE_MANIFEST.json"), "utf8"));
const actualOriginalPaths = manifest.files.map((entry) => entry.exportPath).sort();
if (JSON.stringify(actualOriginalPaths) !== JSON.stringify([...expectedOriginalPaths].sort())) fail("source manifest path list changed");
for (const entry of manifest.files) {
  if (!/^[a-f0-9]{64}$/u.test(entry.sha256) || !/^apps\/frontend\/|^packages\/shared\/src\/study\/public-theory\.ts$/u.test(entry.sourcePath)) {
    fail(`invalid source record ${entry.exportPath}`);
  }
  const actualSha = createHash("sha256").update(await readFile(join(root, entry.exportPath))).digest("hex");
  if (actualSha !== entry.sha256) fail(`copied source changed: ${entry.exportPath}`);
}
for (const path of files) {
  if (path.startsWith("src/") || path.startsWith("tests/") || path.startsWith("scripts/")) {
    checkSource(path, await readFile(join(root, path), "utf8"));
  }
}
console.log(`Export accepted: ${files.length} explicit files; ${manifest.files.length} exact source copies.`);
