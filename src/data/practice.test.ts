import { describe, expect, it } from 'vitest';
import { normalizePracticeSessions } from './practice';

const validEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 'session-1', day: 1, title: 'Linear search', topic: 'Array scan', outcome: 'independent',
  minutes: 20, reflection: 'Checked the empty-array case.', createdAt: '2026-05-01T10:00:00.000Z', ...overrides,
});

describe('practice record storage normalization', () => {
  it('keeps only well-formed learner entries and bounds stored text', () => {
    const sessions = normalizePracticeSessions([
      validEntry({ title: 'x'.repeat(150), reflection: 'y'.repeat(700) }),
      validEntry({ outcome: 'auto-passed' }),
      validEntry({ day: 61 }),
      null,
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.title).toHaveLength(120);
    expect(sessions[0]?.reflection).toHaveLength(600);
  });

  it('caps retained history at the most recent 100 entries', () => {
    const entries = Array.from({ length: 120 }, (_, index) => validEntry({ id: `session-${index}` }));
    const sessions = normalizePracticeSessions(entries);
    expect(sessions).toHaveLength(100);
    expect(sessions[0]?.id).toBe('session-20');
  });
});
