# OurLife

A shared "days together" journal. A grid of dots, one per day since the start date.
Tap a day to open a free-form page (text, stickers and GIFs, photos, drawings, to-dos, moods, goals).
The phones of a space (a couple, up to 20 people) share it and sync live. Built with
Expo (React Native) + TypeScript + Supabase.

UI is English only. Personal content never goes in this repo.

Repo: https://github.com/DieWahrePalme/OurLife (public)
Web version: https://diewahrepalme.github.io/OurLife/

## Status (2026-10-17)

Version **2.0.0 ("Our book")** is built and checked in a browser but **not committed yet** (waiting for Moritz's go). The last
commit on `main` is `96a9ac4`. Works on a phone (Expo Go), in a browser and on GitHub Pages. Phones join a space with a code and
share days, goals, the start date and photos, live. No SQL or migration is needed for version 2.

| Part | State |
| --- | --- |
| Home: book cover per skin, day counter, switch **Pages \| Dots** (little pages or dot grid) | v2, not on a phone yet |
| Day page: paper with page number and stack edge, turn pages by arrows or swipe | v2, not on a phone yet |
| Day page 360 x 580 on every device; zoom (pinch, double tap, wheel, buttons) up to 8x, sharp when zoomed | done |
| Items: text (3 fonts, 3 sizes, highlighter), sticker, washi tape rolls, photo with caption, to-do, focus, 9 moods, goal chips | done / v2 |
| Drawing with a finger, page templates, "share page as picture" | v2 |
| Move, resize, two-finger scale and turn, turn handle, padlock, copy, front / back, undo / redo | done / v2 |
| New items land on a free spot; items stay a third on the page | v2 |
| Yellow "N new things" note on Home, first-page tips | v2 |
| Goals: `/goal car +50`, goal pages, totals, progress | done |
| Space: setup, code, up to 20 people (all admins), leave, rate limits | done (migrations 002 to 004 applied) |
| Offline edits kept and sent later; live sync; photos in a private bucket | done |
| Sticker + GIF library (KLIPY), paste a cut-out sticker | done |
| Skins per phone: Original, Scrapbook, Luxury; light / dark | done |
| Web version on GitHub Pages (rebuilt on every push to `main`) | done |
| Partner-delete notice / history, goals form as a sheet, more skins | parked |
| Native iOS build (EAS / TestFlight) | not started |

Version 2 keeps old data safe: no stored item is rewritten, new data is only optional fields, and a phone with version 1 neither
deletes nor breaks items with new fields or the new `drawing` kind.

Start with `docs/HANDOFF.md` (state, phone checklist, next steps). Product description: `docs/PRD.md`.

## Run it

```bash
npm install
cp .env.example .env   # then fill in the Supabase URL, the publishable key and (optional) the KLIPY key
REACT_NATIVE_PACKAGER_HOSTNAME=100.117.131.14 npx expo start --port 8082 --host lan
```

- iPhone (Expo Go, Tailscale on): `exp://100.117.131.14:8082`
- Browser: http://localhost:8082
- Checks: `npx tsc --noEmit`, `npm run lint`, `npx expo export --platform web`
- After any `npx expo install`, regenerate the lock: `npx npm@latest install --package-lock-only` (CI uses `npm ci` on Node 24)
- Without `.env` the app runs in local-only mode (no pairing). Without a KLIPY key only the emoji stickers are offered.
- Restart the dev server after changing `.env`. Lint: `npx expo lint`.
- Port 8081 belongs to another project (DoYouKnow). Do not use it.

## How it is built

- `src/app/` screens (Expo Router): `index` (grid), `day/[n]`, `goals/`, `settings`.
- `src/features/canvas/` the day page: items and gestures (`canvas-item.tsx`, `use-two-finger.ts`), zoom (`use-canvas-view.ts`),
  `layout.ts` (geometry, free spot), `history.ts` (undo / redo), toolbar, text dialog, drawing, templates, per-day storage,
  `day-merge.ts` (offline merge), `klipy.ts` + `library-grid.tsx` (sticker / GIF library).
- `src/components/` Home: `book-cover.tsx`, `page-grid.tsx` + `mini-page.tsx`, `day-grid.tsx`, `new-things-note.tsx`.
- `src/features/goals/` goals store, `/goal` command parser, progress.
- `src/features/settings/` colour and start date.
- `src/features/space/` anonymous sign-in, create space / join with code, pairing screen,
  setup form, people / code section in Settings.
- `src/features/sync/` current space id, realtime subscription, stable JSON compare.
- `*-cloud.ts` files (canvas, goals) talk to Supabase; the stores keep a local copy as cache.
- `src/lib/supabase.ts` the Supabase client.
- `src/constants/strings.ts` all UI text in one place (so a German version is easy later).
- `src/constants/theme.ts` colours (cream light, dark) and constants.
- Local cache keys: `ourlife.day.<n>`, `ourlife.base.<n>`, `ourlife.goals`, `ourlife.goals.pending`,
  `ourlife.settings`, `ourlife.space`, `ourlife.seen`, `ourlife.mine`, `ourlife.tips`.
  Photos are copied into the app's `photos/` folder on the phone, then uploaded to Supabase Storage.
- Goal totals are computed from the goal chips on day pages, so deleting a chip updates the total.
- Day 1 is the start date itself; dates are calendar days, so there is no timezone drift.

## Safety rules

- **No secrets in git.** `.env*` is ignored (only `.env.example` is committed, and it is empty).
- **Never a `service_role` key** in the app or in EAS. Only the anon/publishable key
  (the KLIPY key is public by design too, but stays in `.env`, not in git).
- `design-refs/` (personal reference photos) is git-ignored. Never commit or upload it.
- No real photos or journal text in the repo. Personal content lives only in Supabase.
- Do not copy images from the reference photos. Use original or licensed assets
  (emoji are system emoji; the big library is KLIPY, linked, never copied: see `docs/HANDOFF.md`).
- The security of the cloud data rests on Row Level Security in
  `supabase/schema.sql`, not on hiding the anon key.
- Supabase Auth must keep **Email provider OFF** (only anonymous sign-ins), see `docs/HANDOFF.md`.
- Merging and pushing are Moritz's decisions.

## History (2026-10-05 to 12)

1. PRD written from voice messages; project kicked off by the "boss" session.
2. Expo skeleton + Supabase client packages; first commit.
3. Home screen: day counter and dot grid (7 per row), approved by Moritz.
4. Month labels, fixed a clipped title font, dark mode that follows the phone,
   removed the milestone countdown ("not cosy").
5. Day canvas: text, stickers, washi tape, with local saving.
6. Photos (polaroid), then to-do, focus and mood blocks.
7. Goals with `/goal` commands.
8. Settings (colour per phone, start date).
9. Supabase schema draft; reviewed by a security agent and a React agent; all
   findings applied (lost edits on quick leave, web tap-select, stale totals,
   accessibility, touch sizes, schema hardening).
10. README.
11. GitHub repo and GitHub Pages deploy of the web version.
12. Supabase project: schema applied and tested, anonymous sign-in, pairing, live sync,
    photos in a private bucket.
13. (2026-10-11) Fixed page size on all devices, space setup with names, start date
    and goals, up to 20 members who are all admins, offline merge, KLIPY sticker and GIF library.

14. (2026-10-12) Design pass: better contrast, filled-day grid, calendar anniversaries, toolbar icons, undo delete,
    photo self-heal, three skins, paste a sticker from the clipboard.
15. (2026-10-15) Day page overhaul: photo upload fix, sharper pictures, text width, padlock; zoomable page, 9 moods.
16. (2026-10-16) Version 2.0.0 "Our book": fixes, canvas gestures, book look, new-things note, caption / drawing / templates
    (built, not committed yet).

See `git log --oneline` for the full history.
