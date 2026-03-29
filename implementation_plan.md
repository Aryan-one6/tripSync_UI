# TripSync Phase 1 & 2 Implementation Plan

## Overview

Implementing Phase 1 (Clean Up the Mess) and Phase 2 (Make the UI Professional) from the TripSync_Claude_Code_Prompts.pdf document. The codebase is a Next.js monorepo at `/apps/web` with Tailwind CSS.

## Current State Analysis

- **Dashboard routes**: The `(dashboard)` folder is **empty** — no `traveler-dashboard` or duplicate routes found. The app uses `/dashboard/feed` as the main traveler route, defined in the `AppSidebar`.
- **Header**: `site-header.tsx` — has no role-switcher button (already simplified), does have a Dashboard link.
- **Sidebar**: `app-sidebar.tsx` — has user/agency nav items, but the links don't match what Phase 1.3 specifies (missing "Saved Trips", "Trip History").
- **CSS**: `globals.css` — **still has clay shadows** (`--shadow-clay-*` variables) that need to be removed per Phase 2.1.
- **Button component**: `button.tsx` — **still uses clay shadows** on all variants. Needs modernization.
- **Card component**: `card.tsx` — `CardFeatured` uses clay shadows. Needs updating.
- **Homepage**: `app/(public)/page.tsx` — Uses a `HomeSocialFeed` with For You/Following tabs (already exists). But the hero is wordy with blobs. Needs redesign to compact 200px hero.
- **Feed cards**: `social-feed-card.tsx` — Information-heavy grid layout, needs redesign to social post style.
- **Header**: `site-header.tsx` — Has inner rounded-xl wrapper style (floating card look) that needs to be flattened.

---

## Proposed Changes

### Phase 1: Clean Up the Mess

