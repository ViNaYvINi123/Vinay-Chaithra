# Java DSA Academy

A browser-based learning workspace for a 60-day data structures and algorithms path. It pairs an editable Java-syntax lesson with a **bounded Java-subset interpreter**. The interpreter records deterministic snapshots; stepping through those snapshots drives the source-line highlight, console, call stack, conceptual heap, array view, and rule-based explanations together.

> **Scope, stated plainly:** this app does not include a JDK, compile Java bytecode, or run a JVM. It implements only the language subset listed below. It is an educational interpreter, not a general-purpose Java compiler or a secure sandbox for untrusted code. Unsupported syntax stops with a specific limitation rather than fabricated trace state.

## Run locally

Requirements: Node.js 22 or newer and npm.

```sh
npm install
npm run dev
```

The dev server prints its local URL. To create and inspect a production build:

```sh
npm run test
npm run build
npm run preview
```

The app has no backend. Lesson completion, notes, breakpoints, editor text, font size, custom playground inputs, interview checklist, and self-reported practice entries are saved in this browser's `localStorage` under `java-dsa-academy.v1`. Clearing browser storage clears that local learning state.

## What is included

- A consecutive 60-day curriculum across nine weeks: Java foundations; arrays and strings; searching and sorting; hashing and sets; recursion and backtracking; linked lists; stacks and queues; trees; graphs and heaps.
- For each day: a topic, learning objective, practice prompt, interview prompt, and self-reported checkpoint.
- A private practice log for attempts you choose to record: independent, with hints, or revisit; minutes; and one takeaway. Summary counts are based only on your entries and are not correctness scores.
- A Java-syntax editor with line numbers, line highlighting, configurable font size, selectable breakpoints, and runnable examples across all nine weeks.
- A problem-first algorithm playground with editable integer arrays/targets for linear search, binary search, bubble sort, and sorted pair-sum. The app generates a bounded Java-subset program from validated integers and runs that exact source through the same interpreter and trace views; it is not a separate mock animation.
- Run, rewind, previous/next-event, play/pause, and reset controls. A run records its trace in a worker; playback replays those snapshots. It is **not** a live JVM debugger.
- A console whose contents are taken from the selected event; a stack-frame inspector; a conceptual object/array heap with stable teaching IDs and reachability; and a one-dimensional array visualizer with tracked loop indices.
- A dismissible first-run goal panel and interview practice with a self-paced timer plus a per-day reflection checklist for clarifying constraints, stating a baseline, explaining an invariant, walking edge cases, analyzing complexity, and communicating clearly. The checklist does not score answers or promise hiring results.
- Deterministic, rule-based teaching notes. There is no generative AI, online judge, account system, automatic score, company attribution, or interview/job guarantee.
- Responsive layouts, keyboard-accessible controls, visible focus, reduced-motion support, labels for screen readers, and local notes.

Not every curriculum prompt has a matching runnable implementation. Load example replaces the editor with a small executable example for the lesson's week; prompts that mention collections, graph libraries, or other unsupported APIs remain conceptual exercises. The interpreter will explain when source exceeds its subset.

## Interpreter contract

### Supported source constructs

- One or more ordinary class declarations with fields and static methods. Access modifiers are accepted. Field initializers and static fields are not supported.
- A `static void main(String[] args)` entry point. The argument array is empty. A no-argument static `void main()` is also accepted.
- Local variables of type `int`, `long`, `float`, `double`, `boolean`, `char`, `String`, a class declared in the source, or a one-dimensional array of those types.
- Decimal numeric literals, boolean/char/String/null literals, array initializers, no-argument allocation of a class declared in the source (using the implicit constructor), `new Type[size]`, indexing, `.length`, and declared instance-field reads/writes.
- Static methods declared in this source, parameters, recursion, `return`, blocks, `if/else`, `for`, and `while`.
- Unary `!`, `+`, `-`, prefix/postfix `++` and `--`; arithmetic `+ - * / %`; comparisons; equality; short-circuit `&&` and `||`; and assignment/compound assignment.
- `System.out.print` and `System.out.println` with primitive, String, or null values. A user object or array cannot be printed; that would invoke behavior the subset does not model.

### Deliberately unsupported

Packages/imports; annotations; interfaces, enums, inheritance, generics, overloaded methods, declared constructors or constructors with arguments; static fields; object instance methods; `this`/`super`; collection classes; multidimensional arrays; casts; `break`/`continue`; `switch`; `do`; exception handling/`throw`; lambdas, streams, reflection, threads, file or network APIs; and unlisted Java syntax. Object `toString()` and full Java overload resolution are not simulated. A parser or runtime limitation is returned with a type and (when available) a source location.

### Resource limits and semantic boundaries

| Limit or behavior | Current value / rule |
| --- | --- |
| Source size | 16,000 characters |
| Interpreter steps | 12,000 |
| Recorded trace events | 2,500 |
| Estimated snapshot-value budget | 220,000 units across the run |
| Interpreter array length | 256 |
| Algorithm playground input length | 24 (kept small for readable replay) |
| Conceptual heap objects | 512 |
| Method call depth | 64 |
| Wall-clock worker deadline | 2.5 seconds; the UI terminates the worker after this deadline |
| `int` arithmetic | Java-style signed 32-bit wraparound for implemented operations |
| `long` arithmetic | limited to JavaScript-safe integer precision; larger values stop with a limitation |
| Object IDs | deterministic teaching labels (`O1`, `O2`, …), not addresses |
| Reachability | calculated from current locals/fields/array slots plus string-literal roots; no garbage collector is modeled |

Numeric promotion, compile-time type analysis, floating-point edge cases, String pooling/identity outside the documented literal model, class initialization, JVM optimizations, and Java's complete runtime semantics are not implemented. The diagrams are conceptual and must not be interpreted as a physical JVM stack/heap dump.

## How one trace stays synchronized

1. The worker tokenizes and parses a whitelist grammar; learner source is never passed to JavaScript `eval`, `Function`, a shell, or a server.
2. The interpreter executes supported statements and records an immutable snapshot after each meaningful event.
3. Each snapshot contains the source line, stack frames/locals, conceptual heap objects, algorithm-relevant indices, console text so far, and an explanation.
4. The UI selects one event index. The editor highlight, memory/array panels, console, and explanation all render from that same event. Previous/next/play are trace replay, not a second execution path.

## Documentation

- [Architecture and trace model](docs/architecture.md)
- [Security and privacy boundaries](docs/security.md)
- [Testing and known validation gaps](docs/testing.md)
- [Static deployment guide](docs/deployment.md)
- [Reference-product comparison and gaps](docs/reference-review.md)
- [Implementation checklist](TASKS.md)

## Validation status

The checked-in tests exercise the interpreter, example programs, error reporting, execution budget, trace snapshots, and the 60-day curriculum. They do not establish compatibility with `javac`/a JVM. The development host used for this build had no Java/Javac runtime; no JVM cross-validation is claimed. See [testing notes](docs/testing.md) for exact commands and remaining manual QA.
