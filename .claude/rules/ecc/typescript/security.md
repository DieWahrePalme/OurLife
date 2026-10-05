---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript/JavaScript Security

> This file extends [common/security.md](../common/security.md) with TypeScript/JavaScript specific content.

## Secret Management

```typescript
// NEVER: Hardcoded secrets
const apiKey = "sk-proj-xxxxx"

// ALWAYS: Environment variables
const apiKey = process.env.API_KEY

if (!apiKey) {
  throw new Error('API_KEY not configured')
}
```

For this project: only `EXPO_PUBLIC_*` variables are readable client-side (see `src/lib/supabase.ts`) — a real secret must never be prefixed `EXPO_PUBLIC_`, since that prefix ships it into the client bundle by design.

## Agent Support

- Use **security-reviewer** agent for comprehensive security audits

---

Origin: imported from github.com/affaan-m/ecc (rules/typescript/security.md), commit bf70150
