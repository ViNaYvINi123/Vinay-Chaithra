import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Circle,
  Code2, FileCode2, HardDrive, Lightbulb, Menu, Minus, Pause, Play, Plus,
  RotateCcw, Search, SkipBack, Sparkles, Timer, X,
} from 'lucide-react';
import type { EditorView } from '@codemirror/view';
import { curriculum, getLesson, weekTitles } from './data/curriculum';
import { sampleForLesson, STARTER_SAMPLE } from './data/samples';
import { DEFAULT_ALGORITHM_ID, getAlgorithmDemo, isAlgorithmId, type AlgorithmId } from './data/algorithms';
import { interviewFramework } from './data/interview';
import { normalizePracticeSessions, type PracticeSession } from './data/practice';
import { AlgorithmExplorer } from './components/AlgorithmExplorer';
import { PracticeLog } from './components/PracticeLog';
import { ArrayVisualizer } from './components/ArrayVisualizer';
import { MemoryDiagram } from './components/MemoryDiagram';
import type { TraceResult } from './engine/types';

const CodeEditor = lazy(() => import('./components/CodeEditor').then((module) => ({ default: module.CodeEditor })));

type ViewMode = 'learn' | 'explore' | 'practice' | 'interview';
type TraceTab = 'memory' | 'array';
type SavedLearningState = {
  selectedDay: number;
  completedDays: number[];
  source: string;
  notes: Record<string, string>;
  breakpoints: number[];
  fontSize: number;
  algorithmId: AlgorithmId;
  customValues: string;
  customTarget: string;
  interviewChecks: Record<string, string[]>;
  welcomeDismissed: boolean;
  practiceSessions: PracticeSession[];
};
type WorkerReply = { type: 'result'; requestId: string; result: TraceResult };

const STORAGE_KEY = 'java-dsa-academy.v1';
const defaultAlgorithm = getAlgorithmDemo(DEFAULT_ALGORITHM_ID);
const DEFAULT_STATE: SavedLearningState = {
  selectedDay: 1, completedDays: [], source: STARTER_SAMPLE, notes: {}, breakpoints: [], fontSize: 14,
  algorithmId: DEFAULT_ALGORITHM_ID, customValues: defaultAlgorithm.defaultValues.join(', '),
  customTarget: String(defaultAlgorithm.defaultTarget ?? 0), interviewChecks: {}, welcomeDismissed: false, practiceSessions: [],
};

function loadSavedState(): SavedLearningState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const saved = JSON.parse(raw) as Partial<SavedLearningState>;
    const selectedDay = Number.isInteger(saved.selectedDay) && (saved.selectedDay ?? 0) >= 1 && (saved.selectedDay ?? 0) <= 60 ? saved.selectedDay! : 1;
    const algorithmId = isAlgorithmId(saved.algorithmId) ? saved.algorithmId : DEFAULT_ALGORITHM_ID;
    const demo = getAlgorithmDemo(algorithmId);
    const rawChecks = saved.interviewChecks && typeof saved.interviewChecks === 'object' && !Array.isArray(saved.interviewChecks) ? Object.entries(saved.interviewChecks) : [];
    const interviewChecks = Object.fromEntries(rawChecks
      .filter(([day, steps]) => /^\d+$/.test(day) && Number(day) >= 1 && Number(day) <= 60 && Array.isArray(steps))
      .map(([day, steps]) => [day, [...new Set((steps as unknown[]).filter((step): step is string => typeof step === 'string' && interviewFramework.some((item) => item.id === step)))]]));
    return {
      selectedDay,
      completedDays: [...new Set(Array.isArray(saved.completedDays) ? saved.completedDays.filter((day): day is number => Number.isInteger(day) && day >= 1 && day <= 60) : [])],
      source: typeof saved.source === 'string' ? saved.source.slice(0, 16_000) : STARTER_SAMPLE,
      notes: saved.notes && typeof saved.notes === 'object' ? Object.fromEntries(Object.entries(saved.notes).filter((entry): entry is [string, string] => typeof entry[1] === 'string').map(([day, note]) => [day, note.slice(0, 10_000)])) : {},
      breakpoints: Array.isArray(saved.breakpoints) ? saved.breakpoints.filter((line): line is number => Number.isInteger(line) && line >= 1) : [],
      fontSize: typeof saved.fontSize === 'number' ? Math.min(20, Math.max(12, saved.fontSize)) : 14,
      algorithmId,
      customValues: typeof saved.customValues === 'string' ? saved.customValues.slice(0, 300) : demo.defaultValues.join(', '),
      customTarget: typeof saved.customTarget === 'string' ? saved.customTarget.slice(0, 20) : String(demo.defaultTarget ?? 0),
      interviewChecks,
      welcomeDismissed: saved.welcomeDismissed === true,
      practiceSessions: normalizePracticeSessions(saved.practiceSessions),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remaining = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
}

