import { glyphFor, quant, push, tiers } from "../lib/glyphs.mjs"
import { card, PALETTE } from "../lib/svg.mjs"

const W = 440, H = 200
const X0 = 40, Y0 = 72, CW = 15.6, CH = 15
const DAYS = ["S", "M", "T", "W", "T", "F", "S"]

export function rhythmCard({ matrix }) {
  const max = Math.max(0, ...matrix.flat())
  const denom = Math.log1p(max || 1)
  const buckets = {}
  matrix.forEach((row, d) => {
    row.forEach((n, h) => {
      const t = n === 0 ? 0 : Math.log1p(n) / denom
      push(buckets, quant(0.16 + 0.78 * t),
        `<text x="${Math.round(X0 + h * CW * 0.66)}" y="${Math.round(Y0 + d * CH)}">${glyphFor(t)}</text>`)
    })
  })
  const dayLabels = DAYS.map((d, i) =>
    `<text x="26" y="${Math.round(Y0 + i * CH)}" font-family="'PlexMonoSub','IBM Plex Mono',ui-monospace,monospace" `
    + `font-size="8" fill="${PALETTE.dim}" text-anchor="middle">${d}</text>`).join("")

  const body =
    `<rect width="${W}" height="${H}" fill="${PALETTE.bg}"/>`
    + `<text x="28" y="36" font-family="'GeistSub',Geist,Inter,system-ui,sans-serif" font-size="10" fill="${PALETTE.dim}" letter-spacing="4.2">RHYTHM ／ 時刻</text>`
    + `<path d="M28 48h384" stroke="${PALETTE.rule}"/>`
    + `<g font-family="'PlexMonoSub','IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace" font-size="10" font-weight="700" `
    + `fill="${PALETTE.blue}" text-anchor="middle">${tiers(buckets)}</g>${dayLabels}`
    + `<text x="28" y="188" font-family="'GeistSub',Geist,Inter,system-ui,sans-serif" font-size="8" fill="${PALETTE.dim}" `
    + `letter-spacing="2">PUBLIC COMMIT SAMPLE ／ VANCOUVER TIME</text>`
  return card({ w: W, h: H, body })
}
