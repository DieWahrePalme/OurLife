# OurLife: PRD

Shared "life in days" journal for Moritz and his girlfriend.
Written by boss, 2026-10-05, from Moritz's voice messages. Updated the same day with his answers.

## 1. Idea

A "life in weeks" style calendar (ref-1, ref-2), but for **our time together**:
a grid of dots, one per day since our start date. Days behind us are filled, today is
highlighted (orange dot in ref-2). Counter: "X days together".

**Start date: 2025-10-12** (one fixed date, set once, editable in settings).
The grid is **open-ended**: it keeps growing day by day (365, 1000, 2000, ...) until the
couple deletes the space. Because there is no end, there is no "days left". Instead show
"day N together" and the next milestone (e.g. 365, 500, 1000) with a countdown. The grid
should handle thousands of days smoothly (virtualised or grouped by year, see ref-1 for
the layout idea). Show some future dots after today so it feels like it continues.

Tapping a day opens an **empty canvas page** like a bullet journal page
(ref-3 to ref-9). Both partners can put things on the same day, and both see each other's
entries live.

## 2. Users and hosting

Exactly two people, each on their own iPhone. Not a public product.

- **Runs locally**: the Expo app runs on Moritz's Mac mini (dev server), phones connect via
  Expo Go (Tailscale link like DoYouKnow: `exp://100.117.131.14:<port>`, pick a port that does
  not clash with DoYouKnow's 8081). No web deploy and no App Store needed now.
- The builder runs a **local web build/dev server** so boss can review the UI in a browser
  (e.g. via `npx expo start --web` and a Playwright screenshot).
- App Store release stays possible later (bundle ID, EAS config like DoYouKnow).
- Open: how does the girlfriend's phone reach the Mac mini when she is not on the home
  Wi-Fi/Tailscale? Decide later (Tailscale on her phone, or a hosted web/EAS build).

## 3. MVP features

1. **Day grid** with today marker, "day N together" counter, next milestone, tap a day to open it.
2. **Day canvas**: free-form board per day. Elements:
   - handwriting-style text blocks (journal fonts)
   - **stickers** (flowers, cats, plants, washi-tape strips, tags, stars, hearts; see refs)
   - photos from the camera roll
   - to-do list block, "focus" block, mood marker (happy / sad / anxious / angry / stressed, colour-coded like ref-5)
   - drag, resize, rotate, delete; layers
   - **no author tracking**: the app does not record or enforce who created what. Everything
     is just a shared white page. Each person freely picks colours for text, to-dos and
     stickers. Moritz usually picks blue, his girlfriend pink or purple, so you can tell by eye.
   - **colour preset per device**: in settings each phone can set a default colour
     (e.g. blue / purple) that new elements start with. It is only a convenience, not an identity.
   - **slash commands / widgets** inside text, see goals below
3. **Sticker library**: big, categorised collection, easy to extend later.
   **Do not copy images from Moritz's reference photos** (they are scans of real sticker
   sheets and journal pages). Use original, free-licence or self-made assets (check licences).
4. **Goals via a typed command (widget)**: e.g. a goal "Car" with target 10,000 EUR within
   one year, or "Website" with target 100%. A goal has a name, a target, a unit (EUR, %, km,
   number, ...) and an optional deadline. On any day page you type a short command, e.g.
   `/goal car +50` or `/goal website +10%`. The app recognises the goal by name, adds the
   value to that goal and shows it on the page as a small progress widget/chip. The goal
   page shows the total, a progress bar and the list of all entries by day.
   - Typing `/goal` should offer autocomplete of existing goals (easy on a phone).
   - Support `+` and `-` (e.g. spent money) and editing/deleting an entry, which updates
     the total.
   - Either partner can use any goal; no ownership.
5. **Live sync between the two phones**: entries from one appear on the other without reload.

## 4. Later (not MVP, but do not block it)

- **Throwback books**: pick a date range (e.g. 10th to 30th, "Croatia holiday"),
  bundle those days into a book, stored in a separate tab you can page through.
  Also auto-suggestions like "last two weeks" or "one year ago".
- Reminders / push ("write your day"), widget, export a day or book as image/PDF.
- Real accounts and App Store release.

## 5. Accounts and privacy

- **No sign-up screen in the MVP.** Suggested approach: Supabase anonymous sign-in
  plus a **pairing code**: the first phone creates "our space" (with the start date),
  the second phone enters the code. Row-level security ties all data to that space.
  The code is the only secret, so it must be long and random.
- **The repo may be public** (Moritz's decision), because it contains only code. The
  personal content lives only in Supabase, never in the repo: no real photos, journal
  entries, names or keys committed. Photos go to a private Supabase Storage bucket.
  `design-refs/` stays out of git.
- Never put a service_role key in the app or in EAS env (same rule as DoYouKnow).
  Only the anon/publishable key, and only in a git-ignored `.env`.

## 6. Tech stack

Same as DoYouKnow: Expo / React Native + TypeScript, Supabase (new project, own
database), EAS for iOS builds later. Reuse DoYouKnow patterns where useful (read only,
from `~/Programming/DoYouKnow`; never edit that folder). Local Xcode is too old for
native builds: those go through EAS cloud.

Canvas notes: `react-native-gesture-handler` + `react-native-reanimated` for
drag/scale/rotate. It must also work on web (for boss's checks).

## 7. Design direction

Warm, cosy **scrapbook / bullet-journal** look: paper textures, washi tape,
handwritten fonts, soft earthy and pink/rose palettes (ref-3 to ref-9), plus the
clean dot grid of the day view (ref-2). Skills to use for visual work:
`apple-design`, `frontend-design`, `design-taste-frontend`, `web-design-guidelines`.
Touch targets and readable contrast still apply.
**Language: English only** (Moritz's decision: cleaner, simpler). Keep strings in one
place so a German switch can be added later without a rewrite.

## 8. Decisions (Moritz, 2026-10-05)

- Name: **OurLife**.
- Start date: 2025-10-12, open-ended, no end date.
- English only. Public repo is fine. Runs locally on the Mac mini.
- Everything is shared and freely editable by both. No author tracking, colours tell who wrote what.
- Goals are driven by typed commands like `/goal car +50`, any unit (EUR, %, ...).

## 9. Still open

1. Sticker sources: free packs first, add custom ones later?
2. How does the girlfriend's phone connect when away from home (see section 2)?

## 10. Suggested first steps for the builder session

1. Read this PRD and look at `design-refs/` (local only, personal content).
2. Ask Moritz the open questions above (short, one message).
3. Scaffold the Expo project, set up Supabase (Moritz runs Supabase CLI commands himself with `!`), git repo.
4. Build day grid + day canvas with local storage first, then sync + pairing.
5. Local web build, then report to boss for review.