function App() {
  const [saved, setSaved] = useState<SavedLearningState>(loadSavedState);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [mode, setMode] = useState<ViewMode>('learn');
  const [traceTab, setTraceTab] = useState<TraceTab>('memory');
  const [lessonQuery, setLessonQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState(1);
  const [trace, setTrace] = useState<TraceResult | null>(null);
  const [traceIndex, setTraceIndex] = useState(-1);
  const [traceStatus, setTraceStatus] = useState<'idle' | 'running' | 'ready' | 'error'>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [interviewSeconds, setInterviewSeconds] = useState(30 * 60);
  const [interviewRunning, setInterviewRunning] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const runTimeoutRef = useRef<number | undefined>(undefined);
  const editorViewRef = useRef<EditorView | null>(null);

  const lesson = getLesson(saved.selectedDay);
  const completed = saved.completedDays.includes(lesson.day);
  const currentEvent = traceIndex >= 0 ? trace?.events[traceIndex] : undefined;
  const progressPercent = Math.round((saved.completedDays.length / curriculum.length) * 100);
  const filteredLessons = useMemo(() => {
    const query = lessonQuery.trim().toLowerCase();
    return curriculum.filter((item) => !query || `${item.title} ${item.topic} ${item.objective}`.toLowerCase().includes(query));
  }, [lessonQuery]);
  const lessonGroups = useMemo(() => {
    const weekNumbers = lessonQuery.trim() ? [...new Set(filteredLessons.map((item) => item.week))] : [lesson.week];
    return weekNumbers.map((week) => ({
      week,
      lessons: filteredLessons.filter((item) => item.week === week),
    }));
  }, [filteredLessons, lessonQuery, lesson.week]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      setStorageUnavailable(false);
    } catch {
      setStorageUnavailable(true);
    }
  }, [saved]);

  useEffect(() => () => {
    workerRef.current?.terminate();
    if (runTimeoutRef.current !== undefined) window.clearTimeout(runTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!isPlaying || !trace) return undefined;
    const timer = window.setTimeout(() => {
      const nextIndex = traceIndex + 1;
      if (nextIndex >= trace.events.length) {
        setIsPlaying(false);
        return;
      }
      setTraceIndex(nextIndex);
      if (saved.breakpoints.includes(trace.events[nextIndex]!.line)) setIsPlaying(false);
    }, 620);
    return () => window.clearTimeout(timer);
  }, [isPlaying, trace, traceIndex, saved.breakpoints]);

  useEffect(() => {
    if (!interviewRunning) return undefined;
    const timer = window.setInterval(() => {
      setInterviewSeconds((seconds) => {
        if (seconds <= 1) {
          setInterviewRunning(false);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [interviewRunning]);

  const updateSaved = useCallback((patch: Partial<SavedLearningState>) => {
    setSaved((current) => ({ ...current, ...patch }));
  }, []);

  const invalidateTrace = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    if (runTimeoutRef.current !== undefined) window.clearTimeout(runTimeoutRef.current);
    setIsPlaying(false);
    setTrace(null);
    setTraceIndex(-1);
    setTraceStatus('idle');
  }, []);

  const handleSourceChange = useCallback((source: string) => {
    updateSaved({ source });
    invalidateTrace();
  }, [invalidateTrace, updateSaved]);

  const selectLesson = (day: number) => {
    updateSaved({ selectedDay: day });
    setSidebarOpen(false);
    setInterviewRunning(false);
    setInterviewSeconds(30 * 60);
    setMode('learn');
  };

  const toggleComplete = () => {
    const completedDays = completed
      ? saved.completedDays.filter((day) => day !== lesson.day)
      : [...new Set([...saved.completedDays, lesson.day])].sort((a, b) => a - b);
    updateSaved({ completedDays });
  };

  const toggleInterviewCheck = (stepId: string) => {
    const key = String(lesson.day);
    const current = saved.interviewChecks[key] ?? [];
    const next = current.includes(stepId) ? current.filter((item) => item !== stepId) : [...current, stepId];
    updateSaved({ interviewChecks: { ...saved.interviewChecks, [key]: next } });
  };

  const addPracticeSession = (draft: Pick<PracticeSession, 'title' | 'outcome' | 'minutes' | 'reflection'>) => {
    const session: PracticeSession = {
      ...draft,
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      day: lesson.day,
      topic: lesson.topic,
      createdAt: new Date().toISOString(),
    };
    updateSaved({ practiceSessions: [...saved.practiceSessions, session].slice(-100) });
  };

  const deletePracticeSession = (id: string) => {
    updateSaved({ practiceSessions: saved.practiceSessions.filter((session) => session.id !== id) });
  };

  const resetTrace = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    if (runTimeoutRef.current !== undefined) window.clearTimeout(runTimeoutRef.current);
    setIsPlaying(false);
    setTrace(null);
    setTraceIndex(-1);
    setTraceStatus('idle');
  };

  const runProgram = (source: string = saved.source) => {
    workerRef.current?.terminate();
    if (runTimeoutRef.current !== undefined) window.clearTimeout(runTimeoutRef.current);
    setTrace(null);
    setTraceIndex(-1);
    setIsPlaying(false);
    setTraceStatus('running');
    const worker = new Worker(new URL('./engine/trace.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const finish = (result: TraceResult) => {
      if (runTimeoutRef.current !== undefined) window.clearTimeout(runTimeoutRef.current);
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      setTrace(result);
      setTraceIndex(result.events.length > 0 ? 0 : -1);
      setTraceStatus(result.error ? 'error' : 'ready');
    };
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      if (event.data.type === 'result' && event.data.requestId === requestId) finish(event.data.result);
    };
    worker.onerror = () => finish({
      events: [], output: '', steps: 0, elapsedMs: 0,
      error: { type: 'WorkerError', message: 'The execution worker failed to start. Try refreshing the page and rerunning.' },
    });
    runTimeoutRef.current = window.setTimeout(() => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      setTraceStatus('error');
      setTrace({ events: [], output: '', steps: 0, elapsedMs: 2500, error: { type: 'WorkerTimeout', message: 'Execution exceeded the 2.5 second wall-clock limit; the worker was terminated.' } });
      setTraceIndex(-1);
    }, 2500);
    worker.postMessage({ type: 'run', requestId, source });
  };

  const runAlgorithmSource = (source: string) => {
    handleSourceChange(source);
    runProgram(source);
  };

  const toggleBreakpoint = () => {
    const breakpoints = saved.breakpoints.includes(selectedLine)
      ? saved.breakpoints.filter((line) => line !== selectedLine)
      : [...saved.breakpoints, selectedLine].sort((a, b) => a - b);
    updateSaved({ breakpoints });
  };

  const selectMode = (nextMode: ViewMode) => {
    setMode(nextMode);
    if (nextMode === 'interview' && interviewSeconds === 0) setInterviewSeconds(30 * 60);
  };

  const onEditorReady = useCallback((view: EditorView) => {
    editorViewRef.current = view;
    setSelectedLine(view.state.doc.lineAt(view.state.selection.main.head).number);
  }, []);

  const setNotes = (value: string) => {
    updateSaved({ notes: { ...saved.notes, [String(lesson.day)]: value } });
  };

  const activeWeek = weekTitles[lesson.week - 1] ?? 'Learning path';
  const activeLine = currentEvent?.line ?? null;
  const isAtEnd = !trace || traceIndex >= trace.events.length - 1;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <button type="button" className="mobile-menu-button icon-button" aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setSidebarOpen((open) => !open)}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <span className="brand-mark" aria-hidden="true"><Code2 size={18} /></span>
          <div><strong>Java DSA Academy</strong><small>LEARN BY TRACING</small></div>
        </div>
        <div className="topbar-center"><span className="topbar-dot" />Local workspace <span className="topbar-divider">/</span> Day {String(lesson.day).padStart(2, '0')} of 60</div>
        <div className="topbar-right"><span className="saved-status"><HardDrive size={14} />{storageUnavailable ? 'Storage unavailable' : 'Saved in this browser'}</span><span className="topbar-avatar" aria-label="Local learner workspace">JS</span></div>
      </header>

      <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {sidebarOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
        <aside className="sidebar" aria-label="Learning navigation">
          <div className="sidebar-section-label">WORKSPACE</div>
          <nav className="primary-nav" aria-label="Workspace views">
            <button type="button" className={mode === 'learn' ? 'nav-item active' : 'nav-item'} onClick={() => selectMode('learn')}><BookOpen size={16} /><span>Learn</span><span className="nav-shortcut">01</span></button>
            <button type="button" className={mode === 'explore' ? 'nav-item active' : 'nav-item'} onClick={() => selectMode('explore')}><Activity size={16} /><span>Explore algorithms</span><span className="nav-shortcut">02</span></button>
            <button type="button" className={mode === 'practice' ? 'nav-item active' : 'nav-item'} onClick={() => selectMode('practice')}><Code2 size={16} /><span>Practice</span><span className="nav-shortcut">03</span></button>
            <button type="button" className={mode === 'interview' ? 'nav-item active' : 'nav-item'} onClick={() => selectMode('interview')}><Timer size={16} /><span>Interview prep</span><span className="nav-shortcut">04</span></button>
          </nav>

          <div className="sidebar-divider" />
          <div className="curriculum-heading"><div><span className="sidebar-section-label">CURRICULUM</span><span className="curriculum-count">60 days</span></div><span className="sidebar-progress-label">{saved.completedDays.length}/60</span></div>
          <div className="progress-track" role="progressbar" aria-label="Curriculum completion" aria-valuemin={0} aria-valuemax={60} aria-valuenow={saved.completedDays.length}><span style={{ width: `${progressPercent}%` }} /></div>
          <label className="lesson-search"><Search size={14} /><input value={lessonQuery} onChange={(event) => setLessonQuery(event.target.value)} placeholder="Find a lesson" aria-label="Search lessons" /><kbd>/</kbd></label>
          <div className="lesson-list" aria-label="Curriculum lessons">
            {lessonGroups.length ? lessonGroups.map((group) => (
              <div key={group.week}>
                <div className="week-label"><span>WEEK {String(group.week).padStart(2, '0')}</span><span className="week-title" title={weekTitles[group.week - 1]}>{weekTitles[group.week - 1]}</span></div>
                {group.lessons.map((item) => {
                  const isCurrent = item.day === lesson.day;
                  const isDone = saved.completedDays.includes(item.day);
                  return (
                    <button type="button" key={item.day} className={`lesson-link ${isCurrent ? 'current' : ''}`} onClick={() => selectLesson(item.day)} aria-current={isCurrent ? 'page' : undefined}>
                      <span className={`lesson-status ${isDone ? 'lesson-done' : isCurrent ? 'lesson-now' : ''}`}>{isDone ? <Check size={11} /> : String(item.day).padStart(2, '0')}</span>
                      <span className="lesson-link-title">{item.title}</span>
                      {isCurrent && <span className="lesson-active-dot" />}
                    </button>
                  );
                })}
              </div>
            )) : <p className="no-results">No matching lessons. Try another term.</p>}
          </div>
          <div className="sidebar-foot">
            <div className="sidebar-foot-icon"><Activity size={15} /></div>
            <div><strong>Progress is yours</strong><p>Notes and completion stay on this device.</p></div>
          </div>
        </aside>

        <main className="main-content">
          <div className="page-context">
            <div className="breadcrumb">{mode === 'explore' ? <><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>Algorithm playground</strong></> : <><span>Curriculum</span><span className="breadcrumb-separator">/</span><span>{activeWeek}</span><span className="breadcrumb-separator">/</span><strong>Day {String(lesson.day).padStart(2, '0')}</strong></>}</div>
            <div className="day-switcher">
              <button type="button" className="icon-button small" aria-label="Previous lesson" onClick={() => selectLesson(Math.max(1, lesson.day - 1))} disabled={lesson.day === 1}><ArrowLeft size={15} /></button>
              <span>{String(lesson.day).padStart(2, '0')} <i>/</i> 60</span>
              <button type="button" className="icon-button small" aria-label="Next lesson" onClick={() => selectLesson(Math.min(60, lesson.day + 1))} disabled={lesson.day === 60}><ArrowRight size={15} /></button>
            </div>
          </div>

          <section className="lesson-heading">
            <div className="lesson-heading-copy">
              {mode === 'explore' ? (
                <div className="eyebrow"><span>ALGORITHM PLAYGROUND</span><span className="eyebrow-dot">·</span><span>Search · sort · pointers</span></div>
              ) : (
                <div className="eyebrow"><span>WEEK {String(lesson.week).padStart(2, '0')}</span><span className="eyebrow-dot">·</span><span>{lesson.topic}</span></div>
              )}
              <h1>{mode === 'explore' ? 'Explore algorithms' : lesson.title}</h1>
              <p>{mode === 'explore' ? 'Change the input, state the pattern’s invariant, and step through the generated Java trace.' : lesson.objective}</p>
            </div>
            {mode === 'explore' ? (
              <div className="explore-heading-pill"><Activity size={14} />4 runnable patterns</div>
            ) : (
              <div className="lesson-heading-actions">
                <button type="button" className={`complete-button ${completed ? 'completed' : ''}`} onClick={toggleComplete} aria-pressed={completed}>
                  {completed ? <CheckCircle2 size={15} /> : <Check size={15} />}{completed ? 'Completed' : 'Mark complete'}
                </button>
                <span className="self-report-note">Self-reported progress</span>
              </div>
            )}
          </section>

          {mode === 'learn' && !saved.welcomeDismissed && (
            <section className="first-run-card" aria-label="Your first learner goal">
              <div className="first-run-main">
                <div className="first-run-kicker"><span>FIRST LEARNER</span><span className="eyebrow-dot">·</span><span>YOUR GOAL</span></div>
                <h2>Prepare for top-tech DSA interviews</h2>
                <p>Build a repeatable routine: understand one pattern, trace it, explain why it works, then test edge cases.</p>
                <div className="first-run-loop" aria-label="Daily practice loop"><span><b>01</b> Learn</span><i>→</i><span><b>02</b> Solve</span><i>→</i><span><b>03</b> Explain</span><i>→</i><span><b>04</b> Review</span></div>
              </div>
              <div className="first-run-action"><small>A focused plan—not a hiring promise.</small><button type="button" className="first-run-button" onClick={() => updateSaved({ welcomeDismissed: true })}>{lesson.day === 1 ? 'Start Day 1' : 'Continue lesson'} <ArrowRight size={14} /></button></div>
            </section>
          )}

          {mode === 'learn' && (
            <section className="learning-strip" aria-label="Lesson checkpoint">
              <div className="learning-strip-icon"><Lightbulb size={17} /></div>
              <div><span className="strip-label">TODAY’S CHECKPOINT</span><p>{lesson.checkpoint}</p></div>
              <button type="button" className="strip-action" onClick={() => selectMode('practice')}>Try the prompt <ArrowRight size={14} /></button>
            </section>
          )}
          {mode === 'practice' && (
            <>
              <section className="challenge-card" aria-label="Practice prompt">
                <div className="challenge-icon"><FileCode2 size={17} /></div>
                <div className="challenge-copy"><span className="strip-label">PRACTICE · DAY {String(lesson.day).padStart(2, '0')}</span><p>{lesson.exercise}</p><small>Try it yourself first. Then load the weekly example if you want to inspect a worked trace.</small></div>
                <button type="button" className="secondary-button" onClick={() => handleSourceChange(sampleForLesson(lesson))}>Load example <Code2 size={14} /></button>
              </section>
              <PracticeLog lesson={lesson} sessions={saved.practiceSessions} onAdd={addPracticeSession} onDelete={deletePracticeSession} />
            </>
          )}
          {mode === 'interview' && (
            <>
              <section className="interview-card" aria-label="Interview practice prompt">
                <div className="interview-prompt"><span className="strip-label">INTERVIEW PRACTICE · NO AUTO-SCORING</span><p>{lesson.interviewPrompt}</p><small>Explain your reasoning aloud or write notes below. This is a self-guided prompt, not an external interview.</small></div>
                <div className="timer-widget"><div className={interviewSeconds < 60 ? 'timer-value timer-warning' : 'timer-value'}>{formatClock(interviewSeconds)}</div><div className="timer-controls"><button type="button" className="timer-action" onClick={() => setInterviewRunning((running) => !running)}>{interviewRunning ? <Pause size={13} /> : <Play size={13} />}{interviewRunning ? 'Pause' : interviewSeconds === 30 * 60 ? 'Start 30 min' : 'Resume'}</button><button type="button" className="timer-reset" aria-label="Reset interview timer" onClick={() => { setInterviewRunning(false); setInterviewSeconds(30 * 60); }}><RotateCcw size={13} /></button></div></div>
              </section>
              <section className="interview-framework" aria-label="Self-coached interview framework">
                <div className="framework-heading"><div><span className="strip-label">A REPEATABLE ROUND ROUTINE</span><h2>Talk through the solution, not just the code.</h2><p>Use these prompts to structure your answer; this checklist is self-reflection, not an assessment score.</p></div><span className="framework-count">{(saved.interviewChecks[String(lesson.day)] ?? []).length}/{interviewFramework.length} noted</span></div>
                <div className="framework-list">{interviewFramework.map((step, index) => {
                  const checked = (saved.interviewChecks[String(lesson.day)] ?? []).includes(step.id);
                  return <button type="button" key={step.id} className={`framework-step ${checked ? 'checked' : ''}`} aria-pressed={checked} onClick={() => toggleInterviewCheck(step.id)}><span className="framework-check">{checked && <Check size={12} />}</span><span className="framework-copy"><strong>{String(index + 1).padStart(2, '0')} · {step.title}</strong><small>{step.detail}</small></span></button>;
                })}</div>
              </section>
            </>
          )}

          {mode === 'explore' && (
            <AlgorithmExplorer
              algorithmId={saved.algorithmId}
              valuesText={saved.customValues}
              targetText={saved.customTarget}
              onAlgorithmChange={(algorithmId) => {
                const nextDemo = getAlgorithmDemo(algorithmId);
                updateSaved({ algorithmId, customValues: nextDemo.defaultValues.join(', '), customTarget: String(nextDemo.defaultTarget ?? saved.customTarget) });
                invalidateTrace();
              }}
              onValuesChange={(customValues) => { updateSaved({ customValues }); invalidateTrace(); }}
              onTargetChange={(customTarget) => { updateSaved({ customTarget }); invalidateTrace(); }}
              onLoadSource={handleSourceChange}
              onRunSource={runAlgorithmSource}
            />
          )}

          <div className="workspace-heading">
            <div><h2>Execution workspace</h2><p>One trace drives the code highlight, output, and memory views.</p></div>
            <div className="execution-badge"><span /> Java subset · runs locally</div>
          </div>

          <section className="workspace-grid" aria-label="Java trace workspace">
            <div className="editor-panel panel-card">
              <div className="editor-panel-header">
                <div className="panel-title-group"><span className="file-icon"><Code2 size={15} /></span><div><strong>Java playground</strong><small>Editable source · browser-only execution</small></div></div>
                <div className="editor-toolbar">
                  <button type="button" className="toolbar-button load-example" onClick={() => handleSourceChange(sampleForLesson(lesson))} title="Replace the editor with this week’s runnable example"><RotateCcw size={13} /><span>Load example</span></button>
                  <button type="button" className={`toolbar-button breakpoint-button ${saved.breakpoints.includes(selectedLine) ? 'selected' : ''}`} onClick={toggleBreakpoint} title={`Toggle breakpoint on line ${selectedLine}`} aria-pressed={saved.breakpoints.includes(selectedLine)}><Circle size={13} /><span>Breakpoint</span></button>
                  <span className="toolbar-divider" />
                  <button type="button" className="zoom-button" aria-label="Decrease editor font size" onClick={() => updateSaved({ fontSize: Math.max(12, saved.fontSize - 1) })} disabled={saved.fontSize <= 12}><Minus size={13} /></button>
                  <span className="font-size-label">{saved.fontSize}</span>
                  <button type="button" className="zoom-button" aria-label="Increase editor font size" onClick={() => updateSaved({ fontSize: Math.min(20, saved.fontSize + 1) })} disabled={saved.fontSize >= 20}><Plus size={13} /></button>
                </div>
              </div>
              <div className="editor-meta"><span className="language-indicator"><span />Java</span><span className="editor-meta-right">{saved.source.length.toLocaleString()} / 16,000 chars <span>·</span> no files, network, or reflection</span></div>
              <div className="code-editor-container">
                <Suspense fallback={<div className="code-editor-loading" role="status">Loading Java editor…</div>}>
                  <CodeEditor value={saved.source} onChange={handleSourceChange} activeLine={activeLine} breakpoints={saved.breakpoints} onSelectedLine={setSelectedLine} onViewReady={onEditorReady} fontSize={saved.fontSize} />
                </Suspense>
              </div>
              <div className="editor-helper"><span><Lightbulb size={13} /> Select a line, then add a breakpoint. Step controls replay recorded snapshots.</span><span>Line {selectedLine}</span></div>
              <div className="execution-controls">
                <button type="button" className="run-button" onClick={() => runProgram()} disabled={traceStatus === 'running'}><Play size={14} fill="currentColor" />{traceStatus === 'running' ? 'Tracing…' : 'Run trace'}</button>
                <div className="step-controls" aria-label="Trace playback controls">
                  <button type="button" className="step-button" onClick={() => { setIsPlaying(false); setTraceIndex(-1); }} disabled={!trace || traceIndex < 0} aria-label="Rewind trace" title="Rewind to before the first event"><SkipBack size={15} /></button>
                  <button type="button" className="step-button" onClick={() => { setIsPlaying(false); setTraceIndex((index) => Math.max(-1, index - 1)); }} disabled={!trace || traceIndex <= 0} aria-label="Step backward" title="Previous event"><ArrowLeft size={15} /></button>
                  <button type="button" className="step-button play-step" onClick={() => setIsPlaying((playing) => !playing)} disabled={!trace || isAtEnd} aria-label={isPlaying ? 'Pause trace playback' : 'Play trace'} title={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}</button>
                  <button type="button" className="step-button" onClick={() => { setIsPlaying(false); setTraceIndex((index) => Math.min((trace?.events.length ?? 1) - 1, index + 1)); }} disabled={!trace || isAtEnd} aria-label="Step forward" title="Next event"><ArrowRight size={15} /></button>
                </div>
                <div className="step-count">{trace ? <><strong>{traceIndex >= 0 ? traceIndex + 1 : 0}</strong><span> / {trace.events.length}</span></> : <span>Trace not run</span>}</div>
                <button type="button" className="reset-button" onClick={resetTrace} disabled={!trace && traceStatus !== 'running'}><RotateCcw size={14} /><span>Reset</span></button>
              </div>
              <div className="subset-notice"><span className="notice-mark">i</span><span>Restricted Java subset. Unsupported syntax stops with a message; this is not a full Java compiler or JVM.</span></div>
            </div>

            <div className="inspector-column">
              <section className="inspector-panel panel-card" aria-label="Trace inspector">
                <div className="inspector-header">
                  <div><span className="inspector-kicker">LIVE TRACE</span><strong>{currentEvent ? currentEvent.label : 'Inspect a run'}</strong></div>
                  <span className="trace-position">{currentEvent ? `#${String(currentEvent.index + 1).padStart(2, '0')}` : '—'}</span>
                </div>
                <div className="inspector-tabs" role="tablist" aria-label="Trace state view">
                  <button type="button" role="tab" aria-selected={traceTab === 'memory'} className={traceTab === 'memory' ? 'inspector-tab selected' : 'inspector-tab'} onClick={() => setTraceTab('memory')}><Activity size={14} />Memory</button>
                  <button type="button" role="tab" aria-selected={traceTab === 'array'} className={traceTab === 'array' ? 'inspector-tab selected' : 'inspector-tab'} onClick={() => setTraceTab('array')}><span className="array-tab-icon">▦</span>Arrays</button>
                  <div className="inspector-tab-spacer" />
                  <span className="snapshot-label">snapshot {currentEvent ? String(currentEvent.index + 1).padStart(2, '0') : '—'}</span>
                </div>
                <div className="inspector-body" role="tabpanel">
                  {traceTab === 'memory' ? <MemoryDiagram event={currentEvent} /> : <ArrayVisualizer event={currentEvent} />}
                </div>
                <div className="console-panel">
                  <div className="console-header"><div><span className="console-led" /><strong>Program output</strong><small>stdout</small></div><span className="console-mode">TRACE-DRIVEN</span></div>
                  <pre className="console-output" aria-live="polite">{currentEvent?.output || (trace ? '(no output at this step)' : 'Run the sample to see program output here.')}</pre>
                  {trace?.error && <div className="execution-error" role="alert"><strong>{trace.error.type}</strong><span>{trace.error.message}{trace.error.line ? ` (line ${trace.error.line}${trace.error.column ? `, column ${trace.error.column}` : ''})` : ''}</span></div>}
                  {trace && !trace.error && <div className="trace-timing">{trace.steps.toLocaleString()} interpreter steps · {trace.elapsedMs} ms in worker</div>}
                </div>
              </section>
            </div>
          </section>

          <section className="explanation-card" aria-live="polite" aria-label="Execution explanation">
            <div className="explanation-rail"><span className="explanation-icon"><Sparkles size={15} /></span><div><span className="explanation-kicker">TRACE NOTE</span><small>{currentEvent ? `EVENT ${String(currentEvent.index + 1).padStart(2, '0')} · LINE ${currentEvent.line}` : 'RULE-BASED · NO AI'}</small></div></div>
            {currentEvent ? (
              <div className="explanation-content"><h3>{currentEvent.label}</h3><p className="explanation-why">{currentEvent.why}</p><div className="explanation-grid"><div><span>Memory change</span><p>{currentEvent.memoryChange}</p></div><div><span>Unchanged</span><p>{currentEvent.unchanged}</p></div><div><span>Next</span><p>{currentEvent.next}</p></div></div><div className="common-mistake"><Lightbulb size={14} /><span><strong>Watch for:</strong> {currentEvent.commonMistake}</span></div></div>
            ) : (
              <div className="explanation-content explanation-empty"><h3>Your trace, one event at a time</h3><p>Run the sample. The selected snapshot will drive the line highlight, call stack, conceptual heap, array view, output, and this explanation.</p><div className="empty-state-footnote"><span><Check size={13} />Deterministic snapshots</span><span><Check size={13} />No code sent to a server</span><span><Check size={13} />Unsupported syntax is explicit</span></div></div>
            )}
          </section>

          <section className="notes-card panel-card">
            <div className="notes-heading"><div><span className="notes-icon"><FileCode2 size={15} /></span><div><strong>My notes</strong><small>Saved locally for Day {lesson.day}</small></div></div><span className="notes-private"><HardDrive size={12} />Private to this browser</span></div>
            <textarea value={saved.notes[String(lesson.day)] ?? ''} onChange={(event) => setNotes(event.target.value)} maxLength={10_000} placeholder="Write down an invariant, edge case, or question to revisit…" aria-label={`Personal notes for day ${lesson.day}`} />
          </section>

          <footer className="page-footer"><span>Built for learning, not JVM certification.</span><span><span className="footer-status-dot" />{storageUnavailable ? 'Local storage is unavailable; changes may not persist' : 'Progress stored in this browser only'}</span></footer>
        </main>
      </div>
    </div>
  );
}

export default App;
