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

// Finds the subtree of the element that opens at `afterIdx` (the index right
// after its opening tag's closing ">"), using a simple depth counter over
// tags with the same name. Self-closing descendants of the same tag name
// don't change depth. Not a real XML parser, but sufficient to bound a
// SMIL <animate> search to the element's own descendants.
function subtreeOf(svg, tagName, afterIdx) {
  const re = new RegExp(`<${tagName}\\b[^>]*/?>|</${tagName}>`, "gi")
  re.lastIndex = afterIdx
  let depth = 1
  let m
  while ((m = re.exec(svg))) {
    if (m[0].startsWith("</")) {
      depth--
      if (depth === 0) return svg.slice(afterIdx, m.index)
    } else if (/\/\s*>$/.test(m[0])) {
      // self-closing descendant sharing the tag name: depth unchanged
    } else {
      depth++
    }
  }
  return svg.slice(afterIdx)
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
  const onAttr = svg.match(/\son\w+="[^"]*"/i)
  if (onAttr) out.push(`contains an event handler attribute: ${onAttr[0].trim()}`)
  for (const m of svg.matchAll(/<(\w+)([^>]*)>/g)) {
    const tagName = m[1]
    const attrs = m[2]
    const selfClosing = /\/\s*$/.test(attrs)
    const hasClass = /\bclass="/.test(attrs)
    const hasFilter = /\bfilter="/.test(attrs)
    if (hasClass && hasFilter) {
      out.push(`filter applied to an element with a class: ${m[0]}`)
    }
    if (hasFilter && !selfClosing) {
      const subtree = subtreeOf(svg, tagName, m.index + m[0].length)
      if (/<animate(transform|motion)?\b/i.test(subtree)) {
        out.push(`filter applied to an animated element: ${m[0]}`)
      }
    }
  }
  return out
}
