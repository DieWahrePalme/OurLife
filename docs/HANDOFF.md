# OurLife: handoff

Last updated: 2026-10-12 (end of the day). Written by the builder session.

**Start here next time:** read "What works today", "What is next" and "Not checked on a phone yet" below.
Moritz decides what comes next; ideas he gave but that are not built yet are at the top of "What is next".

Repo: https://github.com/DieWahrePalme/OurLife (public, remote `origin` via SSH).
Live web version: https://diewahrepalme.github.io/OurLife/ (GitHub Pages, rebuilt on every push to `main`).

**State: everything is committed and pushed (last code commit `4177a4e`, skins + paste sticker). The Pages deploy of that
commit was still running when this was written, check `gh run list --limit 1`.** The database has migrations 002, 003 and
004 (checked with the verify query, 40 of 40 ok). No new SQL since then.

**Checked on phones (2026-10-12, Moritz):** the skins look good, the paste-sticker button works, and the app now also loads on
his girlfriend's phone. Still open from the skin review: pattern strength / more skins (see "What is next").

## Session 2026-10-15 (day page overhaul, **not committed, not checked on a phone yet**)

Moritz's report (4 screenshots, day 366 to 369): photos are not shared between the two phones, pictures are blurry, text
boxes cannot be resized without the letters changing size, the last letter of notes and bubbles is cut off ("unproduktiv",
"Stressed"), stacked items grab the wrong one, wish for a lock and a nicer, easier day page.

- **Photo sharing**: the upload read the file with `fetch(file://).blob()`, which is unreliable in Expo Go on iOS. Now the bytes
  come from `expo-file-system` (`File.arrayBuffer()`) and the type from the file extension (`photo-cloud.ts`). Adding a photo
  only puts it on the page; **one** path (`use-photo-resync.ts`) uploads it, retries every 15 s and returns `{ sharing, failure }`.
  The status line under the page shows "Sharing photo…" or "Photo not shared yet, trying again (<real reason>)". **If it still
  fails on the phone, the reason in that line is the next clue.** A photo whose file only exists on the other phone shows a
  "Photo not shared yet" placeholder instead of a white box. Photos added before this fix that exist only on one phone are
  uploaded when that phone opens the day (their files must still be on it).
- **Sharper pictures**: new dependency `expo-image-manipulator`. Photos are re-encoded once (long edge 1600 px, JPEG 0.85, PNG
  stays PNG, GIF untouched). Items are no longer stretched with a transform: everything is drawn at its real size
  (`item-content.tsx` `makeStyles(zoom)`), so text and pictures stay sharp when enlarged. `item.scale` still means the same, old
  pages keep their positions (`canvas-item.tsx` `shiftX/shiftY`).
- **Text boxes**: selected text / focus / to-do get a blue side handle (changes the width, letters keep their size, text wraps
  again; new item field `width`) and every item gets a round corner handle (resize, top-left corner stays). Pinch and twist still work.
- **Cut-off letters**: handwriting text, mood and goal bubbles now have room for the last glyph (`GLYPH_ROOM`).
  Text starts inside the page (it used to start so far right that long notes ran out of the page).
- **Lock** (shared with the other phone, item field `locked`): toolbar button "Lock". A locked item ignores touches completely
  (items under and over it can be moved freely); a small padlock on it unlocks with one tap.
- **Toolbar when an item is selected**: Color (opens the colour row), Edit (text, to-do, focus, goal), Lock, Copy (not for
  photos or pasted stickers, they own a file), Front, Back, Delete.
- Other phone's moves now show live (the animated values follow the saved item, `use-item-motion.ts`; before, only a reopen did).
- The status / error line no longer pushes the page up over the date.
- Not done yet, ideas: page backgrounds (lined, dotted), snapping guides, text alignment / font choice, photo frame choice,
  multi-select, undo for moves.