#### [MODIFY] [app-sidebar.tsx](file:///Users/nareshsharma/Desktop/Files/TripSync/apps/web/components/layout/app-sidebar.tsx)
- Update `userNav` links to match spec: Dashboard (Home), My Projects, Saved Trips, Trip History, Settings
- Keep agency nav as-is (it's already in good shape)
- Verify active route highlighting works

#### [MODIFY] [site-header.tsx](file:///Users/nareshsharma/Desktop/Files/TripSync/apps/web/components/layout/site-header.tsx)
- Add user avatar dropdown with: Dashboard, Profile, Settings, Logout items
- Replace simple `Dashboard + Logout buttons` with a proper avatar dropdown menu
- Fix any overlap issues on medium screens

> [!NOTE]
> Phase 1.1 (Delete Duplicate Routes) — No `traveler-dashboard` directory exists in `(dashboard)` folder (it's empty). No action needed.
> Phase 1.2 (Remove Role Switching) — No role switcher button exists in the current header. Header already has a simplified profile approach. We'll enhance the avatar dropdown.

---

### Phase 2: Make the UI Professional

#### [MODIFY] [globals.css](file:///Users/nareshsharma/Desktop/Files/TripSync/apps/web/app/globals.css)
- Remove ALL `--shadow-clay-*` variables (lines 84–139)
- Add the 4 clean shadow variables specified:
  - `--shadow-sm: 0 1px 2px rgba(0,0,0,0.05)`
  - `--shadow-md: 0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)`
  - `--shadow-lg: 0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)`
  - `--shadow-xl: 0 16px 48px rgba(0,0,0,0.15)`
- Remove clay-specific utility classes (`.clay-btn`, `.clay-blob`) or repurpose them with clean shadows
- Keep `.clay-card` and `.clay-input` but use clean shadows

#### [MODIFY] [button.tsx](file:///Users/nareshsharma/Desktop/Files/TripSync/apps/web/components/ui/button.tsx)
- **Primary**: solid `bg-[var(--color-sea-600)]` text-white, hover: `bg-[var(--color-sea-700)]` shadow-sm, hover:shadow-md. `rounded-full`.
- **Secondary**: `bg-white border border-[var(--color-border)] text-[var(--color-ink-900)]` shadow-sm, hover:shadow-md. `rounded-full`.
- **Ghost**: transparent, hover: `bg-[var(--color-surface-2)]`. `rounded-md`.
- Remove `active:scale-[0.97]` from base class
- Remove `hover:-translate-y-0.5` from ALL variants

#### [MODIFY] [card.tsx](file:///Users/nareshsharma/Desktop/Files/TripSync/apps/web/components/ui/card.tsx)
- `Card`: use `shadow-sm` by default, `hover:shadow-md`, add subtle `border-[var(--color-border)]`
- `CardFeatured`: Remove clay shadow, use `shadow-md` → `hover:shadow-lg`, no translate-y hover
- Remove all `shadow-[var(--shadow-clay-*)]` references

#### [MODIFY] [page.tsx (homepage)](file:///Users/nareshsharma/Desktop/Files/TripSync/apps/web/app/(public)/page.tsx)
- **Compact Hero** (max ~200px): Remove card wrapper and blobs. Short heading "Discover your next adventure". Subtitle one-liner. Inline search bar (destination input + Search button). Trending destination pills (Himachal, Goa, Ladakh, Rajasthan, Kerala, Uttarakhand).
- **Remove** big CTA buttons ("Create a plan", "Open discover")
- Keep the `HomeSocialFeed` below the hero
- Style hero with subtle `bg-gradient-to-b from-[var(--color-sea-50)] to-transparent`

#### [MODIFY] [social-feed-card.tsx](file:///Users/nareshsharma/Desktop/Files/TripSync/apps/web/components/social/social-feed-card.tsx)
- **Image area**: full-width 16:9 aspect ratio, destination badge (bottom-left), price badge (bottom-right)
- **Content area**: title (font-semibold, truncated), date + duration (small), group progress bar (h-1.5 thin)
- **Footer**: left = listing type label (no pill), right = share/WhatsApp button
- Remove outer border, use `shadow-sm`, `hover:shadow-md`, no translate-y hover
- `p-0` with image flush to top, `p-4` content below, `rounded-xl` overall

#### [MODIFY] [site-header.tsx (Phase 2.4)](file:///Users/nareshsharma/Desktop/Files/TripSync/apps/web/components/layout/site-header.tsx)
- Remove inner `rounded-xl` wrapper
- Use header directly with `white/95 backdrop-blur-lg` background
- Add `border-bottom: 1px solid var(--color-border)` instead of floating card
- Remove `shadow-md` from header container
- `px-6 py-3`, `sticky top-0`
- Mobile: simplify overlay to clean slide-down panel

---

## Open Questions

> [!IMPORTANT]
> **Dashboard Routes (Phase 1.1)**: The `(dashboard)` directory is currently empty. The sidebar links to `/dashboard/feed`, `/dashboard/plans`, etc. — are these routes defined elsewhere (possibly under `(app)`)? Should we create stub pages if they don't exist?

> [!NOTE]  
> The PDF says to add "My Projects", "Saved Trips", "Trip History" to the sidebar but these routes may not have pages yet. We'll add them to the nav and handle missing pages gracefully.

---

## Verification Plan

### After Phase 1
- Sidebar shows correct links with icons: Dashboard, My Projects, Saved Trips, Trip History, Settings
- Header avatar dropdown works with Dashboard/Profile/Settings/Logout options
- Routes update cleanly in the browser

### After Phase 2  
- No clay shadows visible anywhere (check CSS variables removed)
- Buttons look flat/modern: solid sea-600 primary, clean white secondary, transparent ghost
- Homepage hero is compact (~200px), has inline search, trending pills, and tab switcher
- Feed cards look like social posts: image full-width 16:9, thin progress bar, clean footer
- Header is flat with border-bottom, no floating card effect
- Mobile header slides down cleanly
