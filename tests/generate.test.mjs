import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { buildAll } from "../scripts/generate.mjs"
import { violations } from "../scripts/lib/svg.mjs"

const character = {
  cells: JSON.parse(readFileSync(new URL("../assets/character-cells.json", import.meta.url))),
  b64: readFileSync(new URL("../assets/character-b64.txt", import.meta.url), "utf8").trim(),
}
const input = {
  contrib: {
    weeks: Array.from({ length: 53 }, (_, w) => Array.from({ length: 7 }, (_, d) => (w + d) % 9)),
    weekTotals: Array.from({ length: 53 }, (_, i) => i * 3),
    total: 4644, commits: 593, prs: 83, max: 229,
  },
  languages: [{ name: "JavaScript", count: 16 }, { name: "Python", count: 12 }],
  matrix: Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => (d * h) % 4)),
  repoCount: 48,
  character,
}

test("buildAll produces exactly the four expected cards", () => {
  assert.deepEqual(Object.keys(buildAll(input)).sort(),
    ["cards/contributions.svg", "cards/hero.svg", "cards/languages.svg", "cards/rhythm.svg"])
})

test("every generated card obeys every global constraint", () => {
  for (const [name, svg] of Object.entries(buildAll(input))) {
    assert.deepEqual(violations(svg), [], `${name} violated constraints`)
  }
})

test("only the hero card animates", () => {
  const out = buildAll(input)
  assert.ok(out["cards/hero.svg"].includes("@keyframes"))
  for (const name of ["cards/contributions.svg", "cards/languages.svg", "cards/rhythm.svg"]) {
    assert.ok(!out[name].includes("@keyframes"), `${name} must be static`)
  }
})

test("total payload across all four cards stays under 400KB", () => {
  const kb = Object.values(buildAll(input)).reduce((a, s) => a + Buffer.byteLength(s), 0) / 1024
  assert.ok(kb < 400, `total payload is ${kb.toFixed(0)}KB`)
})

test("buildAll is deterministic so unchanged data produces no commit", () => {
  assert.deepEqual(buildAll(input), buildAll(input))
})
