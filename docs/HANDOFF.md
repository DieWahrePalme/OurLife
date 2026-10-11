# OurLife: handoff

Last updated: 2026-10-11 (end of the day). Written by the builder session.

**Start here next time:** read "What works today", "What is next" and "Not checked on a phone yet" below.
Moritz decides what comes next; ideas he gave but that are not built yet are at the top of "What is next".

Repo: https://github.com/DieWahrePalme/OurLife (public, remote `origin` via SSH).
Live web version: https://diewahrepalme.github.io/OurLife/ (GitHub Pages, rebuilt on every push to `main`).

**State: the code is committed and pushed (code up to the commit "ci: Node 24, Ubuntu 26.04 ..."); the docs-only commit
of the evening may still be local, check `git status` / `git log origin/main..`.** The web version on GitHub Pages is built from the pushed code. The database has migrations 002, 003 and 004 (checked with the verify query, 40 of 40 ok).

## What works today

Runs in Expo Go, in a browser and on GitHub Pages. Phones share one space and sync live.

- **Space setup** (first phone): name of the space (e.g. "Momo & Bibble"), your own name, start date,
  optional goals. Gets a 24-character code. Name, code and people are managed in Settings.
- **Joining**: enter the code and your own name. Up to **20 people** per space (DB cap, was 2).
- **Everyone is an admin**: any member can remove any other member (not themself) and can make a
  **new code** (the old one stops working; people already in stay). **Removing someone automatically makes a
  new code**, so the removed person cannot come back with the old one. A removed phone lands on the
  pairing screen at its next app start ("You were removed from your space").
  Lost phone: join from the new phone with the code, remove the old entry in Settings.
- **Leave space** (Settings): this phone leaves, the others keep everything. When the last person leaves, the space
  with its pages, goals and photo files is deleted (the app deletes the photo files first).
- **Appearance** (Settings, per phone): System / Light / Dark, `src/lib/use-theme.ts` (`useColors`, `useScheme`).
- **Home**: "Day N" counter, space name above "together since …", 7-column dot grid, month labels,
  today in orange, 3 future weeks as outlines. Light (cream) and dark follow the phone.
- **Day page** (tap any dot): a white page with the **same logical size (360 x 580) on every device**,
  scaled to fit the screen (max 1.5x). Items: text, stickers, washi tape, photos (polaroid), to-do,
  focus, mood, goal chips. Drag (divided by the page scale), pinch-resize, twist-rotate, recolour,
  bring to front, delete. Double-tap text / to-do / focus / goal to edit. Other phone's changes live.
  Items saved before 2026-10-11 keep their old pixel positions and can look shifted.
- **Stickers**: the sticker sheet (a plain overlay, not a `Modal`) has tabs **Stickers / GIFs / Emoji**.
  Stickers and GIFs come from the **KLIPY** library (search + trending, endless scroll). Emoji tab is
  the old built-in set. **Own GIFs and pictures** are added as photos (photo button).
- **Photos**: private Supabase bucket `photos` (`<space_id>/<item_id>.<ext>`), short-lived signed links.
  Deleting a photo item deletes the file. GIF is allowed after migration 003.
- **Goals**: create a goal (also during space setup); on a day page type `/goal car +50`. Totals come
  from the chips. Goals sync between phones.
- **Settings**: default colour (per phone), start date (shared), space name, pairing code + "Make a new
  code", people list (remove, rename yourself).
- **Offline**: opens from a local copy. Changes made offline are **kept and sent later** (see below).

Local cache keys: `ourlife.day.<n>`, `ourlife.base.<n>`, `ourlife.goals`, `ourlife.goals.pending`,
`ourlife.settings`, `ourlife.space`. Without `.env` the app falls back to local-only mode (no pairing).

## SQL to run (Supabase SQL editor, Moritz runs it)

