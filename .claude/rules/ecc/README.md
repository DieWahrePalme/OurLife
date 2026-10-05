# ECC Rules (imported subset)

This directory is a curated import from [github.com/affaan-m/ecc](https://github.com/affaan-m/ecc)
(commit `bf70150`), following that project's own documented convention for
project-local rules (`rules/README.md` → "For project-local rules, use the
same namespace under the project root: `.claude/rules/ecc/`").

Only `common/`, `typescript/`, and `react-native/` were imported — the other
~20 language rulesets in upstream ECC (Python, Go, Swift, PHP, Ruby, Vue,
Angular, ArkTS, …) don't apply to this project and were left out on purpose.

## What these are

Rules are always-relevant standards and checklists ("what to enforce"), as
opposed to the paired Skills under `.claude/skills/` ("how to do it"). Nothing
here is auto-loaded into every turn — read the relevant file(s) when doing
non-trivial TypeScript/React Native work, a code review, or a security-
sensitive change, the same way you'd consult a style guide.

When `common/` and a language-specific file disagree, the language-specific
file wins (documented upstream as "specific overrides general").

## Project-specific deviations from the upstream text

The files below were copied close to verbatim (they're good, accurate
reference material), but a few things assumed by ECC don't hold for this
project. Read this before treating any of the below as a hard rule here:

1. **`common/agents.md` was deliberately NOT imported.** It documents ECC's
   full plugin (68 agents, invoked as `ecc:planner`, `ecc:code-reviewer`,
   etc.) — this project only imported four plain agents directly
   (`.claude/agents/planner.md`, `security-reviewer.md`, `react-reviewer.md`,
   `tdd-guide.md`), invoked by their own name with no `ecc:` prefix. Do not
   reference or expect any other agent from ECC's roster to exist here.

2. **Commit attribution.** `common/git-workflow.md` mentions ECC-managed
   installs disabling the `Co-Authored-By` trailer by default. **Ignore that
   for this project** — follow the commit/PR attribution lines the Claude
   Code session itself provides (`Co-Authored-By:` etc.). That wins.

3. **No custom backend.** This is Expo/React Native + Supabase with zero
   custom API server. Anywhere a rule says "rate limiting on all endpoints,"
   "CSRF protection," or similar server-middleware advice (`common/security.md`,
   `typescript/security.md`'s cross-references), read it as not applicable —
   the real gate is Postgres Row Level Security in `supabase/schema.sql`.

4. **No test suite yet.** `common/testing.md`, `common/code-review.md`, and
   the `react-native/testing.md`/`production-readiness.md` 80%-coverage and
   RED-GREEN-REFACTOR requirements are aspirational for this project today —
   there is no Jest/Vitest config or test file yet. Don't treat "tests exist
   for new functionality" as a blocking requirement unless the user has asked
   for tests. See `.claude/skills/tdd-workflow/SKILL.md`'s project note for
   the fuller version of this caveat, including why "auto-commit a checkpoint
   per TDD stage" must NOT be followed here (conflicts with this session's
   "never commit unless asked" rule).

5. **Web live, iOS in progress.** The web version ships as a static export to
   GitHub Pages (`.github/workflows/deploy-pages.yml`). The native iOS app is
   being built (target: TestFlight for the friends MVP — see `docs/PRD.md`).
   `react-native/production-readiness.md` (EAS Build/Update, Sentry,
   physical-device testing) is the target process for that; EAS and Sentry
   are not configured yet.

6. **Tooling in `common/development-workflow.md`.** It recommends `gh search
   code`, Context7, and Exa for research. The local Mac has the `gh` CLI
   (logged in); Context7 and Exa are not configured — use `WebSearch`/
   `WebFetch` instead where equivalent.

Everything else — coding style, immutability, Zod validation, RN
accessibility, performance, the New Architecture / SDK 55+ notes, the
Supabase-secrets guidance in `react-native/security.md` — applies as written
and is consistent with this project's existing `AGENTS.md` (Expo SDK 57,
versioned docs) and `CLAUDE.md`.
