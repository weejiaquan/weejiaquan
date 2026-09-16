// tests/hero.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { heroCard } from "../scripts/cards/hero.mjs"
import { violations } from "../scripts/lib/svg.mjs"

const character = {
  cells: JSON.parse(readFileSync(new URL("../assets/character-cells.json", import.meta.url))),
  b64: readFileSync(new URL("../assets/character-b64.txt", import.meta.url), "utf8").trim(),
}
const contrib = {
  weeks: Array.from({ length: 53 }, (_, i) => [i % 5, 0, 2, 1, 0, 3, i % 7]),
  weekTotals: Array.from({ length: 53 }, (_, i) => i * 2),
  total: 4644, commits: 593, prs: 83, max: 229,
}
const svg = heroCard({ contrib, repoCount: 48, character })

test("hero card obeys every global constraint", () => {
  assert.deepEqual(violations(svg), [])
})

test("hero card uses CSS keyframes rather than SMIL for scatter", () => {
  assert.ok(svg.includes("@keyframes"))
  const smil = (svg.match(/<animateTransform/g) || []).length
  assert.equal(smil, 0, "transform animation must be CSS, not SMIL")
})

test("hero card embeds the character as an inline data URI", () => {
  assert.ok(svg.includes("data:image/webp;base64,"))
})

test("hero card shows the headline numbers", () => {
  for (const n of ["4,644", "593", "83", "48"]) {
    assert.ok(svg.includes(n), `missing headline number ${n}`)
  }
})

test("hero card carries the artist credit verbatim", () => {
  assert.ok(svg.includes("ART @Azzinhee"))
})

test("hero card stays inside its byte budget", () => {
  const kb = Buffer.byteLength(svg) / 1024
  assert.ok(kb < 320, `hero is ${kb.toFixed(0)}KB, over the 320KB budget`)
})

test("hero card is deterministic for identical input", () => {
  assert.equal(heroCard({ contrib, repoCount: 48, character }), svg)
})

test("quiet weeks lose more glyph cells than busy weeks", () => {
  const busy = { ...contrib, weekTotals: new Array(53).fill(200) }
  const quiet = { ...contrib, weekTotals: new Array(53).fill(0) }
  const busyCount = (heroCard({ contrib: busy, repoCount: 48, character }).match(/<text/g) || []).length
  const quietCount = (heroCard({ contrib: quiet, repoCount: 48, character }).match(/<text/g) || []).length
  assert.ok(busyCount > quietCount, `busy ${busyCount} should exceed quiet ${quietCount}`)
})