| File | State |
| --- | --- |
| `supabase/schema.sql` | full schema for a fresh project (already includes everything below) |
| `supabase/migration-002-members.sql` | names, 20 members, `remove_member`, `rotate_pair_code`: **run by Moritz on 2026-10-11** |
| `supabase/migration-003-gif-photos.sql` | allows `image/gif` in the photo bucket: **run by Moritz on 2026-10-11** |
| `supabase/verify-live.sql` | read-only check of the live database (40 lines, every `ok` must be `true`); run it in the SQL editor after every migration |
| `supabase/migration-004-hardening.sql` | rate limiter, size caps, `remove_member` returns a new code, `leave_space()`, input checks, narrower rights, storage policies `to authenticated`: **run by Moritz on 2026-10-11**; the app code expects it (remove / leave need it) |

## How it is wired (Supabase)

- Project URL and publishable key are in `.env` (git-ignored) and in the GitHub Actions
  *variables* `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (public by design).
  No service_role key anywhere.
- Dashboard settings that must stay as they are (Authentication > Sign In / Providers):
  **Allow new users to sign up: ON**, **Anonymous sign-ins: ON**, **Email provider: OFF**.
  Check without creating accounts: `curl <URL>/auth/v1/settings -H "apikey: <key>"`,
  `external` must only list `anonymous_users`.
- Code: `src/lib/supabase.ts` (client), `src/features/space/` (sign-in, pairing, `create-space-form`,
  `space-section` for Settings, `space-api`, `space-store`), `src/features/canvas/day-cloud.ts` +
  `photo-cloud.ts`, `src/features/goals/goals-cloud.ts`, `src/features/sync/`.
- Day items store their stacking order as `z` inside the jsonb `data`.
- **Sync model (changed 2026-10-11)**: each phone remembers per day what the cloud had at the last sync
  (`day-merge.ts`, key `ourlife.base.<n>`). On every pull, this phone's unsent changes (changed, added,
  removed items) are put on top of the newest cloud copy item by item, then pushed. Same item changed
  on both phones: the phone that was offline wins. A day first opened offline treats everything on it
  as new. A day without a saved base (older app version) is simply overwritten by the cloud copy.
  Failed pushes retry every 15 s and on app focus / realtime events.
  Goals: failed adds / deletes are queued in `ourlife.goals.pending` and sent on the next load.
- `forgetSpace` / `clearLocalData` (leaving or being removed) also clear the base and pending keys.

## Rate limiter and caps (migration 004)

Meant so that normal use is never noticed and abuse is slow. Counted per person in `public.rate_events`
(`rate_check`, only callable from inside the database functions):

| What | Per minute | Per hour |
| --- | --- | --- |
| item writes (insert + update count) | 300 | 3000 |
| goal writes | 30 | 300 |
| photo uploads | 10 | 60 |
| create a space (per person / all people together) | 2 / 10 | 5 / 60 |
| join attempts (code guessing) | 10 | 30 |
| remove, new code, leave | 10 | 60 |

Caps per space: 5000 items, 200 goals, 400 photos, 20 people. Hitting a limit gives "Too many requests …"; the app
keeps the change on the phone and retries (15 s), so a normal user just sees a delay. An upsert of an existing row
counts twice (insert and update trigger), which is fine for normal use. Anonymous sign-ups themselves are not
limited by the database: for that keep Supabase's Authentication rate limits low and consider CAPTCHA before TestFlight.
**Tested** with a local Postgres (PGlite) against the full `schema.sql`: 48 scenarios (join / wrong code, removal and
rejoin, leave, every limit and cap, rights, anon access, second run of the migration). The 48-scenario script was
only in the session scratchpad and is gone; `supabase/verify-live.sql` is kept in the repo.

## KLIPY (sticker + GIF library)

- Successor of Tenor (Tenor's API was shut down 2026-06-30). Docs: https://docs.klipy.com
- Key: `EXPO_PUBLIC_KLIPY_KEY` in `.env` (git-ignored) and, for the Pages build, a GitHub Actions
  *variable* of the same name (the workflow already passes it; **Moritz still has to create the variable**).
  It is a free **test key: 100 requests per hour** for the whole app. For more people: request
  Production access in https://partner.klipy.com. Without a key the library tabs are hidden.
- Code: `src/features/canvas/klipy.ts` (API, parsing, `isKlipyUrl`), `use-library.ts` (debounced
  search 500 ms, paging, trending cache), `library-grid.tsx`, `sticker-sheet.tsx`.
- **KLIPY rules we follow**: search placeholder "Search KLIPY", "Powered by KLIPY" mark (text for now,
  official logo is in a Google Drive folder linked from docs.klipy.com/attribution), media loaded
  directly from KLIPY URLs, URLs stored unchanged, no copying or re-hosting, results shown in the order
  returned, KLIPY content in its own tabs. Items only render URLs starting with
  `https://static.klipy.com/`.
