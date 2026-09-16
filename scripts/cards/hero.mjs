// Hero card — animated glyph-field name render with a character dissolve.
// Ported from the design prototype. Layout constants and animation timings
// are preserved exactly; they took many iterations to settle. See the Global Constraints in the task brief
// for why this card has zero SVG filters and uses CSS keyframes, not SMIL.
import { RAMP, quant, hash, push, tiers } from "../lib/glyphs.mjs"
import { strokeCov } from "../lib/strokefont.mjs"
import { card } from "../lib/svg.mjs"

const W = 900, H = 500
const ART = 420          // art zone height; every label, stat and the credit sit below it
const NAME = ["WEE JIA", "QUAN"]
const GW = 7, GGAP = 2, GH = 11, LGAP = 2
const NCW = 8.8, NCH = 10.5, NX = 48, NY = 92
const BUCKETS = 20

export function heroCard({ contrib, repoCount, character }) {
  const { weekTotals, total, commits, prs } = contrib
  const WMAX = Math.max(...weekTotals) // -Infinity for an empty calendar
  const hasActivity = Number.isFinite(WMAX) && WMAX > 0
  const char = character.baked
  const charB64 = character.b64

  const nCols = Math.max(...NAME.map(l => l.length)) * (GW + GGAP)
  const nRows = NAME.length * GH + (NAME.length - 1) * LGAP

  // A new account or a fork can have fewer than 53 weeks of calendar.
  const weekAt = c => Math.min(weekTotals.length - 1, Math.floor((c / nCols) * weekTotals.length))
  // Guard against an empty or all-zero contribution history: the
  // prototype's log1p(0)/log1p(0) division produces NaN, which short-circuits
  // the quality filter below and lets every covered cell through regardless
  // of activity. Treating a flat-zero history as zero activity keeps quiet
  // weeks producing fewer glyph cells than busy ones, as intended.
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
          // The prototype quantised cov to tenths over "  " + RAMP, so tenths
          // 0-1 were blank; a blank cell draws nothing, so skip it.
          const ri = Math.round(cov * 10) - 2
          if (ri < 0) continue
          const g = RAMP[Math.min(ri, RAMP.length - 1)]
          const q = quant(0.40 + 0.60 * quality)
          if (quality > 0.44) push(nameCore, q, `<text x="${x}" y="${y}">${g}</text>`)
          else push(nameBuckets[Math.floor(hash(col, row) * BUCKETS) % BUCKETS], q, `<text x="${x}" y="${y}">${g}</text>`)
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
    push(charBuckets[Math.floor(hash(x, y) * BUCKETS) % BUCKETS], quant(o), `<text x="${x}" y="${y}">${g}</text>`)
  }

  // CSS keyframes, not SMIL: transform animations on groups can be promoted to
  // the compositor, whereas SMIL runs on the main thread every frame. The
  // prototype used an <animateTransform> for the ghost-remnant drift; ported
  // to the same @keyframes pattern as scatterGroups() below.
  const css = [
    "@keyframes kghost{0%{transform:translate(-7px,0);opacity:.8}"
      + "30%{transform:translate(0,0);opacity:.28}84%{transform:translate(0,0);opacity:.28}"
      + "100%{transform:translate(5px,0);opacity:.7}}"
      + ".ghost{animation:kghost 13s linear infinite}",
  ]
  function scatterGroups(buckets, dur, spread, tag) {
    let out = ""
    buckets.forEach((bucket, i) => {
      const cells = tiers(bucket)
      if (!cells) return
      const s = i / BUCKETS
      const ang = s * Math.PI * 2 * 3.7
      const dx = (Math.cos(ang) * spread * (0.4 + s)).toFixed(1)
      const dy = (Math.sin(ang) * spread * (0.5 + s) - spread * 0.7).toFixed(1)
      const cls = `${tag}${i}`
      css.push(`@keyframes k${cls}{0%{transform:translate(${dx}px,${dy}px);opacity:0}`
        + `30%{transform:translate(0,0);opacity:1}84%{transform:translate(0,0);opacity:1}`
        + `100%{transform:translate(${dx}px,${dy}px);opacity:0}}`
        + `.${cls}{animation:k${cls} ${dur}s linear ${(s * dur * 0.3).toFixed(2)}s infinite}`)
      out += `<g class="${cls}">${cells}</g>`
    })
    return out
  }

  const [DX, DY, DW, DH] = char.dest
  const [B0, B1] = char.band
  const R = DX + DW
  const fadeInEnd = ((B1 - B0) / (R - B0)).toFixed(3)
  const fadeOutStart = ((R - char.edgeFade - B0) / (R - B0)).toFixed(3)

  const defs = `
  <linearGradient id="irid" x1="-0.6" y1="0" x2="0.4" y2="0.25">
    <stop offset="0" stop-color="#28E7EC"/><stop offset=".26" stop-color="#A9F9FF"/>
    <stop offset=".45" stop-color="#F5FFFF"/><stop offset=".64" stop-color="#8AABFF"/>
    <stop offset=".82" stop-color="#E1A7F3"/><stop offset="1" stop-color="#28E7EC"/>
    <animate attributeName="x1" values="-0.6;0.6;-0.6" dur="12s" repeatCount="indefinite"/>
    <animate attributeName="x2" values="0.4;1.6;0.4" dur="12s" repeatCount="indefinite"/>
  </linearGradient>
  <linearGradient id="warm" x1="0" y1="0" x2="1" y2="0.3">
    <stop offset="0" stop-color="#A8F0D8"/><stop offset=".4" stop-color="#EAFBFF"/>
    <stop offset=".72" stop-color="#4FA8E8"/><stop offset="1" stop-color="#A8F0D8"/>
    <animate attributeName="x1" values="0;0.7;0" dur="15s" repeatCount="indefinite"/>
    <animate attributeName="x2" values="1;1.7;1" dur="15s" repeatCount="indefinite"/>
  </linearGradient>
  <radialGradient id="backlight" cx=".5" cy=".42" r=".5">
    <stop offset="0" stop-color="#2E6F7A" stop-opacity=".55"/>
    <stop offset=".55" stop-color="#20505C" stop-opacity=".26"/>
    <stop offset="1" stop-color="#20505C" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="vig" cx=".64" cy=".4" r=".8">
    <stop offset="0" stop-color="#1B222B"/><stop offset="1" stop-color="#0A0C10"/>
  </radialGradient>
  <!-- horizontal dissolve: image absent at the band start, solid by the band end -->
  <!-- ...and fades out again over the last edgeFade px, so the source crop never shows as a hard line -->
  <linearGradient id="mgx" gradientUnits="userSpaceOnUse" x1="${B0}" y1="0" x2="${R}" y2="0">
    <stop offset="0" stop-color="#000"/><stop offset="${fadeInEnd}" stop-color="#fff"/>
    <stop offset="${fadeOutStart}" stop-color="#fff"/><stop offset="1" stop-color="#000"/>
  </linearGradient>
  <linearGradient id="mgy" gradientUnits="userSpaceOnUse" x1="0" y1="${char.fadeBottom}" x2="0" y2="${char.fadeBottom + char.fadeLen}">
    <stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/>
  </linearGradient>
  <mask id="mx"><rect x="${DX}" y="-40" width="${DW}" height="${H + 80}" fill="url(#mgx)"/></mask>
  <mask id="my"><rect x="${DX}" y="-40" width="${DW}" height="${H + 80}" fill="url(#mgy)"/></mask>`

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
   fill="url(#warm)" text-anchor="middle">${scatterGroups(charBuckets, 16, 26, "c")}</g>

<!-- name -->
<g font-family="'PlexMonoSub','IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace" font-size="11.5" font-weight="700"
   fill="url(#irid)" text-anchor="middle">
  <g>
    <g opacity=".20" font-size="15.5">${tiers(nameCore)}</g>
    <g opacity=".34" fill="#FF3B3B" transform="translate(-2.6,0)">${tiers(nameCore)}</g>
    <g opacity=".34" fill="#2BE3FF" transform="translate(2.6,0)">${tiers(nameCore)}</g>
    <g>${tiers(nameCore)}</g>
    ${scatterGroups(nameBuckets, 13, 26, "n")}
    <g class="ghost">${ghosts}</g>
  </g>
</g>

<rect x="38" y="${NY - 18}" width="${nCols * NCW + 24}" height="2" fill="#A9F9FF">
  <animate attributeName="y" values="${NY - 18};${NY + nRows * NCH + 6};${NY + nRows * NCH + 6}" keyTimes="0;0.3;1" dur="13s" repeatCount="indefinite"/>
  <animate attributeName="opacity" values=".9;.9;0;0" keyTimes="0;0.26;0.33;1" dur="13s" repeatCount="indefinite"/>
</rect>

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
