import type { QuestionBank } from '../types';

// 12 core-CS skills × 10 questions each.
export const BANK: QuestionBank = {
  // ── dsa ────────────────────────────────────────────────────────────────────
  dsa: [
    ['Arrays', 'beginner', 'single_choice', 'What is the time complexity of accessing an array element by index?', ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], [0], 'Arrays are contiguous — index access is constant time.'],
    ['Arrays', 'intermediate', 'single_choice', 'What is the worst-case time to insert at the beginning of an array?', ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], [2], 'All later elements must shift one position.'],
    ['Linked Lists', 'beginner', 'single_choice', 'What is the main advantage of a linked list over an array?', ['Random access in O(1)', 'No extra memory for links', 'Efficient insertion/deletion without shifting', 'Cache friendliness'], [2], 'Insert/delete at a known node is O(1) once positioned.'],
    ['Linked Lists', 'intermediate', 'single_choice', 'How do you detect a cycle in a linked list?', ['Count nodes', 'Floyd’s tortoise and hare algorithm', 'Sort it', 'Hash the values'], [1], 'Two pointers at different speeds meet if a cycle exists.'],
    ['Stacks & Queues', 'beginner', 'single_choice', 'Which data structure is LIFO?', ['Queue', 'Stack', 'Deque', 'Heap'], [1], 'A stack is last-in first-out; a queue is FIFO.'],
    ['Stacks & Queues', 'intermediate', 'single_choice', 'Which traversal uses an explicit stack implicitly?', ['Level order', 'Inorder (recursive)', 'BFS', 'Topological sort with queue'], [1], 'Recursive DFS uses the call stack; iterative versions use an explicit stack.'],
    ['Trees', 'intermediate', 'single_choice', 'What is the time complexity of searching in a balanced BST?', ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], [1], 'Height stays O(log n), so each level costs one comparison.'],
    ['Trees', 'advanced', 'single_choice', 'Which traversal of a BST yields keys in ascending order?', ['Preorder', 'Inorder', 'Postorder', 'Level order'], [1], 'Left–root–right visits keys in sorted order.'],
    ['Graphs', 'intermediate', 'single_choice', 'Which algorithm finds shortest paths in unweighted graphs?', ['Dijkstra', 'BFS', 'Prim', 'Kruskal'], [1], 'Unweighted edges → BFS levels are shortest paths.'],
    ['Sorting & Searching', 'intermediate', 'single_choice', 'What is the average time complexity of quicksort?', ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'], [1], 'Average O(n log n); worst case O(n²) on bad pivots.'],
  ],

  // ── dbms ───────────────────────────────────────────────────────────────────
  dbms: [
    ['ER Model', 'beginner', 'single_choice', 'In an ER diagram, a diamond represents:', ['Entity', 'Relationship', 'Attribute', 'Constraint'], [1], 'Rectangles are entities, ovals attributes, diamonds relationships.'],
    ['ER Model', 'beginner', 'single_choice', 'A relationship involving two entities is called:', ['Unary', 'Binary', 'Ternary', 'Nullary'], [1], 'Binary relationships connect exactly two entity types.'],
    ['Normalization', 'intermediate', 'single_choice', 'What does 1NF require?', ['No composite/multi-valued attributes (atomic values)', 'No transitive dependencies', 'A primary key', 'Foreign keys'], [0], 'First normal form demands atomic column values.'],
    ['Normalization', 'intermediate', 'single_choice', 'A table is in 3NF when:', ['It is in 2NF and has no transitive dependencies', 'All attributes are keys', 'It has no NULLs', 'It is in BCNF'], [0], '3NF removes non-key attributes depending on other non-key attributes.'],
    ['Transactions', 'intermediate', 'single_choice', 'Which ACID property guarantees all-or-nothing execution?', ['Atomicity', 'Consistency', 'Isolation', 'Durability'], [0], 'Atomicity: a transaction fully commits or fully rolls back.'],
    ['Transactions', 'advanced', 'single_choice', 'Which isolation anomaly allows non-repeatable reads?', ['Reading a row twice gives different values after another transaction updates it', 'Dirty read', 'Phantom only', 'Lost update of same statement'], [0], 'Another transaction committed a change between two reads of the same row.'],
    ['Indexing', 'intermediate', 'single_choice', 'A B-tree index primarily speeds up:', ['Exact and range queries on ordered keys', 'Full table scans', 'JOINs of all sizes', 'Wildcard LIKE %% scans'], [0], 'Ordered tree structure supports equality and range lookups efficiently.'],
    ['Indexing', 'advanced', 'true_false', 'Adding indexes speeds up writes as well.', ['True', 'False'], [1], 'Indexes must be updated on every write — they slow inserts/updates.'],
    ['Concurrency', 'intermediate', 'single_choice', 'Two transactions writing the same row — the last commit wins — is called:', ['Deadlock', 'Lost update', 'Phantom', 'Cascade abort'], [1], 'Without locking, one update overwrites the other (lost update).'],
    ['File Organization', 'advanced', 'single_choice', 'In a hash file, a collision means:', ['File is corrupted', 'Two keys hash to the same bucket', 'Disk is full', 'Key not found'], [1], 'Collisions are handled with chaining or open addressing.'],
  ],

  // ── os ─────────────────────────────────────────────────────────────────────
  os: [
    ['Processes', 'beginner', 'single_choice', 'What is a process?', ['A program in execution', 'A program on disk', 'A thread', 'A file'], [0], 'A process is a running instance with its own address space.'],
    ['Processes', 'intermediate', 'single_choice', 'How does the OS switch between processes?', ['Context switching', 'File copying', 'Rebooting', 'Garbage collection'], [0], 'Context switch saves/restores CPU state so another process runs.'],
    ['Threads', 'intermediate', 'single_choice', 'What do threads of a process share?', ['Separate address spaces each', 'Code, data and heap; each has its own stack', 'Nothing', 'File descriptors only'], [1], 'Threads share the address space but have individual stacks and registers.'],
    ['Threads', 'advanced', 'single_choice', 'Race condition occurs when:', ['Threads run too slowly', 'Outcome depends on unpredictable thread interleaving', 'CPU is idle', 'Memory is freed'], [1], 'Shared data accessed without synchronization → nondeterministic results.'],
    ['Memory Management', 'beginner', 'single_choice', 'What is virtual memory?', ['Memory that does not exist', 'An abstraction giving each process its own address space', 'RAM only', 'Swap file only'], [1], 'Processes see contiguous addresses mapped to physical frames.'],
    ['Memory Management', 'intermediate', 'single_choice', 'What is a page fault?', ['Disk failure', 'Access to a page not currently in physical memory', 'Invalid instruction', 'Stack overflow'], [1], 'The OS must load the page from disk before access proceeds.'],
    ['Scheduling', 'intermediate', 'single_choice', 'Which scheduling algorithm can cause starvation of long jobs?', ['Round Robin', 'FCFS', 'Priority scheduling', 'Multilevel feedback (naive)'], [2], 'Low-priority/long jobs may wait indefinitely under fixed priority.'],
    ['Scheduling', 'advanced', 'single_choice', 'What is the convoy effect?', ['Processes grouped in groups of 10', 'Short processes stuck behind one long process in FCFS', 'CPU cache thrashing', 'Swap thrashing'], [1], 'One long I/O-heavy job blocks the queue, idling the CPU.'],
    ['Deadlocks', 'intermediate', 'multiple_choice', 'Which are the four Coffman conditions for deadlock?', ['Mutual exclusion', 'Hold and wait', 'No preemption', 'Circular wait'], [0, 1, 2, 3], 'All four must hold simultaneously for deadlock to occur.'],
    ['File Systems', 'beginner', 'single_choice', 'Inode stores:', ['File name only', 'File metadata and block locations', 'User passwords', 'Directory order'], [1], 'The inode holds size, permissions and pointers to data blocks (name lives in the directory).'],
  ],

  // ── cn ─────────────────────────────────────────────────────────────────────
  cn: [
    ['OSI & TCP/IP Models', 'beginner', 'single_choice', 'How many layers does the OSI model have?', ['4', '5', '7', '8'], [2], 'OSI: physical, data link, network, transport, session, presentation, application.'],
    ['OSI & TCP/IP Models', 'beginner', 'single_choice', 'Which OSI layer handles routing?', ['Physical', 'Data Link', 'Network', 'Transport'], [2], 'Layer 3 (network) chooses paths via IP addressing/routers.'],
    ['OSI & TCP/IP Models', 'intermediate', 'single_choice', 'Which layer is responsible for end-to-end reliability?', ['Network', 'Transport', 'Session', 'Data Link'], [1], 'TCP (transport) provides sequencing, acks and retransmission.'],
    ['IP Addressing', 'beginner', 'single_choice', 'How many bits is an IPv4 address?', ['16', '32', '64', '128'], [1], '32 bits written as four decimal octets.'],
    ['IP Addressing', 'intermediate', 'single_choice', 'In 192.168.1.0/24, how many host addresses are usable?', ['254', '256', '255', '24'], [0], '2⁸ − 2 = 254 (network and broadcast reserved).'],
    ['Routing', 'intermediate', 'single_choice', 'Which protocol builds routing tables using link state?', ['RIP (distance vector)', 'OSPF (link state)', 'ARP', 'ICMP'], [1], 'OSPF floods link-state advertisements and runs Dijkstra.'],
    ['Transport Layer', 'beginner', 'single_choice', 'Which protocol is connection-oriented with acknowledgements?', ['UDP', 'TCP', 'ICMP', 'ARP'], [1], 'TCP performs a 3-way handshake and reliable delivery.'],
    ['Transport Layer', 'intermediate', 'single_choice', 'What is the TCP 3-way handshake sequence?', ['SYN → SYN-ACK → ACK', 'ACK → SYN → FIN', 'SYN → ACK', 'FIN → ACK → FIN'], [0], 'Both sides synchronize sequence numbers, then acknowledge.'],
    ['DNS & HTTP', 'beginner', 'single_choice', 'Which port does HTTPS typically use?', ['80', '443', '8080', '53'], [1], 'HTTP uses 80; HTTPS (HTTP over TLS) uses 443.'],
    ['Security', 'intermediate', 'single_choice', 'Which attack floods a server with fake source IPs to exhaust resources?', ['Man-in-the-middle', 'DNS spoofing', 'SYN flood', 'Phishing'], [2], 'Half-open SYNs exhaust the connection table (a DoS attack).'],
  ],

  // ── toc ────────────────────────────────────────────────────────────────────
  toc: [
    ['Automata', 'beginner', 'single_choice', 'How many states does a DFA have for a given input at any moment?', ['Unlimited', 'Exactly one', 'Two', 'None'], [1], 'Deterministic: one transition per symbol → exactly one current state.'],
    ['Automata', 'intermediate', 'single_choice', 'What is the difference between NFA and DFA?', ['NFA may have multiple/zero transitions and epsilon moves', 'NFA is always faster', 'DFA cannot accept ε', 'NFA has no accept states'], [0], 'NFA allows nondeterminism; both recognize the same class of languages.'],
    ['Automata', 'advanced', 'true_false', 'Every NFA can be converted to an equivalent DFA.', ['True', 'False'], [0], 'Subset construction converts any NFA to a DFA (possibly larger).'],
    ['Regular Expressions', 'beginner', 'single_choice', 'What language does a* denote?', ['Zero or more a’s', 'Exactly one a', 'One or more a’s', 'Any string'], [0], '* is Kleene star — zero or more repetitions.'],
    ['Regular Expressions', 'intermediate', 'single_choice', 'Regular languages are accepted by:', ['Turing machines only', 'Finite automata', 'Pushdown automata only', 'Linear bounded machines'], [1], 'Finite automata, regex and regular grammars all describe regular languages.'],
    ['Context-Free Grammars', 'intermediate', 'single_choice', 'Which automaton accepts context-free languages?', ['DFA', 'PDA (pushdown automaton)', 'Turing machine', 'Finite automaton'], [1], 'CFGs and PDAs (with a stack) are equivalent in power.'],
    ['Context-Free Grammars', 'advanced', 'single_choice', 'Which language is NOT context-free?', ['aⁿbⁿ', 'aⁿbⁿcⁿ', 'Balanced parentheses', 'a*'], [1], 'aⁿbⁿcⁿ needs two counters — it needs a Turing machine.'],
    ['Pumping Lemma', 'advanced', 'single_choice', 'The pumping lemma for regular languages is used to:', ['Prove a language is regular', 'Prove a language is NOT regular', 'Minimize automata', 'Generate strings'], [1], 'Contradiction with the pumping lemma proves non-regularity.'],
    ['Complexity Classes', 'intermediate', 'single_choice', 'Which class contains problems solvable in polynomial time?', ['P', 'NP', 'EXPTIME', 'RE'], [0], 'P = deterministic polynomial time.'],
    ['Complexity Classes', 'advanced', 'single_choice', 'What is the P vs NP question about?', ['Whether every NP problem has a polynomial verifier/solver', 'Whether P = 0', 'Hardware limits', 'Randomness'], [0], 'NP problems are quickly verifiable; whether they are also quickly solvable is open.'],
  ],

  // ── compiler-design ────────────────────────────────────────────────────────
  'compiler-design': [
    ['Lexical Analysis', 'beginner', 'single_choice', 'Which tool is commonly used to generate a lexer?', ['Lex/Flex', 'Yacc only', 'Linker', 'Debugger'], [0], 'Lex/Flex turn regular rules into a scanner.'],
    ['Lexical Analysis', 'beginner', 'single_choice', 'What is the output of the lexical analyzer?', ['Assembly code', 'A stream of tokens', 'AST', 'Machine code'], [1], 'Tokens (keywords, identifiers, literals) feed the parser.'],
    ['Lexical Analysis', 'intermediate', 'single_choice', 'The longest match rule in lexing means:', ['Match the first rule always', 'Prefer the longest possible token match', 'Ignore short tokens', 'Prefer whitespace'], [1], 'Longest match wins; earlier rule breaks ties.'],
    ['Parsing', 'intermediate', 'single_choice', 'Which parser is bottom-up?', ['Recursive descent', 'LL(1)', 'LR parser', 'Predictive'], [2], 'LR parsers build parse trees from leaves upward.'],
    ['Parsing', 'intermediate', 'single_choice', 'Which parser type is typically generated by Yacc/Bison?', ['LL', 'LR (LALR)', 'Recursive', 'Earley only'], [1], 'Yacc/Bison produce LALR(1) parsers.'],
    ['Parsing', 'advanced', 'single_choice', 'A grammar is LL(1) when:', ['One token of lookahead suffices for every decision', 'It needs left recursion', 'It is ambiguous', 'It has ≥ 2 nonterminals'], [0], 'Single-token lookahead uniquely picks productions.'],
    ['Syntax Trees', 'advanced', 'single_choice', 'Left recursion in a grammar is a problem for:', ['Top-down parsers', 'Bottom-up parsers', 'Lexers', 'Code generators'], [0], 'Recursive-descent/LL parsers loop forever on left recursion.'],
    ['Semantic Analysis', 'intermediate', 'single_choice', 'Which checks belong to semantic analysis?', ['Type checking and scope resolution', 'Keyword spotting', 'Register allocation', 'Macro expansion only'], [0], 'Semantics validates meaning: types, declarations, scopes.'],
    ['Semantic Analysis', 'beginner', 'single_choice', 'What does the symbol table store?', ['Source code text', 'Identifiers with type/scope info', 'Object code', 'Errors only'], [1], 'The symbol table tracks declarations and attributes.'],
    ['Code Generation', 'advanced', 'single_choice', 'What does register allocation aim to do?', ['Maximize spills', 'Fit values in CPU registers efficiently', 'Increase file size', 'Remove comments'], [1], 'Good allocation minimizes slow memory traffic (e.g. graph coloring).'],
  ],

  // ── discrete-math ──────────────────────────────────────────────────────────
  'discrete-math': [
    ['Set Theory', 'beginner', 'single_choice', 'How many subsets does a set with 3 elements have?', ['3', '6', '8', '9'], [2], '2ⁿ subsets → 2³ = 8.'],
    ['Set Theory', 'beginner', 'single_choice', 'A ∩ B contains elements that:', ['Are in A or B', 'Are in both A and B', 'Are in A but not B', 'Are in neither'], [1], 'Intersection = common elements; union = all elements.'],
    ['Set Theory', 'intermediate', 'single_choice', 'The set difference A \\ B is:', ['A ∪ B', 'Elements of A not in B', 'A ∩ B', 'Complement of A'], [1], 'A \\ B = {x | x ∈ A and x ∉ B}.'],
    ['Logic & Proofs', 'beginner', 'single_choice', 'What is the negation of "all students pass"?', ['No student passes', 'At least one student fails', 'All fail', 'Exactly one fails'], [1], '¬(∀x P(x)) ≡ ∃x ¬P(x).'],
    ['Logic & Proofs', 'intermediate', 'single_choice', 'p → q is FALSE only when:', ['p is false', 'p true and q false', 'Both true', 'Both false'], [1], 'The only false case of an implication is true → false.'],
    ['Logic & Proofs', 'advanced', 'single_choice', 'A proof by contrapositive of p → q proves:', ['q → p', '¬q → ¬p', '¬p → ¬q', 'p ∨ q'], [1], 'p → q ≡ ¬q → ¬p — the contrapositive.'],
    ['Combinatorics', 'beginner', 'single_choice', 'How many ways to arrange 4 distinct books?', ['4', '16', '24', '12'], [2], '4! = 24 permutations.'],
    ['Combinatorics', 'intermediate', 'single_choice', 'C(5, 2) equals:', ['10', '25', '20', '5'], [0], '5! / (2!·3!) = 10 combinations.'],
    ['Graph Theory', 'intermediate', 'single_choice', 'A graph with n vertices where every pair is connected has edges:', ['n', 'n(n−1)/2', 'n²', 'n−1'], [1], 'Complete graph Kₙ has n(n−1)/2 edges.'],
    ['Relations & Functions', 'intermediate', 'single_choice', 'A relation that is reflexive, symmetric and transitive is a:', ['Partial order', 'Equivalence relation', 'Function', 'Bijection'], [1], 'Equivalence relations partition a set into equivalence classes.'],
  ],

  // ── computer-architecture ──────────────────────────────────────────────────
  'computer-architecture': [
    ['Number Systems', 'beginner', 'single_choice', 'What is the decimal value of binary 1010?', ['8', '10', '12', '1010'], [1], '8 + 0 + 2 + 0 = 10.'],
    ['Number Systems', 'beginner', 'single_choice', 'How many bits in a byte?', ['4', '8', '16', '32'], [1], '1 byte = 8 bits.'],
    ['Number Systems', 'intermediate', 'single_choice', "What is 2's complement of 5 (4-bit)?", ['1011', '1010', '0011', '1111'], [0], 'Invert (1010) and add 1 → 1011 (= −5).'],
    ['Data Representation', 'intermediate', 'single_choice', 'Which representation is used for integers in most computers today?', ['Sign-magnitude', "2's complement", 'BCD', 'Gray code'], [1], "2's complement unifies addition/subtraction and has one zero."],
    ['CPU Design', 'intermediate', 'single_choice', 'Which component performs arithmetic/logic operations?', ['ALU', 'Control unit', 'Cache', 'Registers only'], [0], 'The ALU computes; the control unit orchestrates.'],
    ['CPU Design', 'intermediate', 'single_choice', 'What does the PC (program counter) hold?', ['The data being processed', 'Address of the next instruction', 'ALU results', 'Stack top'], [1], 'The PC tracks the next instruction address.'],
    ['CPU Design', 'advanced', 'single_choice', 'The instruction cycle consists of:', ['Fetch → Decode → Execute', 'Execute → Fetch → Decode', 'Decode → Store → Fetch', 'Load → Save → Jump'], [0], 'Classic fetch-decode-execute cycle.'],
    ['Memory Hierarchy', 'intermediate', 'single_choice', 'Which memory is fastest but smallest and closest to CPU?', ['Disk', 'Registers/cache', 'RAM', 'SSD'], [1], 'Registers → L1/L2/L3 cache → RAM → storage: speed decreases with size.'],
    ['Memory Hierarchy', 'advanced', 'single_choice', 'Cache hit rate of 95% with 100-cycle memory and 1-cycle access gives effective access time (approx, simple model):', ['5 cycles', '5.95 cycles', '95 cycles', '10 cycles'], [1], '0.95×1 + 0.05×100 ≈ 5.95 cycles.'],
    ['Pipelining', 'advanced', 'single_choice', 'A pipeline hazard occurs when:', ['Instructions overlap incorrectly (dependency/stall)', 'Cache is full', 'Disk is slow', 'Clock is doubled'], [0], 'Data/control/structural hazards stall pipeline stages.'],
  ],

  // ── software-engineering ───────────────────────────────────────────────────
  'software-engineering': [
    ['SDLC', 'beginner', 'single_choice', 'Which SDLC model delivers in short iterative cycles?', ['Waterfall', 'Agile', 'V-model only', 'Big bang'], [1], 'Agile iterates in sprints with continuous feedback.'],
    ['SDLC', 'beginner', 'single_choice', 'The Waterfall model is:', ['Highly iterative', 'Sequential phase-by-phase', 'Ad-hoc', 'Test-last only'], [1], 'Each phase completes before the next begins.'],
    ['Testing', 'beginner', 'single_choice', 'Which test checks a single function in isolation?', ['Unit test', 'System test', 'UAT', 'Smoke test'], [0], 'Unit tests verify small pieces with dependencies mocked.'],
    ['Testing', 'intermediate', 'single_choice', 'What does QA primarily focus on?', ['Writing sales pitches', 'Preventing defects through processes', 'Only final testing', 'Documentation only'], [1], 'Quality assurance is process-oriented prevention.'],
    ['Testing', 'intermediate', 'single_choice', 'White-box testing means:', ['Testing without seeing code', 'Testing based on internal structure/code paths', 'Only UI testing', 'Black-box with tools'], [1], 'Testers use knowledge of branches, paths and logic.'],
    ['Design Patterns', 'intermediate', 'single_choice', 'Which pattern creates objects without exposing creation logic?', ['Singleton', 'Factory', 'Observer', 'Adapter'], [1], 'Factory hides instantiation behind an interface.'],
    ['Design Patterns', 'intermediate', 'single_choice', 'The Observer pattern is used for:', ['One-to-many event notification', 'Single instance creation', 'Converting interfaces', 'Tree traversal'], [0], 'Observers subscribe to state changes of a subject.'],
    ['Agile & Scrum', 'intermediate', 'single_choice', 'How long is a typical Scrum sprint?', ['1–4 weeks (commonly 2)', 'Exactly 1 day', '6 months', 'Unlimited'], [0], 'Sprints are fixed timeboxes, commonly two weeks.'],
    ['Agile & Scrum', 'beginner', 'single_choice', 'Who is responsible for maximizing value in Scrum?', ['Scrum Master', 'Product Owner', 'Developers', 'Manager'], [1], 'The Product Owner owns the backlog and priorities.'],
    ['Version Control', 'beginner', 'true_false', 'Committing often with small messages is a good practice.', ['True', 'False'], [0], 'Small frequent commits are easier to review, revert and debug.'],
  ],

  // ── oop ────────────────────────────────────────────────────────────────────
  oop: [
    ['Classes & Objects', 'beginner', 'single_choice', 'An object is:', ['A blueprint', 'An instance of a class', 'A function', 'A data type only'], [1], 'Classes are templates; objects are runtime instances.'],
    ['Classes & Objects', 'beginner', 'single_choice', 'What is a constructor?', ['A method to delete objects', 'Special method called at object creation', 'A class comment', 'A return-type keyword'], [1], 'Constructors initialize new instances.'],
    ['Encapsulation', 'beginner', 'single_choice', 'Encapsulation means:', ['Hiding internal state and exposing controlled access', 'Copying objects', 'Inheriting everything', 'Global variables'], [0], 'Private fields + public getters/setters protect invariants.'],
    ['Encapsulation', 'intermediate', 'single_choice', 'Why expose data via getters instead of public fields?', ['Faster performance always', 'Control, validation and future change without breaking API', 'Less memory', 'To avoid classes'], [1], 'Accessors let you validate and change representation safely.'],
    ['Inheritance', 'beginner', 'single_choice', 'Inheritance models an:', ['is-a relationship', 'has-a relationship', 'uses relationship', 'equals relationship'], [0], 'Dog is-a Animal; composition models has-a.'],
    ['Inheritance', 'intermediate', 'single_choice', 'Method overriding means:', ['Two methods with same name in same class', 'Subclass redefines a parent method', 'Deleting a method', 'Overloading with different params'], [1], 'Overriding provides subclass-specific behaviour (compatible signature).'],
    ['Polymorphism', 'intermediate', 'single_choice', 'Compile-time polymorphism is achieved by:', ['Function overloading / generics', 'Virtual dispatch', 'Pointers only', 'Reflection'], [0], 'Overloads/templated calls resolve at compile time.'],
    ['Polymorphism', 'advanced', 'single_choice', 'Runtime polymorphism requires:', ['Virtual methods / dynamic dispatch', 'Static methods', 'Private constructors', 'Enums'], [0], 'Base-class reference dispatches to the derived implementation.'],
    ['Abstraction', 'beginner', 'single_choice', 'Abstraction is about:', ['Hiding complexity, exposing essentials', 'Hiding all code entirely', 'Copying data', 'Sorting lists'], [0], 'Abstract classes/interfaces define what, not how.'],
    ['Abstraction', 'intermediate', 'single_choice', 'An abstract class differs from an interface in that it:', ['Cannot have any methods', 'Can have state and implemented methods', 'Must be final', 'Cannot be inherited'], [1], 'Interfaces are pure contracts; abstract classes can carry implementation and fields.'],
  ],

  // ── system-design ──────────────────────────────────────────────────────────
  'system-design': [
    ['Scalability Basics', 'beginner', 'single_choice', 'Scaling by adding more machines is called:', ['Vertical scaling', 'Horizontal scaling', 'Cache scaling', 'Database scaling'], [1], 'Horizontal = more nodes; vertical = bigger machine.'],
    ['Scalability Basics', 'intermediate', 'single_choice', 'A load balancer’s main job is:', ['Store data permanently', 'Distribute traffic across healthy instances', 'Compress images', 'Compile code'], [1], 'It spreads requests and enables failover.'],
    ['Databases & Caching', 'intermediate', 'single_choice', 'What problem does a read replica primarily solve?', ['Write contention only', 'Read scalability / query load', 'Data encryption', 'Schema migrations'], [1], 'Reads are routed to replicas; writes go to the primary.'],
    ['Databases & Caching', 'intermediate', 'single_choice', 'Cache invalidation strategy "write-through" means:', ['Write to cache only', 'Write to cache and DB together synchronously', 'Delete cache weekly', 'Read from disk'], [1], 'Data is written to cache and store at the same time — consistent but higher write latency.'],
    ['Databases & Caching', 'advanced', 'single_choice', 'What is a cache stampede?', ['Cache always hits', 'Many requests rebuild a missing key simultaneously', 'Evicting everything', 'Cold start of DB'], [1], 'Mitigate with locks, jitter or early refresh.'],
    ['Load Balancing', 'advanced', 'single_choice', 'Which load balancing algorithm spreads requests to the least busy server?', ['Round robin', 'Least connections', 'Random', 'DNS-only'], [1], 'Least connections considers current in-flight load.'],
    ['Message Queues', 'intermediate', 'single_choice', 'Why put a slow task on a message queue?', ['To make it synchronous', 'To decouple and process asynchronously, absorbing spikes', 'To store files', 'To skip validation'], [1], 'Queues buffer work so the web tier stays responsive.'],
    ['Message Queues', 'advanced', 'single_choice', 'Exactly-once delivery is hard mainly because of:', ['Network failures and retries creating duplicates', 'Slow disks', 'CPU speed', 'Queue size'], [0], 'Systems usually settle for at-least-once + idempotent consumers.'],
    ['Design Trade-offs', 'beginner', 'single_choice', 'CAP theorem says a distributed system can guarantee at most two of:', ['Consistency, Availability, Partition tolerance', 'Speed, Cost, Quality', 'CPU, RAM, Disk', 'Read, Write, Delete'], [0], 'During a partition you choose between consistency and availability.'],
    ['Design Trade-offs', 'intermediate', 'single_choice', 'Eventual consistency means:', ['All nodes always agree instantly', 'Replicas converge to the same state after writes stop', 'No replication exists', 'Writes are forbidden'], [1], 'Temporary divergence is allowed for availability.'],
  ],

  // ── cyber-security ─────────────────────────────────────────────────────────
  'cyber-security': [
    ['Threats & Attacks', 'beginner', 'single_choice', 'What is phishing?', ['A hardware failure', 'Fraudulent messages tricking users into revealing secrets', 'A firewall rule', 'Encryption method'], [1], 'Fake emails/sites harvest credentials or install malware.'],
    ['Threats & Attacks', 'beginner', 'single_choice', 'A denial-of-service attack aims to:', ['Steal passwords', 'Make a service unavailable', 'Encrypt files for ransom only', 'Scan ports quietly'], [1], 'DoS/DDoS floods resources so legitimate users cannot connect.'],
    ['Threats & Attacks', 'intermediate', 'single_choice', 'SQL injection works by:', ['Overflowing the CPU', 'Injecting SQL via unsanitized input', 'Breaking SSL', 'Hijacking DNS'], [1], 'Use parameterized queries/prepared statements to prevent it.'],
    ['Threats & Attacks', 'intermediate', 'single_choice', 'Ransomware typically:', ['Deletes logs only', 'Encrypts victim data and demands payment', 'Spams ads', 'Miners CPU for fun'], [1], 'Backups and patching reduce impact.'],
    ['Cryptography', 'beginner', 'single_choice', 'Symmetric encryption uses:', ['One shared key for encrypt and decrypt', 'Two different keys', 'No keys', 'Only certificates'], [0], 'AES is a symmetric algorithm; asymmetric uses public/private pairs.'],
    ['Cryptography', 'intermediate', 'single_choice', 'What does hashing provide?', ['Reversible encryption', 'Fixed-size fingerprint; not designed to be reversed', 'Compression only', 'Key exchange'], [1], 'SHA-256 digests are one-way; verify by recomputing.'],
    ['Cryptography', 'intermediate', 'single_choice', 'Digital signatures primarily provide:', ['Confidentiality', 'Authentication and integrity', 'Compression', 'Anonymity'], [1], 'Signing with a private key proves origin and detects tampering.'],
    ['Web Security', 'intermediate', 'single_choice', 'What does XSS stand for?', ['Cross-Site Scripting', 'Extra Secure Server', 'XML Style Syntax', 'Cross System Sync'], [0], 'Injecting scripts into pages viewed by others — sanitize/encode output.'],
    ['Network Security', 'beginner', 'single_choice', 'What is the main purpose of a firewall?', ['Speed up internet', 'Filter network traffic by rules', 'Store backups', 'Encrypt emails'], [1], 'Firewalls allow/deny traffic based on rules.'],
    ['Authentication', 'beginner', 'single_choice', 'Why is MFA better than a password alone?', ['Shorter passwords', 'Requires a second factor, blocking stolen passwords', 'No encryption needed', 'It is free'], [1], 'Something you know + something you have/become.'],
  ],
};
