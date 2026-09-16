import { test } from "node:test"
import assert from "node:assert/strict"
import { normalizeContributions, normalizeLanguages, rhythmMatrix } from "../lib/github.mjs"

const sample = {
  user: {
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: 12,
        weeks: [
          { contributionDays: [{ contributionCount: 1 }, { contributionCount: 0 }] },
          { contributionDays: [{ contributionCount: 4 }, { contributionCount: 7 }] },
        ],
      },
      totalCommitContributions: 9,
      totalPullRequestContributions: 3,
    },
  },
}

test("normalizeContributions flattens weeks and derives totals", () => {
  const c = normalizeContributions(sample)
  assert.deepEqual(c.weeks, [[1, 0], [4, 7]])
  assert.deepEqual(c.weekTotals, [1, 11])
  assert.equal(c.total, 12)
  assert.equal(c.commits, 9)
  assert.equal(c.prs, 3)
  assert.equal(c.max, 7)
})

test("normalizeContributions survives an all-zero year without dividing by zero", () => {
  const empty = JSON.parse(JSON.stringify(sample))
  empty.user.contributionsCollection.contributionCalendar.weeks =
    [{ contributionDays: [{ contributionCount: 0 }, { contributionCount: 0 }] }]
  const c = normalizeContributions(empty)
  assert.equal(c.max, 0)
  assert.ok(Number.isFinite(c.max))
})

test("normalizeLanguages counts by primary language, descending, skipping nulls", () => {
  const nodes = [
    { primaryLanguage: { name: "JavaScript" } },
    { primaryLanguage: { name: "Python" } },
    { primaryLanguage: { name: "JavaScript" } },
    { primaryLanguage: null },
  ]
  assert.deepEqual(normalizeLanguages(nodes), [
    { name: "JavaScript", count: 2 },
    { name: "Python", count: 1 },
  ])
})

test("rhythmMatrix is 7x24 and zeroed by default", () => {
  const m = rhythmMatrix([], "America/Vancouver")
  assert.equal(m.length, 7)
  assert.ok(m.every(r => r.length === 24))
  assert.equal(m.flat().reduce((a, b) => a + b, 0), 0)
})

test("rhythmMatrix converts UTC into Vancouver local time, crossing the date boundary", () => {
  // 2026-01-05T02:00:00Z is Sunday 18:00 in Vancouver (UTC-8), not Monday 02:00
  const m = rhythmMatrix(["2026-01-05T02:00:00Z"], "America/Vancouver")
  assert.equal(m[0][18], 1, "should land on Sunday hour 18")
  assert.equal(m[1][2], 0, "must not land on Monday hour 2")
})

test("rhythmMatrix respects daylight saving", () => {
  // July is UTC-7, so 02:00Z is Monday 19:00 the previous day
  const m = rhythmMatrix(["2026-07-07T02:00:00Z"], "America/Vancouver")
  assert.equal(m[1][19], 1, "should land on Monday hour 19 under PDT")
})

test("rhythmMatrix ignores unparseable timestamps rather than throwing", () => {
  const m = rhythmMatrix(["not-a-date", "2026-01-05T02:00:00Z"], "America/Vancouver")
  assert.equal(m.flat().reduce((a, b) => a + b, 0), 1)
})

test("CONTRIB_QUERY only counts public repositories, whichever token runs it", async () => {
  // A personal token also sees private repos; the Actions token does not. Without this
  // filter a local run leaks private repo counts, languages and push times into the cards.
  const { CONTRIB_QUERY } = await import("../lib/github.mjs")
  const repoArgs = CONTRIB_QUERY.match(/repositories\(([^)]*)\)/)
  assert.ok(repoArgs, "repositories(...) call not found in CONTRIB_QUERY")
  console.log("repositories args:", repoArgs[1])
  assert.match(repoArgs[1], /privacy\s*:\s*PUBLIC/)
})