- A GIF on a page works only as long as KLIPY serves it; no internet means it is not shown.
- Parser checked with a sample response in the documented format and the live API (curl); the app
  screens were **not** checked on a phone yet.

## How to run it

- Dev server (also serves the web build), port 8082, never 8081:
  `REACT_NATIVE_PACKAGER_HOSTNAME=100.117.131.14 npx expo start --port 8082 --host lan`
  (restart it after changing `.env`)
- Phone (Expo Go, Tailscale on): `exp://100.117.131.14:8082`
- Web: http://localhost:8082
- Type check: `npx tsc --noEmit`. Lint: `npx expo lint`
- Web export test for Pages: `GH_PAGES_BASE_PATH=/OurLife npx expo export --platform web`

## What was checked

- **On Moritz's phone (2026-10-11, "looks good")**: setup form, members, removing, leave, offline, the library tabs,
  appearance, page size, toolbar. He did not report anything open afterwards.
- **By the builder**: type check (`npx tsc --noEmit`), the offline merge function (5 cases), the KLIPY parser (sample
  response in the documented format, live API with curl), the SQL against a local Postgres (PGlite, 48 scenarios, full
  `schema.sql` plus a second run of migration 004), the live database with the verify query (40 of 40 ok),
  a local web export and the GitHub Pages deploy (success).
- **Not checked**: the web version in a browser by a person after the deploy; the app with three or more people;
  Android; screen readers (VoiceOver) on the new screens.

## What is next

Ideas from Moritz (2026-10-11), not started:

1. **Skins (themes) for the day list.** Several base designs for the Home screen, picked in Settings: the simple one
   as today, playful / floral, retro, anime, and more later. A skin changes the background, the dots (shape, colours,
   today marker), the fonts and the colours; it should not change how a day page works. Notes for when it is built:
   - Make the look data, not code: one skin = a small object (colours for light and dark, dot style, font names,
     background) next to `src/constants/theme.ts`; screens read it through `useColors()` / a new `useSkin()`
     (see `src/lib/use-theme.ts`, which already hides light / dark / system).
   - **Decided: a skin is per phone** (like Appearance), stored in `ourlife.settings`; the other phone's skin does not
     affect yours. Which look comes first is still open.
   - Art and fonts must be original or properly licensed: nothing from `design-refs/`, and for "anime" no characters
     or copied styles of existing series; draw the look with shapes, gradients and free fonts (check each licence).
   - Fonts come from `@expo-google-fonts/*` (Caveat is the only one loaded now); check load time on the web build.
   - Keep dark mode working for every skin and keep touch targets and contrast (accessibility rules).
2. **Long-press a day on the Home grid for a quick look.** Instead of opening the day, a long press shows a short
   preview of that day's page on top of the Home screen (no navigation); letting go closes it, a normal tap still
   opens the day. Notes for when it is built:
   - The preview is the same page, read-only, scaled down (reuse the 360 x 580 logical page and its scale logic in
     `day-canvas.tsx`; items come from the local copy `ourlife.day.<n>`, optionally refreshed from the cloud).
   - Empty days show a short "nothing here yet" instead of a blank page. Photos and library stickers load as usual.
   - **Decided: look only.** Letting go closes the preview; a short tap on the day opens it, as today. No jump button.
   - Needs a long-press handler on the dots in `src/components/day-grid.tsx` (check it does not clash with scrolling),
     an accessibility action ("Show preview") and a haptic tick.

Older items:

