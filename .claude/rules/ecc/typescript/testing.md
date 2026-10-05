---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript/JavaScript Testing

> This file extends [common/testing.md](../common/testing.md) with TypeScript/JavaScript specific content. See `.claude/rules/ecc/README.md` point 4 — no test suite exists yet in this project.

## E2E Testing

Use **Playwright** as the E2E testing framework for critical user flows. (This project already uses Playwright ad hoc for manual dev-server checks — see the `tdd-workflow` skill's project note for how to turn that into a real suite.)

## Agent Support

- **e2e-runner** was not imported into this project (see `.claude/rules/ecc/README.md`) — drive Playwright directly if/when E2E tests are added.

---

Origin: imported from github.com/affaan-m/ecc (rules/typescript/testing.md), commit bf70150
