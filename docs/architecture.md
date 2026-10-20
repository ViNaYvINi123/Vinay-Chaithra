# Architecture

## Runtime shape

```text
React UI ── message(source, requestId) ──> disposable module Web Worker
   ▲                                             │
   │                              tokenize → parse whitelist grammar
   │                                             │
   └──── structured-cloned TraceResult <── interpreter + bounded snapshots
```

There is no application server, database, remote execution service, or API. Vite serves the static client during development. The editor is CodeMirror with Java syntax highlighting; syntax colorization does not imply that all Java syntax is executable.

## Source layout

- `src/data/curriculum.ts` — the ordered 60-day lesson record set and week labels.
- `src/data/samples.ts` — one runnable teaching example per week, including arrays, recursion, object references, a tree, and a small graph traversal.
- `src/data/algorithms.ts` — safe custom-input parsing plus source generators for the playground's search, sort, and two-pointer programs.
- `src/data/interview.ts` — the non-scoring interview communication checklist.
- `src/data/practice.ts` — the validated local session record shape and storage normalizer.
- `src/engine/javaSubset.ts` — tokenizer, recursive-descent/precedence parser, AST evaluator, type checks, object/array model, execution limits, and trace generation. It contains no `eval`/`Function` calls.
- `src/engine/trace.worker.ts` — message boundary that runs a single source request and returns a structured-cloneable result.
- `src/engine/types.ts` — runtime values, snapshots, and limits shared by the engine and UI.
- `src/components/CodeEditor.tsx` — Java highlighting, selected-line reporting, execution-line decoration, and breakpoint gutter.
- `src/components/MemoryDiagram.tsx` / `ArrayVisualizer.tsx` — views that consume the active snapshot only.
- `src/components/AlgorithmExplorer.tsx` — custom-input pattern selector that supplies generated Java to the shared interpreter.
- `src/components/PracticeLog.tsx` — user-entered outcome, duration, reflection, and recent-session history; no automatic correctness scoring.
- `src/App.tsx` — curriculum, lesson selection, editor/trace controls, local state, interview timer/checklist, and explanation presentation.

## Trace contract

A `TraceEvent` is the single presentation unit. It carries:

- `index` and source `line`;
- `kind` and a short `label`;
- `why`, `memoryChange`, `unchanged`, `next`, and `commonMistake` text;
- a copy of the active call frames and each frame's locals;
- conceptual heap objects, their fields/elements, stable IDs, and derived reachability;
- console output accumulated up to that event; and
- an `algorithmState` subset (for example `index`, `left`, `mid`, or `target`) used to label array pointers.

The selected trace index is the only state input to the execution highlight, memory diagram, array visualizer, output, and trace note. A source edit invalidates the old trace. Playback moves between already-recorded snapshots; it does not execute a different implementation of the code or invent intermediate values.

The trace is recorded to completion inside the worker before UI playback. This is a deliberate learning-oriented replay model, not instruction-level JVM stepping. “Run trace” executes the subset program; Play/Step replay its event log.

## Interpreter outline

1. Reject oversized source before tokenization.
2. Tokenize comments, identifiers, numeric/string/char literals, and a fixed operator set. Unknown characters/escapes stop with a typed error and location.
3. Parse only the documented grammar. Imports, packages, and unsupported statements do not get silently skipped.
4. Require one supported static `void main` entry point.
5. Execute an AST with explicit frames/scopes, typed locals, conceptual object/array records, and Java-like `null`/default values. The evaluator uses no host-language dynamic evaluation.
6. Emit event snapshots after control-flow decisions and observable assignments, calls, returns, allocations, output, and completion.
7. Enforce source/step/event/estimated-snapshot-value/array/heap/depth limits. The UI independently terminates the worker on a 2.5-second deadline.

## Memory teaching model

Primitive local values are displayed in their frame. Reference locals and fields point to conceptual objects identified by stable per-run labels (`O1`, `O2`, …). Arrays and user-class instances live in the conceptual heap. An object field or array slot can itself contain a reference. The reachability marker walks from current frame locals and interned string-literal roots through fields/elements.

These labels and diagrams are authored for teaching. They are not physical addresses, a VM heap dump, a claim about stack allocation, or a simulation of garbage-collection timing, JIT optimization, escape analysis, compressed pointers, class metadata, or all JVM object-layout rules. String-pool modeling is intentionally simplified.

## State persistence

A versioned `localStorage` record stores selected day, manually marked completion, editor draft, per-day notes, breakpoints, editor font size, playground inputs, interview checklist items, and up to 100 self-reported practice entries. It is browser-local and not account synchronization. The interpreter's trace is not persisted; rerun the program to create a fresh per-run set of object IDs and snapshots.

## Extension points

- Extend the grammar and semantics together; do not add syntax that the parser accepts but the evaluator ignores.
- Add a test and a runnable sample before exposing a new construct in lessons.
- Preserve the trace contract: new views should derive from the same event snapshot rather than recomputing hidden execution state.
- If a real JVM is introduced later, run it in a separately designed, resource-limited service/wasm runtime and document that boundary. Do not execute arbitrary learner Java on the trusted application server.
