import { loadDb, saveDb } from './db';
import type { Skill, Topic, Question, Assessment } from './skillTestTypes';
import crypto from 'crypto';

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

const SKILLS: Array<Omit<Skill, 'id' | 'created_at' | 'updated_at'>> = [
  { name: 'Java Programming', slug: 'java', category: 'Programming', description: 'Test your Java fundamentals, OOP, Collections, Multithreading, JVM and more.', shortDescription: 'Java assessment', status: 'active', isPopular: true, certificateAvailable: true, displayOrder: 1, tags: ['java', 'oop', 'programming'], totalQuestions: 30, avgCompletionTime: 30 },
  { name: 'Python Programming', slug: 'python', category: 'Programming', description: 'Assess your Python skills across core concepts, data structures and best practices.', shortDescription: 'Python assessment', status: 'active', isPopular: true, certificateAvailable: true, displayOrder: 2, tags: ['python', 'programming'], totalQuestions: 30, avgCompletionTime: 30 },
  { name: 'C++ Programming', slug: 'cpp', category: 'Programming', description: 'Evaluate C++ concepts including STL, pointers, memory management and OOP.', shortDescription: 'C++ assessment', status: 'active', isPopular: false, certificateAvailable: true, displayOrder: 3, tags: ['cpp', 'programming'], totalQuestions: 30, avgCompletionTime: 30 },
  { name: 'JavaScript', slug: 'javascript', category: 'Web Development', description: 'Evaluate JavaScript fundamentals, ES6+, async patterns and DOM concepts.', shortDescription: 'JS assessment', status: 'active', isPopular: true, certificateAvailable: true, displayOrder: 4, tags: ['javascript', 'web'], totalQuestions: 30, avgCompletionTime: 30 },
  { name: 'SQL', slug: 'sql', category: 'Databases', description: 'Test your SQL querying skills from basics to advanced joins and subqueries.', shortDescription: 'SQL assessment', status: 'active', isPopular: true, certificateAvailable: true, displayOrder: 5, tags: ['sql', 'database'], totalQuestions: 30, avgCompletionTime: 30 },
  { name: 'DBMS', slug: 'dbms', category: 'Core CS', description: 'Database Management System concepts — normalization, transactions, indexing.', shortDescription: 'DBMS assessment', status: 'active', isPopular: false, certificateAvailable: true, displayOrder: 6, tags: ['dbms', 'database'], totalQuestions: 30, avgCompletionTime: 30 },
  { name: 'DSA', slug: 'dsa', category: 'Core CS', description: 'DSA fundamentals — arrays, trees, graphs, sorting and problem-solving concepts.', shortDescription: 'DSA assessment', status: 'active', isPopular: true, certificateAvailable: true, displayOrder: 7, tags: ['dsa', 'algorithms'], totalQuestions: 30, avgCompletionTime: 30 },
  { name: 'Operating Systems', slug: 'os', category: 'Core CS', description: 'OS concepts — processes, threads, memory management, scheduling and deadlocks.', shortDescription: 'OS assessment', status: 'active', isPopular: false, certificateAvailable: true, displayOrder: 8, tags: ['os', 'systems'], totalQuestions: 30, avgCompletionTime: 30 },
];

const TOPICS_BY_SKILL: Record<string, string[]> = {
  java: ['Java Basics', 'OOP', 'Collections', 'Exception Handling', 'Multithreading', 'JVM', 'Java 8+'],
  python: ['Python Basics', 'Data Types', 'Functions', 'OOP', 'Modules & Imports', 'Error Handling', 'File Handling'],
  cpp: ['C++ Basics', 'Pointers', 'OOP', 'STL', 'Templates', 'Memory Management'],
  javascript: ['JS Basics', 'ES6+', 'Async/Await', 'DOM', 'Closures', 'Events'],
  sql: ['SELECT & Filters', 'JOINs', 'GROUP BY & Aggregation', 'Subqueries', 'Indexes', 'Normalization'],
  dbms: ['ER Model', 'Normalization', 'Transactions', 'Indexing', 'Concurrency', 'File Organization'],
  dsa: ['Arrays', 'Linked Lists', 'Stacks & Queues', 'Trees', 'Graphs', 'Sorting & Searching'],
  os: ['Processes', 'Threads', 'Memory Management', 'Scheduling', 'Deadlocks', 'File Systems'],
};

