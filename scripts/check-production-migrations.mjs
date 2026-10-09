import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadMigrations, computePlan } from "./production-migrations.mjs";

const files = [
  { name: "0008_ai_commercial_automation.sql", checksum: "sha1", sql: "CREATE TABLE t (id int);" },
  { name: "0009_add_flags.sql", checksum: "sha2", sql: "ALTER TABLE t ADD COLUMN flag bool;" },
];

test("fresh schema plans 0008 and 0009", () => {
  const plan = computePlan(files, [], false, false);
  assert.deepEqual(plan.map((x) => x.action), ["apply", "apply"]);
});

test("already-applied checksum matches and continues after 0008", () => {
  const plan = computePlan(files, [{ name: files[0].name, checksum: "sha1" }], true, false);
  assert.deepEqual(plan.map((x) => x.action), ["skip", "apply"]);
});

test("checksum tampering fails closed", () => {
  assert.throws(() => computePlan(files, [{ name: files[0].name, checksum: "tampered" }], true, false), /checksum mismatch/);
});

test("existing 0008 without ledger requires explicit adoption", () => {
  assert.throws(() => computePlan(files, [], true, false), /ADOPT_EXISTING/);
  const plan = computePlan(files, [], true, true);
  assert.deepEqual(plan.map((x) => x.action), ["adopt", "apply"]);
});

test("cannot skip earlier migration then report later migration as applied", () => {
  assert.throws(() => computePlan(files, [{name:files[1].name,checksum:"sha2"}], false, false), /after a pending migration/);
});

test("can't silently omit an already applied migration from source", () => {
  assert.throws(() => computePlan(files, [{name:"0010_missing.sql",checksum:"x"}], false, false), /missing from source/);
});

test("reject destructive SQL and noncontiguous migration ordering", () => {
  const directory = mkdtempSync(join(tmpdir(), "agency-migration-test-"));
  try {
    writeFileSync(join(directory, "0008_safe.sql"), "CREATE TABLE example (id int);");
    writeFileSync(join(directory, "0009_unsafe.sql"), "DROP TABLE public.leads;");
    assert.throws(() => loadMigrations(directory), /Disallowed destructive/);
    rmSync(join(directory, "0009_unsafe.sql"));
    writeFileSync(join(directory, "0010_gap.sql"), "ALTER TABLE example ADD COLUMN title text;");
    assert.throws(() => loadMigrations(directory), /Non-contiguous/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
