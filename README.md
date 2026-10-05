# OurLife

A shared "days together" journal for two people. A grid of dots, one per day since
the start date. Tap a day to open a free-form page (text, stickers, photos, to-dos,
moods, goals). Built with Expo (React Native) + TypeScript. Supabase comes next.

UI is English only. Personal content never goes in this repo.

## Status (2026-10-06)

Everything below works **locally on the phone** (and in a browser). Nothing is synced yet.

| Part | State |
| --- | --- |
| Home: "Day N", 7-column dot grid, month labels, light + dark | done |
| Day page: text, stickers (emoji), washi tape, photos, to-do, focus, mood | done |
| Gestures: drag, pinch-resize, twist-rotate, recolour, front, delete | done (pinch/rotate not yet tried on a real phone) |
| Goals: `/goal car +50` commands, goal pages, totals, progress | done |
| Settings: colour per phone, start date | done |
| Supabase schema (`supabase/schema.sql`) | drafted and security-reviewed, **not applied** |
| Live sync between two phones, pairing code | **not built** (needs the Supabase project) |
| Photos in the cloud | **not built** |
| Original sticker art | **not built** (emoji for now) |

## Next steps (planned for 2026-10-07 together with Moritz)

1. **Create the Supabase project** (Moritz does this; he runs the Supabase CLI himself with `!`).
   Apply `supabase/schema.sql`, turn email sign-up OFF and anonymous sign-ins ON
   (instructions are at the top of that file). Put the project URL and the
   anon/publishable key in a local `.env` (copy `.env.example`).
2. **Push the repo to GitHub** (Moritz's decision; the repo may be public, it holds only code).
3. **Decide how her phone connects when away from home**: Tailscale on her phone, or a
   hosted web / EAS build.

After that the builder wires up anonymous sign-in, "create our space" / "enter code",
and moves day pages, goals and photos to Supabase with live updates.
More detail and open questions: `docs/HANDOFF.md`. Product description: `docs/PRD.md`.

## Run it

```bash
npm install
REACT_NATIVE_PACKAGER_HOSTNAME=100.117.131.14 npx expo start --port 8082 --host lan
```

- iPhone (Expo Go, Tailscale on): `exp://100.117.131.14:8082`
- Browser: http://localhost:8082
- Type check: `npx tsc --noEmit`
- Port 8081 belongs to another project (DoYouKnow). Do not use it.

## How it is built

- `src/app/` screens (Expo Router): `index` (grid), `day/[n]`, `goals/`, `settings`.
- `src/features/canvas/` the day page: items, gestures, toolbar, sheets, per-day storage.
- `src/features/goals/` goals store, `/goal` command parser, progress.
- `src/features/settings/` colour and start date.
- `src/constants/strings.ts` all UI text in one place (so a German version is easy later).
- `src/constants/theme.ts` colours (cream light, dark) and constants.
- Local storage keys: `ourlife.day.<n>`, `ourlife.goals`, `ourlife.settings`.
  Photos are copied into the app's own `photos/` folder on the phone.
- Goal totals are computed from the goal chips on day pages, so deleting a chip updates the total.
- Day 1 is the start date itself; dates are calendar days, so there is no timezone drift.

## Safety rules

- **No secrets in git.** `.env*` is ignored (only `.env.example` is committed, and it is empty).
- **Never a `service_role` key** in the app or in EAS. Only the anon/publishable key.
- `design-refs/` (personal reference photos) is git-ignored. Never commit or upload it.
- No real photos or journal text in the repo. Personal content will live only in Supabase.
- Do not copy images from the reference photos. Use original or licensed assets
  (the emoji stickers are system emoji; original art is a later task).
- The security of the future cloud data rests on Row Level Security in
  `supabase/schema.sql`, not on hiding the anon key.
- Nothing is pushed anywhere yet. Merging and pushing are Moritz's decisions.

## History (2026-10-05 / 06)

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
10. This README.

Commits are on the local `main` branch (`git log --oneline`).
