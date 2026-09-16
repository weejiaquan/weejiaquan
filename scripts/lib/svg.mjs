export const PALETTE = {
  bg: "#0A0C10",
  ink: "#EAF6FF",
  dim: "#71808F",
  rule: "#2A323C",
  mint: "#A8F0D8",
  ice: "#EAFBFF",
  blue: "#4FA8E8",
  cyan: "#28E7EC",
}

const REDUCED_MOTION = "@media(prefers-reduced-motion:reduce){*{animation:none!important}}"

export function card({ w, h, css = "", defs = "", body = "" }) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" font-kerning="none">`
    + `<style>${css}${REDUCED_MOTION}</style>`
    + (defs ? `<defs>${defs}</defs>` : "")
    + body
    + `</svg>`
}

// Single enforcement point for the Global Constraints.
export function violations(svg) {
  const out = []
  if (/<script/i.test(svg)) out.push("contains a <script> tag")
  // strip the xmlns declaration, which is the only legitimate https reference
  const stripped = svg.replace(/xmlns(:\w+)?="[^"]*"/g, "")
  if (/https?:\/\//i.test(stripped)) out.push("contains an external https reference")
  if (!/<svg[^>]*\swidth="/.test(svg)) out.push("missing explicit width attribute")
  if (!/<svg[^>]*\sheight="/.test(svg)) out.push("missing explicit height attribute")
  if (!svg.includes("prefers-reduced-motion")) out.push("missing prefers-reduced-motion opt-out")
  for (const m of svg.matchAll(/<g\b[^>]*>/g)) {
    const tag = m[0]
    if (/\bclass="/.test(tag) && /\bfilter="/.test(tag)) {
      out.push(`filter applied to an animated group: ${tag}`)
    }
  }
  return out
}
