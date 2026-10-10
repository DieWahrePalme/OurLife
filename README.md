# OurLife

A shared "days together" journal. A grid of dots, one per day since the start date.
Tap a day to open a free-form page (text, stickers and GIFs, photos, to-dos, moods, goals).
The phones of a space (a couple, up to 20 people) share it and sync live. Built with
Expo (React Native) + TypeScript + Supabase.

UI is English only. Personal content never goes in this repo.

Repo: https://github.com/DieWahrePalme/OurLife (public)
Web version: https://diewahrepalme.github.io/OurLife/

## Status (2026-10-11)

Works on a phone (Expo Go), in a browser and on GitHub Pages. Phones join a space with a code
and share days, goals, the start date and photos, live. **The work of 2026-10-11 (everything
marked "new" below) is committed locally, not pushed, and has not been tried on a phone**, see `docs/HANDOFF.md`.

| Part | State |
| --- | --- |
| Home: "Day N", 7-column dot grid, month labels, light + dark | done |
| Day page: text, stickers, washi tape, photos, to-do, focus, mood | done |
| Day page has the same size on every device (360 x 580, scaled to fit) | new |
| Gestures: drag, pinch-resize, twist-rotate, recolour, front, delete | done |
| Goals: `/goal car +50` commands, goal pages, totals, progress | done |
| Settings: colour per phone, shared start date, space name | done, name new |
| Supabase: anonymous sign-in, pairing code, row level security | done, tested |
| Space setup: name, own name, start date, optional goals | new |
| Up to 20 people per space, every member is an admin (remove people, new code) | new, needs `migration-002` (run) |
| Lost phone: join again from the new one, remove the old entry | new |
| Offline edits are kept and sent later (days and goals) | new |
| Sticker + GIF library from KLIPY (search, trending), own GIFs as photos | new, needs a KLIPY key and `migration-003` |
| Live sync of days, goals and start date between phones | done |
| Photos in the private cloud bucket | done |
| Web version on GitHub Pages | done (rebuilt on every push to `main`) |
| Offline start date change and offline photo upload | not built |
| Native iOS build (EAS / TestFlight) | not started |

Next steps, open questions and known small things: `docs/HANDOFF.md`.
Product description: `docs/PRD.md`.

## Run it

```bash
npm install
cp .env.example .env   # then fill in the Supabase URL, the publishable key and (optional) the KLIPY key
REACT_NATIVE_PACKAGER_HOSTNAME=100.117.131.14 npx expo start --port 8082 --host lan
```

- iPhone (Expo Go, Tailscale on): `exp://100.117.131.14:8082`
- Browser: http://localhost:8082
- Type check: `npx tsc --noEmit`
- Without `.env` the app runs in local-only mode (no pairing). Without a KLIPY key only the emoji stickers are offered.
- Restart the dev server after changing `.env`. Lint: `npx expo lint`.
- Port 8081 belongs to another project (DoYouKnow). Do not use it.

## How it is built

- `src/app/` screens (Expo Router): `index` (grid), `day/[n]`, `goals/`, `settings`.
- `src/features/canvas/` the day page: items, gestures, toolbar, sheets, per-day storage,
  `day-merge.ts` (offline merge), `klipy.ts` + `library-grid.tsx` (sticker / GIF library).
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
  `ourlife.settings`, `ourlife.space`.
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

## History (2026-10-05 to 11)

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

See `git log --oneline` for the full history.
