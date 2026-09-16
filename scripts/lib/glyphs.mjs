export const RAMP = ".:-=+*#%@"

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

export const glyphFor = t => RAMP[clamp(Math.round(t * (RAMP.length - 1)), 0, RAMP.length - 1)]

const QSTEP = 0.07
export const quant = op => (Math.round(op / QSTEP) * QSTEP).toFixed(2)

// Deterministic so a rebuild with unchanged data produces an identical file.
export const hash = (a, b) => {
  let h = (a * 73856093) ^ (b * 19349663)
  h = (h ^ (h >>> 13)) >>> 0
  return (h % 1000) / 1000
}

// Hoisting opacity to a wrapping <g> saves ~16 bytes on every cell.
export const push = (bucket, q, cell) => { bucket[q] = (bucket[q] || "") + cell }
export const tiers = bucket =>
  Object.keys(bucket).map(q => `<g opacity="${q}">${bucket[q]}</g>`).join("")
