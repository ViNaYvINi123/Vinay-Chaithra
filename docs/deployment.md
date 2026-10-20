# Static deployment

The academy is a static single-page app. It does not need a database, backend, server-side Java, or environment secrets.

## Build

```sh
npm ci
npm test
npm run build
```

Deploy the contents of `dist/` to a static HTTPS host. A Vite preview for local inspection is available with `npm run preview`; do not use Vite's preview/dev server as a public production server.

The build is configured for relative asset URLs (`base: './'`) so the app can be served from a root domain or a repository subpath. There is no client-side URL router; serve `dist/index.html` at the chosen app path and preserve its relative `assets/` directory. If you later add routes, configure the host's fallback to `index.html` and retest subpath deployment.

## Example host setup

Any static host that serves HTML, JavaScript modules, CSS, and the worker asset over HTTPS is suitable. Configure:

- build command: `npm ci && npm test && npm run build`;
- publish directory: `dist`;
- no API rewrite, serverless function, or Java runtime;
- an HTTPS custom domain and reviewed security headers (see [security notes](security.md)); and
- immutable caching for hashed `assets/*`; revalidate `index.html` so new builds become visible.

For a repository-pages deployment, ensure the build artifact is published from `dist/`, the host serves the nested app path, and the relative worker/module assets still load. The workflow is host-specific; this repository does not include a deployment credential or claim a configured domain.

## Runtime considerations

- Source is interpreted in the browser worker. A static CDN serves the app bundle, not learner programs.
- Local state uses that browser's `localStorage`; it is not backed up or synchronized to the hosting provider.
- The 2.5-second client timer, interpreter budgets, and unsupported-syntax errors are part of the product contract. Do not remove them when changing hosting.
- Preview/dev host allowances are limited to local hosts and the Arena `.e2b.app` suffix in `vite.config.ts`. Production should be served by the static provider's own origin policy.
