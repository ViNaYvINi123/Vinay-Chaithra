import { describe, expect, it } from 'vitest';
import { executeJavaSubset } from './javaSubset';
import { curriculum, getLesson } from '../data/curriculum';
import { sampleForLesson, STARTER_SAMPLE } from '../data/samples';

const run = (body: string) => executeJavaSubset(body);
const program = (body: string) => `class Main { public static void main(String[] args) { ${body} } }`;

describe('bounded Java-subset interpreter', () => {
  it('runs the starter array search and records replayable line snapshots', () => {
    const result = run(STARTER_SAMPLE);
    expect(result.error).toBeUndefined();
    expect(result.output).toBe('2\n');
    expect(result.events.length).toBeGreaterThan(10);
    expect(result.events.at(-1)?.kind).toBe('complete');
    expect(result.events.some((event) => event.kind === 'branch')).toBe(true);
    expect(result.events.some((event) => event.kind === 'loop')).toBe(true);
    expect(result.events.every((event) => event.line >= 1)).toBe(true);
  });

  it('keeps output and memory aligned to each selected snapshot', () => {
    const result = run(STARTER_SAMPLE);
    const outputEvent = result.events.find((event) => event.kind === 'output');
    expect(outputEvent?.output).toBe('2\n');
    const arrayEvent = result.events.find((event) => event.kind === 'statement' && event.label.includes('Declare int[] values'));
    expect(arrayEvent?.frames[0]?.locals.find((local) => local.name === 'values')?.value).toEqual({ kind: 'reference', target: 'O2' });
    expect(arrayEvent?.heap.find((object) => object.id === 'O2')?.elements).toHaveLength(4);
    expect(arrayEvent?.heap.find((object) => object.id === 'O2')?.reachable).toBe(true);
  });

  it('uses explicit call frames and returns the recursive result', () => {
    const result = run(`class Recursion {
      static void main(String[] args) { int answer = factorial(4); System.out.println(answer); }
      static int factorial(int n) { if (n <= 1) { return 1; } return n * factorial(n - 1); }
    }`);
    expect(result.error).toBeUndefined();
    expect(result.output).toBe('24\n');
    expect(Math.max(...result.events.map((event) => event.frames.length))).toBeGreaterThanOrEqual(5);
    expect(result.events.filter((event) => event.kind === 'return').length).toBeGreaterThan(1);
  });

  it('models user objects as stable conceptual heap references', () => {
    const result = run(`class node { int value; node next; }
      class Main { static void main(String[] args) {
        node first = new node(); node second = new node();
        first.value = 4; second.value = 9; first.next = second;
        node cursor = first; System.out.println(cursor.next.value);
      } }`);
    expect(result.error).toBeUndefined();
    expect(result.output).toBe('9\n');
    const linked = result.events.find((event) => event.kind === 'mutation' && event.label.includes('.next ='));
    expect(linked?.heap.filter((object) => object.kind === 'object')).toHaveLength(2);
    expect(linked?.heap.every((object) => object.reachable)).toBe(true);
  });

  it('emulates Java int wraparound for supported 32-bit integer operations', () => {
    const result = run(program('int value = 2147483647; value++; System.out.println(value);'));
    expect(result.error).toBeUndefined();
    expect(result.output).toBe('-2147483648\n');
  });

  it('treats strings as references while printing their text', () => {
    const result = run(program('String greeting = "hello"; System.out.println(greeting);'));
    expect(result.error).toBeUndefined();
    expect(result.output).toBe('hello\n');
    const greeting = result.events.find((event) => event.kind === 'statement' && event.label.includes('Declare String greeting'));
    expect(greeting?.frames[0]?.locals.find((local) => local.name === 'greeting')?.value.kind).toBe('reference');
    expect(greeting?.heap.some((object) => object.kind === 'string' && object.text === 'hello')).toBe(true);
  });

  it('returns a useful runtime error for an array bounds violation without inventing later state', () => {
    const result = run(program('int[] values = {3}; System.out.println(values[2]); System.out.println(9);'));
    expect(result.error?.type).toBe('ArrayIndexOutOfBoundsException');
    expect(result.error?.line).toBe(1);
    expect(result.events.at(-1)?.kind).toBe('exception');
    expect(result.output).toBe('');
  });

  it('reports unsupported imports rather than simulating their behavior', () => {
    const result = run('import java.util.*; class Main { static void main(String[] args) {} }');
    expect(result.error?.type).toBe('UnsupportedSyntax');
    expect(result.events).toHaveLength(0);
  });

  it('rejects instance methods at parse time instead of silently ignoring them', () => {
    const result = run('class Main { void helper() {} static void main(String[] args) {} }');
    expect(result.error?.type).toBe('UnsupportedSyntax');
    expect(result.error?.message).toContain('Only static methods');
  });

  it('rejects multidimensional arrays explicitly', () => {
    const result = run(program('int[][] values = new int[2][2];'));
    expect(result.error?.type).toBe('UnsupportedSyntax');
    expect(result.error?.message).toContain('one-dimensional');
  });

  it('reports reads from uninitialized locals', () => {
    const result = run(program('int value; System.out.println(value);'));
    expect(result.error?.type).toBe('UninitializedVariable');
    expect(result.events.at(-1)?.exception?.type).toBe('UninitializedVariable');
  });

  it('enforces a deterministic execution-step budget for runaway loops', () => {
    const result = executeJavaSubset(program('int i = 0; while (true) { i++; }'), { maxSteps: 40, maxTraceEvents: 300 });
    expect(result.error?.type).toBe('ExecutionLimitExceeded');
    expect(result.steps).toBeGreaterThan(40);
    expect(result.steps).toBeLessThan(50);
  });

  it('limits accumulated snapshot state as well as event count', () => {
    const result = executeJavaSubset(program('int i = 0; while (i < 10) { i++; }'), { maxTraceValueUnits: 50 });
    expect(result.error?.type).toBe('TraceMemoryLimitExceeded');
    expect(result.events.length).toBeLessThan(10);
  });

  it('runs one executable sample for each curriculum week', () => {
    const expectedByWeek: Record<number, string> = {
      1: '72\n', 2: '2\n', 3: '2\n', 4: '3\n', 5: '24\n',
      6: '4\n9\n', 7: '20\n10\n', 8: '2\n1\n3\n', 9: '0\n1\n2\n3\n',
    };
    for (const week of Object.keys(expectedByWeek).map(Number)) {
      const result = run(sampleForLesson(getLesson(curriculum.find((lesson) => lesson.week === week)!.day)));
      expect(result.error, `week ${week}: ${result.error?.message}`).toBeUndefined();
      expect(result.output, `week ${week}`).toBe(expectedByWeek[week]);
    }
  });

  it('contains a complete, consecutive 60-day plan', () => {
    expect(curriculum).toHaveLength(60);
    expect(curriculum.map((lesson) => lesson.day)).toEqual(Array.from({ length: 60 }, (_, index) => index + 1));
    expect(getLesson(60).week).toBe(9);
  });
});
