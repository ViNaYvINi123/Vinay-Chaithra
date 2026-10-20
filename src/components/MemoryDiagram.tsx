import { ArrowDownRight, CircleDot, Layers3, PackageOpen, Pointer } from 'lucide-react';
import type { HeapObjectSnapshot, RuntimeValue, TraceEvent } from '../engine/types';

function ValueChip({ value }: { value: RuntimeValue }) {
  if (value.kind === 'reference') return <span className="value-chip reference-value"><Pointer size={11} aria-hidden="true" />{value.target}</span>;
  if (value.kind === 'null') return <span className="value-chip null-value">null</span>;
  if (value.kind === 'uninitialized') return <span className="value-chip unset-value">unassigned</span>;
  if (value.kind === 'void') return <span className="value-chip unset-value">void</span>;
  const text = value.type === 'char' ? value.value === '\u0000' ? "'\\0'" : `'${String(value.value)}'` : String(value.value);
  return <span className={`value-chip primitive-value type-${value.type}`}>{text}</span>;
}

function HeapCard({ object }: { object: HeapObjectSnapshot }) {
  return (
    <article className={`heap-card ${object.reachable ? '' : 'heap-card-unreachable'}`} aria-label={`${object.typeName} ${object.id}`}>
      <div className="heap-card-head">
        <span className={`heap-kind-icon kind-${object.kind}`} aria-hidden="true">
          {object.kind === 'array' ? <Layers3 size={14} /> : object.kind === 'string' ? <PackageOpen size={14} /> : <CircleDot size={14} />}
        </span>
        <div className="heap-title"><strong>{object.id}</strong><span>{object.typeName}</span></div>
        <span className={`reachability-pill ${object.reachable ? 'is-reachable' : ''}`}>{object.reachable ? 'reachable' : 'unreachable'}</span>
      </div>
      {object.kind === 'string' ? (
        <div className="string-contents"><span>text</span><code>{JSON.stringify(object.text ?? '')}</code><small>immutable value</small></div>
      ) : object.kind === 'array' ? (
        <div className="array-slots" aria-label={`${object.elements.length} array elements`}>
          {object.elements.length === 0 ? <span className="empty-slots">empty array</span> : object.elements.map((value, index) => (
            <div className="array-slot" key={`${object.id}-${index}`}>
              <span className="slot-index">{index}</span><ValueChip value={value} />
            </div>
          ))}
        </div>
      ) : (
        <div className="field-list">
          {object.fields.length === 0 ? <span className="empty-slots">no instance fields</span> : object.fields.map((field) => (
            <div className="field-row" key={`${object.id}-${field.name}`}>
              <span className="field-name"><small>{field.type}</small>{field.name}</span><ValueChip value={field.value} />
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export function MemoryDiagram({ event }: { event?: TraceEvent }) {
  if (!event) {
    return (
      <div className="memory-empty">
        <span className="empty-illustration"><Layers3 size={23} /></span>
        <strong>Memory follows the trace</strong>
        <p>Run the sample to inspect stack frames, object references, and array slots.</p>
      </div>
    );
  }

  return (
    <div className="memory-diagram">
      <div className="memory-section">
        <div className="memory-section-title"><span className="section-icon stack-icon"><ArrowDownRight size={14} /></span><div><strong>Call stack</strong><small>frames active at this step</small></div><span className="section-count">{event.frames.length}</span></div>
        {event.frames.length === 0 ? <div className="stack-empty">No active method frame</div> : (
          <div className="stack-list">
            {event.frames.map((frame, index) => (
              <article className={`stack-frame ${index === event.frames.length - 1 ? 'top-frame' : ''}`} key={frame.id}>
                <div className="frame-head"><span>{frame.id}</span><strong>{frame.className}.{frame.methodName}()</strong><small>{index === event.frames.length - 1 ? 'active' : 'caller'}</small></div>
                {frame.locals.length === 0 ? <div className="frame-empty">No parameters or locals yet</div> : frame.locals.map((local) => (
                  <div className="local-row" key={`${frame.id}-${local.scopeDepth}-${local.name}`}>
                    <span className="local-name"><small>{local.type}</small>{local.name}</span><ValueChip value={local.value} />
                  </div>
                ))}
              </article>
            ))}
          </div>
        )}
      </div>
      <div className="memory-section heap-section">
        <div className="memory-section-title"><span className="section-icon heap-icon"><PackageOpen size={14} /></span><div><strong>Conceptual heap</strong><small>pedagogical object IDs · no addresses</small></div><span className="section-count">{event.heap.length}</span></div>
        <p className="memory-caveat">Reachability is inferred from visible locals, fields, arrays, and string literals. It is not a physical JVM memory map.</p>
        {event.heap.length === 0 ? <div className="stack-empty">No heap objects allocated yet</div> : (
          <div className="heap-list">{event.heap.map((object) => <HeapCard object={object} key={object.id} />)}</div>
        )}
      </div>
    </div>
  );
}
