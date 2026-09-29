import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { assertTrackedPaths } from "../scripts/tracked-allowlist.mjs";

const allowed = new Set(["README.md", "src/index.ts"]);

test("listed Git files are accepted", () => {
  assert.doesNotThrow(() => assertTrackedPaths(["README.md", "src/index.ts"], allowed));
});

test("tracked generated roots cannot hide behind filesystem exclusions", () => {
  for (const path of ["dist/private.js", "node_modules/private.txt", ".git/config", "dist"]) {
    assert.throws(() => assertTrackedPaths([path], allowed), /tracked generated path/);
  }
});

test("every other tracked file needs an exact allowlist entry", () => {
  assert.throws(() => assertTrackedPaths(["src/unreviewed.ts"], allowed), /unknown tracked file/);
});

test("Git reports force-added ignored build files for rejection", () => {
  const fixture = mkdtempSync(join(process.cwd(), "node_modules", "public-export-tracked-"));
  try {
    execFileSync("git", ["-C", fixture, "init", "-q"]);
    writeFileSync(join(fixture, ".gitignore"), "dist/\n");
    mkdirSync(join(fixture, "dist"));
    writeFileSync(join(fixture, "dist", "private.js"), "fixture only\n");
    execFileSync("git", ["-C", fixture, "add", "-f", "dist/private.js"]);
    const tracked = execFileSync("git", ["-C", fixture, "ls-files", "--cached", "-z"])
      .toString("utf8").split("\0").filter(Boolean);
    assert.deepEqual(tracked, ["dist/private.js"]);
    assert.throws(() => assertTrackedPaths(tracked, allowed), /tracked generated path/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
