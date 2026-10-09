# OurLife: handoff

Last updated: 2026-10-09. Written by the builder session.

Repo: https://github.com/DieWahrePalme/OurLife (public, remote `origin` via SSH).
Live web version: https://diewahrepalme.github.io/OurLife/ (GitHub Pages, rebuilt on every push to `main`).

## What works today

Runs in Expo Go, in a browser and on GitHub Pages. Two phones share one space and sync live.

- **Pairing**: first start shows "Start our space" or "I have a code". Each phone signs in
  anonymously. The first phone creates the space and gets a 24-character code, the second
  enters it. A space holds exactly two people. The code is also shown in Settings.
- **Home**: "Day N" counter (start date is shared and editable), 7-column dot grid, month
  labels, today in orange, 3 future weeks as outlines. Light (cream) and dark follow the phone.
- **Day page** (tap any dot): free-form white page. Items: text, stickers (emoji), washi tape,
  photos (polaroid), to-do card, focus card, mood marker, goal chips. Drag, pinch-resize,
  twist-rotate, recolour, bring to front, delete. Double-tap a text, to-do, focus or goal chip to edit.
  Changes from the other phone appear live.
- **Photos**: uploaded to the private Supabase bucket `photos` (`<space_id>/<item_id>.<ext>`),
  shown through short-lived signed links. Deleting a photo item deletes the file.
- **Goals**: create a goal; on a day page type `/goal car +50`. Totals are derived from the chips.
  Goals sync between phones.
- **Settings**: default colour (per phone), start date (shared), pairing code.
- **Offline**: the app opens from a local copy (AsyncStorage) without internet.

Local cache keys: `ourlife.day.<n>`, `ourlife.goals`, `ourlife.settings`, `ourlife.space`.
Without `.env` the app falls back to local-only mode (no pairing screen).

## How it is wired (Supabase)

- Project URL and publishable key are in `.env` (git-ignored) and in the GitHub Actions
  *variables* `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (public by design).
  No service_role key anywhere.
- Schema is applied (`supabase/schema.sql`, tested 2026-10-09 with three test users: pairing,
  full space, strangers blocked, oversize rows rejected, realtime, storage rules).
- Dashboard settings that must stay as they are (Authentication > Sign In / Providers):
  **Allow new users to sign up: ON**, **Anonymous sign-ins: ON**, **Email provider: OFF**.
  Check without creating accounts: `curl <URL>/auth/v1/settings -H "apikey: <key>"`,
  `external` must only list `anonymous_users`.
- Code: `src/lib/supabase.ts` (client), `src/features/space/` (sign-in, pairing, pair screen),
  `src/features/canvas/day-cloud.ts` + `photo-cloud.ts`, `src/features/goals/goals-cloud.ts`,
  `src/features/sync/` (current space id, realtime, stable JSON compare).
- Day items store their stacking order as `z` inside the jsonb `data`.
- Sync model: load local copy, then the cloud copy (cloud wins), edits push only what changed,
  Realtime triggers a re-read of the open day.

## How to run it

- Dev server (also serves the web build), port 8082, never 8081:
  `REACT_NATIVE_PACKAGER_HOSTNAME=100.117.131.14 npx expo start --port 8082 --host lan`
- Phone (Expo Go, Tailscale on): `exp://100.117.131.14:8082`
- Web: http://localhost:8082
- Type check: `npx tsc --noEmit`
- Web export test for Pages: `GH_PAGES_BASE_PATH=/OurLife npx expo export --platform web`

## What is next

1. **Setup options when creating a space** (Moritz, 2026-10-09): the create step only uses the
   phone's current start date. Add a start-date field (and other setup options) there. The
   server function `create_space(start_date)` already takes the date. Not urgent for the two of
   them, needed before other people use the app.
2. **Identity recovery**: a phone that loses its anonymous session (cleared browser data,
   private tab, reinstall) cannot rejoin, because the space is full (2 people, one phone = one
   user). Needs a way out, e.g. link an email later, or let the remaining member free a seat.
3. **Offline edits**: if a phone edits offline, its changes are overwritten by the cloud copy at the
   next load. Fine for now; a proper pending-changes queue would fix it.
4. **Original sticker art.** The sticker library is system emoji. Replace or add original or
   licensed art, check licences. Do not copy from `design-refs/`.
5. **Handwriting fonts**: only Caveat so far; the refs use several journal fonts.
6. **Throwback books**, reminders, export (see PRD section 4).
7. **Smaller dots** option for the grid (ref-1 is denser). Moritz has not asked again.
8. **Native iOS build / EAS** (TestFlight) when the friends MVP starts. Not configured yet.
9. Tests: none yet. Add only if Moritz asks.

## Known small things

- Realtime delete events are not filtered by space (Supabase limitation), so another user could
  learn the ids of deleted rows, never their content.
- Goal totals and the goal list refresh when the screen is focused / on goal changes, not on every
  day-item change from the other phone.
- A start date changed on the other phone shows up after the next app start.
- The session token is stored in AsyncStorage on native (not secure-store). Revisit before TestFlight.
- "Delete goal" has no "are you sure?" step.
- A screen left open past midnight keeps showing yesterday's day number until reopened.
- Selecting an item by tap waits about half a second (it waits to see if you double-tap).
- Gesture code writes `.value` directly; if the React Compiler ever complains, switch to `.get()` / `.set()`.
- Screen-reader users get select / edit / delete actions on items, but no way to move or resize yet.
- New wide items (photo, to-do, focus, tape) now start inside the page; only checked in the type check,
  not yet looked at on a phone.

## Open questions for Moritz

1. Should the identity-recovery problem (next step 2) be solved before the girlfriend uses it daily?
2. Sticker sources: free packs first, custom later?
3. When does the iOS / TestFlight build start?

## Decisions already made

English only; public repo is fine; everything is shared and freely editable, no
author tracking (colours tell who wrote what); goals driven by typed commands;
milestone countdown on Home removed (it did not feel cosy); two people per space,
joined with a long random code, anonymous sign-in, no email accounts.

## Things to know

- `design-refs/` and `.env*` are git-ignored (except `.env.example`). Never commit them.
- No service_role key anywhere. Only the anon/publishable key.
- Supabase test data: delete with `delete from public.spaces;` and
  `delete from auth.users where is_anonymous;` in the SQL editor (only before real use).
- Dates are calendar days (UTC math on the local date), day 1 = the start date.
- New screens must be in `src/app/_layout.tsx` for titles; typed routes regenerate
  while the dev server runs.
- Reviews done on 2026-10-06 (security-reviewer on the schema, react-reviewer on `src/`).
  The Supabase sync code from 2026-10-09 has not had a separate review yet.
