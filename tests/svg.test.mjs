// tests/svg.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { card, violations, PALETTE } from "../scripts/lib/svg.mjs"

test("card emits explicit width and height alongside viewBox", () => {
  const s = card({ w: 900, h: 440, body: "<rect/>" })
  assert.match(s, /<svg[^>]*width="900"/)
  assert.match(s, /<svg[^>]*height="440"/)
  assert.match(s, /<svg[^>]*viewBox="0 0 900 440"/)
})

test("card always emits the reduced-motion opt-out", () => {
  const s = card({ w: 100, h: 100, body: "" })
  assert.ok(s.includes("prefers-reduced-motion"))
})

test("card passes its own constraint check", () => {
  assert.deepEqual(violations(card({ w: 900, h: 190, body: "<rect/>" })), [])
})

test("violations flags a script tag", () => {
  assert.ok(violations(card({ w: 10, h: 10, body: "<script>x</script>" }))
    .some(v => v.includes("script")))
})

test("violations flags an external reference but not xmlns", () => {
  const bad = card({ w: 10, h: 10, body: '<image href="https://evil.test/a.png"/>' })
  assert.ok(violations(bad).some(v => v.includes("external")))
  assert.deepEqual(violations(card({ w: 10, h: 10, body: "<rect/>" })), [])
})

test("violations flags a filter applied to an animated group", () => {
  const bad = card({ w: 10, h: 10, css: "@keyframes k{}", body: '<g class="n0" filter="url(#b)"><text/></g>' })
  assert.ok(violations(bad).some(v => v.includes("filter")))
})

test("violations flags a missing width attribute", () => {
  assert.ok(violations('<svg viewBox="0 0 9 9"></svg>').some(v => v.includes("width")))
})

test("PALETTE exposes the agreed accent colours", () => {
  assert.equal(PALETTE.mint, "#A8F0D8")
  assert.equal(PALETTE.bg, "#0A0C10")
})
