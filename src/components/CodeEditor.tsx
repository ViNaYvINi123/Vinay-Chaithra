import { useEffect, useMemo, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { java } from '@codemirror/lang-java';
import { Decoration, EditorView, GutterMarker, gutter, type DecorationSet } from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';

const setExecutionLine = StateEffect.define<number | null>();
const refreshMarkers = StateEffect.define<void>();

const markerRefreshField = StateField.define<number>({
  create: () => 0,
  update(value, transaction) {
    return transaction.effects.some((effect) => effect.is(refreshMarkers)) ? value + 1 : value;
  },
});

const executionLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    let next = decorations.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (!effect.is(setExecutionLine)) continue;
      const lineNumber = effect.value;
      if (lineNumber === null || lineNumber < 1 || lineNumber > transaction.state.doc.lines) {
        next = Decoration.none;
      } else {
        const line = transaction.state.doc.line(lineNumber);
        next = Decoration.set([Decoration.line({ class: 'cm-execution-active' }).range(line.from)]);
      }
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

class BreakpointMarker extends GutterMarker {
  toDOM() {
    const dot = document.createElement('span');
    dot.className = 'cm-breakpoint-dot';
    dot.setAttribute('aria-hidden', 'true');
    dot.textContent = '●';
    return dot;
  }
  eq(other: BreakpointMarker) { return other instanceof BreakpointMarker; }
}

const breakpointMarker = new BreakpointMarker();

export type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  activeLine: number | null;
  breakpoints: number[];
  onSelectedLine: (line: number) => void;
  onViewReady: (view: EditorView) => void;
  fontSize: number;
};

export function CodeEditor({ value, onChange, activeLine, breakpoints, onSelectedLine, onViewReady, fontSize }: CodeEditorProps) {
  const viewRef = useRef<EditorView | null>(null);
  const breakpointsRef = useRef(new Set(breakpoints));
  const selectedLineHandler = useRef(onSelectedLine);
  const viewReadyHandler = useRef(onViewReady);
  breakpointsRef.current = new Set(breakpoints);
  selectedLineHandler.current = onSelectedLine;
  viewReadyHandler.current = onViewReady;

  const extensions = useMemo(() => [
    java(),
    executionLineField,
    markerRefreshField,
    gutter({
      class: 'cm-breakpoints',
      lineMarker: (view, line) => breakpointsRef.current.has(view.state.doc.lineAt(line.from).number) ? breakpointMarker : null,
      initialSpacer: () => breakpointMarker,
    }),
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (update.selectionSet) {
        const line = update.state.doc.lineAt(update.state.selection.main.head).number;
        selectedLineHandler.current(line);
      }
    }),
  ], []);

  const theme = useMemo(() => EditorView.theme({
    '&': { height: '100%', backgroundColor: 'var(--editor-bg)', color: 'var(--ink)', fontSize: `${fontSize}px` },
    '.cm-scroller': { fontFamily: 'var(--font-mono)', overflow: 'auto', lineHeight: '1.72' },
    '.cm-content': { minHeight: '300px', padding: '16px 0', caretColor: 'var(--accent)' },
    '.cm-line': { padding: '0 16px' },
    '.cm-gutters': { backgroundColor: 'var(--editor-bg)', color: 'var(--muted)', border: 'none', borderRight: '1px solid var(--line)' },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 12px 0 14px', minWidth: '36px' },
    '.cm-activeLineGutter': { color: 'var(--ink)' },
    '.cm-cursor': { borderLeftColor: 'var(--accent)' },
    '&.cm-focused': { outline: 'none' },
    '.cm-selectionBackground, ::selection': { backgroundColor: '#cfe2d6 !important' },
    '.cm-execution-active': { backgroundColor: 'rgba(235, 166, 73, 0.17)', borderLeft: '2px solid #d48a2f' },
    '.cm-breakpoints': { width: '14px' },
    '.cm-breakpoint-dot': { color: '#c9534f', fontSize: '10px', lineHeight: '1', display: 'inline-block', transform: 'translateX(2px)' },
    '.cm-tooltip': { backgroundColor: 'white', border: '1px solid var(--line)' },
  }, { dark: false }), [fontSize]);

  useEffect(() => {
    const view = viewRef.current;
    if (view) view.dispatch({ effects: setExecutionLine.of(activeLine) });
  }, [activeLine]);

  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      view.dispatch({ effects: refreshMarkers.of(undefined) });
      view.requestMeasure();
    }
  }, [breakpoints]);

  return (
    <div className="code-editor-shell" aria-label="Java code editor">
      <CodeMirror
        value={value}
        height="100%"
        theme={theme}
        extensions={extensions}
        onChange={onChange}
        onCreateEditor={(view) => {
          viewRef.current = view;
          viewReadyHandler.current(view);
          view.dispatch({ effects: setExecutionLine.of(activeLine) });
        }}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          indentOnInput: true,
          tabSize: 4,
          searchKeymap: true,
        }}
      />
    </div>
  );
}
