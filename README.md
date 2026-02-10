# FastLane Show System

Production-ready Next.js + Tailwind web app for segment-driven show planning with Supabase Auth, Postgres, and Storage-backed cross-device sync.

## Stack
- Next.js (App Router) + TypeScript + TailwindCSS
- Supabase Auth (email/password)
- Supabase Postgres with RLS
- Supabase Storage private bucket `segment-audio` with signed playback URLs
- TipTap rich text editor

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env values:
   ```bash
   cp .env.example .env.local
   ```
3. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project.
4. Run SQL migration in Supabase SQL Editor:
   - `supabase/migrations/202602090001_init.sql`
5. In Supabase Auth, enable Email/Password provider.
6. Start app:
   ```bash
   npm run dev
   ```

## Features
- Authenticated home dashboard list with `Create New Dashboard` and `Open`.
- Segment editor with draggable/collapsible cards.
- New segment title is empty and uses placeholder `Segment Title`.
- Two-column segment cards:
  - Left: TipTap rich text editor (cut/copy/paste, bullets, font family, font size, text color)
  - Right: Presenter controls + audio upload/list
- Presenter mode per segment:
  - Does not auto-scroll when toggled on
  - Play/Pause control shown
  - Scroll starts on Play or tapping teleprompter area
  - Tap teleprompter to pause/resume
  - Font size and scroll speed sliders persisted per segment
- Multi-audio upload per segment (supports iPad file picker), stored in Supabase Storage `segment-audio`.
- Playback uses signed URLs and Play/Stop behavior.
- Global Content Library:
  - User-editable categories (add + rename)
  - Items with title, category, rich content, metadata JSON, status Available/Archived
  - Insert into segment copies content (never linked), with confirmation

## Manual test checklist
- [ ] **Cross-device sync**: Login on laptop and iPad with same account; create dashboard/segments on laptop and verify appears on iPad.
- [ ] **Auth ownership isolation**: Create data under account A; verify account B cannot see it.
- [ ] **Segment defaults**: Add Segment and confirm title field is empty with placeholder only.
- [ ] **Reorder/collapse**: Drag reorder segments; reload and verify order and collapse state persist.
- [ ] **Rich text persistence**: Apply bullets/font family/font size/color; reload and confirm formatting remains.
- [ ] **Presenter controls**: Enable presenter mode; verify no autoscroll; use Play button and tap area to pause/resume; adjust sliders and reload to confirm persistence.
- [ ] **Audio upload/playback (iPad + laptop)**:
  - Upload multiple audio files to one segment from iPad file picker.
  - Verify files list with visible names.
  - Press Play/Stop repeatedly and confirm restart-from-beginning behavior.
  - Verify playback works via signed URL and continues after page reload.
- [ ] **Library categories**: Add and rename categories.
- [ ] **Insert-copy semantics**: Insert library item into selected segment; edit segment content and verify library item remains unchanged.
- [ ] **No selected segment prompt**: Trigger insert without selecting target segment and confirm prompt appears.

## Notes
- Storage bucket is private by default. Playback requires signed URLs generated at runtime.
- RLS policies restrict all table access to `auth.uid()` ownership.
