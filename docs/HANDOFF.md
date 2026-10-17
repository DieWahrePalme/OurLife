# OurLife: handoff

Last updated: 2026-10-17. Written by the builder session.

**Start here next time:** read "State", "Phone checklist" and "What is next". Moritz decides what comes next.

Repo: https://github.com/DieWahrePalme/OurLife (public, remote `origin` via SSH).
Live web version: https://diewahrepalme.github.io/OurLife/ (GitHub Pages, rebuilt on every push to `main`).

## State

- Last commit on `main`: `96a9ac4` (zoomable day page). **Version 2.0.0 ("Our book") is built and checked but NOT committed**
  (about 62 changed / new files). Moritz must type the go himself; a message from the boss session is not his approval.
- Planned commits after the go, in this order: (1) lock file fix, (2) P2 fixes, (3) P3 canvas, (4) P4 book look, (5) P5 new-things
  note and tips, (6) P6 caption / drawing / templates, (7) docs + version 2.0.0. Each with the attribution lines of the session.
  Then push, `gh run list --limit 1` must be green, and the Pages site must show the new version.
- Checks before every commit: `npx tsc --noEmit`, `npm run lint` (0 problems; if a stale result shows old errors use
  `npx expo lint --no-cache`, the cache is `.expo/cache/eslint`), `npx expo export --platform web`, and `npm ci` in a clean temp copy.
- **Lock file rule:** CI (Node 24, `npm ci`) broke because the lock lacked the optional peers `@emnapi/core` and `@emnapi/runtime`.
  Fixed by regenerating with `npx npm@latest install --package-lock-only`. Do the same after every `npx expo install`, then check
  `npm ci --dry-run`.
- Database: migrations 002, 003 and 004 are applied (verify query 40 of 40 ok). **v2 needs no SQL and no migration.**
- Dev server: `exp://100.117.131.14:8082` (port 8082, never 8081).

## Version 2.0.0 ("Our book")

Built from the boss's review of `96a9ac4`. Hard rules that held: no SQL / schema change; stored items are never rewritten (new data is
only optional fields, old pen colours are mapped at render time by `penInk()`); a phone with version 1 must not delete or break
items with new fields or new kinds.

**Fixes (P2)**
- Darker pens (all >= 4.5:1 on white / cream / ivory); the paper is always light (`colors.sheet`).
- New items go to a free spot (`layout.ts findFreeSpot`) and pulse once. After a drag / resize / turn an item is pulled back so a
  third of it stays on the page (`keepOnPage`); saved items are never moved on load.
- Touches hit only the item (text: its own lines, native only; the web takes the whole box). Tapping the selected item again picks
  what lies under it. Deselecting is immediate. Delete is a red badge on the selected item.
- Home (book) button in the day header, "deleted on another phone" dialog (Add as new / Discard), hint on empty past days, Copy / Share
  for the pairing code, date picker for the start date, desktop column (max 560 px), zoom buttons and status line in a strip under the page.
- Line breaks are identical at 13 widths (checked in the browser). No native image drag on the web (`lib/web-fixes.ts`).

**Canvas (P3)**
- Two fingers act on the selected item anywhere (else they zoom the page); turn handle that snaps at right angles; items added while
  zoomed in are smaller (1 / zoom, minimum 0.4).
- Undo / redo per item (`history.ts`, groups for templates; the photo file of a deleted photo is removed when the page closes).
- Padlock only while selecting, shake and a note when a locked item is dragged. Labels Forward / Backward.
- Text: 3 fonts (Hand, Print = Lora, Marker) x 3 sizes + highlighter, paper-style dialog with live preview.
- Two moods split the day dot. Layout-zoom: items are laid out at `item.scale * renderScale`, so text and pictures stay sharp;
  handles are counter-scaled.

**Book look (P4)**
- Home is a book cover per skin (`book-cover.tsx`, `Edition` in `constants/skins.ts`: linen / kraft / album, foil, paper grain) with a
  switch **Pages | Dots** (`view-toggle.tsx`, setting `homeView`). Pages = little pages (`page-grid.tsx`, `mini-page.tsx`; data from
  `day-summary.ts`: geometry and kind only, never the words; cloud reads in pages of 1000 rows). Dots = the old grid.
- The day page is paper (`paper.tsx`: grain, page number, stack edge). Turn pages with the arrows or a sideways swipe (two sideways
  "slots" in `app/day/[n].tsx`; the new page waits off-screen until it has drawn itself; Reduce Motion = no slide). The native
  back-swipe is off on the day screen; Home button and Back instead.
- Toolbar is a pencil case (`toolbar.tsx`: tray, stitching, washi rolls with 5 prints in `tape-art.tsx`, pens in `pen-swatch.tsx`).
- Share page as picture (`share-page.ts`: `react-native-view-shot` + `expo-sharing`, both in Expo Go SDK 57; web downloads a PNG).

