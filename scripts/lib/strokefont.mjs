// Normalised 0..1, y down. Each glyph is a list of polylines.
// E's arms stop at 0.86 so adjacent E's do not fuse into one bar.
export const STROKES = {
  W: [[[0, 0], [0.2, 1], [0.5, 0.28], [0.8, 1], [1, 0]]],
  E: [[[0.86, 0], [0, 0], [0, 1], [0.86, 1]], [[0, 0.5], [0.62, 0.5]]],
  J: [[[0.78, 0], [0.78, 0.74], [0.66, 0.95], [0.36, 1], [0.1, 0.88], [0.04, 0.7]]],
  I: [[[0.16, 0], [0.84, 0]], [[0.5, 0], [0.5, 1]], [[0.16, 1], [0.84, 1]]],
  A: [[[0, 1], [0.5, 0], [1, 1]], [[0.17, 0.63], [0.83, 0.63]]],
  Q: [[[0.5, 0], [0.16, 0.14], [0, 0.5], [0.16, 0.86], [0.5, 1], [0.84, 0.86], [1, 0.5], [0.84, 0.14], [0.5, 0]], [[0.6, 0.68], [1.02, 1.06]]],
  U: [[[0, 0], [0, 0.68], [0.14, 0.92], [0.5, 1], [0.86, 0.92], [1, 0.68], [1, 0]]],
  N: [[[0, 1], [0, 0], [1, 1], [1, 0]]],
  " ": [],
}

export const HALFW = 0.115

const distToSeg = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay
  const L = dx * dx + dy * dy
  let t = L === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / L
  t = t < 0 ? 0 : t > 1 ? 1 : t
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

export function strokeCov(glyph, cx, cy, cw, ch, N = 3) {
  const polys = STROKES[glyph]
  if (!polys || !polys.length) return 0
  let hits = 0
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const px = cx + ((i + 0.5) / N) * cw
      const py = cy + ((j + 0.5) / N) * ch
      let inside = false
      for (const poly of polys) {
        for (let k = 0; k < poly.length - 1; k++) {
          if (distToSeg(px, py, poly[k][0], poly[k][1], poly[k + 1][0], poly[k + 1][1]) < HALFW) {
            inside = true
            break
          }
        }
        if (inside) break
      }
      if (inside) hits++
    }
  }
  return hits / (N * N)
}
