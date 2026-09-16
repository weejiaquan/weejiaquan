export const CONTRIB_QUERY = `query($login:String!){
  user(login:$login){
    contributionsCollection{
      contributionCalendar{ totalContributions weeks{ contributionDays{ contributionCount date } } }
      totalCommitContributions
      totalPullRequestContributions
    }
    repositories(first:100, ownerAffiliations:OWNER, isFork:false, orderBy:{field:STARGAZERS, direction:DESC}){
      nodes{ name description stargazerCount url pushedAt primaryLanguage{ name } }
    }
    followers{ totalCount }
  }
}`

export async function fetchGraphQL(query, token, variables = {}) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}: ${await res.text()}`)
  const body = await res.json()
  if (body.errors) throw new Error(`GitHub GraphQL: ${JSON.stringify(body.errors)}`)
  return body.data
}

export function normalizeContributions(data) {
  const cc = data.user.contributionsCollection
  const weeks = cc.contributionCalendar.weeks.map(w => w.contributionDays.map(d => d.contributionCount))
  const weekTotals = weeks.map(w => w.reduce((a, b) => a + b, 0))
  const flat = weeks.flat()
  return {
    weeks,
    weekTotals,
    total: cc.contributionCalendar.totalContributions,
    commits: cc.totalCommitContributions,
    prs: cc.totalPullRequestContributions,
    max: flat.length ? Math.max(...flat) : 0,
  }
}

export function normalizeLanguages(nodes) {
  const counts = new Map()
  for (const n of nodes) {
    const name = n?.primaryLanguage?.name
    if (!name) continue
    counts.set(name, (counts.get(name) || 0) + 1)
  }
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
}

export function rhythmMatrix(isoTimestamps, timeZone) {
  const matrix = Array.from({ length: 7 }, () => new Array(24).fill(0))
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone, weekday: "short", hour: "numeric", hour12: false,
  })
  const DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  for (const ts of isoTimestamps) {
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) continue
    const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]))
    const day = DAYS[parts.weekday]
    const hour = Number(parts.hour) % 24
    if (day === undefined || Number.isNaN(hour)) continue
    matrix[day][hour]++
  }
  return matrix
}
