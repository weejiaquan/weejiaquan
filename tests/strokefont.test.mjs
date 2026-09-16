// tests/strokefont.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { STROKES, strokeCov } from "../scripts/lib/strokefont.mjs"

test("every glyph needed by the name is defined", () => {
  for (const ch of "WEE JIA QUAN") assert.ok(STROKES[ch], `missing glyph: ${JSON.stringify(ch)}`)
})

test("space and unknown glyphs have zero coverage", () => {
  assert.equal(strokeCov(" ", 0.5, 0.5, 0.1, 0.1), 0)
  assert.equal(strokeCov("Z", 0.5, 0.5, 0.1, 0.1), 0)
})

test("coverage is always a fraction", () => {
  for (const ch of "WEJIAQUN") {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const v = strokeCov(ch, c / 4, r / 4, 0.25, 0.25)
      assert.ok(v >= 0 && v <= 1, `${ch} ${r},${c} = ${v}`)
    }
  }
})

test("a cell on the I stem is covered, a cell beside it is not", () => {
  // I is a centre stem with top and bottom bars
  assert.ok(strokeCov("I", 0.46, 0.45, 0.08, 0.1) > 0.9, "centre of I should be solid")
  assert.equal(strokeCov("I", 0.0, 0.45, 0.06, 0.1), 0, "left edge of I should be empty")
})

test("E has ink on its stem at mid-height and none past its arm", () => {
  assert.ok(strokeCov("E", 0.0, 0.45, 0.08, 0.1) > 0.8)
  assert.equal(strokeCov("E", 0.93, 0.45, 0.07, 0.1), 0)
})

test("increasing supersample count keeps coverage stable within tolerance", () => {
  const a = strokeCov("A", 0.4, 0.5, 0.15, 0.12, 3)
  const b = strokeCov("A", 0.4, 0.5, 0.15, 0.12, 8)
  assert.ok(Math.abs(a - b) < 0.25, `unstable: ${a} vs ${b}`)
})
