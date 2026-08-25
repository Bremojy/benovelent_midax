# Benevolent MIDAX portal redesign — v19.2

Implemented role-specific portal information architecture, shared responsive design system, member “My Benovelent” status dashboard, Admin “Operations Center”, SuperAdmin “Control Center”, financial/disbursement workflow presentation, universal portal search behavior, and lightweight Admin Reports/Website workspace pages.

Existing functional pages/routes remain intact. The new dashboard cards use live backend aggregates and degrade gracefully when secondary metrics are unavailable.

Performance adjustments include preserving lazy-loaded route bundles, shortening the global page transition from 2s to 500ms, keeping secondary dashboard widgets non-blocking, and retaining optional Redis cache support with fail-open behavior.

The package release number remains the existing 18.0.0 because the project’s contract tests enforce that release identifier. The application deployment version can continue to be managed with APP_VERSION/VITE_APP_VERSION.
