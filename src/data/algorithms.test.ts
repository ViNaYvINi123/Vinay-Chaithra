import { describe, expect, it } from 'vitest';
import { algorithmDemos, getAlgorithmDemo, parseCustomInput } from './algorithms';
import { executeJavaSubset } from '../engine/javaSubset';

describe('custom algorithm playground programs', () => {
  it('executes each generated Java example through the trace interpreter', () => {
    const expected: Record<string, string> = {
      'linear-search': '2\n',
      'binary-search': '4\n',
      'bubble-sort': '1\n2\n4\n5\n',
      'two-pointer-sum': '0\n4\n',
    };
    for (const demo of algorithmDemos) {
      const result = executeJavaSubset(demo.source(demo.defaultValues, demo.defaultTarget ?? 0));
      expect(result.error, `${demo.name}: ${result.error?.message}`).toBeUndefined();
      expect(result.output, demo.name).toBe(expected[demo.id]);
      expect(result.events.some((event) => event.kind === 'loop')).toBe(true);
    }
  });

  it('runs user-supplied values through generated code, including absent targets and duplicate values', () => {
    const linear = getAlgorithmDemo('linear-search').source([-3, 7, 7], 7);
    expect(executeJavaSubset(linear).output).toBe('1\n');
    const binary = getAlgorithmDemo('binary-search').source([1, 2, 4, 8], 5);
    expect(executeJavaSubset(binary).output).toBe('-1\n');
    const bubble = getAlgorithmDemo('bubble-sort').source([-1, 5, 0], 0);
    expect(executeJavaSubset(bubble).output).toBe('-1\n0\n5\n');
    const pair = getAlgorithmDemo('two-pointer-sum').source([2, 3, 4], 6);
    expect(executeJavaSubset(pair).output).toBe('0\n2\n');
  });

  it('accepts empty, signed, comma-separated integer input within the visualization limit', () => {
    expect(parseCustomInput('-3, 0, 17', '9').input).toEqual({ values: [-3, 0, 17], target: 9 });
    expect(parseCustomInput('', '0').input).toEqual({ values: [], target: 0 });
  });

  it('rejects malformed, out-of-range, and oversized custom arrays', () => {
    expect(parseCustomInput('1, two, 3', '4').error).toContain('whole numbers');
    expect(parseCustomInput('1, 2,', '4').error).toContain('separator');
    expect(parseCustomInput('2147483648', '0').error).toContain('32-bit');
    expect(parseCustomInput(Array.from({ length: 25 }, (_, index) => index).join(','), '0').error).toContain('24');
    expect(parseCustomInput('1, 2', '2.5').error).toContain('Target');
  });

  it('provides sorted-input constraints only for patterns that depend on ordering', () => {
    expect(getAlgorithmDemo('binary-search').sortedRequired).toBe(true);
    expect(getAlgorithmDemo('two-pointer-sum').sortedRequired).toBe(true);
    expect(getAlgorithmDemo('linear-search').sortedRequired).toBe(false);
    expect(getAlgorithmDemo('bubble-sort').sortedRequired).toBe(false);
  });
});
