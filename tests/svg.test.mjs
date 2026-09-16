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

test("violations flags a filtered non-group element with a SMIL animation child", () => {
  // regression case: the prototype that pinned a CPU core had a filtered,
  // animating <rect> with no class attribute at all.
  const bad = card({
    w: 700, h: 400,
    defs: '<filter id="bloom"></filter>',
    body: '<rect x="38" y="86" width="620" height="2" fill="#A9F9FF" filter="url(#bloom)">'
      + '<animate attributeName="y" values="86;373;373" dur="13s" repeatCount="indefinite"/>'
      + '</rect>',
  })
  assert.ok(violations(bad).some(v => v.includes("filter")))
})

test("violations flags a filtered element with a class regardless of tag name", () => {
  const bad = card({ w: 10, h: 10, body: '<rect class="n0" filter="url(#b)"/>' })
  assert.ok(violations(bad).some(v => v.includes("filter")))
})

test("violations flags an on* event handler attribute", () => {
  const bad = card({ w: 10, h: 10, body: '<rect onload="alert(1)"/>' })
  assert.ok(violations(bad).some(v => v.includes("event handler")))
})

test("violations does not flag a static filtered element with no animation", () => {
  const ok = card({
    w: 10, h: 10,
    defs: '<filter id="bloom"></filter>',
    body: '<rect filter="url(#bloom)"><title>static</title></rect>',
  })
  assert.deepEqual(violations(ok), [])
})

test("card with a plain rect body still passes with zero violations", () => {
  assert.deepEqual(violations(card({ w: 900, h: 190, body: "<rect/>" })), [])
})