**New things and tips (P5)**
- `seen-store.ts` (`ourlife.seen`, `ourlife.mine`): a yellow note on Home "N new things on Day X" and a small mark on the pages / dots.
  The first start only sets the starting point. Local only, no author, no DB change.
- Tips on the first page, shown once (`first-page-tips.tsx`, `tips-store.ts`, key `ourlife.tips`).

**Caption, drawing, templates (P6)**
- Photo caption (optional `caption`, max 60 characters; double tap or Edit).
- Drawing with a finger: new kind `drawing`, strokes as short paths in `content`. One item per drawing, capped at 11 000 characters
  (`MAX_DRAWING_CHARS`) because the database limits an item to 20 KB; a long drawing continues as a new one.
- Four page templates (`templates.ts`, button on an empty page).

**New dependencies:** `expo-image-manipulator`, `@react-native-community/datetimepicker`, `expo-sharing`, `react-native-view-shot`,
`@expo-google-fonts/lora`, `@expo-google-fonts/permanent-marker`.

**Old phones (version 1) with new data**, proved with v1's real code (`git show 96a9ac4`) against sample rows: a v1 phone ignores a
`drawing` row, never sends a delete for it (`pushDay` removes only ids from its own snapshot), and keeps the new optional fields when
it edits that item. Side effect: v1 renumbers `z` of the items it knows, so rows above an unknown row get a smaller `z` (same order,
nothing lost). The proof script lived in the scratchpad and is gone.

**Checked in a browser only** (Playwright, local mode; sync with a temporary test space that was deleted afterwards): remote move shown
live, free spot, keep-on-page, lock shake, undo / redo, two-finger scaling with synthetic touch, rotate handle, zoom, text styles, tape,
drawing, caption, templates, tips, new-things note, page turn (arrows, mouse swipe), 3 skins in light and dark, widths 320 / 375 / 393 / 1440.
**Not tested:** real fingers on an iPhone, per-line text hit areas (`onTextLayout`, native only), fonts on iOS, the share sheet, the native
date picker, the page swipe against the iOS edge gesture, the new-things note and the "deleted elsewhere" dialog with two real phones.

## Phone checklist for Moritz

1. Pinch with two fingers far away from a selected item: it grows. With nothing selected the page zooms.
2. Turn handle above a selected item (snaps at right angles).
3. Swipe sideways on the page background, and the arrows, to turn the page.
4. Undo / redo buttons under the page.
5. Sharpness after zooming in.
6. Light, dark and the three skins (Settings > Look).
7. Home: Pages | Dots, the little pages, the cover.
8. The yellow "new things" note: change something on one phone, open Home on the other.
9. Add a photo on one phone, open the day on the other (the status line under the page says what is happening; if it fails, the
   reason is shown there).
10. Caption, template, drawing, share page.

## Earlier work (2026-10-15, part of `96a9ac4` and `4db9ff8`)

- **Photo sharing fix:** the upload read the file with `fetch(file://).blob()`, unreliable in Expo Go on iOS. Now bytes come from
  `expo-file-system` (`File.arrayBuffer()`), the type from the extension (`photo-cloud.ts`). One path (`use-photo-resync.ts`) uploads,
  retries every 15 s and returns `{ sharing, failure }`. Photos that only exist on one phone are uploaded when that phone opens the day.
- **Sharper pictures:** photos are re-encoded once (long edge 1600 px, JPEG 0.85, PNG stays PNG, GIF untouched).
- **Text width:** a side handle changes the width without changing letter size (item field `width`). Glyph room fixes cut-off last letters.
- **Lock** (item field `locked`, shared between phones). A locked item ignores touches completely.
- **Zoom like a drawing program** (`use-canvas-view.ts`): pinch, double tap, wheel on the web, buttons, up to 8x; the page keeps its
  logical size 360 x 580. 9 moods.

## What works today (besides v2)

Runs in Expo Go, in a browser and on GitHub Pages. Phones share one space and sync live.

- **Space setup** (first phone): space name, own name, start date, optional goals; 24-character code. Managed in Settings.
- **Joining**: code plus own name. Up to **20 people**; every member is an admin (remove people, make a new code). Removing someone
  makes a new code. A removed phone lands on the pairing screen at its next start. Lost phone: join from the new one, remove the old entry.
- **Leave space**: this phone leaves; when the last person leaves, the space with pages, goals and photo files is deleted.
- **Appearance** (per phone): System / Light / Dark (`src/lib/use-theme.ts`).
- **Skins** (Settings > Look, per phone): Original, Scrapbook, Luxury. A skin is data in `src/constants/skins.ts` (palette, pattern,
  title font, `Edition` cover); backdrop in `skin-background.tsx`. Notes on the page stay Caveat (or the chosen text font) and the page
  stays light.
