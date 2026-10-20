export type AlgorithmId = 'linear-search' | 'binary-search' | 'bubble-sort' | 'two-pointer-sum';

export type AlgorithmDemo = {
  id: AlgorithmId;
  name: string;
  pattern: string;
  prompt: string;
  invariant: string;
  time: string;
  space: string;
  defaultValues: number[];
  usesTarget: boolean;
  sortedRequired: boolean;
  defaultTarget?: number;
  source: (values: number[], target: number) => string;
};

const valuesDeclaration = (values: number[]) => `int[] values = {${values.join(', ')}};`;
const targetDeclaration = (target: number) => `int target = ${target};`;

export const algorithmDemos: AlgorithmDemo[] = [
  {
    id: 'linear-search',
    name: 'Linear search',
    pattern: 'Scan · unsorted input',
    prompt: 'Return the first index containing the target, or -1 when no value matches.',
    invariant: 'Before checking index, every earlier slot has already been checked and did not match.',
    time: 'O(n)',
    space: 'O(1)',
    defaultValues: [4, 1, 7, 2],
    usesTarget: true,
    sortedRequired: false,
    defaultTarget: 7,
    source: (values, target) => `class LinearSearchDemo {
    public static void main(String[] args) {
        ${valuesDeclaration(values)}
        ${targetDeclaration(target)}

        for (int index = 0; index < values.length; index++) {
            if (values[index] == target) {
                System.out.println(index);
                return;
            }
        }
        System.out.println(-1);
    }
}`,
  },
  {
    id: 'binary-search',
    name: 'Binary search',
    pattern: 'Divide and conquer · sorted input',
    prompt: 'Find the target in an ascending array by discarding half the remaining range at each comparison.',
    invariant: 'If the target exists, it remains between low and high inclusive.',
    time: 'O(log n)',
    space: 'O(1)',
    defaultValues: [1, 3, 4, 7, 9, 13],
    usesTarget: true,
    sortedRequired: true,
    defaultTarget: 9,
    source: (values, target) => `class BinarySearchDemo {
    public static void main(String[] args) {
        ${valuesDeclaration(values)}
        ${targetDeclaration(target)}
        int low = 0;
        int high = values.length - 1;

        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (values[mid] == target) {
                System.out.println(mid);
                return;
            }
            if (values[mid] < target) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        System.out.println(-1);
    }
}`,
  },
  {
    id: 'bubble-sort',
    name: 'Bubble sort',
    pattern: 'Sort · adjacent swaps',
    prompt: 'Sort the values in ascending order by swapping adjacent out-of-order pairs.',
    invariant: 'After each outer pass, the largest remaining unsorted value has moved to the end of the active range.',
    time: 'O(n²)',
    space: 'O(1)',
    defaultValues: [5, 1, 4, 2],
    usesTarget: false,
    sortedRequired: false,
    source: (values) => `class BubbleSortDemo {
    public static void main(String[] args) {
        ${valuesDeclaration(values)}

        for (int end = values.length - 1; end > 0; end--) {
            for (int index = 0; index < end; index++) {
                if (values[index] > values[index + 1]) {
                    int temporary = values[index];
                    values[index] = values[index + 1];
                    values[index + 1] = temporary;
                }
            }
        }
        for (int index = 0; index < values.length; index++) {
            System.out.println(values[index]);
        }
    }
}`,
  },
  {
    id: 'two-pointer-sum',
    name: 'Pair sum · two pointers',
    pattern: 'Two pointers · sorted input',
    prompt: 'Return two distinct indices whose values add to the target, or -1 when no pair exists.',
    invariant: 'All pairs outside the current left/right interval have been ruled out by sorted order.',
    time: 'O(n)',
    space: 'O(1)',
    defaultValues: [1, 2, 4, 6, 9],
    usesTarget: true,
    sortedRequired: true,
    defaultTarget: 10,
    source: (values, target) => `class PairSumDemo {
    public static void main(String[] args) {
        ${valuesDeclaration(values)}
        ${targetDeclaration(target)}
        int left = 0;
        int right = values.length - 1;

        while (left < right) {
            int sum = values[left] + values[right];
            if (sum == target) {
                System.out.println(left);
                System.out.println(right);
                return;
            }
            if (sum < target) {
                left++;
            } else {
                right--;
            }
        }
        System.out.println(-1);
    }
}`,
  },
];

export const DEFAULT_ALGORITHM_ID: AlgorithmId = 'linear-search';

export function isAlgorithmId(value: unknown): value is AlgorithmId {
  return typeof value === 'string' && algorithmDemos.some((demo) => demo.id === value);
}

export function getAlgorithmDemo(id: AlgorithmId): AlgorithmDemo {
  return algorithmDemos.find((demo) => demo.id === id) ?? algorithmDemos[0]!;
}

export type ParsedCustomInput = { values: number[]; target: number };

export function parseCustomInput(rawValues: string, rawTarget: string): { input?: ParsedCustomInput; error?: string } {
  const trimmed = rawValues.trim();
  const tokens = trimmed ? trimmed.split(/[\s,]+/) : [];
  if (tokens.some((token) => token === '')) return { error: 'Remove a leading or trailing separator, or enter an integer for each value.' };
  if (tokens.length > 24) return { error: 'Use at most 24 integers so each step stays readable.' };
  const values = tokens.map(Number);
  if (values.some((value) => !Number.isInteger(value) || value < -2_147_483_648 || value > 2_147_483_647)) {
    return { error: 'Enter only whole numbers in the signed 32-bit int range.' };
  }
  const target = rawTarget.trim() === '' ? 0 : Number(rawTarget);
  if (!Number.isInteger(target) || target < -2_147_483_648 || target > 2_147_483_647) {
    return { error: 'Target must be a whole number in the signed 32-bit int range.' };
  }
  return { input: { values, target } };
}
