# Security and privacy boundaries

## Data handling

- Learner source is interpreted in a disposable browser Web Worker. It is not submitted to an application backend; the app has no backend or account API.
- The worker receives source through `postMessage` and returns structured-cloneable trace data. The UI requests termination after 2.5 seconds.
- The app uses `localStorage` for the editor draft, lesson notes, completion toggles, breakpoints, editor font size, custom algorithm inputs, interview checklist, and self-reported practice entries. This is local browser storage, not encrypted storage, device sync, or an account vault. Do not put secrets or personal data in notes or source.
- No analytics, AI endpoint, remote execution, online judge, or external font/image request is configured. The interface intentionally uses system font fallbacks and local package assets.

## Execution boundary

The worker is a resource-isolation aid, **not a security boundary for arbitrary Java code**. This implementation avoids shelling out, JavaScript `eval`, `new Function`, reflection, and ambient file/network APIs by interpreting a small whitelisted AST. It can call only methods declared in the submitted source and the explicitly supported `System.out` methods.

Limits are applied before and during interpretation: 16,000 source characters, 12,000 interpreter steps, 2,500 events, an estimated 220,000 trace-value units, 256 elements per array, 512 heap objects, and 64 active calls. A separate 2.5-second UI deadline terminates the worker. These limits reduce accidental runaway work; they are not a formal memory quota or a substitute for OS-level process isolation.

Do not broaden the interpreter with unrestricted JavaScript evaluation or run user source on a trusted server. If a real Java/JVM execution backend is added, design a separate sandbox with process/container or wasm isolation, CPU/memory limits, filesystem/network denial, hard deadlines, and independent security review.

## Browser and deployment notes

- Serve the built app over HTTPS in production.
- Configure the host's security headers deliberately: a restrictive `Content-Security-Policy`, `frame-ancestors`, `X-Content-Type-Options`, and `Referrer-Policy` are appropriate. Test worker and module loading against the exact CSP before enabling it; this repository does not pretend a static HTML meta tag is a complete header policy.
- Keep npm dependencies reviewed and lockfile-pinned. Run `npm audit` in the deployment pipeline and assess advisories before upgrading. A clean audit does not prove the app is secure.
- `vite.config.ts` allows the Arena preview suffix for development/preview. Do not reuse the dev server as a public production server.
- The conceptual heap and synthetic IDs are explanatory UI. They are not an exposure of actual device/JVM memory.