- Checked in the browser (Playwright, local mode, no cloud): add text, width handle, corner handle, lock (a locked item does not move),
  colour row, mood bubble. **Not checkable there:** the real upload, blur on iOS, gestures with fingers. Please test on the phone:
  add a photo on one phone, open the day on the other; enlarge a photo and a note; lock a photo and drag a sticker over it.

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
- **Skins** (Settings > Look, per phone, key `skin` in `ourlife.settings`): Original (follows light / dark), **Scrapbook**
  (mint paper, pink flowers, Kalam font) and **Luxury** (near-black, gold lattice, Cormorant Garamond). A skin is data in
  `src/constants/skins.ts` (palette + `pattern` + `fontDisplay` + `followsAppearance`); `useSkin()` / `useColors()` in
  `src/lib/use-theme.ts`; backdrop drawn by `src/components/skin-background.tsx` (react-native-svg patterns, original shapes);
  `SkinFrame` + a transparent `ThemeProvider` in `src/app/_layout.tsx` so the pattern shows through the stack. Scrapbook and
  Luxury have fixed colours (the Light / Dark choice is hidden with a hint). Titles use `colors.fontDisplay`; **notes on the
  day page stay Caveat in every skin** and the page itself (`colors.sheet`) stays light so pen colours stay readable.
  Contrast of all palettes was computed (4.5:1 text, 3:1 graphics). Add a skin = one object in `skins.ts` + a preview
  in `skin-picker.tsx`; load its font in `_layout.tsx`.
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
- **Paste a sticker** (sticker sheet, button "Paste from clipboard"): takes the image on the clipboard (on iOS: long-press a
  subject in Photos > Copy, a transparent PNG), saves it in the app folder (`photos.ts` `pasteClipboardImage`, package
  `expo-clipboard`), shows it as a frameless `sticker` item and uploads it like a photo (content `storage:<path>`).
  Rendering is `PastedSticker` in `item-content.tsx`; resync and delete treat it like a photo.
- **Day grid** (since 2026-10-12): filled days are solid dots, a small inner dot shows the mood colour, empty past days are a
  soft tinted disc, future days a thin ring, milestones show "100" / "1y" (calendar anniversaries, so 12.10. = day 366,
  `src/lib/milestones.ts`), a "Today" button jumps to today. Summaries come from `day-summary*.ts` (local + cloud).
- **Day page extras**: icon toolbar (raised by `BAR_LIFT`), prev / next day arrows, an empty-page hint, **Undo after delete**
  (6 s bar, the photo file is only deleted after the window; `use-undo-delete.ts`, `undo-bar.tsx`).
- **Photos**: private Supabase bucket `photos` (`<space_id>/<item_id>.<ext>`), short-lived signed links.
  Deleting a photo item deletes the file. GIF is allowed after migration 003.
  **Self-healing (2026-10-12):** a photo or pasted sticker that only exists as a local file (upload failed, phone offline) is
  uploaded again when the day page opens (`use-photo-resync.ts`); "already exists" from storage counts as success.
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

**New items from Moritz, 2026-10-12 (via the boss session). Not started; ask Moritz which one first. Suggested order: A, A2 (both bugs), then B.**

A. **Bug: the goals page is hard to use with more than 3 goals.** (Not reproduced on a phone yet; cause below is from reading the code.)
   - Findings in `src/app/goals/index.tsx` and `src/features/goals/new-goal-form.tsx`: the "New goal" form sits at the *bottom* of
     one `ScrollView` under the list of goal cards. With 1 to 3 goals it is still on screen; with 4 or more it is below the fold.
     The `ScrollView` has no keyboard handling at all (no `KeyboardAvoidingView`, no `automaticallyAdjustKeyboardInsets`, no
     `keyboardShouldPersistTaps="handled"`). Likely effect on the iPhone: the keyboard covers the lower fields and the "Create
     goal" button, the decimal keyboard for the target has no Return key, and the first tap on the button only closes the keyboard.
     There is no "edit goal" form at all (`src/app/goals/[id].tsx` only shows progress), so "edit" in the report probably means
     adding.
   - To confirm before fixing: add 4+ goals in Expo Go, tap the name field, and note what is covered. The web build cannot show
     the keyboard problem (no on-screen keyboard), so it needs the phone.
   - Proposed fix: open "New goal" as a sheet (a plain overlay like the sticker sheet, with `KeyboardAvoidingView`) from a "+"
     button at the top of the list, so the list can grow without limit; set `keyboardShouldPersistTaps="handled"` and
     `automaticallyAdjustKeyboardInsets` on the scroll view. Fits the planned goals-page polish (item 1b).
