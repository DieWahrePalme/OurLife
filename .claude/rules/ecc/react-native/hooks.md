---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# React Native / Expo Hooks

> This file extends [common/hooks.md](../common/hooks.md) with React Native / Expo-specific automation guidance. No ECC hook runtime is installed in this project — these are manual commands to run yourself, not automated hooks, unless the user asks to wire up real hooks.

These are recommended PostToolUse automations to keep RN/Expo code healthy. Wire them in your hook runtime (or run manually); adapt commands to your package manager.

## Suggested checks (run manually, or wire as hooks if asked)

- **Type check:** `npx tsc --noEmit` — catch type errors early. (This project's established pattern — see `AGENTS.md`/prior sessions.)
- **Lint:** `npx expo lint` (uses `eslint-config-expo`; flat config `eslint.config.js` is the default from SDK 53+).
- **Format:** `prettier --write` on changed files.

## Pre-release / periodic

- `npx expo-doctor` — validates Expo/native dependency health and config.
- `npx expo install --check` — keeps native deps aligned with the installed Expo SDK.
- `npm audit` — dependency vulnerability scan.

## Notes

- Do not run heavy native builds inside fast edit hooks; keep edit-time hooks to typecheck/lint/format.
- Reserve `eas build` / E2E for explicit commands or CI, not per-edit automation. (This project doesn't have an EAS project yet — see `.claude/rules/ecc/README.md` point 5.)

---

Origin: imported from github.com/affaan-m/ecc (rules/react-native/hooks.md), commit bf70150
