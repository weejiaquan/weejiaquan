import { test } from "node:test"
import assert from "node:assert/strict"
import { contributionsCard } from "../scripts/cards/contributions.mjs"
import { violations } from "../scripts/lib/svg.mjs"
import { RAMP } from "../scripts/lib/glyphs.mjs"

const contrib = {
  weeks: Array.from({ length: 53 }, (_, w) => Array.from({ length: 7 }, (_, d) => (w * 7 + d) % 12)),
  weekTotals: Array.from({ length: 53 }, (_, i) => i),
  total: 4644, commits: 593, prs: 83, max: 229,
}
const svg = contributionsCard({ contrib })

test("contributions card obeys every global constraint", () => {
  assert.deepEqual(violations(svg), [])
})

test("contributions card is 900x190", () => {
  assert.match(svg, /<svg[^>]*width="900"[^>]*height="190"/)
})

test("contributions card is completely static", () => {
  assert.equal((svg.match(/<animate/g) || []).length, 0)
  assert.ok(!svg.includes("@keyframes"))
})

test("contributions card draws one cell per day of the year", () => {
  const cells = (svg.match(/<text/g) || []).length
  assert.ok(cells >= 53 * 7, `expected at least 371 day cells, got ${cells}`)
})

test("a zero day renders the sparsest glyph and the max day the densest", () => {
  const sparse = { ...contrib, weeks: [[0, 0, 0, 0, 0, 0, 0]], max: 10 }
  const dense = { ...contrib, weeks: [[10, 10, 10, 10, 10, 10, 10]], max: 10 }
  assert.ok(contributionsCard({ contrib: sparse }).includes(`>${RAMP[0]}<`))
  assert.ok(contributionsCard({ contrib: dense }).includes(`>${RAMP[RAMP.length - 1]}<`))
})

test("contributions card survives a year with zero activity", () => {
  const empty = { ...contrib, weeks: [[0, 0, 0, 0, 0, 0, 0]], weekTotals: [0], max: 0, total: 0 }
  const out = contributionsCard({ contrib: empty })
  assert.deepEqual(violations(out), [])
  assert.ok(!out.includes("NaN"), "log scale must not divide by zero")
})
