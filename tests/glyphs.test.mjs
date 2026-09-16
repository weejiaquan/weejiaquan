// tests/glyphs.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { RAMP, glyphFor, quant, hash, push, tiers } from "../scripts/lib/glyphs.mjs"

test("RAMP runs sparse to dense with no leading blank", () => {
  assert.equal(RAMP, ".:-=+*#%@")
  assert.equal(RAMP.length, 9)
})

test("glyphFor maps 0..1 across the full ramp", () => {
  assert.equal(glyphFor(0), ".")
  assert.equal(glyphFor(1), "@")
  assert.equal(glyphFor(0.5), RAMP[4])
})

test("glyphFor clamps out-of-range input instead of returning undefined", () => {
  assert.equal(glyphFor(-3), ".")
  assert.equal(glyphFor(99), "@")
})

test("quant snaps opacity to 0.07 steps as a 2dp string", () => {
  assert.equal(quant(0.5), "0.49")
  assert.equal(quant(0), "0.00")
  assert.equal(typeof quant(0.31), "string")
})

test("hash is deterministic and bounded", () => {
  assert.equal(hash(3, 7), hash(3, 7))
  assert.notEqual(hash(3, 7), hash(7, 3))
  for (const [a, b] of [[0, 0], [5, 9], [130, 44]]) {
    const h = hash(a, b)
    assert.ok(h >= 0 && h < 1, `hash(${a},${b}) = ${h} out of range`)
  }
})

test("push groups cells by quantised opacity and tiers wraps each in a <g>", () => {
  const b = {}
  push(b, "0.49", "<text x='1' y='2'>#</text>")
  push(b, "0.49", "<text x='3' y='4'>%</text>")
  push(b, "0.91", "<text x='5' y='6'>@</text>")
  const out = tiers(b)
  assert.ok(out.includes('<g opacity="0.49">'))
  assert.ok(out.includes('<g opacity="0.91">'))
  assert.equal((out.match(/<g opacity=/g) || []).length, 2)
  assert.equal((out.match(/<text/g) || []).length, 3)
})

test("tiers returns empty string for an empty bucket", () => {
  assert.equal(tiers({}), "")
})
