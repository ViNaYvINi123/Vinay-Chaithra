import { useMemo } from 'react';
import { ArrowRight, Play } from 'lucide-react';
import { algorithmDemos, getAlgorithmDemo, parseCustomInput, type AlgorithmId } from '../data/algorithms';

type AlgorithmExplorerProps = {
  algorithmId: AlgorithmId;
  valuesText: string;
  targetText: string;
  onAlgorithmChange: (id: AlgorithmId) => void;
  onValuesChange: (values: string) => void;
  onTargetChange: (target: string) => void;
  onLoadSource: (source: string) => void;
  onRunSource: (source: string) => void;
};

export function AlgorithmExplorer({ algorithmId, valuesText, targetText, onAlgorithmChange, onValuesChange, onTargetChange, onLoadSource, onRunSource }: AlgorithmExplorerProps) {
  const demo = getAlgorithmDemo(algorithmId);
  const parsed = useMemo(() => parseCustomInput(valuesText, targetText), [valuesText, targetText]);
  const sortedError = demo.sortedRequired && parsed.input && parsed.input.values.some((value, index, values) => index > 0 && value < values[index - 1]!)
    ? 'This pattern needs ascending input. Sort the values first or choose another activity.'
    : undefined;
  const targetError = demo.usesTarget && targetText.trim() === '' ? 'Enter a target value for this activity.' : undefined;
  const error = parsed.error ?? targetError ?? sortedError;
  const source = parsed.input && !error ? demo.source(parsed.input.values, parsed.input.target) : '';

  return (
    <section className="algorithm-explorer panel-card" aria-label="Interactive algorithm playground">
      <div className="explorer-header">
        <div className="explorer-title"><span className="explorer-kicker">INTERACTIVE PLAYGROUND</span><h2>Choose a pattern. Change the input. Trace the code.</h2><p>Changing patterns loads a suggested input you can edit. The generated Java-subset program uses the same worker and trace views below.</p></div>
        <span className="explorer-step-label"><span />CUSTOM INPUT</span>
      </div>
      <div className="explorer-body">
        <div className="algorithm-picker" role="group" aria-label="Choose an algorithm">
          <span className="form-label">ALGORITHM</span>
          {algorithmDemos.map((item, index) => (
            <button type="button" key={item.id} className={`algorithm-choice ${item.id === demo.id ? 'selected' : ''}`} aria-pressed={item.id === demo.id} onClick={() => onAlgorithmChange(item.id)}>
              <span className="algorithm-choice-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="algorithm-choice-copy"><strong>{item.name}</strong><small>{item.pattern}</small></span>
              {item.id === demo.id && <ArrowRight size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
        <div className="explorer-details">
          <div className="activity-prompt"><span className="activity-label">PROBLEM</span><p>{demo.prompt}</p></div>
          <div className="custom-input-grid">
            <label className="custom-field array-input-field"><span>Integer array</span><input value={valuesText} onChange={(event) => onValuesChange(event.target.value)} placeholder="4, 1, 7, 2" aria-label="Custom integer array" aria-invalid={Boolean(parsed.error)} /><small>Comma or space separated · up to 24 values</small></label>
            {demo.usesTarget ? (
              <label className="custom-field target-input-field"><span>Target</span><input value={targetText} onChange={(event) => onTargetChange(event.target.value)} inputMode="numeric" placeholder="7" aria-label="Target integer" aria-invalid={Boolean(targetError)} /><small>Signed 32-bit integer</small></label>
            ) : (
              <div className="custom-field target-not-needed"><span>Target</span><div className="not-needed-value">Not used by this algorithm</div><small>Choose a search pattern to set a target</small></div>
            )}
          </div>
          {error && <p className="input-validation" role="alert">{error}</p>}
          <div className="demo-facts"><div><span>TIME</span><strong>{demo.time}</strong></div><div><span>EXTRA SPACE</span><strong>{demo.space}</strong></div><div className="demo-invariant"><span>TRACE INVARIANT</span><p>{demo.invariant}</p></div></div>
          <div className="explorer-actions">
            <button type="button" className="run-button explorer-run" disabled={Boolean(error)} onClick={() => onRunSource(source)}><Play size={13} fill="currentColor" />Run this input</button>
            <button type="button" className="load-source-button" disabled={Boolean(error)} onClick={() => onLoadSource(source)}><span>Load Java into editor</span><CodeGlyph /> </button>
            <span className="replacement-note">Run replaces the editor with this exact Java example.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function CodeGlyph() {
  return <span className="code-glyph" aria-hidden="true">{'{}'}</span>;
}
