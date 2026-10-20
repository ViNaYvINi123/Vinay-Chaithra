import { executeJavaSubset } from './javaSubset';
import type { TraceResult } from './types';

type RunMessage = { type: 'run'; requestId: string; source: string };
type WorkerReply = { type: 'result'; requestId: string; result: TraceResult };

const workerScope = self as unknown as {
  addEventListener: (type: 'message', listener: (event: MessageEvent<RunMessage>) => void) => void;
  postMessage: (message: WorkerReply) => void;
};

workerScope.addEventListener('message', (event) => {
  if (event.data.type !== 'run') return;
  const { requestId, source } = event.data;
  try {
    workerScope.postMessage({ type: 'result', requestId, result: executeJavaSubset(source) });
  } catch (error) {
    const result: TraceResult = {
      events: [],
      output: '',
      steps: 0,
      elapsedMs: 0,
      error: { type: 'WorkerError', message: error instanceof Error ? error.message : 'Execution worker failed.' },
    };
    workerScope.postMessage({ type: 'result', requestId, result });
  }
});