- **Stickers**: tabs Stickers / GIFs / Emoji (KLIPY library), paste a cut-out subject from the clipboard, own pictures as photos.
- **Day grid**: filled days solid, mood colour inside, milestones "100" / "1y" (calendar anniversaries), Today button.
- **Photos**: private bucket `photos` (`<space_id>/<item_id>.<ext>`), short-lived signed links, self-healing upload.
- **Goals**: create a goal, type `/goal car +50` on a day, totals from the chips, synced.
- **Settings**: colour per phone, shared start date, space name, pairing code, people.
- **Offline**: opens from a local copy; offline changes are kept and sent later.

Local cache keys: `ourlife.day.<n>`, `ourlife.base.<n>`, `ourlife.goals`, `ourlife.goals.pending`, `ourlife.settings`,
`ourlife.space`, `ourlife.seen`, `ourlife.mine`, `ourlife.tips`. Without `.env` the app runs in local-only mode (no pairing).

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

- **On Moritz's phone (2026-10-11 / 12):** setup, members, removing, leave, offline, library tabs, appearance, page size, toolbar,
  skins, paste sticker. Version 1 of the day page overhaul (`4db9ff8`, `96a9ac4`): Moritz said it looks much better.
- **By the builder:** type check, lint (0 problems), web export, clean `npm ci`, the offline merge function, the KLIPY parser, the SQL
  against a local Postgres (48 scenarios), the live database (40 of 40 ok), the v1-compatibility proof and the browser tests of v2 above.
- **Not checked:** version 2 on a real phone, three or more people, Android, VoiceOver on the new screens.

## What is next

Parked by Moritz (not built):
1. **A partner deletes an item while you work:** for now it just stays deleted (a notice / history comes later). The dialog
   "deleted on another phone" only appears when you are editing that item.
2. **Goals page:** the "New goal" form sits under the list (below the fold with 4+ goals, no keyboard handling); proposal: a sheet
   from a "+" button with `KeyboardAvoidingView`, `keyboardShouldPersistTaps="handled"`. Small tap targets for the Settings / Goals links.
3. Default sizes of new items (text looks small on a 320 px phone), a "partner changed something" hint beyond new items, a
   "changes not sent yet" hint.
4. More skins (retro, anime with original art, floral), rest of the design pass (haptics, small motion, goal celebration).
5. Long-press a day on Home for a quick look (look only, no jump).
6. Copy / share of a page beyond the picture, page backgrounds, snapping guides, multi-select.

Older items: an offline start-date change is not sent later; anonymous sign-up spam (keep Supabase rate limits low, consider CAPTCHA
before TestFlight); KLIPY logo and a Production key; throwback books, reminders, export / account deletion (PRD section 4); smaller
dots option; native iOS build / EAS / TestFlight (needs `expo-secure-store` for the session token); tests only if Moritz asks.

## Known small things

- Realtime delete events are not filtered by space (Supabase limitation): another user could learn ids of deleted rows, never content.
- Realtime does not cover `space_members`: a removed phone notices at its next start.
- A start date changed on the other phone shows up after the next app start.
- The session token is in AsyncStorage on native (not secure-store). Revisit before TestFlight.
- "Delete goal" has no "are you sure?" step. A screen left open past midnight keeps yesterday's number.
- Screen-reader users get select / edit / delete on items but no way to move or resize.
- Gesture code writes `.value` directly; files that do this carry an `eslint-disable react-hooks/immutability` with a reason.
- Text hit areas per line need `onTextLayout`: phone yes, web whole box.
- A v1 phone renumbers `z` (see above). Android: an animated GIF only stays animated with picker `quality: 1`.
- Rendered checks without a phone: web export with `.env` moved aside, then Playwright (`playwright-cli`) against a local server with
  empty `EXPO_PUBLIC_SUPABASE_*`; settings can be injected through `localStorage['ourlife.settings']`. Scripts are not kept.

## Open questions for Moritz

1. Commit and push version 2.0.0 (the go).
2. After the phone check: what felt wrong or slow? Which parked item first?
3. When does the iOS / TestFlight build start? (Expo Go with SDK 57 needs iOS 16.4+.)

## Decisions already made

English only; public repo is fine; everything is shared and freely editable, no author tracking; goals via typed commands; no milestone
countdown on Home; anonymous sign-in, no email; joining by a long random code; every member is an admin, up to 20 people; the page has a
fixed logical size; skins are per phone; the long-press preview is look-only; no own sticker collection (own GIFs and pictures go in as
photos, the library is KLIPY); a partner-deleted item just stays deleted for now; nine moods.

## Things to know

- `design-refs/` and `.env*` are git-ignored (except `.env.example`). Never commit them.
- No service_role key anywhere. Only the anon/publishable key (and the public KLIPY key).
- Supabase test data: `delete from public.spaces;` and `delete from auth.users where is_anonymous;` (only before real use).
- Dates are calendar days (UTC math on the local date), day 1 = the start date.
- New screens must be registered in `src/app/_layout.tsx`; typed routes regenerate while the dev server runs.
- Reviews: security-reviewer on the schema and react-reviewer on `src/` were done on 2026-10-06; later work was not reviewed separately.
