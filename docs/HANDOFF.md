# OurLife: handoff

Last updated: 2026-10-09. Written by the builder session.

Repo: https://github.com/DieWahrePalme/OurLife (public, `main` pushed 2026-10-09, remote `origin` via SSH).

## What works today (all local, on the phone)

Runs in Expo Go and in a browser. Nothing leaves the device yet.

- **Home**: "Day N" counter (start date 2025-10-12, editable), 7-column dot grid
  (one row per week), month labels (year at each January), today in orange,
  3 future weeks as outlines. Light (cream) and dark follow the phone setting.
- **Day page** (tap any dot): free-form white page. Items: text, stickers (emoji),
  washi tape, photos (polaroid), to-do card, focus card, mood marker, goal chips.
  Drag, pinch-resize, twist-rotate, recolour, bring to front, delete.
  Double-tap a text, to-do, focus or goal chip to edit it.
- **Goals** (link top right on Home): create a goal (name, target, unit, optional
  deadline). On a day page type `/goal car +50` in a text box. Autocomplete offers
  your goals, a wrong name shows an error, the chip appears on the page. The goal
  page shows total, progress bar and entries by day. Totals are derived from the
  chips, so deleting a chip updates the total.
- **Settings** (link top left on Home): default colour for this phone, start date.

Storage is AsyncStorage: `ourlife.day.<n>`, `ourlife.goals`, `ourlife.settings`.
Photos on a phone are copied into the app's document folder (`photos/`).

## How to run it

- Dev server (also serves the web build for boss), port 8082, never 8081:
  `REACT_NATIVE_PACKAGER_HOSTNAME=100.117.131.14 npx expo start --port 8082 --host lan`
- Phone (Expo Go, Tailscale on): `exp://100.117.131.14:8082`
- Web: http://localhost:8082
- Type check: `npx tsc --noEmit`

## What is next

1. **Supabase + live sync** (the big one). Draft schema is in `supabase/schema.sql`,
   NOT applied. Needs Moritz: create the Supabase project, run the SQL, put the
   URL and anon key in `.env` (copy `.env.example`). Then in the app: anonymous
   sign-in, "create our space" / "enter code" screen, move day items, goals and
   photos from AsyncStorage to Supabase with realtime, keep local cache.
2. **Photos in Supabase Storage** (private bucket `photos`, path `<space_id>/<item_id>.<ext>`).
   Right now photos only exist on the phone that picked them.
3. **Original sticker art.** The sticker library is system emoji (fine to use,
   but they look like Apple's emoji). Replace or add original or licensed art,
   check licences. Do not copy from `design-refs/`.
4. **Handwriting fonts**: only Caveat so far; the refs use several journal fonts.
5. **Throwback books**, reminders, export (see PRD section 4).
6. **Smaller dots** option for the grid (ref-1 is denser). Moritz has not asked again.
7. Tests: none yet. Add only if Moritz asks.

## Known small things (from the code review, not fixed yet)

- "Delete goal" has no "are you sure?" step.
- A screen left open past midnight keeps showing yesterday's day number until reopened.
- Selecting an item by tap waits about half a second (it waits to see if you double-tap).
- Gesture code writes `.value` directly; if the React Compiler ever complains, switch to `.get()` / `.set()`.
- Screen-reader users get select / edit / delete actions on items, but no way to move or resize yet.

Reviews done on 2026-10-06: security-reviewer on `supabase/schema.sql` (all findings applied,
SQL itself is still untested because no database exists yet) and react-reviewer on `src/`
(data-loss on quick leave, accessibility labels, touch size, stale goal totals, web tap-select fixed).

## Open questions for Moritz

1. How does your girlfriend's phone connect when away from home? (Tailscale on her
   phone, or a hosted web/EAS build.) Decides whether we need EAS soon.
2. Sticker sources: free packs first, custom later?
3. Create the Supabase project now? (Moritz decides, runs CLI with `!`.)
4. ~~Push the repo to GitHub?~~ Done (2026-10-09).

## Decisions already made

English only; public repo is fine; everything is shared and freely editable, no
author tracking (colours tell who wrote what); goals driven by typed commands;
milestone countdown on Home removed (it did not feel cosy).

## Things to know

- `design-refs/` and `.env*` are git-ignored (except `.env.example`). Never commit them.
- No service_role key anywhere. Only the anon/publishable key.
- Dates are calendar days (UTC math on the local date), day 1 = the start date.
- New screens must be in `src/app/_layout.tsx` for titles; typed routes regenerate
  while the dev server runs.
