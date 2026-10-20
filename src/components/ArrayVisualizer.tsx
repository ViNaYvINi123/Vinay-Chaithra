import { Grid2X2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { HeapObjectSnapshot, RuntimeValue, TraceEvent } from '../engine/types';

const pointerNames = ['index', 'i', 'j', 'left', 'right', 'low', 'high', 'mid', 'start', 'end', 'current'];

function valueLabel(value: RuntimeValue): string {
  if (value.kind === 'reference') return `↗ ${value.target}`;
  if (value.kind === 'null') return 'null';
  if (value.kind === 'uninitialized') return '—';
  if (value.kind === 'void') return 'void';
  return value.type === 'char' ? String(value.value) : String(value.value);
}

function valuesForArray(event: TraceEvent, object: HeapObjectSnapshot) {
  const values: Array<{ name: string; value: number }> = [];
  for (const frame of event.frames) {
    for (const local of frame.locals) {
      if (!pointerNames.includes(local.name) || local.value.kind !== 'primitive' || local.value.type === 'boolean') continue;
      if (typeof local.value.value !== 'number' || !Number.isInteger(local.value.value)) continue;
      const index = local.value.value;
      if (index >= 0 && index < object.elements.length) values.push({ name: local.name, value: index });
    }
  }
  return values;
}

export function ArrayVisualizer({ event }: { event?: TraceEvent }) {
  const arrays = event?.heap.filter((object) => object.kind === 'array') ?? [];
  if (!event || arrays.length === 0) {
    return (
      <div className="memory-empty">
        <span className="empty-illustration"><Grid2X2 size={23} /></span>
        <strong>No array in this snapshot</strong>
        <p>Allocate or initialize an array to see its indexed slots update with execution.</p>
      </div>
    );
  }

  const arrayNames = new Map<string, string[]>();
  for (const frame of event.frames) {
    for (const local of frame.locals) {
      if (local.value.kind !== 'reference') continue;
      const names = arrayNames.get(local.value.target) ?? [];
      names.push(local.name);
      arrayNames.set(local.value.target, names);
    }
  }

  return (
    <div className="array-visualizer">
      <div className="visualizer-note"><span className="dot dot-active" />current loop index <span className="dot dot-pointer" />other tracked index</div>
      {arrays.map((array) => {
        const pointers = valuesForArray(event, array);
        return (
          <section className="array-visual-section" key={array.id} aria-label={`Array ${array.id}`}>
            <div className="array-visual-head"><div><strong>{arrayNames.get(array.id)?.join(', ') || array.id}</strong><small>{array.typeName} · {array.elements.length} slots · {array.id}</small></div><span className={`reachability-pill ${array.reachable ? 'is-reachable' : ''}`}>{array.reachable ? 'reachable' : 'unreachable'}</span></div>
            <div className="array-visual-scroll">
              <div className="array-visual-grid" style={{ '--slot-count': Math.max(array.elements.length, 1) } as CSSProperties}>
                {array.elements.map((value, index) => {
                  const labels = pointers.filter((pointer) => pointer.value === index);
                  const active = labels.some((pointer) => ['index', 'i', 'mid', 'current'].includes(pointer.name));
                  return (
                    <div className={`array-visual-cell ${active ? 'cell-active' : labels.length ? 'cell-pointed' : ''}`} key={`${array.id}-cell-${index}`}>
                      <div className="cell-pointer-labels">{labels.map((pointer) => <span key={pointer.name}>{pointer.name}</span>)}</div>
                      <span className="cell-value">{valueLabel(value)}</span>
                      <span className="cell-index">{index}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {pointers.length === 0 && <p className="no-pointer-note">No tracked loop index points into this array at the current step.</p>}
          </section>
        );
      })}
      <div className="array-visual-footnote">Array IDs are trace labels, not memory addresses. Only one-dimensional arrays are modeled by this subset.</div>
    </div>
  );
}