// Java questions — 30 questions across 7 topics
const JAVA_QUESTIONS: Array<{
  topic: string; difficulty: Question['difficulty']; type: Question['type'];
  question: string; options: string[]; correctIdx: number[]; explanation: string;
}> = [
  // Java Basics (5)
  { topic: 'Java Basics', difficulty: 'beginner', type: 'single_choice', question: 'Which keyword is used to inherit a class in Java?', options: ['extends', 'implements', 'inherits', 'super'], correctIdx: [0], explanation: 'The extends keyword is used for class inheritance in Java.' },
  { topic: 'Java Basics', difficulty: 'beginner', type: 'single_choice', question: 'What is the entry point of a Java program?', options: ['start()', 'main()', 'run()', 'init()'], correctIdx: [1], explanation: 'public static void main(String[] args) is the entry point.' },
  { topic: 'Java Basics', difficulty: 'beginner', type: 'true_false', question: 'Java is a platform-independent language.', options: ['True', 'False'], correctIdx: [0], explanation: 'Java compiles to bytecode which runs on any JVM, making it platform-independent.' },
  { topic: 'Java Basics', difficulty: 'beginner', type: 'single_choice', question: 'Which is NOT a primitive type in Java?', options: ['int', 'boolean', 'String', 'char'], correctIdx: [2], explanation: 'String is a class (object type), not a primitive.' },
  { topic: 'Java Basics', difficulty: 'intermediate', type: 'single_choice', question: 'What is the default value of an uninitialized int variable?', options: ['0', 'null', 'undefined', 'garbage'], correctIdx: [0], explanation: 'Instance int fields default to 0. Local int variables must be initialized before use.' },

  // OOP (5)
  { topic: 'OOP', difficulty: 'intermediate', type: 'multiple_choice', question: 'Which of the following are OOP principles?', options: ['Encapsulation', 'Inheritance', 'Polymorphism', 'Compilation'], correctIdx: [0, 1, 2], explanation: 'Encapsulation, Inheritance, Polymorphism, and Abstraction are the four OOP principles.' },
  { topic: 'OOP', difficulty: 'intermediate', type: 'single_choice', question: 'Which keyword prevents a method from being overridden?', options: ['static', 'final', 'abstract', 'private'], correctIdx: [1], explanation: 'The final keyword prevents overriding of methods and inheritance of classes.' },
  { topic: 'OOP', difficulty: 'intermediate', type: 'single_choice', question: 'What is the parent class of all Java classes?', options: ['Object', 'Class', 'Main', 'Root'], correctIdx: [0], explanation: 'java.lang.Object is the root of the class hierarchy.' },
  { topic: 'OOP', difficulty: 'advanced', type: 'multiple_choice', question: 'Which statements are true about abstract classes?', options: ['Can have constructors', 'Can have abstract methods', 'Cannot be instantiated', 'Must have only abstract methods'], correctIdx: [0, 1, 2], explanation: 'Abstract classes can have constructors, abstract and concrete methods, but cannot be instantiated directly.' },
  { topic: 'OOP', difficulty: 'intermediate', type: 'single_choice', question: 'Which access modifier provides the most restrictive access?', options: ['public', 'protected', 'default (package)', 'private'], correctIdx: [3], explanation: 'private is the most restrictive — only accessible within the same class.' },

  // Collections (5)
  { topic: 'Collections', difficulty: 'beginner', type: 'single_choice', question: 'Which collection class allows duplicate elements?', options: ['HashSet', 'ArrayList', 'TreeSet', 'HashMap'], correctIdx: [1], explanation: 'ArrayList allows duplicate elements; HashSet and TreeSet do not.' },
  { topic: 'Collections', difficulty: 'intermediate', type: 'single_choice', question: 'What data structure does HashMap internally use?', options: ['Array only', 'Linked List only', 'Hash Table with Linked List/Binary Tree', 'Stack'], correctIdx: [2], explanation: 'HashMap uses buckets (array) with linked lists (or trees for large buckets) for collision handling.' },
  { topic: 'Collections', difficulty: 'intermediate', type: 'single_choice', question: 'Which interface does HashMap implement?', options: ['List', 'Map', 'Set', 'Queue'], correctIdx: [1], explanation: 'HashMap implements the Map interface.' },
  { topic: 'Collections', difficulty: 'advanced', type: 'multiple_choice', question: 'Which collection types maintain insertion order?', options: ['ArrayList', 'LinkedHashMap', 'TreeMap', 'HashSet'], correctIdx: [0, 1], explanation: 'ArrayList and LinkedHashMap maintain insertion order. TreeMap sorts by key, HashSet has no order.' },
  { topic: 'Collections', difficulty: 'intermediate', type: 'true_false', question: 'ArrayList is thread-safe by default.', options: ['True', 'False'], correctIdx: [1], explanation: 'ArrayList is NOT thread-safe. Use Collections.synchronizedList() or CopyOnWriteArrayList for thread safety.' },

  // Exception Handling (5)
  { topic: 'Exception Handling', difficulty: 'beginner', type: 'single_choice', question: 'Which block is used to handle exceptions?', options: ['try-catch', 'if-else', 'switch', 'loop'], correctIdx: [0], explanation: 'try-catch blocks handle exceptions in Java.' },
  { topic: 'Exception Handling', difficulty: 'intermediate', type: 'multiple_choice', question: 'Which are checked exceptions?', options: ['IOException', 'NullPointerException', 'SQLException', 'ArithmeticException'], correctIdx: [0, 2], explanation: 'IOException and SQLException are checked exceptions. RuntimeException subclasses are unchecked.' },
  { topic: 'Exception Handling', difficulty: 'intermediate', type: 'single_choice', question: 'What does the finally block do?', options: ['Runs only if exception occurs', 'Runs always regardless of exception', 'Replaces catch block', 'Handles multiple exceptions'], correctIdx: [1], explanation: 'finally always executes after try-catch, regardless of whether an exception occurred.' },
  { topic: 'Exception Handling', difficulty: 'advanced', type: 'true_false', question: 'A method can throw multiple checked exceptions using multiple throws clauses.', options: ['True', 'False'], correctIdx: [0], explanation: 'A throws clause can list multiple exceptions separated by commas: throws IOException, SQLException.' },
  { topic: 'Exception Handling', difficulty: 'intermediate', type: 'single_choice', question: 'Which class is the root of all unchecked exceptions?', options: ['Exception', 'Error', 'RuntimeException', 'Throwable'], correctIdx: [2], explanation: 'RuntimeException is the root of all unchecked exceptions.' },

  // Multithreading (5)
  { topic: 'Multithreading', difficulty: 'intermediate', type: 'single_choice', question: 'Which class is used to create a thread by subclassing?', options: ['Thread', 'Runnable', 'Callable', 'ExecutorService'], correctIdx: [0], explanation: 'Extend the Thread class or implement Runnable. Thread is the class used for subclassing.' },
  { topic: 'Multithreading', difficulty: 'advanced', type: 'multiple_choice', question: 'Which methods are used for thread synchronization?', options: ['synchronized', 'volatile', 'wait()', 'yield()'], correctIdx: [0, 1, 2], explanation: 'synchronized, volatile, and wait() are used for synchronization. yield() is a hint to the scheduler.' },
  { topic: 'Multithreading', difficulty: 'intermediate', type: 'true_false', question: 'Java supports multiple inheritance of classes.', options: ['True', 'False'], correctIdx: [1], explanation: 'Java does not support multiple inheritance of classes to avoid the diamond problem. Use interfaces instead.' },
  { topic: 'Multithreading', difficulty: 'advanced', type: 'single_choice', question: 'What does the wait() method do?', options: ['Pauses the current thread forever', 'Releases the lock and waits for notify()', 'Kills the thread', 'Sleeps for fixed time'], correctIdx: [1], explanation: 'wait() releases the object lock and waits until notify() or notifyAll() is called.' },
  { topic: 'Multithreading', difficulty: 'intermediate', type: 'single_choice', question: 'Which interface should you implement for a thread that returns a result?', options: ['Runnable', 'Callable', 'Comparator', 'Serializable'], correctIdx: [1], explanation: 'Callable.call() can return a value and throw checked exceptions.' },

  // JVM (5)
  { topic: 'JVM', difficulty: 'beginner', type: 'single_choice', question: 'What does JVM stand for?', options: ['Java Virtual Machine', 'Java Verified Machine', 'Joint Virtual Method', 'Java Value Module'], correctIdx: [0], explanation: 'JVM = Java Virtual Machine, which executes Java bytecode.' },
  { topic: 'JVM', difficulty: 'intermediate', type: 'single_choice', question: 'Where does garbage collection occur?', options: ['Stack', 'Heap', 'Code Segment', 'Static Area'], correctIdx: [1], explanation: 'Garbage collection operates on the heap memory where objects are allocated.' },
  { topic: 'JVM', difficulty: 'intermediate', type: 'single_choice', question: 'What is JIT compilation?', options: ['Compile whole program at once', 'Compile hot methods at runtime', 'Interpreter-only execution', 'Static code analysis'], correctIdx: [1], explanation: 'JIT (Just-In-Time) compiler compiles frequently executed methods to native code at runtime.' },
  { topic: 'JVM', difficulty: 'advanced', type: 'multiple_choice', question: 'Which memory areas are managed by the JVM?', options: ['Heap', 'Stack', 'Method Area', 'Registers'], correctIdx: [0, 1, 2], explanation: 'JVM manages Heap, Stack, and Method Area. Registers are managed by the underlying CPU.' },
  { topic: 'JVM', difficulty: 'advanced', type: 'true_false', question: 'System.gc() guarantees immediate garbage collection.', options: ['True', 'False'], correctIdx: [1], explanation: 'System.gc() is a suggestion only; the JVM may ignore it. No guarantee of immediate collection.' },

  // Java 8+ (5)
  { topic: 'Java 8+', difficulty: 'intermediate', type: 'single_choice', question: 'Which Java version introduced the var keyword for local variable type inference?', options: ['Java 7', 'Java 8', 'Java 10', 'Java 11'], correctIdx: [2], explanation: 'Java 10 introduced var for local variable type inference.' },
  { topic: 'Java 8+', difficulty: 'intermediate', type: 'multiple_choice', question: 'Which are features introduced in Java 8?', options: ['Lambda expressions', 'Stream API', 'Default methods', 'Record types'], correctIdx: [0, 1, 2], explanation: 'Java 8 introduced lambdas, streams, and default methods. Records came in Java 14/16.' },
  { topic: 'Java 8+', difficulty: 'advanced', type: 'single_choice', question: 'What does the Optional class help avoid?', options: ['Memory leaks', 'NullPointerException', 'Stack overflow', 'Compilation errors'], correctIdx: [1], explanation: 'Optional helps avoid NullPointerException by providing a container for possibly-null values.' },
  { topic: 'Java 8+', difficulty: 'intermediate', type: 'single_choice', question: 'Which functional interface has the method apply()?', options: ['Predicate', 'Function', 'Consumer', 'Supplier'], correctIdx: [1], explanation: 'Function<T,R> has apply(). Predicate has test(), Consumer has accept(), Supplier has get().' },
  { topic: 'Java 8+', difficulty: 'advanced', type: 'true_false', question: 'A Java interface can have default methods with implementations (Java 8+).', options: ['True', 'False'], correctIdx: [0], explanation: 'Java 8 introduced default methods allowing interfaces to have method implementations.' },
];

