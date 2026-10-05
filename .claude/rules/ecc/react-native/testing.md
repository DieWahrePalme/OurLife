---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# React Native / Expo Testing

> This file extends [common/testing.md](../common/testing.md) with React Native / Expo specific content.
> Coverage target and TDD workflow are inherited from common/testing.md (80% minimum, RED-GREEN-REFACTOR) — see `.claude/rules/ecc/README.md` point 4: not applicable until this project actually has a test suite.

## Tooling

| Layer | Tool |
|-------|------|
| Unit / component | Jest + `@testing-library/react-native` (via `jest-expo` preset) |
| Hooks | `@testing-library/react-native` `renderHook` |
| E2E | Maestro (recommended, simple YAML flows) or Detox — or Playwright against the web export, which this project already exercises manually |
| Type safety | `tsc --noEmit` in CI |

## Component Tests

- Query by accessible role/label/text, not by `testID` unless necessary — this also enforces accessibility.
- Assert on user-visible behavior, not implementation details.
- Follow Arrange-Act-Assert.

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native'

test('calls onSelect with the user id when pressed', () => {
  const onSelect = jest.fn()
  render(<UserCard user={{ id: '1', email: 'a@b.com' }} onSelect={onSelect} />)

  fireEvent.press(screen.getByText('a@b.com'))

  expect(onSelect).toHaveBeenCalledWith('1')
})
```

## Mocking

- Mock Expo SDK modules (camera, location, notifications, secure-store) at the test boundary.
- Wrap components that use TanStack Query in a `QueryClientProvider` with a fresh client per test — not applicable to this project's current Zustand-only state (see `patterns.md`'s project note).
- Mock navigation (`expo-router`) so screens render in isolation.
- Mock `@/lib/supabase` for anything touching `appStore.ts`'s Supabase reads/writes.

## E2E

- Cover critical flows only: auth, primary navigation, core transactions.
- Run E2E on CI against a built app (EAS Build) before release — for now, against the web export in CI/locally, since there's no EAS build yet.

## What to test first

Use the `tdd-guide` agent only when the user has asked for tests for this project (see `.claude/agents/tdd-guide.md`'s project note) — not proactively by default.

---

Origin: imported from github.com/affaan-m/ecc (rules/react-native/testing.md), commit bf70150