A2. **Bug report: text is cut off on the day page of day 366 (the 1-year milestone).** Suggested right after A.
   - **Not reproduced on the web build** (checked 2026-10-12 with Playwright at 390 px and 320 px wide, Original and Scrapbook skins,
     day 366, 100 and 12, with a long text item): the title "Day 366", the date line and a long note all fit and wrap normally.
   - **Day 366 is not special on the day page by code:** the milestone logic (`src/lib/milestones.ts`) is only used on Home
     (`index.tsx`, `day-grid.tsx`, `day-dot.tsx`); `src/app/day/[n].tsx` and `day-canvas.tsx` treat every day number the same.
     The only clipping on the page is `overflow: 'hidden'` on the 360 x 580 page (`day-canvas.tsx`): an item placed or dragged
     partly outside the page is cut off, and text has `maxWidth: 260` (`item-content.tsx`).
   - **Needs from Moritz:** a screenshot (or where exactly: the "Day 366" title, the date, a note, or something on the Home dot
     "1y"?) and whether it is Expo Go on the iPhone. Open guesses to test on the phone: Caveat title glyphs clipped by the
     line height on iOS (an earlier "clipped title font" fix exists, History step 4), the "1y" text inside the Home dot (large
     milestone dot, `day-dot.tsx`), or a note that sits near the page edge and is cut by the page's `overflow: 'hidden'`.
B. **Lock items on the day page with a padlock.** A locked item cannot be moved, resized, rotated, edited or deleted by accident.
   One lock / unlock toggle per item (item toolbar), a small padlock on the item while locked, unlock with one tap.
   Decisions to make with Moritz:
   - Is the lock shared with the other phone? Probably yes, stored in the item data (`locked`), since the page is shared; may
     the other person unlock it?
   - Can a locked item still be selected, to reach the unlock button? (Probably yes: tap selects, the toolbar shows only Unlock.)
   - Does a locked item stay where it is in the stacking order when other items are dragged over it, or always stay behind / in front?
   - Needs: a `locked` field in `types.ts` and the sync merge in `day-merge.ts`; gestures in `canvas-item.tsx` ignore a locked item;
     the toolbar hides move / delete actions; the delete and undo paths respect it.

1. **Skins: more looks?** Moritz said the three skins are good and paste works (2026-10-12). Possible additions: more skins he may want: retro, anime (original art only), a floral /
   romantic one, a light luxury variant; real paper textures would need own or licensed images (references in `design-refs/`
   must not be copied, the gold Medusa / paisley motifs are brand material).
   Rules that stay: skins are per phone, change only background / colours / title font, never layout or logic.
1b. **Rest of the design pass** (from the 2026-10-12 review, not built): goals page (percentage on the bar, "+" for a new
   goal as a sheet, celebrate completed goals), haptics (`expo-haptics`), small motion (item pop-in, pulsing today dot,
   respect reduced motion).
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

3. **Offline gap**: a start date changed while offline is not sent later (cloud wins at next start). (Photos added offline are
   now uploaded when the day opens.)
4. **Anonymous sign-up spam**: keep Supabase's Authentication rate limits low (dashboard) and consider CAPTCHA before
   TestFlight; the database limiter (migration 004) cannot stop account creation itself.
5. **KLIPY logo** instead of the text mark "Powered by KLIPY"; Production key when more people use the app.
6. **Handwriting fonts**: notes are Caveat only; skins use Kalam / Cormorant for titles only.
7. **Throwback books**, reminders, export / full account deletion (see PRD section 4).
8. **Smaller dots** option for the grid.
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
- Lint is the same 4 `set-state-in-effect` errors, nothing new.
- **npm lock rule:** after any `npx expo install`, regenerate the lock with `npx --yes npm@10 install --package-lock-only` and check
  `npx --yes npm@10 ci --dry-run` and `npx --yes npm@11 ci --dry-run` (CI runs Node 24 with npm 10; an npm 11 lock broke it once).
- **Rendered checks without a phone:** web export with `.env` moved aside, `expo export --clear`, then Playwright with the local
  chrome-headless-shell; settings are injected through `localStorage['ourlife.settings']`. Scripts lived in the session scratchpad
  and are gone.
- Android: a picked animated GIF only stays animated with picker `quality: 1` (iPhone keeps it as is).

## Open questions for Moritz

1. Skins: keep these three, or add retro / anime / floral? Pattern strength OK?
2. When does the iOS / TestFlight build start? Note: **Expo Go with SDK 57 needs iOS 16.4+** (an iPhone X can reach 16.7);
   it loads on his girlfriend's phone now, so that was not the problem in the end.

## Decisions already made

English only; public repo is fine; everything is shared and freely editable, no
author tracking (colours tell who wrote what); goals driven by typed commands;
milestone countdown on Home removed (it did not feel cosy); anonymous sign-in, no email accounts;
joined with a long random code. **2026-10-11:** every member is an admin (can remove people and make
a new code), member limit 20 instead of 2; space has a name and members have names; the page has a
fixed logical size; skins are per phone; the long-press preview (later) is look-only; no own sticker collection (own GIFs and pictures go in as photos), the big
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
