# Benevolent MIDAX — V16 final code audit

## Fixed
- Fixed the Vercel SPA rewrite so the client-side fallback explicitly excludes `/assets/*`, `/api/*`, and files with extensions.
- Hardened the Vercel asset verifier to test the actual fallback pattern against asset/API URLs and a client-side route.
- Vite dev/preview commands now invoke Vite through Node, avoiding Windows executable-shim failures such as `vite is not recognized` after dependencies are installed.
- Bumped frontend/backend release metadata to 16.0.0 and synchronized package-lock versions.
- Bumped the service-worker cache namespace to V16 so stale V15 shell/assets are retired on activation.
- Removed the external Vercel JSON schema declaration that can show an untrusted-schema warning in VS Code; it is not required for deployment.
- Removed duplicate Vite environment example entries and synchronized `VITE_APP_VERSION`.

## Automated verification
`npm run test` PASSED.

Included gates:
- security contract
- source quality (254 source files)
- static integrity (135 backend JS files)
- route contract (253 backend routes / 131 frontend API calls)
- portal UI contract
- call flow and call-auth regression
- verification flow
- portal shell
- regression audit

`node --check` also passes for all backend JavaScript files.

## Vercel asset verification
The production Vercel log supplied with this project shows Vite successfully transformed 2403 modules and generated the production assets, then the deployment failed only at the custom asset verifier because the verifier reported: `SPA fallback does not exclude /assets/*.` The verifier now passes against a representative production-style asset index and route set.

A full local `npm ci` was attempted in this execution environment but did not complete before the execution timeout. Therefore this package is not represented as having a locally generated Vite build in this environment; the supplied Vercel build log demonstrates that Vite itself already builds successfully in Vercel, and the remaining failing verification rule has been corrected.

## Deployment expectation
Push this package to the repository and allow Vercel to run a fresh deployment. The previous failed deployment should no longer stop at the custom asset verification step. If the browser has an old PWA/service-worker cache, unregister the old service worker once or use a private window for the first validation after deployment.
