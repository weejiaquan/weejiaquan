// Hero card — animated glyph-field name render with a character dissolve.
//
// Performance model: GitHub shows this SVG through an <img>, so the browser
// paints it as one image and ANY animation repaints the whole card. Two rules
// follow, both measured: glyphs use solid fills (gradient-filled text made each
// repaint ~5x slower), and every animation steps at FPS on a shared clock so the
// card repaints at most FPS times a second instead of 60.
import { RAMP, quant, hash, push, tiers } from "../lib/glyphs.mjs"
import { strokeCov } from "../lib/strokefont.mjs"
import { card } from "../lib/svg.mjs"

const W = 900, H = 500
const ART = 420          // art zone height; every label, stat and the credit sit below it
export const NAME = ["JQ", "WEE"]
const GW = 13, GGAP = 3, GH = 16, LGAP = 2
const NCW = 8.8, NCH = 10.5, NX = 48
const BUCKETS = 20
export const FPS = 15

const nCols = Math.max(...NAME.map(l => l.length)) * (GW + GGAP)
const nRows = NAME.length * GH + (NAME.length - 1) * LGAP
// centre the name block vertically in the art zone (glyph tops sit ~8px above their baseline)
const NY = Math.round((ART + 8 - (nRows - 1) * NCH) / 2)

// Solid colour bands stand in for the old animated gradient; picked by position
// so the iridescent sweep still reads across the name and the character.
const IRID = ["#28E7EC", "#A9F9FF", "#F5FFFF", "#8AABFF", "#E1A7F3"]
const WARM = ["#A8F0D8", "#EAFBFF", "#4FA8E8", "#A8F0D8"]
const bandOf = (t, palette) => Math.max(0, Math.min(palette.length - 1, Math.floor(t * palette.length)))
const pushBand = (bucket, band, q, cell) => { bucket[band] = bucket[band] || {}; push(bucket[band], q, cell) }
const bandTiers = (bucket, palette) =>
  Object.keys(bucket).map(b => `<g fill="${palette[b]}">${tiers(bucket[b])}</g>`).join("")
// merge the colour bands, for copies that paint in a single colour of their own
const flatTiers = bucket => {
  const merged = {}
  for (const b of Object.keys(bucket)) for (const q of Object.keys(bucket[b])) push(merged, q, bucket[b][q])
  return tiers(merged)
}

// Keyframes whose every segment steps once per 1/FPS second. Each stop must
// declare every animated property so the per-segment step count is exact.
const frames = sec => Math.round(sec * FPS)
function stepped(name, total, stops) {
  const body = stops.map(([fr, decl], i) => {
    const next = stops[i + 1]
    const timing = next ? `;animation-timing-function:steps(${Math.max(1, next[0] - fr)})` : ""
    return `${+((fr / total) * 100).toFixed(4)}%{${decl}${timing}}`
  }).join("")
  return `@keyframes ${name}{${body}}`
}
// delays snap to 0.2s (3 frames at 15fps): exact in decimal and on the shared grid
const snapDelay = sec => (Math.round(sec / 0.2) * 0.2).toFixed(1)

