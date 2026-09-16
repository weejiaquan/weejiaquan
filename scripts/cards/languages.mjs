import { card, PALETTE } from "../lib/svg.mjs"

const W = 440, H = 200
const BAR = [PALETTE.mint, PALETTE.blue, PALETTE.cyan, "#8AABFF", "#3E4854"]

export function languagesCard({ languages }) {
  const shown = languages.filter(l => l.count > 1).slice(0, 4)
  const tail = languages.reduce((a, l) => a + l.count, 0) - shown.reduce((a, l) => a + l.count, 0)
  const rows = tail > 0 ? [...shown, { name: "Other", count: tail }] : shown
  const total = rows.reduce((a, l) => a + l.count, 0)

  let x = 28, bar = ""
  rows.forEach((l, i) => {
    const w = total ? (384 * l.count) / total : 0
    bar += `<rect x="${x.toFixed(1)}" y="70" width="${w.toFixed(1)}" height="10" rx="2" fill="${BAR[i % BAR.length]}"/>`
    x += w
  })

  const legend = rows.map((l, i) =>
    `<text x="28" y="${108 + i * 17}" font-family="Geist,Inter,system-ui,sans-serif" font-size="11" fill="${PALETTE.ink}">`
    + `<tspan fill="${BAR[i % BAR.length]}">■</tspan> ${l.name}`
    + `<tspan fill="${PALETTE.dim}" dx="6">${l.count}</tspan></text>`).join("")

  const body =
    `<rect width="${W}" height="${H}" fill="${PALETTE.bg}"/>`
    + `<text x="28" y="36" font-family="Geist,Inter,system-ui,sans-serif" font-size="10" fill="${PALETTE.dim}" letter-spacing="4.2">LANGUAGES ／ 言語</text>`
    + `<path d="M28 48h384" stroke="${PALETTE.rule}"/>${bar}${legend}`
  return card({ w: W, h: H, body })
}
