---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# React Native / Expo Security

> This file extends [common/security.md](../common/security.md) with React Native / Expo specific content.
> The mandatory pre-commit checklist and Security Response Protocol from common/security.md still apply (minus the CSRF/rate-limiting items — see `.claude/rules/ecc/README.md`).

## The Bundle Is Public

Treat everything shipped in the app as readable by an attacker. A mobile binary can be unpacked.

- NEVER ship real secrets (private API keys, service-role keys, signing secrets) in the JS bundle or `app.config`.
- Public/anon keys (e.g. Supabase anon key, Firebase config) are acceptable ONLY when protected by server-side rules (RLS, security rules). Enforce authorization on the backend, never in the client. **This is exactly this project's model**: `EXPO_PUBLIC_SUPABASE_ANON_KEY` is meant to be public, and `supabase/schema.sql`'s RLS policies are the real gate — never the anon key's secrecy.
- Keep privileged operations behind your own server / edge functions. This project has none — everything goes through Supabase directly with RLS enforcing access, which is the correct pattern for this architecture (no server to "keep it behind").

## Secret & Token Storage

- Store auth tokens and sensitive values in `expo-secure-store` (Keychain / Keystore) — never in `AsyncStorage` or plain MMKV.
- Do not persist secrets in Redux/Zustand state that may be serialized to disk.

Note for this project: `src/lib/supabase.ts` currently uses plain `AsyncStorage` (via `@react-native-async-storage/async-storage`) for the Supabase session, not `expo-secure-store`. That session token is more sensitive than ordinary app state — worth a follow-up to switch to `expo-secure-store` for the native builds, once/if this ships as a real app rather than web-only (AsyncStorage's web implementation is just `localStorage`, which has the same exposure either way; `expo-secure-store` only helps on native).

## Configuration

- Read environment via `expo-constants` / `app.config.ts` `extra`, and `EXPO_PUBLIC_*` only for genuinely public values.
- Keep build secrets in EAS secrets, not in the repo. (This project doesn't have EAS yet — see production-readiness.md.)

## Network & Data

- HTTPS only; reject cleartext. Consider certificate pinning for high-risk apps.
- Validate ALL external data (API responses, deep-link params, push payloads) with Zod before use.
- Validate and sanitize deep links and universal links — never route or grant access based on unvalidated params.

## Permissions & Privacy

- Request the minimum device permissions, at the moment they are needed, with clear rationale.
- Declare data collection accurately for App Store / Play Store privacy disclosures.

## Dependencies

- Run `expo-doctor` and `npm audit` regularly; keep the Expo SDK and native deps current.
- Use `/security-scan` (AgentShield) on the agent configuration itself — not available in this project (AgentShield is part of ECC's own plugin, not imported here).

---

Origin: imported from github.com/affaan-m/ecc (rules/react-native/security.md), commit bf70150
