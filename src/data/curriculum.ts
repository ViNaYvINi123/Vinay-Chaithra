export type CurriculumLesson = {
  day: number;
  week: number;
  title: string;
  topic: string;
  objective: string;
  exercise: string;
  interviewPrompt: string;
  checkpoint: string;
};

type LessonSeed = Omit<CurriculumLesson, 'day' | 'week'>;

const weeks: Array<{ title: string; lessons: LessonSeed[] }> = [
  {
    title: 'Java foundations',
    lessons: [
      { title: 'How a Java program runs', topic: 'Source, statements, and execution order', objective: 'Trace a short method from its first statement to its return value.', exercise: 'Add three print statements and predict the output order before running the trace.', interviewPrompt: 'What happens between writing a Java source file and seeing its output?', checkpoint: 'I can explain what a statement does and identify the next statement that runs.' },
      { title: 'Variables and assignment', topic: 'Names, values, and reassignment', objective: 'Track how assigning a new value changes one local variable.', exercise: 'Set a balance, add a deposit, and print the updated value.', interviewPrompt: 'What is the difference between declaring a variable and assigning to it?', checkpoint: 'I can track a variable’s value after each assignment.' },
      { title: 'Primitive types', topic: 'int, long, double, boolean, and char', objective: 'Choose a primitive type and distinguish a value from a reference.', exercise: 'Store a count and a flag, then use the flag in a conditional.', interviewPrompt: 'Name Java’s primitive types and give a use for int and boolean.', checkpoint: 'I can recognize primitive values and explain that they are not heap references.' },
      { title: 'Branching with if and else', topic: 'Boolean conditions and control flow', objective: 'Predict which branch runs for a given condition.', exercise: 'Classify a score into passing and not-yet-passing outcomes.', interviewPrompt: 'How does Java choose between the branches of an if/else statement?', checkpoint: 'I can evaluate a condition and follow exactly one branch.' },
      { title: 'Loops and invariants', topic: 'for and while loops', objective: 'Track a loop counter, termination condition, and repeated work.', exercise: 'Sum the values in a small integer array.', interviewPrompt: 'What must eventually change for a loop to terminate?', checkpoint: 'I can trace a loop iteration by iteration and state its stopping condition.' },
      { title: 'Methods and call frames', topic: 'Parameters, locals, and return values', objective: 'Follow a method call and separate caller locals from callee locals.', exercise: 'Write a method that returns the larger of two integers.', interviewPrompt: 'What information belongs to a method’s stack frame?', checkpoint: 'I can explain where parameters and local variables live while a method runs.' },
      { title: 'Big-O first principles', topic: 'Input size and growth rates', objective: 'Count how work changes as a loop’s input grows.', exercise: 'Compare a single array pass with a nested pass on the same input.', interviewPrompt: 'Why is a linear scan O(n), and what does n represent?', checkpoint: 'I can identify constant, linear, and quadratic loop shapes.' },
    ],
  },
  {
    title: 'Arrays and strings',
    lessons: [
      { title: 'Array traversal', topic: 'Indices, bounds, and length', objective: 'Use a loop to visit each array element once without crossing its bounds.', exercise: 'Find the first occurrence of a target in an integer array.', interviewPrompt: 'Why does a Java array of length n use indices from 0 through n - 1?', checkpoint: 'I can trace an index and explain the valid range for an array.' },
      { title: 'Two-pointer patterns', topic: 'Converging indices', objective: 'Move two indices while preserving a clear stopping condition.', exercise: 'Check whether a sorted pair of endpoints reaches a target sum.', interviewPrompt: 'When can two pointers replace a nested loop?', checkpoint: 'I can explain why each pointer moves and when the search ends.' },
      { title: 'Array aggregates', topic: 'Min, max, and running totals', objective: 'Maintain a summary as one pass consumes an array.', exercise: 'Compute the minimum and sum of a non-empty array.', interviewPrompt: 'What invariant can you use while finding the minimum?', checkpoint: 'I can state what a running aggregate represents after each iteration.' },
      { title: 'Frequency tables', topic: 'Counting values with an indexed table', objective: 'Map a bounded integer value to a counter.', exercise: 'Count how many times each digit from 0 through 9 appears.', interviewPrompt: 'What assumptions make an array a useful frequency table?', checkpoint: 'I can justify the counter-array size and update rule.' },
      { title: 'Two-dimensional arrays', topic: 'Rows, columns, and nested loops', objective: 'Visit every cell using row and column indices.', exercise: 'Sum all cells in a small rectangular matrix.', interviewPrompt: 'How do the outer and inner loops map to matrix coordinates?', checkpoint: 'I can distinguish a row index from a column index.' },
      { title: 'Strings and character access', topic: 'String references and immutable text', objective: 'Reason about a String as a reference and inspect characters conceptually.', exercise: 'Describe a left-to-right scan that counts a chosen character.', interviewPrompt: 'Why does Java String immutability matter when building new text?', checkpoint: 'I can distinguish a String reference from a primitive char.' },
      { title: 'Palindrome check', topic: 'Symmetry and two pointers', objective: 'Compare matching positions from both ends of a sequence.', exercise: 'Plan a case-sensitive palindrome check and name its stopping condition.', interviewPrompt: 'How many comparisons are needed for a palindrome check?', checkpoint: 'I can express the palindrome condition using left and right indices.' },
    ],
  },
  {
    title: 'Searching and sorting',
    lessons: [
      { title: 'Linear search', topic: 'Sequential scan', objective: 'Return an index when a value is found and -1 otherwise.', exercise: 'Trace the target 7 through [4, 1, 7, 2].', interviewPrompt: 'What are the best- and worst-case comparisons for linear search?', checkpoint: 'I can state linear search’s result and O(n) worst-case work.' },
      { title: 'Binary search', topic: 'Halving a sorted search interval', objective: 'Update low, high, and mid without losing a possible answer.', exercise: 'Trace binary search for 13 in a sorted array of seven values.', interviewPrompt: 'What precondition does binary search require?', checkpoint: 'I can maintain the invariant that a possible answer remains inside the interval.' },
      { title: 'Bubble sort', topic: 'Adjacent swaps and passes', objective: 'Explain how a pass moves a large value toward the end.', exercise: 'Record every adjacent swap for [5, 2, 4].', interviewPrompt: 'Why does the largest unsorted item settle at the end of a bubble-sort pass?', checkpoint: 'I can trace one complete pass and bound the inner loop.' },
      { title: 'Selection sort', topic: 'Selecting the next minimum', objective: 'Track the smallest remaining item and its index.', exercise: 'Mark the minimum of each suffix in [4, 1, 3, 2].', interviewPrompt: 'How many swaps does selection sort need at most?', checkpoint: 'I can explain the sorted-prefix invariant.' },
      { title: 'Insertion sort', topic: 'Growing a sorted prefix', objective: 'Shift larger values and insert a key in its correct position.', exercise: 'Trace insertion of each value in [5, 2, 4, 1].', interviewPrompt: 'Why can insertion sort be efficient on nearly sorted input?', checkpoint: 'I can distinguish a shift from a swap and name the sorted prefix.' },
      { title: 'Merge sort concepts', topic: 'Divide, solve, and merge', objective: 'Explain recursive splitting and the linear merge step.', exercise: 'Merge the sorted runs [1, 4] and [2, 3] by hand.', interviewPrompt: 'Why is merge sort O(n log n), and what extra space is commonly used?', checkpoint: 'I can describe the merge step without mixing values from the two runs.' },
      { title: 'Search and sort review', topic: 'Choosing an algorithm from constraints', objective: 'Compare a scan, binary search, and elementary sorts by their preconditions and cost.', exercise: 'Choose an approach for a sorted array and justify its complexity.', interviewPrompt: 'Which constraints would make you choose binary search over a scan?', checkpoint: 'I can name an algorithm’s precondition before using it.' },
    ],
  },
  {
    title: 'Hashing and sets',
    lessons: [
      { title: 'Maps and sets', topic: 'Key-to-value lookup and membership', objective: 'Describe how a map or set answers a lookup by key.', exercise: 'Design a set-based duplicate check and state the expected lookup cost.', interviewPrompt: 'What is the difference between a HashMap and a HashSet?', checkpoint: 'I can choose a map for counts and a set for membership.' },
      { title: 'Count with a map', topic: 'Frequency maps', objective: 'Update a count associated with each distinct key.', exercise: 'Write pseudocode to count words while preserving case.', interviewPrompt: 'What does getOrDefault help express in a frequency counter?', checkpoint: 'I can trace a key’s count through repeated updates.' },
      { title: 'Find duplicates', topic: 'Seen-set pattern', objective: 'Detect the first repeated value using prior observations.', exercise: 'Trace a seen set over [3, 1, 4, 1].', interviewPrompt: 'What is the time and space trade-off of a seen set?', checkpoint: 'I can explain why a set lookup detects a repeated value.' },
      { title: 'Two sum', topic: 'Complement lookup', objective: 'Use the complement of the current value to find a pair in one pass.', exercise: 'Trace target 9 through [2, 7, 11, 15] and record the map state.', interviewPrompt: 'Why should the current value be checked against the map before it is inserted?', checkpoint: 'I can state what each key and value in the lookup map represents.' },
      { title: 'Set membership', topic: 'Deduplication and membership tests', objective: 'Separate membership from ordering.', exercise: 'Remove repeated IDs conceptually while preserving the first-seen order separately.', interviewPrompt: 'Does a HashSet guarantee iteration order?', checkpoint: 'I can name what information a set keeps and what it does not promise.' },
      { title: 'Hashing and collisions', topic: 'Hash codes, equality, and buckets', objective: 'Explain why different keys can land in the same bucket.', exercise: 'Describe how equals and hashCode must agree for equal keys.', interviewPrompt: 'What contract should equals and hashCode follow?', checkpoint: 'I can explain that a hash is not a unique key.' },
      { title: 'Hashing review', topic: 'Selecting an auxiliary structure', objective: 'Recognize when extra memory reduces repeated search work.', exercise: 'Compare nested scanning with a set-based membership check.', interviewPrompt: 'When is the extra space of hashing worth using?', checkpoint: 'I can state the time/space trade-off before choosing hashing.' },
    ],
  },
  {
    title: 'Recursion and backtracking',
    lessons: [
      { title: 'The recursive call stack', topic: 'Base cases and smaller subproblems', objective: 'Draw pending calls and return values for a small recursive function.', exercise: 'Trace factorial(4), marking each frame before unwinding.', interviewPrompt: 'What two parts must a terminating recursive solution have?', checkpoint: 'I can identify a base case and show how the input gets smaller.' },
      { title: 'Factorial', topic: 'A first recurrence', objective: 'Relate factorial(n) to n × factorial(n - 1).', exercise: 'Write the call and return sequence for factorial(5).', interviewPrompt: 'What is the base case for factorial, and why?', checkpoint: 'I can separate work performed before and after a recursive call.' },
      { title: 'Recursive array work', topic: 'Index as progress state', objective: 'Replace a loop with a recursive index that advances toward an end.', exercise: 'Describe a recursive sum using an array and a starting index.', interviewPrompt: 'What state must be passed so a recursive array scan makes progress?', checkpoint: 'I can define the meaning of the recursive index.' },
      { title: 'Recursive binary search', topic: 'Recursive interval narrowing', objective: 'Pass a smaller inclusive interval to each recursive call.', exercise: 'Trace the intervals for a search through eight sorted elements.', interviewPrompt: 'How do the recursive bounds change after a midpoint comparison?', checkpoint: 'I can prove each recursive call shrinks the interval.' },
      { title: 'Backtracking template', topic: 'Choose, explore, undo', objective: 'Identify a choice point and the state that must be restored.', exercise: 'Write the decision tree for choosing one of two letters at each position.', interviewPrompt: 'Why must backtracking undo a choice before exploring a sibling?', checkpoint: 'I can point to choose, explore, and undo steps.' },
      { title: 'Generate subsets', topic: 'Include/exclude decisions', objective: 'Count the branches in a subset decision tree.', exercise: 'List all subsets of [a, b] and trace the include/exclude choices.', interviewPrompt: 'How many subsets does a set of n distinct elements have?', checkpoint: 'I can relate two choices at each position to 2^n outcomes.' },
      { title: 'Recursion review', topic: 'Stack depth and iterative alternatives', objective: 'Estimate call depth and recognize when iteration may be safer.', exercise: 'Compare iterative and recursive factorial in call count and extra stack space.', interviewPrompt: 'What can cause StackOverflowError in recursive code?', checkpoint: 'I can describe recursion’s stack-space cost.' },
    ],
  },
  {
    title: 'Linked lists',
    lessons: [
      { title: 'Node references', topic: 'Objects connected by next fields', objective: 'Read a linked structure as references rather than adjacent array slots.', exercise: 'Draw three nodes and label each next reference.', interviewPrompt: 'What does a list node contain, and why is the head reference important?', checkpoint: 'I can follow a chain of object references.' },
      { title: 'Traverse a list', topic: 'Moving a cursor reference', objective: 'Advance a cursor until it reaches null.', exercise: 'Trace a three-node list and record the cursor at each step.', interviewPrompt: 'Why should traversal usually not overwrite the head reference?', checkpoint: 'I can explain why null marks the end of a singly linked list.' },
      { title: 'Insert at the head', topic: 'Reassigning links safely', objective: 'Preserve the old head while linking a new node.', exercise: 'Order the pointer updates needed to prepend a node.', interviewPrompt: 'Which reference must be assigned before the head changes?', checkpoint: 'I can explain the new node’s next reference and the new head.' },
      { title: 'Delete a node', topic: 'Bypass a link', objective: 'Relink a predecessor around a node to remove it from a chain.', exercise: 'Remove the middle node from a three-node list on paper.', interviewPrompt: 'Why is deleting a node by value harder in a singly linked list?', checkpoint: 'I can identify the predecessor needed to bypass a node.' },
      { title: 'Reverse a linked list', topic: 'Previous, current, and next', objective: 'Reverse links without losing the unprocessed suffix.', exercise: 'Trace the three-reference iterative reversal on four nodes.', interviewPrompt: 'Why must next be saved before current.next is reassigned?', checkpoint: 'I can state the roles of previous, current, and next.' },
      { title: 'Fast and slow pointers', topic: 'Relative-speed traversal', objective: 'Use two cursors to detect a cycle or find a midpoint.', exercise: 'Mark fast and slow positions over a six-node chain.', interviewPrompt: 'Why does fast move twice as quickly as slow in cycle detection?', checkpoint: 'I can explain when fast and slow meet in a cycle.' },
      { title: 'Linked-list review', topic: 'Reference invariants and edge cases', objective: 'Handle empty, one-node, and multi-node lists deliberately.', exercise: 'List the edge cases for removing the head and reversing a list.', interviewPrompt: 'What edge cases would you test for a list reversal?', checkpoint: 'I can name null and single-node cases before tracing list code.' },
    ],
  },
  {
    title: 'Stacks and queues',
    lessons: [
      { title: 'Stack operations', topic: 'Last in, first out', objective: 'Track push and pop operations and the current top.', exercise: 'Trace push(2), push(5), pop(), push(8).', interviewPrompt: 'Which data structure behavior is LIFO?', checkpoint: 'I can identify the next item removed from a stack.' },
      { title: 'Balanced parentheses', topic: 'Stack-based matching', objective: 'Use an opening delimiter stack to validate closing delimiters.', exercise: 'Trace the stack for the string "([])" and for "([)]".', interviewPrompt: 'Why is a stack a natural structure for nested delimiters?', checkpoint: 'I can describe the mismatch and leftover-opening checks.' },
      { title: 'Queue operations', topic: 'First in, first out', objective: 'Track the head and tail through enqueues and dequeues.', exercise: 'Trace enqueue(3), enqueue(4), dequeue(), enqueue(5).', interviewPrompt: 'Which data structure behavior is FIFO?', checkpoint: 'I can identify the next item removed from a queue.' },
      { title: 'Breadth-first search', topic: 'A queue of the frontier', objective: 'Explain why BFS visits nodes by distance in an unweighted graph.', exercise: 'Trace the queue after visiting the start node in a small graph.', interviewPrompt: 'What data structure does BFS use and what does its order guarantee?', checkpoint: 'I can distinguish discovered nodes from queued nodes.' },
      { title: 'Monotonic stack', topic: 'Maintaining ordered candidates', objective: 'Use a stack whose values stay monotonic while scanning.', exercise: 'Trace next-greater-element candidates for [2, 1, 3].', interviewPrompt: 'Why can each item be pushed and popped at most once?', checkpoint: 'I can state the stack invariant and amortized linear work.' },
      { title: 'Deque patterns', topic: 'Operations at both ends', objective: 'Choose a deque for sliding-window additions and removals.', exercise: 'Show which indices remain candidates for a window maximum.', interviewPrompt: 'When is a deque more useful than a simple queue?', checkpoint: 'I can explain which end each deque operation uses.' },
      { title: 'Stacks and queues review', topic: 'Match order to a problem', objective: 'Select LIFO, FIFO, or double-ended processing from a requirement.', exercise: 'Match undo history, level-order traversal, and sliding windows to structures.', interviewPrompt: 'How would you justify a queue for level-order traversal?', checkpoint: 'I can justify a structure from the order of required processing.' },
    ],
  },
  {
    title: 'Trees',
    lessons: [
      { title: 'Tree nodes and roots', topic: 'Parent-child references', objective: 'Identify root, leaf, depth, and subtree in a binary tree.', exercise: 'Label the root, leaves, and height of a five-node tree.', interviewPrompt: 'What is the difference between depth and height?', checkpoint: 'I can identify the root and trace left/right references.' },
      { title: 'Preorder traversal', topic: 'Node, left, right', objective: 'Visit a node before recursively exploring its children.', exercise: 'Write the preorder sequence for a small binary tree.', interviewPrompt: 'In what order does preorder visit each node?', checkpoint: 'I can distinguish preorder from inorder and postorder.' },
      { title: 'Inorder traversal', topic: 'Left, node, right', objective: 'Use inorder traversal to read a BST in sorted order.', exercise: 'Trace inorder on a BST with five keys.', interviewPrompt: 'Why does inorder traversal of a BST produce sorted keys?', checkpoint: 'I can explain the BST ordering property behind inorder output.' },
      { title: 'Level-order traversal', topic: 'Breadth-first tree visits', objective: 'Process nodes by level using a queue.', exercise: 'List the queue contents at each level of a binary tree.', interviewPrompt: 'How does level-order traversal differ from DFS?', checkpoint: 'I can trace the queue front and newly enqueued children.' },
      { title: 'Search a BST', topic: 'Ordering-guided decisions', objective: 'Choose one child at each comparison and state the complexity caveat.', exercise: 'Search for 6 in a BST and mark each visited node.', interviewPrompt: 'What property makes a BST search discard one subtree?', checkpoint: 'I can follow the ordering rule without inspecting both children.' },
      { title: 'Insert into a BST', topic: 'Finding an empty child link', objective: 'Follow comparisons until a null child can point to a new node.', exercise: 'Insert 5 into a BST and mark the link that changes.', interviewPrompt: 'What happens when a BST receives duplicate keys?', checkpoint: 'I can identify the exact null link changed by an insertion.' },
      { title: 'Tree review', topic: 'Traversal choice and shape', objective: 'Choose DFS or BFS and consider how tree shape affects depth.', exercise: 'Compare recursive depth for a balanced tree and a chain.', interviewPrompt: 'Why can a skewed BST have O(n) search time?', checkpoint: 'I can connect tree height to traversal and search cost.' },
    ],
  },
  {
    title: 'Graphs and heaps',
    lessons: [
      { title: 'Graph representations', topic: 'Vertices, edges, and adjacency lists', objective: 'Represent a small graph and distinguish directed from undirected edges.', exercise: 'Write adjacency lists for a four-vertex undirected graph.', interviewPrompt: 'When is an adjacency list preferable to a matrix?', checkpoint: 'I can state the space cost in terms of vertices and edges.' },
      { title: 'Graph BFS', topic: 'Visited set and frontier queue', objective: 'Avoid revisiting vertices while exploring an unweighted graph.', exercise: 'Trace the visited set and queue from vertex A.', interviewPrompt: 'How do you prevent BFS from enqueuing a vertex repeatedly?', checkpoint: 'I can explain when to mark a vertex visited.' },
      { title: 'Graph DFS', topic: 'Depth-first exploration', objective: 'Trace recursive or explicit-stack exploration and recognize disconnected components.', exercise: 'Trace DFS from one vertex and then find an unvisited component.', interviewPrompt: 'How would you visit every component of a disconnected graph?', checkpoint: 'I can distinguish a traversal from a full-graph traversal.' },
      { title: 'Binary heaps and priority queues', topic: 'Complete-tree shape and heap order', objective: 'Explain the parent/child index relationships and min-heap invariant.', exercise: 'Identify the next extracted value from a small min-heap.', interviewPrompt: 'What does a priority queue guarantee about its next removal?', checkpoint: 'I can distinguish heap order from a fully sorted array.' },
    ],
  },
];

export const curriculum: CurriculumLesson[] = weeks.flatMap((week, weekIndex) =>
  week.lessons.map((lesson, lessonIndex) => ({
    ...lesson,
    day: weeks.slice(0, weekIndex).reduce((sum, item) => sum + item.lessons.length, 0) + lessonIndex + 1,
    week: weekIndex + 1,
  })),
);

export const weekTitles = weeks.map((week) => week.title);

export function getLesson(day: number): CurriculumLesson {
  return curriculum.find((lesson) => lesson.day === day) ?? curriculum[0]!;
}
