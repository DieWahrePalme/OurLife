# Security Guidelines

> See `.claude/rules/ecc/README.md` point 3 — this project has no custom backend; "CSRF protection" and "rate limiting on all endpoints" below don't apply as written. The real enforcement point is Postgres RLS in `supabase/schema.sql`.

## Mandatory Security Checks

Before ANY commit:
- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized HTML)
- [ ] CSRF protection enabled (n/a for this project)
- [ ] Authentication/authorization verified
- [ ] Rate limiting on all endpoints (n/a for this project — see note above)
- [ ] Error messages don't leak sensitive data

## Secret Management

- NEVER hardcode secrets in source code
- ALWAYS use environment variables or a secret manager
- Validate that required secrets are present at startup
- Rotate any secrets that may have been exposed

## Security Response Protocol

If security issue found:
1. STOP immediately
2. Use **security-reviewer** agent
3. Fix CRITICAL issues before continuing
4. Rotate any exposed secrets
5. Review entire codebase for similar issues

---

Origin: imported from github.com/affaan-m/ecc (rules/common/security.md), commit bf70150
