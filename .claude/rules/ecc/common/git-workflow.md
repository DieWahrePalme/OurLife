# Git Workflow

> **Project override:** ignore the attribution note below. Use the commit/PR attribution lines the Claude Code session itself provides — that takes precedence. Also: never commit unless the user has explicitly asked for a commit in this turn (see `.claude/rules/ecc/README.md`, point 4).

## Commit Message Format
```
<type>: <description>

<optional body>
```

Types: feat, fix, refactor, docs, test, chore, perf, ci

Note: ECC-managed installs set `"includeCoAuthoredBy": false` in `~/.claude/settings.json`, so commits carry no `Co-Authored-By` trailer by default. To keep Claude attribution, set `"includeCoAuthoredBy": true` or configure `attribution`; ECC never overwrites an explicit choice. (Not applicable here — see project override above.)

## Pull Request Workflow

When creating PRs:
1. Analyze full commit history (not just latest commit)
2. Use `git diff [base-branch]...HEAD` to see all changes
3. Draft comprehensive PR summary
4. Include test plan with TODOs
5. Push with `-u` flag if new branch

> For the full development process (planning, TDD, code review) before git operations,
> see [development-workflow.md](./development-workflow.md).

---

Origin: imported from github.com/affaan-m/ecc (rules/common/git-workflow.md), commit bf70150
