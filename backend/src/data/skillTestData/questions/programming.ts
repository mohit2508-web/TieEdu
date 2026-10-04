import type { QuestionBank } from '../types';

// 12 programming skills × 10 questions each.
export const BANK: QuestionBank = {
  // ── python ─────────────────────────────────────────────────────────────────
  python: [
    ['Python Basics', 'beginner', 'single_choice', 'Which symbol is used for comments in Python?', ['#', '//', '--', '/* */'], [0], 'Python uses # for single-line comments.'],
    ['Python Basics', 'beginner', 'true_false', 'Python is an interpreted language.', ['True', 'False'], [0], 'Python source is executed line by line by the interpreter (after bytecode compilation).'],
    ['Data Types', 'beginner', 'single_choice', 'Which of these is NOT a built-in Python data type?', ['list', 'tuple', 'array', 'dict'], [2], 'array is from the array module; list, tuple and dict are built-in.'],
    ['Data Types', 'intermediate', 'single_choice', 'What is the output of type(3 / 2) in Python 3?', ['int', 'float', 'decimal', 'double'], [1], 'The / operator always returns a float in Python 3; use // for floor division.'],
    ['Functions', 'beginner', 'single_choice', 'Which keyword defines a function in Python?', ['func', 'function', 'def', 'define'], [2], 'Python uses def to define functions.'],
    ['Functions', 'intermediate', 'single_choice', 'What does *args allow in a function definition?', ['Only keyword arguments', 'Any number of positional arguments', 'Only one argument', 'Return multiple values'], [1], '*args collects any number of positional arguments into a tuple.'],
    ['OOP', 'intermediate', 'single_choice', 'Which method is called when an object is instantiated?', ['__str__', '__init__', '__new_()', '__del__'], [1], '__init__ is the constructor, called when a new instance is created.'],
    ['OOP', 'advanced', 'multiple_choice', 'Which are valid ways to achieve inheritance in Python?', ['class Child(Parent)', 'class Child: pass with Parent assignment', 'class Child inherits Parent', 'class Child(ParentA, ParentB)'], [0, 3], 'Python supports class Child(Parent) and multiple inheritance class Child(A, B).'],
    ['Error Handling', 'beginner', 'single_choice', 'Which block handles exceptions in Python?', ['try-except', 'catch-throw', 'handle-error', 'guard'], [0], 'Python uses try/except blocks to catch exceptions.'],
    ['Error Handling', 'intermediate', 'single_choice', 'Which statement always executes after try/except?', ['next', 'finally', 'else-branch', 'cleanup-if'], [1], 'finally always runs whether or not an exception occurred.'],
  ],

  // ── cpp ────────────────────────────────────────────────────────────────────
  cpp: [
    ['C++ Basics', 'beginner', 'single_choice', 'Which header provides cout in C++?', ['<stdio.h>', '<iostream>', '<console>', '<output>'], [1], '<iostream> declares std::cout.'],
    ['C++ Basics', 'beginner', 'true_false', 'C++ supports function overloading.', ['True', 'False'], [0], 'Functions with the same name but different parameter lists can coexist.'],
    ['Pointers', 'intermediate', 'single_choice', 'What does dereferencing a pointer do?', ['Returns its memory address', 'Returns the value stored at its address', 'Deletes the variable', 'Converts it to integer'], [1], 'The * operator accesses the value at the pointed-to address.'],
    ['Pointers', 'advanced', 'single_choice', 'What is a dangling pointer?', ['A pointer that is nullptr', 'A pointer to memory that has been freed', 'An uninitialized static pointer', 'A pointer to a const'], [1], 'After delete/free the pointer still holds the old address — memory is no longer valid.'],
    ['OOP', 'intermediate', 'single_choice', 'Which access specifier allows access only within the class?', ['public', 'protected', 'private', 'internal'], [2], 'private members are accessible only inside the class.'],
    ['OOP', 'advanced', 'single_choice', 'What is a virtual destructor used for?', ['To prevent destruction', 'To ensure derived class destructor runs via base pointer', 'To make deletion faster', 'To forbid inheritance'], [1], 'A virtual base destructor ensures proper cleanup when deleting through a base-class pointer.'],
    ['STL', 'intermediate', 'single_choice', 'Which STL container provides FIFO behaviour?', ['stack', 'queue', 'vector', 'set'], [1], 'queue is first-in first-out; stack is LIFO.'],
    ['STL', 'advanced', 'multiple_choice', 'Which statements about std::vector are true?', ['Stores elements contiguously', 'Grows dynamically', 'Provides constant-time random access', 'Keeps elements sorted automatically'], [0, 1, 2], 'vector is contiguous, dynamic and O(1) indexed — it does not auto-sort.'],
    ['Memory Management', 'intermediate', 'single_choice', 'Which operator allocates memory on the heap in C++?', ['new', 'malloc only', 'create', 'alloc'], [0], 'new allocates and constructs objects on the heap (delete frees them).'],
    ['Memory Management', 'advanced', 'single_choice', 'What causes a memory leak?', ['Allocating stack memory', 'Losing the pointer to allocated heap memory without freeing it', 'Using vector', 'Too many global variables'], [1], 'If no pointer references heap memory, it can never be freed — that is a leak.'],
  ],

  // ── c ──────────────────────────────────────────────────────────────────────
  c: [
    ['C Basics', 'beginner', 'single_choice', 'Which is the correct entry point of a C program?', ['void main()', 'int main()', 'start()', 'run()'], [1], 'int main() is the standard entry point of a C program.'],
    ['C Basics', 'beginner', 'true_false', 'C is a high-level structured programming language.', ['True', 'False'], [0], 'C is a high-level language that supports structured programming.'],
    ['Arrays & Strings', 'beginner', 'single_choice', 'How is a string represented in C?', ['A special string object', 'A character array terminated by \\0', 'A built-in String type', 'A linked list of chars'], [1], 'C strings are null-terminated character arrays.'],
    ['Arrays & Strings', 'intermediate', 'single_choice', 'What is the output of printf("%d", sizeof(int)) on a typical 64-bit system?', ['2', '4', '8', '16'], [1], 'int is typically 4 bytes on modern systems.'],
    ['Pointers', 'intermediate', 'single_choice', 'What does NULL represent?', ['The address of the first variable', 'A pointer that points to nothing', 'Zero bytes of memory', 'The end of a string'], [1], 'NULL is the null pointer constant — it points to nothing.'],
    ['Pointers', 'advanced', 'single_choice', 'What is the result of p++ on an int pointer p?', ['Increases p by 1 byte', 'Increases p by sizeof(int) bytes', 'Increases the pointed value by 1', 'Is invalid in C'], [1], 'Pointer arithmetic scales by the size of the pointed type.'],
    ['Functions', 'beginner', 'single_choice', 'Which storage class makes a variable retain its value between calls?', ['auto', 'static', 'extern', 'register'], [1], 'static local variables keep their value across function calls.'],
    ['Functions', 'intermediate', 'true_false', 'In C, functions can be passed as arguments using function pointers.', ['True', 'False'], [0], 'C supports function pointers for callbacks (e.g. qsort).'],
    ['Memory & File I/O', 'intermediate', 'single_choice', 'Which function allocates memory on the heap in C?', ['new', 'malloc', 'create', 'alloc'], [1], 'malloc (and calloc) allocate heap memory; free releases it.'],
    ['Memory & File I/O', 'advanced', 'single_choice', 'Which mode opens a file for both reading and writing, truncating it?', ['"r+"', '"w"', '"a"', '"rb"'], [1], '"w" opens for writing and truncates; "r+" reads and writes without truncating.'],
  ],

  // ── typescript ─────────────────────────────────────────────────────────────
  typescript: [
    ['Types & Interfaces', 'beginner', 'single_choice', 'Which keyword declares an interface in TypeScript?', ['type', 'interface', 'struct', 'protocol'], [1], 'interface declares an object shape; type is an alias.'],
    ['Types & Interfaces', 'beginner', 'true_false', 'TypeScript types are erased at runtime (they only exist at compile time).', ['True', 'False'], [0], 'Type annotations are removed by the compiler — they do not exist at runtime.'],
    ['Types & Interfaces', 'intermediate', 'single_choice', 'What does the unknown type allow that any does not?', ['Everything any allows', 'Nothing — they are identical', 'Assigning to a variable only after narrowing', 'Implicit any conversions'], [2], 'unknown requires type narrowing before use, making it safer than any.'],
    ['Generics', 'intermediate', 'single_choice', 'What does a generic <T> provide?', ['A specific built-in type', 'A type parameter filled in by the caller', 'A runtime type check', 'A type alias'], [1], 'Generics let callers supply the concrete type, keeping code type-safe and reusable.'],
    ['Generics', 'advanced', 'single_choice', 'What does the keyof operator return?', ['A string of the object name', 'A union of an object type’s keys', 'The prototype chain', 'A list of methods only'], [1], 'keyof T yields a union of all property names of T.'],
    ['Functions', 'intermediate', 'single_choice', 'Syntax for an optional parameter in TypeScript:', ['param?: type', 'param?: type must come first', 'param!: type', '@optional param: type'], [0], 'A trailing ? marks a parameter optional; optional params must precede required ones.'],
    ['Functions', 'advanced', 'single_choice', 'What does a return type of Promise<string> mean?', ['The function returns a string synchronously', 'The function returns a Promise resolving to string', 'The function is async only if marked', 'It returns any string-like'], [1], 'Promise<string> means an awaitable value that resolves to string.'],
    ['Classes', 'intermediate', 'single_choice', 'Which modifier makes a class member visible only inside its own class?', ['public', 'private', 'protected', 'internal'], [1], 'private members are accessible only within the declaring class.'],
    ['Classes', 'advanced', 'single_choice', 'What does the satisfies operator do (TS 4.9+)?', ['Rewrites the code', 'Checks an expression against a type without widening it', 'Forces a cast', 'Merges two types'], [1], 'satisfies validates shape while preserving the narrower inferred type.'],
    ['Advanced Types', 'advanced', 'multiple_choice', 'Which are TypeScript utility types?', ['Partial<T>', 'Readonly<T>', 'Record<K, T>', 'Dynamic<T>'], [0, 1, 2], 'Partial, Readonly and Record are built-in; Dynamic does not exist.'],
  ],

  // ── go ─────────────────────────────────────────────────────────────────────
  go: [
    ['Syntax & Types', 'beginner', 'single_choice', 'Which keyword declares a variable with inferred type in Go?', ['var', ':=', 'let', 'def'], [1], ':= is the short variable declaration; var also works with explicit or inferred types.'],
    ['Syntax & Types', 'beginner', 'true_false', 'Unused variables are a compile-time error in Go.', ['True', 'False'], [0], 'Go refuses to compile when a declared variable is unused (use _ to discard).'],
    ['Syntax & Types', 'intermediate', 'single_choice', 'What is the zero value of an int in Go?', ['-1', '0', 'null', 'undefined'], [1], 'Numeric types default to 0; strings to "" and pointers/interfacers to nil.'],
    ['Concurrency', 'intermediate', 'single_choice', 'Which keyword starts a goroutine?', ['thread', 'go', 'async', 'spawn'], [1], 'go f() launches f as a goroutine.'],
    ['Concurrency', 'advanced', 'single_choice', 'What does a channel with cap 1 and no reader do on second send?', ['Drops the value', 'Blocks until received', 'Panics immediately', 'Creates a buffer of 2'], [1], 'Unbuffered/full channels block the sender until a value is received.'],
    ['Structs & Interfaces', 'intermediate', 'single_choice', 'How is an interface satisfied in Go?', ['By writing "implements"', 'Structurally, by having the methods', 'By inheriting it', 'By registering at runtime'], [1], 'Go interfaces are implicit — any type with the right method set satisfies it.'],
    ['Structs & Interfaces', 'advanced', 'single_choice', 'What is the empty interface?', ['interface{} — holds any value', 'A broken interface', 'An interface with private methods', 'nil'], [0], 'interface{} (any) has no methods, so every type satisfies it.'],
    ['Error Handling', 'beginner', 'single_choice', 'What is the idiomatic way to handle errors in Go?', ['try/catch', 'if err != nil', 'assert', 'onError callback'], [1], 'Go returns errors as values and checks them with if err != nil.'],
    ['Error Handling', 'intermediate', 'single_choice', 'What does panic do?', ['Logs and continues', 'Stops the current goroutine by unwinding', 'Returns an error value', 'Restarts the program'], [1], 'panic stops execution and unwinds; recover (in a deferred call) can catch it.'],
    ['Standard Library', 'intermediate', 'single_choice', 'Which package is used for HTTP servers in Go stdlib?', ['net/http', 'http/server', 'web', 'net/web'], [0], 'net/http provides the HTTP client and server APIs.'],
  ],

  // ── rust ───────────────────────────────────────────────────────────────────
  rust: [
    ['Ownership & Borrowing', 'beginner', 'single_choice', 'How many owners can a value have at a time in Rust?', ['Unlimited', 'Exactly two', 'One', 'Zero'], [2], 'Each value has exactly one owning variable; ownership can be moved.'],
    ['Ownership & Borrowing', 'intermediate', 'single_choice', 'What does &x create?', ['A raw pointer', 'An immutable borrow', 'A move', 'A copy of the heap'], [1], '& creates an immutable reference; &mut creates a mutable one.'],
    ['Ownership & Borrowing', 'advanced', 'true_false', 'While an immutable borrow exists, no mutable borrow of the same value is allowed.', ['True', 'False'], [0], 'Rust enforces: many shared XOR one mutable reference at a time.'],
    ['Types & Traits', 'intermediate', 'single_choice', 'What is a trait?', ['A class you can inherit', 'A set of methods a type must implement', 'A package', 'An enum'], [1], 'Traits define shared behaviour; types implement them with impl Trait for Type.'],
    ['Types & Traits', 'intermediate', 'single_choice', 'Which macro prints to stdout in Rust?', ['printf!', 'println!', 'cout<<', 'echo!'], [1], 'println! writes a line to standard output.'],
    ['Concurrency', 'advanced', 'single_choice', 'Why do threads require Send to share data?', ['Send guarantees the type can move across threads', 'It speeds up threads', 'It enables locks', 'It allocates on heap'], [0], 'Send marks types safe to transfer between threads; Sync marks them shareable by reference.'],
    ['Error Handling', 'beginner', 'single_choice', 'What are the two result-like types for fallible operations?', ['Option and Result', 'Try and Catch', 'Ok and Err only', 'Panic and Abort'], [0], 'Result<T, E> for errors and Option<T> for absence.'],
    ['Error Handling', 'intermediate', 'single_choice', 'Which operator unwraps a Result or panics on Err?', ['await', '?', '!', '.get()'], [1], '? propagates Err upward; unwrap() panics instead.'],
    ['Cargo', 'beginner', 'single_choice', 'Which Cargo command builds the project?', ['cargo run --build', 'cargo build', 'cargo compile', 'cargo make'], [1], 'cargo build compiles to target/; cargo run builds and executes.'],
    ['Cargo', 'intermediate', 'single_choice', 'Where are project dependencies declared?', ['Cargo.toml', 'package.json', 'go.mod', 'deps.rs'], [0], 'Cargo.toml holds metadata and the [dependencies] table.'],
  ],

  // ── ruby ───────────────────────────────────────────────────────────────────
  ruby: [
    ['Syntax & Types', 'beginner', 'single_choice', 'Which symbol starts a comment in Ruby?', ['#', '//', '%', '--'], [0], 'Ruby uses # for comments.'],
    ['Syntax & Types', 'beginner', 'true_false', 'Everything in Ruby is an object, including integers.', ['True', 'False'], [0], 'Even primitives like 5 are objects with methods (e.g. 5.even?).'],
    ['Syntax & Types', 'intermediate', 'single_choice', 'What is the result of 7 / 2 in Ruby?', ['3.5', '3', '4', 'Error'], [1], 'Integer division truncates; use 7 / 2.0 for 3.5.'],
    ['Blocks & Procs', 'intermediate', 'single_choice', 'Which method iterates over a collection with a block?', ['each', 'loop_only', 'for_in_only', 'walk'], [0], 'each yields each element to the block.'],
    ['Blocks & Procs', 'advanced', 'single_choice', 'What is the difference between proc and lambda?', ['None', 'lambda checks arity and has its own scope', 'proc cannot take arguments', 'lambda returns nil'], [1], 'Lambdas enforce argument counts and do not leak the outer local scope.'],
    ['OOP', 'intermediate', 'single_choice', 'Which keyword defines a class method in Ruby?', ['static', 'def self.method', 'class method', 'instance'], [1], 'def self.method defines a method on the class itself.'],
    ['OOP', 'advanced', 'single_choice', 'Which module method is used for multiple inheritance-style reuse?', ['include', 'inherit', 'extend-class', 'attach'], [0], 'include mixes instance methods; extend mixes class methods.'],
    ['Modules', 'beginner', 'single_choice', 'What is a Ruby module used for?', ['Only namespacing', 'Namespacing and mixing in methods', 'Defining database tables', 'Creating threads'], [1], 'Modules group methods (mixins) and provide namespaces.'],
    ['Enumerable', 'intermediate', 'multiple_choice', 'Which methods come from the Enumerable module?', ['map', 'select', 'reduce', 'spawn'], [0, 1, 2], 'map, select and reduce are Enumerable; spawn is unrelated.'],
    ['Enumerable', 'advanced', 'single_choice', 'What does [1,2,3].reduce(:+) return?', ['1+2+3 as array', '6', 'Error', '+'], [1], 'reduce folds the collection with + giving 6.'],
  ],

  // ── php ────────────────────────────────────────────────────────────────────
  php: [
    ['Syntax & Types', 'beginner', 'single_choice', 'Which tag style delimits PHP code?', ['<?php ... ?>', '<script php>', '<% %>', '@php'], [0], 'PHP code is enclosed in <?php ... ?> (or short tags when enabled).'],
    ['Syntax & Types', 'beginner', 'true_false', 'PHP variables must be declared with a data type before use.', ['True', 'False'], [1], 'Variables start with $ and are typed dynamically — no declaration needed.'],
    ['Syntax & Types', 'intermediate', 'single_choice', 'Which operator checks both value and type for equality?', ['==', '===', '=>', '~='], [1], '=== compares value and type strictly.'],
    ['Arrays', 'beginner', 'single_choice', 'Which function adds an element to the end of an array?', ['array_add()', 'push()', 'array_push()', 'append()'], [2], 'array_push($arr, $val) appends elements.'],
    ['Arrays', 'intermediate', 'single_choice', 'What does foreach loop over?', ['Only integers', 'Arrays and objects', 'Only strings', 'Database rows only'], [1], 'foreach iterates arrays and objects (Traversable).'],
    ['Functions', 'beginner', 'single_choice', 'How are default parameter values specified?', ['param = value', 'param: value', 'param default value', 'param ?= value'], [0], 'function f($a = 1) sets a default.'],
    ['Functions', 'advanced', 'single_choice', 'What does the ... spread operator do in PHP 5.6+?', ['Slices arrays', 'Accepts any number of arguments as an array', 'Copies arrays', 'Deletes elements'], [1], '... packs variadic arguments into an array (and unpacks arrays to calls).'],
    ['OOP', 'intermediate', 'single_choice', 'Which keyword refers to the current object inside a class?', ['$this', 'self', 'this', '$obj'], [0], '$this references the current instance; self refers to the class.'],
    ['OOP', 'advanced', 'single_choice', 'Which visibility allows access only inside the defining class?', ['public', 'protected', 'private', 'global'], [2], 'private members are limited to the class itself.'],
    ['Web & Databases', 'intermediate', 'single_choice', 'Which function is used to prevent SQL injection with PDO?', ['escape_sql()', 'prepared statements with bound parameters', 'htmlspecialchars', 'addslashes'], [1], 'Prepared statements with bound parameters safely separate SQL from data.'],
  ],

  // ── kotlin ─────────────────────────────────────────────────────────────────
  kotlin: [
    ['Syntax & Null Safety', 'beginner', 'single_choice', 'How do you declare an immutable variable in Kotlin?', ['const x = 1', 'val x = 1', 'let x = 1', 'final x = 1'], [1], 'val is immutable; var is mutable.'],
    ['Syntax & Null Safety', 'beginner', 'single_choice', 'Which type explicitly allows null?', ['String?', 'String!', 'NullString', 'String? only via cast'], [0], 'T? is a nullable type; T itself cannot be null.'],
    ['Syntax & Null Safety', 'intermediate', 'single_choice', 'What does the safe call operator ?. do?', ['Throws on null', 'Returns null instead of NPE if receiver is null', 'Casts to non-null', 'Forces unwrap'], [1], 'a?.b evaluates to null when a is null — no exception.'],
    ['Functions', 'beginner', 'single_choice', 'Which keyword defines a function in Kotlin?', ['def', 'fun', 'function', 'sub'], [1], 'fun is used for functions, properties and lambdas.'],
    ['Functions', 'intermediate', 'single_choice', 'What are default parameter values for?', ['Making params optional with fallbacks', 'Casting arguments', 'Private variables', 'Coroutine support'], [0], 'Callers may omit parameters that have defaults.'],
    ['OOP', 'intermediate', 'single_choice', 'Which keyword creates a subclass?', ['extends', ':', 'inherits', 'implements'], [1], 'Kotlin uses class Child : Parent().'],
    ['OOP', 'advanced', 'single_choice', 'What does the data class modifier generate?', ['Only a constructor', 'equals, hashCode, toString, copy, componentN', 'Database tables', 'Coroutines'], [1], 'data classes auto-generate the value-class boilerplate.'],
    ['Collections', 'intermediate', 'single_choice', 'Which collection type cannot contain duplicates?', ['List', 'Set', 'ArrayList', 'MutableList'], [1], 'Set guarantees unique elements.'],
    ['Collections', 'advanced', 'single_choice', 'What is the difference between map and filter?', ['map transforms each element; filter keeps matching ones', 'Both do the same', 'map filters; filter maps', 'map is only for maps'], [0], 'map produces a new collection of transformed values; filter selects a subset.'],
    ['Coroutines', 'advanced', 'single_choice', 'Which function starts a coroutine in a scope?', ['runBlocking only', 'launch or async', 'thread', 'startRoutine'], [1], 'launch returns Unit; async returns Deferred — both start coroutines.'],
  ],

  // ── swift ──────────────────────────────────────────────────────────────────
  swift: [
    ['Syntax & Types', 'beginner', 'single_choice', 'Which keyword declares a constant in Swift?', ['let', 'const', 'final', 'static'], [0], 'let declares an immutable binding; var is mutable.'],
    ['Syntax & Types', 'beginner', 'true_false', 'Swift supports type inference — you can omit types when the value is clear.', ['True', 'False'], [0], 'let x = 10 infers Int automatically.'],
    ['Optionals', 'beginner', 'single_choice', 'What does String? mean?', ['A non-null string', 'A string that may be nil', 'An array of strings', 'A string literal'], [1], 'The trailing ? makes the type optional (nil allowed).'],
    ['Optionals', 'intermediate', 'single_choice', 'What does force unwrap ! do when the optional is nil?', ['Returns a default', 'Crashes at runtime', 'Converts to empty string', 'Returns optional'], [1], 'Force-unwrapping nil traps — use guard/if let instead.'],
    ['Collections', 'intermediate', 'single_choice', 'Which collection preserves insertion order and allows duplicates?', ['Set', 'Dictionary', 'Array', 'Tuple'], [2], 'Array is ordered and permits duplicates.'],
    ['Collections', 'intermediate', 'single_choice', 'What does map do on a collection?', ['Filters it', 'Transforms each element', 'Sorts it', 'Reverses it'], [1], 'map applies a closure to every element producing a new array.'],
    ['OOP & Protocols', 'intermediate', 'single_choice', 'What is a Swift protocol?', ['A class you inherit', 'A blueprint of methods/properties to adopt', 'A data type', 'A package'], [1], 'Protocols define requirements that types implement.'],
    ['OOP & Protocols', 'advanced', 'single_choice', 'What does an extension do?', ['Modifies Apple’s source', 'Adds methods/properties to an existing type from outside', 'Creates subclasses', 'Copies a class'], [1], 'Extensions add capability to types you do not own.'],
    ['Concurrency', 'advanced', 'single_choice', 'Which keyword defines an asynchronous function?', ['async', 'await only', 'thread', 'future'], [0], 'func f() async marks async functions; await calls them.'],
    ['Concurrency', 'advanced', 'single_choice', 'What does @MainActor ensure?', ['Runs on a background thread', 'Code runs on the main actor (main thread)', 'Disables concurrency', 'Pauses execution'], [1], '@MainActor bounds work to the main thread for UI safety.'],
  ],

  // ── csharp ─────────────────────────────────────────────────────────────────
  csharp: [
    ['Syntax & Types', 'beginner', 'single_choice', 'Which symbol starts a comment in C#?', ['//', '#', '--', '**'], [0], '// begins a single-line comment; /* */ for block comments.'],
    ['Syntax & Types', 'beginner', 'true_false', 'C# is case-sensitive.', ['True', 'False'], [0], 'Variable and keyword names are case-sensitive.'],
    ['OOP', 'intermediate', 'single_choice', 'Which keyword creates a derived class?', [':', 'extends', 'inherits', '->'], [0], 'class Dog : Animal {} — C# uses a colon.'],
    ['OOP', 'intermediate', 'single_choice', 'Which modifier makes a member accessible only in the defining class?', ['public', 'internal', 'private', 'protected'], [2], 'private is restricted to the declaring type.'],
    ['OOP', 'advanced', 'multiple_choice', 'Which are pillars of OOP supported by C#?', ['Encapsulation', 'Inheritance', 'Polymorphism', 'Compilation'], [0, 1, 2], 'Encapsulation, inheritance and polymorphism (plus abstraction).'],
    ['LINQ', 'intermediate', 'single_choice', 'What does LINQ let you do?', ['Write UI', 'Query collections with SQL-like syntax', 'Compile faster', 'Deploy apps'], [1], 'LINQ provides declarative query operators over in-memory and remote data.'],
    ['LINQ', 'advanced', 'single_choice', 'What does .Select(x => x.Name) return?', ['The first item only', 'A projected sequence of names', 'A count', 'void'], [1], 'Select projects each element into a new form.'],
    ['Async/Await', 'intermediate', 'single_choice', 'What does await do?', ['Blocks the thread', 'Suspends the method until the task completes', 'Starts a new process', 'Cancels the task'], [1], 'await yields control and resumes when the awaited task finishes.'],
    ['Async/Await', 'advanced', 'single_choice', 'Which return type does an async method use?', ['void always', 'Task / Task<T> or void for event handlers', 'int', 'IEnumerable'], [1], 'async methods return Task (or Task<T>); void only for fire-and-forget handlers.'],
    ['.NET Basics', 'beginner', 'single_choice', 'Which file defines project dependencies in modern .NET?', ['project.json', '*.csproj', 'makefile', 'deps.txt'], [1], 'The .csproj file holds target framework and package references.'],
  ],

  // ── r-lang ─────────────────────────────────────────────────────────────────
  'r-lang': [
    ['Syntax & Types', 'beginner', 'single_choice', 'Which operator assigns a value in R?', ['<-', '=', '->', ':='], [0], '<- is the standard assignment operator (= also works).'],
    ['Syntax & Types', 'beginner', 'true_false', 'R vectors can hold only numbers.', ['True', 'False'], [1], 'Vectors can be numeric, character, logical, etc.'],
    ['Data Frames', 'beginner', 'single_choice', 'Which function creates a data frame?', ['data.frame()', 'df()', 'table()', 'matrix()'], [0], 'data.frame() builds tabular data; read.csv() loads files.'],
    ['Data Frames', 'intermediate', 'single_choice', 'What does df[, 2] return?', ['Row 2', 'Column 2', 'All of column 2 only with df[,2] and cell [2,2]', 'Both rows and columns 2'], [1], 'In df[row, col], an empty row index means all rows — column 2.'],
    ['Data Frames', 'advanced', 'single_choice', 'Which package is the tidyverse grammar of data manipulation?', ['dplyr', 'base', 'plot3d', 'Rcpp'], [0], 'dplyr provides filter, select, mutate, summarise and pipes.'],
    ['Functions', 'intermediate', 'single_choice', 'How do you define a function in R?', ['function keyword or <- function()', 'def', 'fun', 'sub'], [0], 'f <- function(x) x + 1 defines a function.'],
    ['Functions', 'advanced', 'single_choice', 'What does lapply(x, f) return?', ['A vector always', 'A list of results', 'Nothing', 'A data frame only'], [1], 'lapply always returns a list; sapply simplifies to a vector when possible.'],
    ['Statistics', 'intermediate', 'single_choice', 'Which function fits a linear model?', ['lm()', 'linear()', 'fitlm()', 'reg()'], [0], 'lm(y ~ x, data=df) fits ordinary least squares.'],
    ['Statistics', 'advanced', 'single_choice', 'A p-value of 0.03 at α = 0.05 means:', ['Accept null hypothesis', 'Reject the null hypothesis', 'Test is invalid', 'Effect size is large'], [1], 'p < α → reject H0; statistical significance at the 5% level.'],
    ['Visualization', 'intermediate', 'single_choice', 'Which function creates a basic plot in base R?', ['plot()', 'draw()', 'graph()', 'chart()'], [0], 'plot(x, y) draws the default scatter/line plot.'],
  ],
};
