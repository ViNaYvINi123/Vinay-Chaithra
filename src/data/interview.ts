export const interviewFramework = [
  { id: 'clarify', title: 'Clarify constraints', detail: 'Ask about input size, ordering, duplicates, invalid values, and required output.' },
  { id: 'baseline', title: 'State a correct baseline', detail: 'Give a simple approach first, then name its time and space cost.' },
  { id: 'invariant', title: 'Choose a pattern and invariant', detail: 'Explain why the data structure or pointer movement preserves correctness.' },
  { id: 'walkthrough', title: 'Walk a normal and edge case', detail: 'Use a small example, then test empty, one-item, duplicate, and boundary cases as relevant.' },
  { id: 'complexity', title: 'Analyze time and space', detail: 'Define n (and any other input sizes) before stating asymptotic costs.' },
  { id: 'communicate', title: 'Narrate and revisit', detail: 'Explain decisions while coding, then summarize correctness, cost, and remaining assumptions.' },
] as const;
