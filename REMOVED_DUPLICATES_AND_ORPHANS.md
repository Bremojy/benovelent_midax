# Benevolent MIDAX cleanup record

## Removed duplicate assets
- `backend/public/` — entire directory removed because every bundled frontend asset duplicated the canonical root `public/` tree. The backend now serves `../public` directly.
- `backend/documents/` — removed because the same constitution/document assets were duplicated in the canonical root `public/documents/` directory and the backend document resolver now points there.
- `public/documents/1785864861377-527362886-BENEVOLENT-SCHEME-CONSTITUTION-Nov---2025--1-.pdf` — duplicate byte-for-byte copy of `public/documents/benevolent-midax-constitution.pdf`.

## Removed orphan/legacy frontend pages
- `src/pages/PlatformCenter.jsx`
- `src/pages/PlatformCenter.css`
- `src/pages/PublicEvents.jsx`
- `src/pages/Resources.jsx`
- `src/pages/Profile.jsx`

These were not reachable from the current router. `/events` and `/resources` remain supported as redirects into the canonical News content tabs.

## Removed unused starter/legacy assets and components
- `src/assets/hero.png`
- `src/assets/react.svg`
- `src/assets/vite.svg`
- `src/styles/updated1.css`
- `src/styles/v12-dashboard-mobile.css`
- `src/components/SectionTitle.jsx`
- `src/components/common/DashboardSkeleton.jsx`
- `src/components/common/DashboardSkeleton.css`
- `src/components/notifications/NotificationItem.jsx`
- Unused member dashboard legacy cards/components: `ClaimCard`, `ClaimsOverview`, `ContributionHistory`, `MemberStats`, `MembershipCard`, `NotificationCenter`, `ProfileHeader`, `QuickActions`, `RecentChats` and their CSS files.
- Unused dashboard legacy modules: `ChatPreview`, `ContributionCard` and their CSS files, plus `DashboardHome.jsx`.

## Deliberately retained
- `src/pages/Disclaimer.jsx` is retained and is now explicitly routed at `/disclaimer` and linked from the public footer, so it is no longer orphaned.
- The canonical constitution file `public/documents/benevolent-midax-constitution.pdf` is retained.
- The canonical root `public/` assets are retained because both Vercel and the backend fallback use this directory.
