# Development Workflow

> This file extends [common/git-workflow.md](./git-workflow.md) with the full feature development process that happens before git operations.
> See `.claude/rules/ecc/README.md` — `gh` CLI is available locally; Exa/Context7 are not configured, use `WebSearch`/`WebFetch` instead.

The Feature Implementation Workflow describes the development pipeline: research, planning, TDD, code review, and then committing to git.

## Feature Implementation Workflow

0. **Research & Reuse** _(mandatory before any new implementation)_
   - **Code search first:** search for existing implementations, templates, and patterns before writing anything new (`gh search code`).
   - **Library docs second:** use primary vendor docs (or Context7 if configured) to confirm API behavior, package usage, and version-specific details before implementing. For this project specifically: Expo's versioned docs, per `AGENTS.md`.
   - **Web search only when the first two are insufficient:** use `WebSearch`/`WebFetch` for broader research after code search and primary docs.
   - **Check package registries:** search npm before writing utility code. Prefer battle-tested libraries over hand-rolled solutions.
   - **Search for adaptable implementations:** look for open-source projects that solve 80%+ of the problem and can be forked, ported, or wrapped.
   - Prefer adopting or porting a proven approach over writing net-new code when it meets the requirement.

1. **Plan First**
   - Use **planner** agent to create implementation plan for anything non-trivial
   - Identify dependencies and risks
   - Break down into phases

2. **TDD Approach** (only when the user has asked for tests — see README caveat 4)
   - Use **tdd-guide** agent
   - Write tests first (RED)
   - Implement to pass tests (GREEN)
   - Refactor (IMPROVE)

3. **Code Review**
   - Use **security-reviewer** / **react-reviewer** agents after writing security-sensitive or React code
   - Address CRITICAL and HIGH issues
   - Fix MEDIUM issues when possible

4. **Commit & Push**
   - Detailed commit messages
   - Follow conventional commits format
   - Only when the user has asked for a commit — see [git-workflow.md](./git-workflow.md)

5. **Pre-Review Checks**
   - Verify all automated checks (CI/CD) are passing
   - Resolve any merge conflicts
   - Ensure branch is up to date with target branch
   - Only request review after these checks pass

---

Origin: imported from github.com/affaan-m/ecc (rules/common/development-workflow.md), commit bf70150