export function heroCard({ contrib, repoCount, character }) {
  const { weekTotals, total, commits, prs } = contrib
  const WMAX = Math.max(...weekTotals) // -Infinity for an empty calendar
  const hasActivity = Number.isFinite(WMAX) && WMAX > 0
  const char = character.baked
  const charB64 = character.b64
  const [DX, DY, DW, DH] = char.dest
  const [B0, B1] = char.band

  // A new account or a fork can have fewer than 53 weeks of calendar.
  const weekAt = c => Math.min(weekTotals.length - 1, Math.floor((c / nCols) * weekTotals.length))
  // Guard against an empty or all-zero contribution history: log1p(0)/log1p(0)
  // is NaN, which would short-circuit the quality filter below and let every
  // covered cell through regardless of activity.
  const activity = c => (!hasActivity ? 0 : Math.log1p(weekTotals[weekAt(c)]) / Math.log1p(WMAX))
  const deltaAt = c => {
    const w = weekAt(c)
    if (w <= 0 || !hasActivity) return 0
    return Math.abs(weekTotals[w] - weekTotals[w - 1]) / WMAX
  }

  const nameCore = {}
  const nameBuckets = Array.from({ length: BUCKETS }, () => ({}))
  const charBuckets = Array.from({ length: BUCKETS }, () => ({}))

  // ---- name layer -----------------------------------------------------------
  let ghosts = ""
  NAME.forEach((line, li) => {
    const rowOff = li * (GH + LGAP)
    ;[...line].forEach((ch, gi) => {
      const colOff = gi * (GW + GGAP)
      for (let r = 0; r < GH; r++) {
        for (let c = 0; c < GW; c++) {
          const cov = strokeCov(ch, c / GW, r / GH, 1 / GW, 1 / GH)
          if (cov <= 0.04) continue
          const col = colOff + c, row = rowOff + r
          const quality = cov * (0.45 + 0.55 * activity(col))
          if (quality < 0.13) continue
          const x = Math.round(NX + col * NCW), y = Math.round(NY + row * NCH)
          // Coverage quantises to tenths over "  " + RAMP, so tenths 0-1 are
          // blank; a blank cell draws nothing, so skip it.
          const ri = Math.round(cov * 10) - 2
          if (ri < 0) continue
          const g = RAMP[Math.min(ri, RAMP.length - 1)]
          const q = quant(0.40 + 0.60 * quality)
          const band = bandOf(col / nCols, IRID)
          const cell = `<text x="${x}" y="${y}">${g}</text>`
          if (quality > 0.44) pushBand(nameCore, band, q, cell)
          else pushBand(nameBuckets[Math.floor(hash(col, row) * BUCKETS) % BUCKETS], band, q, cell)
          if (deltaAt(col) > 0.10 && cov > 0.3) {
            ghosts += `<text x="${Math.round(x + deltaAt(col) * 16)}" y="${y}">${g}</text>`
          }
        }
      }
    })
  })

  // ---- character dissolve cells (pre-baked) ----------------------------------
  for (const [x, y, g, o] of char.cells) {
    if (g === " ") continue // the bake's ramp has blank entries; they draw nothing
    pushBand(charBuckets[Math.floor(hash(x, y) * BUCKETS) % BUCKETS],
      bandOf((x - DX) / DW, WARM), quant(o), `<text x="${x}" y="${y}">${g}</text>`)
  }

  // ---- animation --------------------------------------------------------------
  const css = []
  const loop = (name, dur, stops, cls, delay = "0.0") => {
    css.push(stepped(name, frames(dur), stops) + `.${cls}{animation:${name} ${dur}s linear ${delay}s infinite}`)
  }
  const scatterStops = (dur, from, rest) => {
    const T = frames(dur), a = frames(dur * 0.3), b = frames(dur * 0.84)
    return [[0, from], [a, rest], [b, rest], [T, from]]
  }

  const ghostT = frames(13)
  css.push(stepped("kghost", ghostT, [
    [0, "transform:translate(-7px,0);opacity:.8"],
    [frames(13 * 0.3), "transform:translate(0,0);opacity:.28"],
    [frames(13 * 0.84), "transform:translate(0,0);opacity:.28"],
    [ghostT, "transform:translate(5px,0);opacity:.7"],
  ]) + ".ghost{animation:kghost 13s linear 0.0s infinite}")

  function scatterGroups(buckets, dur, spread, tag, palette) {
    let out = ""
    buckets.forEach((bucket, i) => {
      const cells = bandTiers(bucket, palette)
      if (!cells) return
      const s = i / BUCKETS
      const ang = s * Math.PI * 2 * 3.7
      const dx = (Math.cos(ang) * spread * (0.4 + s)).toFixed(1)
      const dy = (Math.sin(ang) * spread * (0.5 + s) - spread * 0.7).toFixed(1)
      const cls = `${tag}${i}`
      loop(`k${cls}`, dur,
        scatterStops(dur, `transform:translate(${dx}px,${dy}px);opacity:0`, "transform:translate(0,0);opacity:1"),
        cls, snapDelay(s * dur * 0.3))
      out += `<g class="${cls}">${cells}</g>`
    })
    return out
  }

  // scan bar: sweeps the name once per loop, then fades
  const scanTravel = +(nRows * NCH + 24).toFixed(1)
  const sT = frames(13), s26 = frames(13 * 0.26), s30 = frames(13 * 0.30), s33 = frames(13 * 0.33)
  const fadeAt30 = (0.9 * (s33 - s30) / (s33 - s26)).toFixed(2)
  css.push(stepped("kscan", sT, [
    [0, "transform:translate(0,0);opacity:.9"],
    [s26, `transform:translate(0,${+(scanTravel * s26 / s30).toFixed(1)}px);opacity:.9`],
    [s30, `transform:translate(0,${scanTravel}px);opacity:${fadeAt30}`],
    [s33, `transform:translate(0,${scanTravel}px);opacity:0`],
    [sT, `transform:translate(0,${scanTravel}px);opacity:0`],
  ]) + ".scan{animation:kscan 13s linear 0.0s infinite}")

  const R = DX + DW
  const fadeInEnd = ((B1 - B0) / (R - B0)).toFixed(3)
  // the right edge either bleeds off the card (edgeFade 0) or fades out over edgeFade px
  const rightFade = char.edgeFade > 0
    ? `<stop offset="${((R - char.edgeFade - B0) / (R - B0)).toFixed(3)}" stop-color="#fff"/><stop offset="1" stop-color="#000"/>`
    : ""

  const defs = `
  <radialGradient id="backlight" cx=".5" cy=".42" r=".5">
    <stop offset="0" stop-color="#2E6F7A" stop-opacity=".55"/>
    <stop offset=".55" stop-color="#20505C" stop-opacity=".26"/>
    <stop offset="1" stop-color="#20505C" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="vig" cx=".64" cy=".4" r=".8">
    <stop offset="0" stop-color="#1B222B"/><stop offset="1" stop-color="#0A0C10"/>
  </radialGradient>
  <!-- horizontal dissolve: image absent at the band start, solid by the band end -->
  <linearGradient id="mgx" gradientUnits="userSpaceOnUse" x1="${B0}" y1="0" x2="${R}" y2="0">
    <stop offset="0" stop-color="#000"/><stop offset="${fadeInEnd}" stop-color="#fff"/>${rightFade}
  </linearGradient>
  <linearGradient id="mgy" gradientUnits="userSpaceOnUse" x1="0" y1="${char.fadeBottom}" x2="0" y2="${char.fadeBottom + char.fadeLen}">
    <stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/>
  </linearGradient>
  <mask id="mx"><rect x="${DX}" y="-40" width="${DW}" height="${H + 80}" fill="url(#mgx)"/></mask>
  <mask id="my"><rect x="${DX}" y="-40" width="${DW}" height="${H + 80}" fill="url(#mgy)"/></mask>`

  const charField = scatterGroups(charBuckets, 16, 26, "c", WARM)
  const nameField = scatterGroups(nameBuckets, 13, 26, "n", IRID)

  const body = `
<rect width="${W}" height="${H}" fill="url(#vig)"/>
<ellipse cx="${DX + DW * 0.54}" cy="${DY + DH * 0.40}" rx="${DW * 0.78}" ry="${DH * 0.60}" fill="url(#backlight)"/>

<!-- character: masked twice (horizontal dissolve x vertical fade) -->
<g mask="url(#mx)"><g mask="url(#my)" opacity=".94">
  <image x="${DX}" y="${DY}" width="${DW}" height="${DH}"
    href="data:image/webp;base64,${charB64}"/>
</g></g>

<!-- the image handing off to type as it fades -->
<g font-family="'PlexMonoSub','IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace" font-size="6.6" font-weight="700"
   text-anchor="middle">${charField}</g>

<!-- name -->
<g font-family="'PlexMonoSub','IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace" font-size="11.5" font-weight="700"
   text-anchor="middle">
  <g opacity=".20" font-size="15.5">${bandTiers(nameCore, IRID)}</g>
  <g opacity=".34" fill="#FF3B3B" transform="translate(-2.6,0)">${flatTiers(nameCore)}</g>
  <g opacity=".34" fill="#2BE3FF" transform="translate(2.6,0)">${flatTiers(nameCore)}</g>
  <g>${bandTiers(nameCore, IRID)}</g>
  ${nameField}
  <g class="ghost" fill="#E1A7F3">${ghosts}</g>
</g>

<rect class="scan" x="38" y="${NY - 18}" width="${+(nCols * NCW + 24).toFixed(1)}" height="2" fill="#A9F9FF"/>

<!-- footer: all readable text lives below the art zone -->
<path d="M48 ${ART + 8}h804" stroke="#2A323C"/>
<g font-family="'GeistSub',Geist,Inter,system-ui,sans-serif">
  <text x="48" y="${ART + 32}" font-size="10.5" fill="#71808F" letter-spacing="4.6">READ ERROR ／ 読取</text>
  <text x="852" y="${ART + 32}" text-anchor="end" font-size="9" fill="#5F6E7E" letter-spacing="1.8">ART @Azzinhee</text>
</g>
<g font-family="'GeistSub',Geist,Inter,system-ui,sans-serif" fill="#EAF6FF">
  <text x="48" y="${ART + 64}" font-size="20" font-weight="500" letter-spacing="-.4">${total.toLocaleString("en-US")}<tspan font-size="9" fill="#71808F" letter-spacing="2.4" dx="8">CONTRIB</tspan></text>
  <text x="206" y="${ART + 64}" font-size="20" font-weight="500">${commits.toLocaleString("en-US")}<tspan font-size="9" fill="#71808F" letter-spacing="2.4" dx="8">COMMITS</tspan></text>
  <text x="372" y="${ART + 64}" font-size="20" font-weight="500">${prs.toLocaleString("en-US")}<tspan font-size="9" fill="#71808F" letter-spacing="2.4" dx="8">PR</tspan></text>
  <text x="488" y="${ART + 64}" font-size="20" font-weight="500">${repoCount.toLocaleString("en-US")}<tspan font-size="9" fill="#71808F" letter-spacing="2.4" dx="8">REPOS</tspan></text>
</g>`

  return card({ w: W, h: H, css: css.join(""), defs, body })
}
