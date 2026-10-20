# Testing and validation

## Automated checks

Run from the repository root:

```sh
npm test
npm run build
```

The Vitest suite currently covers:

- the default linear-search trace and synchronized snapshots;
- console output at the selected event and array references/slots;
- recursive calls, returns, and stack depth;
- user-object references and reachability;
- supported 32-bit `int` wraparound and String references;
- bounds and uninitialized-local errors;
- rejection of imports, instance methods, and multidimensional arrays, plus explicit runaway-loop budgets;
- one executable example for each of the nine curriculum weeks;
- exactly 60 consecutive curriculum days;
- local practice-entry normalization (allowed outcomes/ranges, bounded text, and 100-entry history cap);
- custom-input validation plus Java execution/output checks for linear search, binary search, bubble sort, and two-pointer pair-sum; and
- React workspace rendering, run/step UI state with an inline test worker, first-learner goal/dismissal, Explore-to-editor flow, interview reflection persistence, self-entered practice-log persistence, and browser-local lesson completion.

The UI test substitutes the browser Worker and CodeMirror editor; it verifies the React trace path, not the actual CodeMirror DOM or production worker isolation. These tests exercise the **custom interpreter**, not the Java language specification. They are not compiler-conformance tests and do not establish JVM behavior.

## Manual browser QA checklist

Before publishing a change to the editor or UI, check:

- [ ] Run the default program; verify the console eventually prints `2`.
- [ ] Step backward/forward and confirm the highlighted line, selected event, stack, heap, array indices, output, and explanation all describe that same event.
- [ ] Play, pause, add a breakpoint on a line, and verify playback pauses at the next matching event.
- [ ] Edit source during/after a trace; confirm stale snapshots are cleared.
- [ ] Load each weekly example; verify it runs or returns a useful typed limitation.
- [ ] In Explore, change the custom array/target for each pattern; verify sorted-input validation, generated Java source, and the synchronized trace for search/sort/pair-sum.
- [ ] In Practice, record a real attempt with its actual duration and takeaway; verify counts reflect only submitted entries, deletion works, and storage is local.
- [ ] In Interview prep, start/pause/reset the timer and toggle checklist items; verify per-day local persistence and no score is reported.
- [ ] Try an import, an out-of-bounds access, and `while (true)`; verify explicit errors/budget stops and no fabricated continuation.
- [ ] Refresh and confirm local lesson selection, notes, source, completion toggles, breakpoints, and font size persist.
- [ ] Test narrow/mobile layout, keyboard focus order, reduced-motion preference, zoom, and at least one screen reader/browser combination.
- [ ] Confirm no source, notes, or local progress are sent in network requests.

## Known validation gaps

- The build host did not have `java`, `javac`, `jshell`, Docker, or Podman. No Java compiler or JVM cross-check was possible; no output is described as JDK-verified.
- There is no Playwright/Cypress real-browser automation yet. The automated React test mocks CodeMirror and the Worker, so actual editor rendering, bundled-worker startup, breakpoint gutter behavior, and browser layout are not end-to-end tested.
- Manual assistive-technology and mobile-browser testing remains necessary; CSS/accessibility attributes alone are not proof of conformance.
- The interpreter implements a small subset. New grammar or semantic work requires more differential tests, ideally against a JDK in a separate, non-production validation environment.
- No production load, quota, or browser memory stress test has been performed.
