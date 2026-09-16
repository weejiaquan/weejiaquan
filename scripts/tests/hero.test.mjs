// scripts/tests/hero.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { heroCard } from "../cards/hero.mjs"
import { violations } from "../lib/svg.mjs"
import { RAMP } from "../lib/glyphs.mjs"

const character = {
  baked: JSON.parse(readFileSync(new URL("../assets/character-cells.json", import.meta.url))),
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

// Name-layer cells only: render with no character cells, then map each glyph
// position to the brightest opacity tier it appears in (core cells are drawn
// several times for the chromatic split).
const nameOnly = { ...character, baked: { ...character.baked, cells: [] } }
function nameCells(weekTotals) {
  const out = heroCard({ contrib: { ...contrib, weekTotals }, repoCount: 48, character: nameOnly })
  const pos = new Map()
  for (const t of out.matchAll(/<g opacity="([\d.]+)">((?:<text x="-?\d+" y="-?\d+">[^<]*<\/text>)+)<\/g>/g)) {
    for (const c of t[2].matchAll(/<text x="(-?\d+)" y="(-?\d+)">/g)) {
      const k = `${c[1]},${c[2]}`
      pos.set(k, Math.max(pos.get(k) || 0, Number(t[1])))
    }
  }
  return [...pos].map(([k, o]) => ({ x: Number(k.split(",")[0]), o }))
}
const meanOpacity = cells => cells.reduce((a, c) => a + c.o, 0) / cells.length
// 63 name columns map onto 53 weeks: columns 0-30 are weeks 0-25 (x <= 330),
// columns 31+ are weeks 26+ (x >= 339).
const LEFT = c => c.x <= 330, RIGHT = c => c.x >= 339

test("busy weeks render the name brighter and fuller than quiet weeks", () => {
  const busy = nameCells(new Array(53).fill(200))
  const quiet = nameCells(new Array(53).fill(0))
  console.log(`busy: ${busy.length} cells, mean opacity ${meanOpacity(busy).toFixed(3)}; `
    + `quiet: ${quiet.length} cells, mean opacity ${meanOpacity(quiet).toFixed(3)}`)
  assert.ok(busy.length > quiet.length, `busy ${busy.length} should exceed quiet ${quiet.length}`)
  assert.ok(meanOpacity(busy) - meanOpacity(quiet) > 0.15, "activity must visibly brighten the name")
})

test("activity is placed by week: a busy half brightens only its side of the name", () => {
  const halves = {
    firstBusy: nameCells(Array.from({ length: 53 }, (_, i) => (i < 26 ? 200 : 0))),
    secondBusy: nameCells(Array.from({ length: 53 }, (_, i) => (i < 26 ? 0 : 200))),
  }
  for (const [name, cells] of Object.entries(halves)) {
    const l = meanOpacity(cells.filter(LEFT)), r = meanOpacity(cells.filter(RIGHT))
    console.log(`${name}: left mean opacity ${l.toFixed(3)}, right ${r.toFixed(3)}`)
    if (name === "firstBusy") assert.ok(l - r > 0.15, `${name}: left should be brighter`)
    else assert.ok(r - l > 0.15, `${name}: right should be brighter`)
  }
})

// Glyph cells are the only <text> nodes carrying exactly x and y attributes;
// headline and label <text> nodes all carry font or fill attributes.
const glyphCells = s => [...s.matchAll(/<text x="-?\d+" y="-?\d+">([^<]*)<\/text>/g)].map(m => m[1])

test("every hero glyph cell is a single character from RAMP", () => {
  const glyphs = glyphCells(svg)
  const bad = glyphs.filter(g => g.length !== 1 || !RAMP.includes(g))
  const hist = {}
  for (const g of glyphs) hist[g] = (hist[g] || 0) + 1
  console.log(`hero glyph cells: ${glyphs.length}, histogram ${JSON.stringify(hist)}`)
  assert.ok(glyphs.length > 500, `expected hundreds of glyph cells, got ${glyphs.length}`)
  assert.equal(bad.length, 0, `non-RAMP glyph contents: ${JSON.stringify([...new Set(bad)])}`)
})

test("hero card survives a short calendar (3 weeks, e.g. a brand-new account)", () => {
  const short = { ...contrib, weeks: contrib.weeks.slice(0, 3), weekTotals: [4, 0, 9] }
  const out = heroCard({ contrib: short, repoCount: 1, character })
  const v = violations(out)
  console.log("short calendar ->", v)
  assert.deepEqual(v, [])
})

test("hero card survives an empty calendar", () => {
  const empty = { ...contrib, weeks: [], weekTotals: [], total: 0, commits: 0, prs: 0, max: 0 }
  const out = heroCard({ contrib: empty, repoCount: 0, character })
  const v = violations(out)
  console.log("empty calendar ->", v)
  assert.deepEqual(v, [])
})

test("hero card is 900x500 with a footer band below the art", () => {
  assert.match(svg, /<svg[^>]*width="900"[^>]*height="500"/)
})

test("all readable text sits in the footer, below the art zone", () => {
  // glyph cells are single characters; everything longer is a label, stat or credit
  const labels = [...svg.matchAll(/<text\b([^>]*)>([^<]{2,})/g)]
    .map(m => ({ y: Number((m[1].match(/\by="([\d.]+)"/) || [])[1]), text: m[2].trim() }))
  console.log("label rows:", JSON.stringify(labels))
  assert.ok(labels.length >= 6, `expected label/stat/credit text, found ${labels.length}`)
  for (const l of labels) assert.ok(l.y > 420, `"${l.text}" at y=${l.y} is inside the art zone`)
  for (const t of ["READ ERROR", "ART @Azzinhee", "CONTRIB", "COMMITS", "REPOS"]) {
    assert.ok(svg.includes(t), `missing footer text ${t}`)
  }
})

test("character fills the art zone to the top, right and bottom edges, with no gaps", () => {
  const [dx, dy, dw, dh] = character.baked.dest
  console.log("character box:", { dx, dy, right: dx + dw, bottom: dy + dh })
  assert.equal(dy, 0, "top: must start at the card edge (not sliced above it, no gap below it)")
  assert.equal(dx + dw, 900, "right: must reach the card edge")
  assert.equal(dy + dh, 420, "bottom: must reach the footer line")
  const { fadeBottom, fadeLen } = character.baked
  assert.equal(fadeBottom + fadeLen, 420, "bottom fade must finish exactly at the footer line")
})

test("character mask dissolves the left edge and lets the right edge bleed off the card", () => {
  const grad = svg.match(/<linearGradient id="mgx"[\s\S]*?<\/linearGradient>/)
  assert.ok(grad, "horizontal mask gradient missing")
  const stops = [...grad[0].matchAll(/stop-color="(#[0-9a-fA-F]+)"/g)].map(m => m[1].toLowerCase())
  console.log("mgx stops:", stops, "edgeFade:", character.baked.edgeFade)
  assert.equal(stops[0], "#000", "left edge must start transparent")
  assert.equal(stops[stops.length - 1], character.baked.edgeFade > 0 ? "#000" : "#fff",
    "right edge ends opaque when it bleeds, transparent when it fades")
})

test("hero renders the name as JQ over WEE", async () => {
  const { NAME } = await import("../cards/hero.mjs")
  assert.deepEqual(NAME, ["JQ", "WEE"])
})

test("hero has no SMIL at all, so nothing animates on the main thread every frame", () => {
  assert.equal((svg.match(/<animate/g) || []).length, 0)
})

test("every hero animation steps at the shared frame rate, on a shared clock", async () => {
  // Any change redraws the whole card. Stepping at FPS with delays on the same
  // 1/FPS grid means at most FPS redraws a second instead of 60.
  const { FPS } = await import("../cards/hero.mjs")
  const frames = [...svg.matchAll(/@keyframes[^{]*\{((?:[^{}]*\{[^}]*\})*)\}/g)]
  assert.ok(frames.length > 0, "expected keyframe animations")
  for (const [, body] of frames) {
    const moving = body.match(/\{[^}]*\}/g).length
    assert.ok(/steps\(\d+\)/.test(body), `keyframes without steps(): ${body.slice(0, 80)}`)
    assert.ok(moving >= 2)
  }
  const delays = [...svg.matchAll(/animation:\S+ ([\d.]+)s \S+ ([\d.]+)s infinite/g)]
  assert.ok(delays.length > 0, "expected animation shorthand with duration and delay")
  for (const [, dur, delay] of delays) {
    for (const v of [Number(dur), Number(delay)]) {
      assert.ok(Math.abs(v * FPS - Math.round(v * FPS)) < 1e-6, `${v}s is not on the 1/${FPS}s grid`)
    }
  }
})
