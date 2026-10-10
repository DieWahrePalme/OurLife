# OurLife: handoff

Last updated: 2026-10-11. Written by the builder session.

Repo: https://github.com/DieWahrePalme/OurLife (public, remote `origin` via SSH).
Live web version: https://diewahrepalme.github.io/OurLife/ (GitHub Pages, rebuilt on every push to `main`).

**The work of 2026-10-11 is committed locally (not pushed yet; pushing to `main` rebuilds the web version).**
It changes the database too: see "SQL to run" below.

## What works today

Runs in Expo Go, in a browser and on GitHub Pages. Phones share one space and sync live.

- **Space setup** (first phone): name of the space (e.g. "Momo & Bibble"), your own name, start date,
  optional goals. Gets a 24-character code. Name, code and people are managed in Settings.
- **Joining**: enter the code and your own name. Up to **20 people** per space (DB cap, was 2).
- **Everyone is an admin**: any member can remove any other member (not themself) and can make a
  **new code** (the old one stops working; people already in stay). A removed phone lands on the
  pairing screen at its next app start ("You were removed from your space").
  Lost phone: join from the new phone with the code, remove the old entry in Settings.
  If the old phone could be in wrong hands, also make a new code.
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
| `supabase/migration-003-gif-photos.sql` | allows `image/gif` in the photo bucket: **prepared, ask Moritz whether it was run** (own GIFs fail without it) |

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

## Not checked on a phone yet

Written and type-checked, but not tried on a real device: the new setup form with goals, removing a
member and the "removed" screen, new code, the offline merge, the library tabs (search, scroll, placing
a GIF), uploading an own GIF. The offline test: airplane mode, edit a day, app closed, airplane mode
off, reopen; the edits must still be there and show on the other phone.
The merge function itself was tested with five cases (local edit / delete / add, remote edit / delete / add).

## What is next

1. **Test the above on the phones**, then commit (Moritz asks for it).
2. **Security review of migration 002** (`remove_member`, `rotate_pair_code`, `create_space`,
   `join_space`, 20-member cap) and of the sync code. Not done: reviews on file are only from
   2026-10-06 (old schema, `src/`).
3. **GitHub variable** `EXPO_PUBLIC_KLIPY_KEY` for the Pages build; KLIPY logo instead of the text mark.
4. **Offline gaps**: a start date changed while offline is not sent later (cloud wins at next start);
   a photo added offline is not uploaded later (the item keeps a local file path).
5. **Handwriting fonts**: only Caveat so far; the refs use several journal fonts.
6. **Throwback books**, reminders, export (see PRD section 4).
7. **Smaller dots** option for the grid. Moritz has not asked again.
8. **Native iOS build / EAS** (TestFlight) when the friends MVP starts. Not configured yet.
   Needs the KLIPY Production key, `expo-secure-store` for the session token, and an own-phone test.
9. Tests: none yet. Add only if Moritz asks.

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

1. Was migration 003 (GIF in photos) run?
2. KLIPY Production key / logo: when more people than the two of them use the app.
3. When does the iOS / TestFlight build start?

## Decisions already made

English only; public repo is fine; everything is shared and freely editable, no
author tracking (colours tell who wrote what); goals driven by typed commands;
milestone countdown on Home removed (it did not feel cosy); anonymous sign-in, no email accounts;
joined with a long random code. **2026-10-11:** every member is an admin (can remove people and make
a new code), member limit 20 instead of 2; space has a name and members have names; the page has a
fixed logical size; no own sticker collection (own GIFs and pictures go in as photos), the big
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