export function seedSkillTest() {
  const db = loadDb();
  let changed = false;

  // Seed skills
  db.skills = db.skills || [];
  for (const s of SKILLS) {
    if (!db.skills.some((x: Skill) => x.slug === s.slug)) {
      db.skills.push({
        ...s,
        id: id('skl'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      changed = true;
    }
  }

  // Seed topics
  db.topics = db.topics || [];
  for (const skill of db.skills) {
    const names = TOPICS_BY_SKILL[skill.slug];
    if (!names) continue;
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      if (!db.topics.some((t: Topic) => t.skillId === skill.id && t.name === name)) {
        db.topics.push({
          id: id('top'),
          skillId: skill.id,
          name,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          displayOrder: i + 1,
          isActive: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        changed = true;
      }
    }
  }

  // Seed Java questions (30)
  const javaSkill = db.skills.find((s: Skill) => s.slug === 'java');
  if (javaSkill) {
    const javaTopics = db.topics.filter((t: Topic) => t.skillId === javaSkill.id);
    db.questions = db.questions || [];
    const hasJavaQs = db.questions.some((q: Question) => q.skillId === javaSkill.id);

    if (!hasJavaQs) {
      for (const q of JAVA_QUESTIONS) {
        const topic = javaTopics.find((t: Topic) => t.name === q.topic);
        if (!topic) continue;

        db.questions.push({
          id: id('qst'),
          skillId: javaSkill.id,
          topicId: topic.id,
          type: q.type,
          difficulty: q.difficulty,
          question: q.question,
          options: q.options.map((text, i) => ({ text, isCorrect: q.correctIdx.includes(i) })),
          explanation: q.explanation,
          tags: [q.topic.toLowerCase()],
          status: 'approved',
          version: 1,
          usageCount: 0,
          correctCount: 0,
          difficultyScore: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      changed = true;
    }
  }

  // Seed assessment for each skill
  db.assessments = db.assessments || [];
  for (const skill of db.skills) {
    if (db.assessments.some((a: Assessment) => a.skillId === skill.id)) continue;
    const topics = db.topics.filter((t: Topic) => t.skillId === skill.id);
    const skillQuestions = (db.questions || []).filter((q: Question) => q.skillId === skill.id);

    const topicBlueprint = topics.map((t: Topic) => ({
      topicId: t.id,
      questionCount: skillQuestions.filter((q: Question) => q.topicId === t.id).length,
    }));

    db.assessments.push({
      id: id('asm'),
      skillId: skill.id,
      title: `${skill.name} Skill Assessment`,
      description: `Test your ${skill.name} skills`,
      durationMinutes: 30,
      totalQuestions: Math.min(30, skillQuestions.length) || 30,
      passingScore: 60,
      topicBlueprint,
      difficultyBlueprint: { beginner: 8, intermediate: 14, advanced: 6, expert: 2 },
      certificateThresholds: { pass: 60, proficient: 75, advanced: 85, expert: 90 },
      isActive: true,
      isDefault: true,
      allowRetake: true,
      maxRetakes: 10,
      shuffleQuestions: true,
      shuffleOptions: true,
      showExplanationAfterSubmit: true,
      requireFullScreen: false,
      tabSwitchLimit: 0,
      instructions: ['Do not refresh during assessment', 'Ensure stable internet connection', 'Submit only when ready'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    changed = true;
  }

  if (changed) {
    saveDb(db);
    console.log('[SkillTest] Seed data installed');
  }
}
