---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# React Native / Expo Production Readiness

> Extends the ECC philosophy to ship-grade concerns that style/pattern rules cannot encode by themselves.
> A clean codebase is necessary but not sufficient for production — these items are mandatory before release.
> **Project status (Do You Know):** this project currently ships web-only, as a static export to GitHub Pages (`.github/workflows/deploy-pages.yml`) — there is no EAS project, no native builds, and no Sentry configured. Everything below is the target state for if/when this becomes a real native app, not the current process. See `.claude/rules/ecc/README.md` point 5.

## Architecture

- Ship on the **New Architecture** (Fabric + TurboModules). It is the default in recent Expo SDKs and is mandatory (cannot be disabled) from SDK 55+. Audit native deps for compatibility.
- Pin the Expo SDK version; upgrade deliberately with `npx expo install --check` and test on both platforms.

## Build & Release (EAS) — not yet applicable to this project

- Use **EAS Build** for production binaries and **EAS Submit** for store delivery. Do not rely on local ad-hoc builds for release.
- Keep separate build profiles (`development`, `preview`, `production`) in `eas.json`.
- Manage signing credentials via EAS; never commit keystores or provisioning profiles.

## Over-the-Air Updates — not yet applicable to this project

- Use **EAS Update** (`expo-updates`) for JS-only fixes, with a defined runtime version policy.
- Never push native changes via OTA — those require a new store build.
- Roll out gradually and keep the ability to roll back.

## Observability — not yet applicable to this project

- Integrate crash + error reporting (e.g. **Sentry** via `@sentry/react-native`) in production builds.
- Add structured logging and, where useful, analytics — but strip verbose logs from release.
- Capture and surface failed network/mutation states; do not fail silently.

## Configuration & Versioning

- Bump `version` and `ios.buildNumber` / `android.versionCode` per release (once a native release path exists).
- Public config via `EXPO_PUBLIC_*`; real secrets via EAS secrets only (once EAS is in use — today, GitHub Actions secrets for the Pages build).
- Validate required config at startup and fail fast with a clear message. This project already does this — see `isSupabaseConfigured` in `src/lib/supabase.ts`.

## Pre-Release Gate (target state, once native builds exist)

Before shipping, all must pass:

- [ ] `tsc --noEmit` clean
- [ ] `npx expo lint` clean
- [ ] Tests green, coverage >= 80% (see testing.md) — not applicable until a test suite exists
- [ ] `npx expo-doctor` healthy
- [ ] Critical-flow E2E (Maestro/Detox) pass on a real build
- [ ] No secrets in bundle (see security.md)
- [ ] Crash reporting active and verified
- [ ] Tested on physical iOS and Android devices, not just simulators

---

Origin: imported from github.com/affaan-m/ecc (rules/react-native/production-readiness.md), commit bf70150