3. **Offline gaps**: a start date changed while offline is not sent later (cloud wins at next start);
   a photo added offline is not uploaded later (the item keeps a local file path).
4. **Anonymous sign-up spam**: keep Supabase's Authentication rate limits low (dashboard) and consider CAPTCHA before
   TestFlight; the database limiter (migration 004) cannot stop account creation itself.
5. **KLIPY logo** instead of the text mark "Powered by KLIPY"; Production key when more people use the app.
6. **Handwriting fonts**: only Caveat so far; the refs use several journal fonts (fits together with skins).
7. **Throwback books**, reminders, export / full account deletion (see PRD section 4).
8. **Smaller dots** option for the grid (fits together with skins).
9. **Native iOS build / EAS** (TestFlight) when the friends MVP starts. Not configured yet.
   Needs the KLIPY Production key, `expo-secure-store` for the session token, and an own-phone test.
10. Housekeeping: `expo lint` reports 4 `set-state-in-effect` errors (see below); `eslint` 9 and `uuid` 7 show
    deprecation warnings in `npm ci`.
11. Tests: none yet. Add only if Moritz asks.

## Known small things

- `.gitignore`: the `!.env.example` exception was glued to the expo-cli comment line and never worked;
  fixed on 2026-10-11, `.env.example` is tracked now (it holds only empty values).
- The first `npx expo lint` run on 2026-10-11 added `eslint` + `eslint-config-expo` to `package.json`
  and created `eslint.config.js`. Kept (AGENTS.md asks for lint).
- `expo lint` reports 4 errors, all `react-hooks/set-state-in-effect` ("load in an effect"):
  `photo-cloud.ts`, `use-day-items.ts` (both older) and `space-section.tsx`, `use-library.ts` (new,
  same pattern as the older code). The app works with them.
- Realtime delete events are not filtered by space (Supabase limitation), so another user could
  learn the ids of deleted rows, never their content.
- Realtime does not cover `space_members`: a removed phone notices at its next app start, not live.
- Goal totals and the goal list refresh when the screen is focused / on goal changes, not on every
  day-item change from the other phone.
- A start date changed on the other phone shows up after the next app start.
- The session token is stored in AsyncStorage on native (not secure-store). Revisit before TestFlight.
- "Delete goal" has no "are you sure?" step.
- A screen left open past midnight keeps showing yesterday's day number until reopened.
- Selecting an item by tap waits about half a second (it waits to see if you double-tap).
- Gesture code writes `.value` directly; if the React Compiler ever complains, switch to `.get()` / `.set()`.
- Screen-reader users get select / edit / delete actions on items, but no way to move or resize yet.
- Android: a picked animated GIF only stays animated with picker `quality: 1` (iPhone keeps it as is).

## Open questions for Moritz

1. Skins: which look first (playful / floral, retro, anime)?
2. When does the iOS / TestFlight build start?

## Decisions already made

English only; public repo is fine; everything is shared and freely editable, no
author tracking (colours tell who wrote what); goals driven by typed commands;
milestone countdown on Home removed (it did not feel cosy); anonymous sign-in, no email accounts;
joined with a long random code. **2026-10-11:** every member is an admin (can remove people and make
a new code), member limit 20 instead of 2; space has a name and members have names; the page has a
fixed logical size; skins (later) are per phone; the long-press preview (later) is look-only; no own sticker collection (own GIFs and pictures go in as photos), the big
library is KLIPY.

## Things to know

- `design-refs/` and `.env*` are git-ignored (except `.env.example`). Never commit them.
- No service_role key anywhere. Only the anon/publishable key (and the public KLIPY key).
- Supabase test data: delete with `delete from public.spaces;` and
  `delete from auth.users where is_anonymous;` in the SQL editor (only before real use).
- Dates are calendar days (UTC math on the local date), day 1 = the start date.
- New screens must be in `src/app/_layout.tsx` for titles; typed routes regenerate
  while the dev server runs.
- Reviews done on 2026-10-06 (security-reviewer on the schema, react-reviewer on `src/`).
  Everything added since (Supabase sync 2026-10-09, members / offline / library 2026-10-11) has not
  been reviewed separately.
