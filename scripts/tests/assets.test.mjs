import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const cells = JSON.parse(readFileSync(new URL("../assets/character-cells.json", import.meta.url)))
const b64 = readFileSync(new URL("../assets/character-b64.txt", import.meta.url), "utf8").trim()

test("baked geometry matches the hero card layout", () => {
  assert.deepEqual(cells.dest, [564, 0, 336, 420])
  // soft edges are part of the layout contract: the card fades these, never hard-cuts
  assert.equal(typeof cells.fadeLen, "number")
  assert.equal(typeof cells.edgeFade, "number")
  assert.equal(cells.encoded[0], 520, "encode width must cover 2.1x DPR")
})

test("dissolve cells are well formed and inside the destination box", () => {
  assert.ok(cells.cells.length > 200, `too few cells: ${cells.cells.length}`)
  const [dx, dy, dw, dh] = cells.dest
  for (const [x, y, g, o] of cells.cells) {
    assert.equal(typeof g, "string")
    assert.equal(g.length, 1)
    assert.ok(o > 0 && o <= 1, `bad opacity ${o}`)
    assert.ok(x >= dx - 2 && x <= dx + dw + 2, `x out of box: ${x}`)
    assert.ok(y >= dy - 8 && y <= dy + dh + 8, `y out of box: ${y}`)
  }
})

test("base64 payload is raw WebP with no data-URI prefix", () => {
  assert.ok(!b64.startsWith("data:"), "must not include the data: prefix")
  assert.match(b64, /^[A-Za-z0-9+/=]+$/)
  const raw = Buffer.from(b64, "base64")
  assert.equal(raw.subarray(0, 4).toString("ascii"), "RIFF")
  assert.equal(raw.subarray(8, 12).toString("ascii"), "WEBP")
})

test("character payload stays inside its byte budget", () => {
  const kb = b64.length / 1024
  assert.ok(kb < 140, `character base64 is ${kb.toFixed(0)}KB, over the 140KB budget`)
})
