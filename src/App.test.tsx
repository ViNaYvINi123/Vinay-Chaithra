import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeJavaSubset } from './engine/javaSubset';
import type { TraceResult } from './engine/types';

type EditorMockProps = { value: string; onChange: (value: string) => void };

type RunMessage = { type: 'run'; requestId: string; source: string };
type WorkerReply = { type: 'result'; requestId: string; result: TraceResult };

vi.mock('./components/CodeEditor', () => ({
  CodeEditor: (props: EditorMockProps) => (
    <textarea aria-label="Java code editor mock" value={props.value} onChange={(event) => props.onChange(event.currentTarget.value)} />
  ),
}));

class InlineExecutionWorker {
  onmessage: ((event: MessageEvent<WorkerReply>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  constructor(_url: URL, _options?: WorkerOptions) { /* test executes the same interpreter without a browser worker thread */ }
  postMessage(message: RunMessage) {
    const result = executeJavaSubset(message.source);
    this.onmessage?.({ data: { type: 'result', requestId: message.requestId, result } } as MessageEvent<WorkerReply>);
  }
  terminate() { /* nothing to stop in the inline test double */ }
}

let root: Root | undefined;
let container: HTMLDivElement | undefined;

describe('academy workspace UI', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal('Worker', InlineExecutionWorker);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('renders the first lesson and exposes the 60-day path', async () => {
    const { default: App } = await import('./App');
    await act(async () => { root!.render(<App />); await Promise.resolve(); });
    expect(container?.textContent).toContain('Java DSA Academy');
    expect(container?.textContent).toContain('How a Java program runs');
    expect(container?.textContent).toContain('60 days');
    expect(container?.querySelector('[aria-label="Java trace workspace"]')).not.toBeNull();
  });

  it('shows and saves the first-learner goal without promising a hiring outcome', async () => {
    const { default: App } = await import('./App');
    await act(async () => { root!.render(<App />); await Promise.resolve(); });
    expect(container?.textContent).toContain('Prepare for top-tech DSA interviews');
    expect(container?.textContent).toContain('A focused plan—not a hiring promise.');
    const start = [...container!.querySelectorAll('button')].find((button) => button.textContent?.includes('Start Day 1'));
    await act(async () => { start?.click(); });
    expect(container?.querySelector('.first-run-card')).toBeNull();
    const saved = JSON.parse(window.localStorage.getItem('java-dsa-academy.v1') ?? '{}') as { welcomeDismissed?: boolean };
    expect(saved.welcomeDismissed).toBe(true);
  });

  it('runs source through the interpreter and advances the displayed snapshot', async () => {
    const { default: App } = await import('./App');
    await act(async () => { root!.render(<App />); await Promise.resolve(); });
    const button = (label: string) => [...container!.querySelectorAll('button')].find((item) => item.textContent?.includes(label));
    await act(async () => { button('Run trace')?.click(); });
    const output = container!.querySelector('.console-output');
    expect(output?.textContent).toContain('(no output at this step)');
    const forward = container!.querySelector<HTMLButtonElement>('button[aria-label="Step forward"]');
    for (let step = 0; step < 80 && !output?.textContent?.includes('2'); step += 1) {
      await act(async () => { forward?.click(); });
    }
    expect(output?.textContent).toContain('2');
    expect(container?.textContent).toContain('TRACE NOTE');
  });

  it('runs a selected custom-input algorithm from Explore through the Java trace', async () => {
    const { default: App } = await import('./App');
    await act(async () => { root!.render(<App />); await Promise.resolve(); });
    const button = (label: string) => [...container!.querySelectorAll('button')].find((item) => item.textContent?.includes(label));
    await act(async () => { button('Explore algorithms')?.click(); });
    expect(container?.textContent).toContain('Choose a pattern. Change the input. Trace the code.');
    expect(container?.querySelector('input[aria-label="Custom integer array"]')).not.toBeNull();
    await act(async () => { button('Run this input')?.click(); });
    expect((container?.querySelector('textarea[aria-label="Java code editor mock"]') as HTMLTextAreaElement | null)?.value).toContain('class LinearSearchDemo');
    expect(container?.querySelector('.execution-error')).toBeNull();
    await act(async () => { button('Binary search')?.click(); });
    expect((container?.querySelector('input[aria-label="Custom integer array"]') as HTMLInputElement).value).toBe('1, 3, 4, 7, 9, 13');
    expect((container?.querySelector('input[aria-label="Target integer"]') as HTMLInputElement).value).toBe('9');
    await act(async () => { button('Run this input')?.click(); });
    expect((container?.querySelector('textarea[aria-label="Java code editor mock"]') as HTMLTextAreaElement | null)?.value).toContain('class BinarySearchDemo');
    expect(container?.querySelector('.execution-error')).toBeNull();
  });

  it('stores interview reflection checks per lesson without assigning a score', async () => {
    const { default: App } = await import('./App');
    await act(async () => { root!.render(<App />); await Promise.resolve(); });
    const interview = [...container!.querySelectorAll('button')].find((button) => button.textContent?.includes('Interview prep'));
    await act(async () => { interview?.click(); });
    const clarify = [...container!.querySelectorAll('button')].find((button) => button.textContent?.includes('Clarify constraints'));
    await act(async () => { clarify?.click(); });
    expect(clarify?.getAttribute('aria-pressed')).toBe('true');
    const saved = JSON.parse(window.localStorage.getItem('java-dsa-academy.v1') ?? '{}') as { interviewChecks?: Record<string, string[]> };
    expect(saved.interviewChecks?.['1']).toContain('clarify');
  });

  it('records only a learner-submitted practice attempt and persists the summary source', async () => {
    const { default: App } = await import('./App');
    await act(async () => { root!.render(<App />); await Promise.resolve(); });
    const practice = [...container!.querySelectorAll('button')].find((button) => button.textContent?.includes('Practice'));
    await act(async () => { practice?.click(); });
    const outcome = container!.querySelector<HTMLSelectElement>('select[aria-label="Practice outcome"]');
    expect(outcome).not.toBeNull();
    const duration = container!.querySelector<HTMLInputElement>('input[aria-label="Practice duration in minutes"]');
    const save = [...container!.querySelectorAll('button')].find((button) => button.textContent?.includes('Save practice entry'));
    await act(async () => {
      outcome!.value = 'independent';
      outcome!.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(save?.disabled).toBe(true);
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(duration, '18');
      duration!.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(save?.disabled).toBe(false);
    await act(async () => { save?.click(); });
    const saved = JSON.parse(window.localStorage.getItem('java-dsa-academy.v1') ?? '{}') as { practiceSessions?: Array<{ outcome: string; title: string; day: number; minutes: number }> };
    expect(saved.practiceSessions).toHaveLength(1);
    expect(saved.practiceSessions?.[0]).toMatchObject({ outcome: 'independent', title: 'How a Java program runs', day: 1, minutes: 18 });
    expect(container?.textContent).toContain('Solved independently');
  });

  it('persists learner-marked completion in local browser storage', async () => {
    const { default: App } = await import('./App');
    await act(async () => { root!.render(<App />); await Promise.resolve(); });
    const complete = [...container!.querySelectorAll('button')].find((button) => button.textContent?.includes('Mark complete'));
    await act(async () => { complete?.click(); });
    const saved = JSON.parse(window.localStorage.getItem('java-dsa-academy.v1') ?? '{}') as { completedDays?: number[] };
    expect(saved.completedDays).toContain(1);
    expect(container?.textContent).toContain('Completed');
  });
});
