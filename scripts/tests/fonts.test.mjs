import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { card, FONT_FACE_CSS } from "../lib/svg.mjs"

test("font subsets are committed as raw base64 woff2", () => {
  for (const f of ["plex-mono-subset.txt", "geist-subset.txt"]) {
    const b64 = readFileSync(new URL(`../assets/fonts/${f}`, import.meta.url), "utf8").trim()
    assert.match(b64, /^[A-Za-z0-9+/=]+$/)
    const raw = Buffer.from(b64, "base64")
    assert.equal(raw.subarray(0, 4).toString("ascii"), "wOF2", `${f} is not woff2`)
  }
})

test("each font subset stays under 24KB base64", () => {
  for (const f of ["plex-mono-subset.txt", "geist-subset.txt"]) {
    const kb = readFileSync(new URL(`../assets/fonts/${f}`, import.meta.url), "utf8").trim().length / 1024
    assert.ok(kb < 24, `${f} is ${kb.toFixed(0)}KB`)
  }
})

test("FONT_FACE_CSS inlines the fonts as data URIs, never as external URLs", () => {
  assert.ok(FONT_FACE_CSS.includes("@font-face"))
  assert.ok(FONT_FACE_CSS.includes("data:font/woff2;base64,"))
  assert.ok(!/https?:\/\//.test(FONT_FACE_CSS))
})

test("every card carries the embedded fonts", () => {
  assert.ok(card({ w: 10, h: 10, body: "" }).includes("@font-face"))
})
