export type PracticeOutcome = 'independent' | 'with-hints' | 'revisit';

export type PracticeSession = {
  id: string;
  day: number;
  title: string;
  topic: string;
  outcome: PracticeOutcome;
  minutes: number;
  reflection: string;
  createdAt: string;
};

export const practiceOutcomeLabels: Record<PracticeOutcome, string> = {
  independent: 'Solved independently',
  'with-hints': 'Solved with hints',
  revisit: 'Needs another pass',
};

export function normalizePracticeSessions(value: unknown): PracticeSession[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is PracticeSession => {
    if (!entry || typeof entry !== 'object') return false;
    const session = entry as Partial<PracticeSession>;
    return typeof session.id === 'string'
      && Number.isInteger(session.day) && (session.day ?? 0) >= 1 && (session.day ?? 0) <= 60
      && typeof session.title === 'string'
      && typeof session.topic === 'string'
      && (session.outcome === 'independent' || session.outcome === 'with-hints' || session.outcome === 'revisit')
      && Number.isInteger(session.minutes) && (session.minutes ?? 0) >= 1 && (session.minutes ?? 0) <= 180
      && typeof session.reflection === 'string'
      && typeof session.createdAt === 'string' && Number.isFinite(Date.parse(session.createdAt));
  }).slice(-100).map((session) => ({
    ...session,
    title: session.title.slice(0, 120),
    topic: session.topic.slice(0, 160),
    reflection: session.reflection.slice(0, 600),
  }));
}
