import { RAMP, glyphFor, quant, push, tiers } from "../lib/glyphs.mjs"
import { card, PALETTE } from "../lib/svg.mjs"

const W = 900, H = 190
const X0 = 48, Y0 = 62, CW = 15.2, CH = 13.4

export function contributionsCard({ contrib }) {
  const { weeks, max, total } = contrib
  const denom = Math.log1p(max || 1)
  const buckets = {}
  weeks.forEach((week, x) => {
    week.forEach((n, y) => {
      const t = n === 0 ? 0 : Math.log1p(n) / denom
      const gx = Math.round(X0 + x * CW)
      const gy = Math.round(Y0 + y * CH)
      push(buckets, quant(0.18 + 0.77 * t), `<text x="${gx}" y="${gy}">${glyphFor(t)}</text>`)
    })
  })
  const body =
    `<rect width="${W}" height="${H}" fill="${PALETTE.bg}"/>`
    + `<text x="48" y="34" font-family="'GeistSub',Geist,Inter,system-ui,sans-serif" font-size="10.5" `
    + `fill="${PALETTE.dim}" letter-spacing="4.6">CONTRIBUTION FIELD ／ 貢献 ／ 53 WEEKS</text>`
    + `<path d="M48 44h804" stroke="${PALETTE.rule}"/>`
    + `<g font-family="'PlexMonoSub','IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace" font-size="11" `
    + `font-weight="700" fill="${PALETTE.mint}" text-anchor="middle">${tiers(buckets)}</g>`
    + `<text x="852" y="34" text-anchor="end" font-family="'GeistSub',Geist,Inter,system-ui,sans-serif" `
    + `font-size="10.5" fill="${PALETTE.ink}">${total.toLocaleString("en-US")}</text>`
  return card({ w: W, h: H, body })
}
