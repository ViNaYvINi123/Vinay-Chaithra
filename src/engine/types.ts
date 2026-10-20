export type PrimitiveType = 'int' | 'long' | 'double' | 'float' | 'boolean' | 'char';

export type PrimitiveValue = {
  kind: 'primitive';
  type: PrimitiveType;
  value: number | boolean | string;
};

export type ReferenceValue = { kind: 'reference'; target: string };
export type NullValue = { kind: 'null' };
export type VoidValue = { kind: 'void' };
export type UninitializedValue = { kind: 'uninitialized' };
export type RuntimeValue = PrimitiveValue | ReferenceValue | NullValue | VoidValue | UninitializedValue;

export type HeapObjectSnapshot = {
  id: string;
  typeName: string;
  kind: 'object' | 'array' | 'string';
  fields: Array<{ name: string; type: string; value: RuntimeValue }>;
  elements: RuntimeValue[];
  elementType?: string;
  text?: string;
  reachable: boolean;
};

export type LocalSnapshot = {
  name: string;
  type: string;
  value: RuntimeValue;
  scopeDepth: number;
};

export type FrameSnapshot = {
  id: string;
  className: string;
  methodName: string;
  locals: LocalSnapshot[];
};

export type TraceKind = 'entry' | 'statement' | 'branch' | 'loop' | 'call' | 'return' | 'allocation' | 'mutation' | 'output' | 'exception' | 'complete';

export type TraceEvent = {
  index: number;
  line: number;
  kind: TraceKind;
  label: string;
  why: string;
  memoryChange: string;
  unchanged: string;
  next: string;
  commonMistake: string;
  frames: FrameSnapshot[];
  heap: HeapObjectSnapshot[];
  output: string;
  algorithmState: Record<string, string | number | boolean | null>;
  exception?: { type: string; message: string };
};

export type ExecutionError = {
  type: string;
  message: string;
  line?: number;
  column?: number;
};

export type TraceResult = {
  events: TraceEvent[];
  error?: ExecutionError;
  output: string;
  steps: number;
  elapsedMs: number;
};

export type ExecutionLimits = {
  maxSourceLength: number;
  maxSteps: number;
  maxTraceEvents: number;
  maxTraceValueUnits: number;
  maxArrayLength: number;
  maxHeapObjects: number;
  maxCallDepth: number;
};

export const DEFAULT_LIMITS: ExecutionLimits = {
  maxSourceLength: 16_000,
  maxSteps: 12_000,
  maxTraceEvents: 2_500,
  maxTraceValueUnits: 220_000,
  maxArrayLength: 256,
  maxHeapObjects: 512,
  maxCallDepth: 64,
};
