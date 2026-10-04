import { loadDb, saveDb } from './db';
import type { Skill, Topic, Question, Assessment, TopicBlueprintItem } from './skillTestTypes';
import { SKILL_CATALOG, CatalogSkill } from './skillTestData/catalog';
import { ALL_QUESTIONS } from './skillTestData/index';
import type { SeedQ } from './skillTestData/types';
import crypto from 'crypto';

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

// Java questions — 35 questions across 7 topics (assessment draws 30)
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

type SeedRow = {
  topic: string; difficulty: Question['difficulty']; type: Question['type'];
  question: string; options: string[]; correctIdx: number[]; explanation: string;
};

function rowsFor(slug: string): SeedRow[] {
  if (slug === 'java') return JAVA_QUESTIONS;
  const bank: SeedQ[] = ALL_QUESTIONS[slug] || [];
  return bank.map(([topic, difficulty, type, question, options, correctIdx, explanation]) => ({
    topic, difficulty, type, question, options, correctIdx, explanation,
  }));
}

function proportionalDifficulty(total: number) {
  const beginner = Math.round(total * 0.4);
  const intermediate = Math.round(total * 0.4);
  const advanced = Math.max(0, total - beginner - intermediate);
  return { beginner, intermediate, advanced, expert: 0 };
}

export function seedSkillTest() {
  const db = loadDb();
  let changed = false;
  const now = new Date().toISOString();

  db.skills = db.skills || [];
  db.topics = db.topics || [];
  db.questions = db.questions || [];
  db.assessments = db.assessments || [];

  let nextOrder = db.skills.reduce((max: number, s: Skill) => Math.max(max, s.displayOrder || 0), 0);

  for (const c of SKILL_CATALOG as CatalogSkill[]) {
    // ── 1. Skill upsert (existing metadata kept; only counts repaired) ───────
    let skill = db.skills.find((s: Skill) => s.slug === c.slug);
    if (!skill) {
      nextOrder += 1;
      skill = {
        id: id('skl'),
        name: c.name,
        slug: c.slug,
        category: c.category as Skill['category'],
        description: c.description,
        shortDescription: c.shortDescription,
        status: 'active',
        isPopular: c.isPopular,
        certificateAvailable: true,
        displayOrder: nextOrder,
        tags: c.tags,
        totalQuestions: c.totalQuestions,
        avgCompletionTime: c.avgCompletionTime,
        created_at: now,
        updated_at: now,
      };
      db.skills.push(skill);
      changed = true;
    } else if (skill.totalQuestions !== c.totalQuestions || skill.avgCompletionTime !== c.avgCompletionTime) {
      skill.totalQuestions = c.totalQuestions;
      skill.avgCompletionTime = c.avgCompletionTime;
      skill.updated_at = now;
      changed = true;
    }

    // ── 2. Topics (additive) ─────────────────────────────────────────────────
    for (let i = 0; i < c.topics.length; i++) {
      const name = c.topics[i];
      if (!db.topics.some((t: Topic) => t.skillId === skill!.id && t.name === name)) {
        db.topics.push({
          id: id('top'),
          skillId: skill.id,
          name,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          displayOrder: i + 1,
          isActive: true,
          created_at: now,
          updated_at: now,
        });
        changed = true;
      }
    }

    // ── 3. Questions (only when the skill has none yet) ──────────────────────
    const hasQuestions = db.questions.some((q: Question) => q.skillId === skill!.id);
    if (!hasQuestions) {
      const rows = rowsFor(c.slug);
      for (const r of rows) {
        if (!r.correctIdx.length || !r.correctIdx.every((i) => i >= 0 && i < r.options.length)) continue;
        let topic = db.topics.find((t: Topic) => t.skillId === skill!.id && t.name === r.topic);
        if (!topic) {
          topic = {
            id: id('top'),
            skillId: skill.id,
            name: r.topic,
            slug: r.topic.toLowerCase().replace(/\s+/g, '-'),
            displayOrder: db.topics.filter((t: Topic) => t.skillId === skill!.id).length + 1,
            isActive: true,
            created_at: now,
            updated_at: now,
          };
          db.topics.push(topic);
        }
        db.questions.push({
          id: id('qst'),
          skillId: skill.id,
          topicId: topic.id,
          type: r.type,
          difficulty: r.difficulty,
          question: r.question,
          options: r.options.map((text, i) => ({ text, isCorrect: r.correctIdx.includes(i) })),
          explanation: r.explanation,
          tags: [r.topic.toLowerCase()],
          status: 'approved',
          version: 1,
          usageCount: 0,
          correctCount: 0,
          difficultyScore: 0,
          created_at: now,
          updated_at: now,
        });
      }
      changed = true;
    }

    // ── 4. Assessment: create missing, repair inconsistent ───────────────────
    const skillQuestions = db.questions.filter((q: Question) => q.skillId === skill!.id && q.status === 'approved');
    const targetTotal = skillQuestions.length > 0
      ? Math.min(c.totalQuestions, skillQuestions.length)
      : c.totalQuestions;

    const topicBlueprint: TopicBlueprintItem[] = db.topics
      .filter((t: Topic) => t.skillId === skill!.id)
      .map((t: Topic) => ({
        topicId: t.id,
        questionCount: skillQuestions.filter((q: Question) => q.topicId === t.id).length,
      }))
      .filter((bp: TopicBlueprintItem) => bp.questionCount > 0);

    const existing = db.assessments.find((a: Assessment) => a.skillId === skill!.id);
    if (!existing) {
      db.assessments.push({
        id: id('asm'),
        skillId: skill.id,
        title: `${skill.name} Skill Assessment`,
        description: `Test your ${skill.name} skills`,
        durationMinutes: c.avgCompletionTime,
        totalQuestions: targetTotal,
        passingScore: 60,
        topicBlueprint,
        difficultyBlueprint: proportionalDifficulty(targetTotal),
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
        created_at: now,
        updated_at: now,
      });
      changed = true;
    } else if (
      existing.totalQuestions !== targetTotal ||
      existing.durationMinutes !== c.avgCompletionTime ||
      existing.topicBlueprint.length === 0 ||
      existing.topicBlueprint.reduce((sum: number, bp: TopicBlueprintItem) => sum + bp.questionCount, 0) < targetTotal
    ) {
      existing.totalQuestions = targetTotal;
      existing.durationMinutes = c.avgCompletionTime;
      existing.topicBlueprint = topicBlueprint;
      existing.difficultyBlueprint = proportionalDifficulty(targetTotal);
      existing.updated_at = now;
      changed = true;
    }
  }

  if (changed) {
    saveDb(db);
    console.log(
      `[SkillTest] Seed complete — skills=${db.skills.length} topics=${db.topics.length} ` +
      `questions=${db.questions.length} assessments=${db.assessments.length}`
    );
  }
}
