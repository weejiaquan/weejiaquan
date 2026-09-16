import { test } from "node:test"
import assert from "node:assert/strict"
import { languagesCard } from "../scripts/cards/languages.mjs"
import { rhythmCard } from "../scripts/cards/rhythm.mjs"
import { violations } from "../scripts/lib/svg.mjs"

const languages = [
  { name: "JavaScript", count: 16 }, { name: "Python", count: 12 },
  { name: "TypeScript", count: 5 }, { name: "HTML", count: 3 }, { name: "Swift", count: 1 },
]
const matrix = Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => (d + h) % 5))

test("both paired cards obey every global constraint", () => {
  assert.deepEqual(violations(languagesCard({ languages })), [])
  assert.deepEqual(violations(rhythmCard({ matrix })), [])
})

test("both paired cards are 440x200 so they sit side by side inside 900px", () => {
  for (const svg of [languagesCard({ languages }), rhythmCard({ matrix })]) {
    assert.match(svg, /<svg[^>]*width="440"[^>]*height="200"/)
  }
})

test("both paired cards are completely static", () => {
  for (const svg of [languagesCard({ languages }), rhythmCard({ matrix })]) {
    assert.equal((svg.match(/<animate/g) || []).length, 0)
  }
})

test("languages card names the top languages and omits the long tail", () => {
  const svg = languagesCard({ languages })
  assert.ok(svg.includes("JavaScript"))
  assert.ok(svg.includes("Python"))
  assert.ok(!svg.includes("Swift"), "single-repo languages belong in Other")
})

test("languages card handles an empty language list without dividing by zero", () => {
  const svg = languagesCard({ languages: [] })
  assert.deepEqual(violations(svg), [])
  assert.ok(!svg.includes("NaN"))
})

test("languages card never leaks the literal text \"undefined\" for an empty language list", () => {
  assert.ok(!languagesCard({ languages: [] }).includes("undefined"))
})

test("rhythm card draws a 24x7 grid", () => {
  const cells = (rhythmCard({ matrix }).match(/<text/g) || []).length
  assert.ok(cells >= 24 * 7, `expected at least 168 cells, got ${cells}`)
})

test("rhythm card handles an all-zero matrix", () => {
  const zero = Array.from({ length: 7 }, () => new Array(24).fill(0))
  const svg = rhythmCard({ matrix: zero })
  assert.deepEqual(violations(svg), [])
  assert.ok(!svg.includes("NaN"))
})

test("rhythm card never leaks the literal text \"undefined\" for an all-zero matrix", () => {
  const zero = Array.from({ length: 7 }, () => new Array(24).fill(0))
  assert.ok(!rhythmCard({ matrix: zero }).includes("undefined"))
})
