import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BookOpenCheck, Clock3, History, Trash2 } from 'lucide-react';
import type { CurriculumLesson } from '../data/curriculum';
import { practiceOutcomeLabels, type PracticeOutcome, type PracticeSession } from '../data/practice';

type PracticeDraft = Pick<PracticeSession, 'title' | 'outcome' | 'minutes' | 'reflection'>;
type PracticeLogProps = {
  lesson: CurriculumLesson;
  sessions: PracticeSession[];
  onAdd: (draft: PracticeDraft) => void;
  onDelete: (id: string) => void;
};

export function PracticeLog({ lesson, sessions, onAdd, onDelete }: PracticeLogProps) {
  const [title, setTitle] = useState(lesson.title);
  const [outcome, setOutcome] = useState<PracticeOutcome | ''>('');
  const [minutesText, setMinutesText] = useState('');
  const [reflection, setReflection] = useState('');

  useEffect(() => {
    setTitle(lesson.title);
    setOutcome('');
    setMinutesText('');
    setReflection('');
  }, [lesson.day, lesson.title]);

  const counts = useMemo(() => ({
    total: sessions.length,
    independent: sessions.filter((session) => session.outcome === 'independent').length,
    hints: sessions.filter((session) => session.outcome === 'with-hints').length,
    revisit: sessions.filter((session) => session.outcome === 'revisit').length,
  }), [sessions]);
  const recentSessions = [...sessions].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 6);
  const titleIsValid = title.trim().length > 0 && title.trim().length <= 120;
  const minutes = Number(minutesText);
  const minutesAreValid = /^\d+$/.test(minutesText) && Number.isInteger(minutes) && minutes >= 1 && minutes <= 180;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!outcome || !titleIsValid || !minutesAreValid) return;
    onAdd({ title: title.trim(), outcome, minutes, reflection: reflection.trim().slice(0, 600) });
    setOutcome('');
    setMinutesText('');
    setReflection('');
  };

  return (
    <section className="practice-log panel-card" aria-label="Local interview practice log">
      <div className="practice-log-header">
        <div><span className="practice-log-kicker">YOUR PRACTICE RECORD</span><h2>Log the work you actually did.</h2><p>Self-reported attempts only. These counts are not scores, ratings, or hiring predictions.</p></div>
        <span className="practice-log-local"><BookOpenCheck size={14} />Saved on this device</span>
      </div>
      <div className="practice-log-stats" aria-label="Practice log summary">
        <div><span>SESSIONS LOGGED</span><strong>{counts.total}</strong></div>
        <div><span>INDEPENDENT</span><strong>{counts.independent}</strong></div>
        <div><span>USED HINTS</span><strong>{counts.hints}</strong></div>
        <div><span>REVISIT</span><strong>{counts.revisit}</strong></div>
      </div>
      <div className="practice-log-grid">
        <form className="practice-log-form" onSubmit={submit}>
          <div className="practice-form-title"><span className="practice-form-icon"><Clock3 size={14} /></span><div><strong>Record an attempt</strong><small>Day {String(lesson.day).padStart(2, '0')} · {lesson.topic}</small></div></div>
          <label className="practice-field"><span>Problem or exercise</span><input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} required aria-label="Practice problem title" /></label>
          <div className="practice-form-row">
            <label className="practice-field"><span>How did it go?</span><select value={outcome} onChange={(event) => setOutcome(event.target.value as PracticeOutcome | '')} required aria-label="Practice outcome"><option value="" disabled>Choose outcome</option><option value="independent">Solved independently</option><option value="with-hints">Solved with hints</option><option value="revisit">Needs another pass</option></select></label>
            <label className="practice-field minutes-field"><span>Minutes</span><input type="number" min={1} max={180} step={1} value={minutesText} onChange={(event) => setMinutesText(event.target.value)} placeholder="e.g. 25" required aria-label="Practice duration in minutes" /></label>
          </div>
          <label className="practice-field"><span>One takeaway <small>(optional)</small></span><textarea value={reflection} maxLength={600} onChange={(event) => setReflection(event.target.value)} placeholder="What pattern or edge case did you learn?" aria-label="Practice takeaway" /></label>
          <button type="submit" className="log-attempt-button" disabled={!outcome || !titleIsValid || !minutesAreValid}>Save practice entry</button>
        </form>
        <div className="practice-history" aria-label="Recent practice entries">
          <div className="practice-history-heading"><div><span className="history-icon"><History size={14} /></span><strong>Recent entries</strong></div><span>{Math.min(counts.total, 6)} shown</span></div>
          {recentSessions.length === 0 ? (
            <div className="practice-history-empty"><History size={19} /><strong>Start your record</strong><p>After a real attempt, note the result and one thing to revisit. Nothing is auto-marked as solved.</p></div>
          ) : (
            <div className="practice-history-list">{recentSessions.map((session) => (
              <article className="practice-history-item" key={session.id}>
                <div className="practice-history-item-top"><div><strong>{session.title}</strong><small>Day {String(session.day).padStart(2, '0')} · {session.topic}</small></div><button type="button" className="delete-practice-entry" aria-label={`Delete practice entry: ${session.title}`} onClick={() => onDelete(session.id)}><Trash2 size={13} /></button></div>
                <div className="practice-history-meta"><span className={`outcome-pill outcome-${session.outcome}`}>{practiceOutcomeLabels[session.outcome]}</span><span>{session.minutes} min</span><time dateTime={session.createdAt}>{new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time></div>
                {session.reflection && <p className="practice-history-reflection">{session.reflection}</p>}
              </article>
            ))}</div>
          )}
        </div>
      </div>
    </section>
  );
}
