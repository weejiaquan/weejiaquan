import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"
import { heroCard } from "./cards/hero.mjs"
import { contributionsCard } from "./cards/contributions.mjs"
import { languagesCard } from "./cards/languages.mjs"
import { rhythmCard } from "./cards/rhythm.mjs"
import { CONTRIB_QUERY, fetchGraphQL, normalizeContributions, normalizeLanguages, rhythmMatrix } from "./lib/github.mjs"

export function buildAll({ contrib, languages, matrix, repoCount, character }) {
  return {
    "cards/hero.svg": heroCard({ contrib, repoCount, character }),
    "cards/contributions.svg": contributionsCard({ contrib }),
    "cards/languages.svg": languagesCard({ languages }),
    "cards/rhythm.svg": rhythmCard({ matrix }),
  }
}

async function main() {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error("GITHUB_TOKEN is required")
  const login = process.env.GITHUB_LOGIN || "weejiaquan"

  const data = await fetchGraphQL(CONTRIB_QUERY, token, { login })
  const contrib = normalizeContributions(data)
  // CONTRIB_QUERY fetches first:100 repositories, so repoCount caps at 100.
  const nodes = data.user.repositories.nodes
  const languages = normalizeLanguages(nodes)

  // Rhythm uses repository pushedAt as a cheap proxy. Per-commit timestamps
  // would need one request per repo; see the spec's note on this card.
  const matrix = rhythmMatrix(nodes.map(n => n.pushedAt).filter(Boolean), "America/Vancouver")

  const character = {
    baked: JSON.parse(readFileSync(new URL("./assets/character-cells.json", import.meta.url))),
    b64: readFileSync(new URL("./assets/character-b64.txt", import.meta.url), "utf8").trim(),
  }

  mkdirSync(new URL("../cards/", import.meta.url), { recursive: true })
  for (const [name, svg] of Object.entries(buildAll({ contrib, languages, matrix, repoCount: nodes.length, character }))) {
    writeFileSync(new URL(`../${name}`, import.meta.url), svg)
    console.log(`wrote ${name} (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB)`)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(e => { console.error(e); process.exit(1) })
}
