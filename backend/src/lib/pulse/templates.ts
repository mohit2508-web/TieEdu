/**
 * Project Pulse — ready-made C tasks a teacher can start from (PROJECT_PULSE_PLAN.md §12.2 #6).
 * Each fills the task editor; the teacher changes the deadline and publishes.
 * Tests are included but "Auto-run tests" starts off; the teacher turns it on if wanted.
 */
export interface TaskTemplate {
  id: string;
  title: string;
  level: 'Basics' | 'Intermediate' | 'Advanced';
  summary: string;
  requirements: { title: string; detail: string }[];
  tests: { name: string; input: string; expected: string; req: number | null }[];
  days: number;
}

export const TEMPLATES: TaskTemplate[] = [
  {
    id: 'marks', title: 'Marks calculator', level: 'Basics', days: 5,
    summary: 'Read n, then n marks. Print the total and the average with 2 decimals. If any mark is negative or above 100, print "Invalid" and stop.',
    requirements: [
      { title: 'Reads input', detail: 'Reads n and then n marks using scanf.' },
      { title: 'Total and average', detail: 'Adds the marks in a loop; prints "Total: …" and "Average: …" with 2 decimals.' },
      { title: 'Rejects bad marks', detail: 'Prints "Invalid" for a mark below 0 or above 100.' },
    ],
    tests: [
      { name: 'Three marks', input: '3\n50\n60\n70', expected: 'Total: 180\nAverage: 60.00', req: 2 },
      { name: 'Negative mark', input: '2\n-5\n40', expected: 'Invalid', req: 3 },
    ],
  },
  {
    id: 'arrays', title: 'Array operations', level: 'Basics', days: 7,
    summary: 'Read n integers into an array. Print the largest, the smallest, the array reversed, and whether a number k (read last) is present.',
    requirements: [
      { title: 'Max and min', detail: 'Prints "Max: …" and "Min: …" in one pass over the array.' },
      { title: 'Reverse', detail: 'Prints the array reversed, space separated.' },
      { title: 'Search', detail: 'Reads k and prints "Found at index i" or "Not found".' },
      { title: 'Functions', detail: 'Each operation is its own function taking the array and n.' },
    ],
    tests: [
      { name: 'Max, min, reverse', input: '5\n4 9 1 7 3\n7', expected: 'Max: 9\nMin: 1\n3 7 1 9 4\nFound at index 3', req: 1 },
      { name: 'Missing value', input: '3\n1 2 3\n8', expected: 'Not found', req: 3 },
    ],
  },
  {
    id: 'strings', title: 'String functions without string.h', level: 'Intermediate', days: 7,
    summary: 'Write your own my_strlen, my_strrev and is_palindrome (no <string.h>). Read one word and print its length, its reverse, and "Palindrome" or "Not palindrome".',
    requirements: [
      { title: 'my_strlen', detail: 'Counts characters up to the null terminator.' },
      { title: 'my_strrev', detail: 'Reverses the string in place with two indexes.' },
      { title: 'is_palindrome', detail: 'Returns 1 or 0; main prints the result.' },
      { title: 'No string.h', detail: 'Does not include <string.h> or call library string functions.' },
    ],
    tests: [
      { name: 'Palindrome word', input: 'level', expected: 'Length: 5\nReverse: level\nPalindrome', req: 3 },
      { name: 'Normal word', input: 'pulse', expected: 'Length: 5\nReverse: eslup\nNot palindrome', req: 2 },
    ],
  },
  {
    id: 'records', title: 'Student Record Manager', level: 'Intermediate', days: 10,
    summary: 'A menu-driven program that keeps student records (roll, name, marks): add, list, search by roll number, save to a file and load it back on start.',
    requirements: [
      { title: 'Student struct', detail: 'A typedef struct with roll (int), name (char array) and marks (float).' },
      { title: 'Add & list records', detail: 'Menu option 1 adds a record; option 2 prints every record in a table.' },
      { title: 'Search by roll number', detail: 'Option 3 finds a record by roll; prints "Not found" when missing.' },
      { title: 'Save & load from file', detail: 'Writes all records to records.dat on exit and reads them back on start.' },
      { title: 'Input validation', detail: 'Rejects marks outside 0–100; reads names with fgets so they cannot overflow.' },
    ],
    tests: [
      { name: 'Search for a missing roll', input: '3\n999\n0', expected: 'Not found', req: 3 },
      { name: 'Records survive a restart', input: '1\n101\nAsha\n88\n0\n---run---\n2\n0', expected: '101', req: 4 },
    ],
  },
  {
    id: 'linkedlist', title: 'Linked list library', level: 'Advanced', days: 10,
    summary: 'A singly linked list of integers with insert at front, insert at end, delete by value, print, and free all nodes. Drive it from a small menu.',
    requirements: [
      { title: 'Node struct and malloc', detail: 'struct node { int data; struct node *next; } created with malloc; malloc result checked.' },
      { title: 'Insert front and end', detail: 'Two functions; inserting into an empty list works.' },
      { title: 'Delete by value', detail: 'Removes the first match, including the head; prints "Not found" otherwise.' },
      { title: 'Print and free', detail: 'Prints "a -> b -> NULL"; frees every node before exit.' },
    ],
    tests: [
      { name: 'Insert and print', input: '1\n10\n2\n20\n4\n0', expected: '10 -> 20 -> NULL', req: 2 },
      { name: 'Delete missing value', input: '1\n5\n3\n9\n0', expected: 'Not found', req: 3 },
    ],
  },
];

/** A template as task-editor input. */
export const templateInput = (t: TaskTemplate) => {
  const start = new Date();
  return {
    title: t.title, summary: t.summary, published: false, auto_tests: false,
    assigned_at: start.toISOString(), deadline_at: new Date(start.getTime() + t.days * 86400000).toISOString(),
    requirements: t.requirements,
    tests: t.tests.map((x) => ({ name: x.name, input: x.input, expected: x.expected, req_id: x.req ? `R${x.req}` : null })),
    starter: [{ path: 'main.c', code: '#include <stdio.h>\n\nint main(void) {\n    // TODO\n    return 0;\n}\n' }],
    weights: { tests: 30, reqs: 60, activity: 10 },
  };
};
