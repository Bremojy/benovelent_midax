# Benevolent MIDAX V12 — UI, Responsiveness & Quality Update

## Purpose
V12 preserves the existing portal functionality while correcting dashboard geometry, mobile navigation consistency, portal visual identity, and chat self-selection behavior.

## Portal dashboard changes
- Desktop dashboard content is explicitly constrained to the viewport area remaining after the fixed 270px portal sidebar.
- Dashboard pages now have `min-width: 0` / `max-width: 100%` protections to prevent child panels from pushing the entire portal beyond the sidebar.
- Mobile portal navigation remains fixed at the bottom on **all** portal pages, not only the dashboard home.
- Mobile subpages expose a direct Dashboard-home control in the top bar.
- Safe-area spacing is retained for modern phones.
- Member, Admin, and SuperAdmin portals use distinct accent identities: green, orange, and purple.

## Chat changes
- The current signed-in user is passed into the chat directory and filtered from both conversations and people lists using ID, email, username, member number, and phone identity checks.
- Existing server-side and start-conversation self checks remain intact.
- The chat UI uses the active portal accent rather than a single global purple treatment.
- Incoming message scrolls use an immediate layout update; explicit send actions retain smooth scrolling to reduce visual work during realtime updates.
- Chat panes remain constrained to `min-width: 0` so the center chat cannot force the portal page wider.

## Testing
- Source quality test: PASS.
- Backend static integrity test: PASS.
- Frontend/backend route contract test: PASS.
- V12 UI contract test: PASS.
- JS/JSX syntax transpilation check: PASS for all source JS/JSX files.

A production Vite build could not be executed in this sandbox because the environment could not retrieve the missing Vite/plugin packages from npm. No build failure was inferred from this environment limitation.
