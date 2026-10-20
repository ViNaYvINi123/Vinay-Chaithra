import type { CurriculumLesson } from './curriculum';

export const STARTER_SAMPLE = `class LinearSearch {
    public static void main(String[] args) {
        int[] values = {4, 1, 7, 2};
        int target = 7;

        for (int index = 0; index < values.length; index++) {
            if (values[index] == target) {
                System.out.println(index);
                return;
            }
        }
        System.out.println(-1);
    }
}`;

const foundationSample = `class Branching {
    public static void main(String[] args) {
        int score = 72;
        int passingScore = 60;

        if (score >= passingScore) {
            System.out.println(score);
        } else {
            System.out.println(0);
        }
    }
}`;

const arraySample = STARTER_SAMPLE;

const frequencySample = `class FrequencyTable {
    public static void main(String[] args) {
        int[] values = {2, 1, 2, 0, 2};
        int[] counts = new int[3];

        for (int index = 0; index < values.length; index++) {
            int value = values[index];
            counts[value]++;
        }
        System.out.println(counts[2]);
    }
}`;

const recursionSample = `class RecursionTrace {
    public static void main(String[] args) {
        int answer = factorial(4);
        System.out.println(answer);
    }

    static int factorial(int number) {
        if (number <= 1) {
            return 1;
        }
        return number * factorial(number - 1);
    }
}`;

const linkedListSample = `class Node {
    int value;
    Node next;
}

class LinkedWalk {
    public static void main(String[] args) {
        Node first = new Node();
        Node second = new Node();
        first.value = 4;
        second.value = 9;
        first.next = second;

        Node current = first;
        while (current != null) {
            System.out.println(current.value);
            current = current.next;
        }
    }
}`;

const stackQueueSample = `class StackWalk {
    public static void main(String[] args) {
        int[] stack = new int[4];
        int top = -1;

        stack[++top] = 10;
        stack[++top] = 20;
        System.out.println(stack[top]);
        top--;
        System.out.println(stack[top]);
    }
}`;

const treeSample = `class TreeNode {
    int value;
    TreeNode left;
    TreeNode right;
}

class TreeWalk {
    public static void main(String[] args) {
        TreeNode root = new TreeNode();
        TreeNode left = new TreeNode();
        TreeNode right = new TreeNode();
        root.value = 2;
        left.value = 1;
        right.value = 3;
        root.left = left;
        root.right = right;
        preorder(root);
    }

    static void preorder(TreeNode node) {
        if (node == null) {
            return;
        }
        System.out.println(node.value);
        preorder(node.left);
        preorder(node.right);
    }
}`;

const graphSample = `class GraphBfs {
    public static void main(String[] args) {
        int[] from = {0, 0, 1, 2};
        int[] to = {1, 2, 3, 3};
        int[] queue = new int[4];
        boolean[] visited = new boolean[4];
        int head = 0;
        int tail = 0;
        queue[tail] = 0;
        tail++;
        visited[0] = true;

        while (head < tail) {
            int node = queue[head];
            head++;
            System.out.println(node);
            for (int edge = 0; edge < from.length; edge++) {
                if (from[edge] == node && !visited[to[edge]]) {
                    int next = to[edge];
                    visited[next] = true;
                    queue[tail] = next;
                    tail++;
                }
            }
        }
    }
}`;

export function sampleForLesson(lesson: CurriculumLesson): string {
  if (lesson.week === 1) return foundationSample;
  if (lesson.week === 2 || lesson.week === 3) return arraySample;
  if (lesson.week === 4) return frequencySample;
  if (lesson.week === 5) return recursionSample;
  if (lesson.week === 6) return linkedListSample;
  if (lesson.week === 7) return stackQueueSample;
  if (lesson.week === 8) return treeSample;
  return graphSample;
}
