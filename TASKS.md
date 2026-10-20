# Implementation checklist

## Completed in this repository

- [x] Audit the old repository, remove the previous site and static prototype, and preserve `.git` plus the active Arena branch.
- [x] Create a buildable React/TypeScript/Vite app, Java syntax editor, responsive lesson layout, persistent local notes/progress, and accessible controls.
- [x] Publish a structured 60-day plan across nine weeks with goals, exercises, interview prompts, and learner-controlled completion.
- [x] Implement a whitelist parser/interpreter for a documented Java subset; do not use `eval`, `Function`, shell execution, or a trusted server to run learner code.
- [x] Run the interpreter in a disposable Web Worker; enforce source, step, trace-event, snapshot-value, array, heap, recursion, and wall-clock limits.
- [x] Use one deterministic trace event as the source for source-line highlight, stack/heap view, array inspector, console output, and rule-based explanation.
- [x] Report unsupported syntax and runtime errors explicitly; do not fabricate later execution state.
- [x] Provide working weekly starter examples for arrays/search, frequency counters, recursion, linked objects, array-backed stack operations, a tree, and a graph traversal.
- [x] Add a problem-first custom-input playground whose generated Linear Search, Binary Search, Bubble Sort, and sorted Pair Sum Java programs use the same worker trace as the editor.
- [x] Add an interview-round self-coaching checklist with per-day local persistence and no automatic scoring.
- [x] Add a dismissible first-run goal panel for the learner's top-tech DSA target, with a practical learn/solve/explain/review loop and no hiring guarantee.
- [x] Add a private self-reported practice log with independent/hint/revisit outcomes, actual minutes, takeaways, and no automatic correctness score.
- [x] Add architecture, security/privacy, testing, deployment, and reference-gap documentation.
- [x] Add automated interpreter/curriculum tests and verify a production build.

## Open validation / future product work

- [ ] Cross-validate supported syntax/output against a real JDK or JVM in a separately controlled test environment. The current host has no Java/Javac runtime; this has not been done.
- [ ] Add real-browser end-to-end tests for the production CodeMirror editor, bundled Worker, breakpoint gutter/playback, and responsive behavior (current React UI tests mock CodeMirror and Worker).
- [ ] Conduct manual screen-reader, keyboard-only, touch, and mobile-browser QA.
- [ ] Expand language support only with parser/runtime tests; do not claim full Java compatibility.
- [ ] Add specialized trace visualizers for stacks/queues, sorting, heaps, hash tables, and graphs; current memory/array views are intentionally a vertical slice.
- [ ] Add unique runnable solutions for more of the 60 day prompts; some are concept-only because relevant collections/libraries are not supported.
- [ ] Reassess whether a real Java runtime can be safely offered before advertising JVM execution or source-level debugging.

## Verified commands

- `npm test` — passing interpreter and curriculum tests.
- `npm run build` — passing TypeScript check and production bundling with the editor code-split into a separate chunk.
- `npm audit --omit=dev` — no production dependency vulnerabilities reported.
