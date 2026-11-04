/**
 * Milestone 1 (15 Nov 2026): Modules 1–4, Swift foundations. 20 lessons and
 * their practice questions. Written to the owner's curriculum sheet; practice
 * questions, not past papers.
 */
import { qsFor, type WLesson, type WQuestion } from './types';

const SB = 'https://docs.swift.org/swift-book/documentation/the-swift-programming-language';

export const M1_LESSONS: WLesson[] = [
  // ---------------- Module 1 · 30 Oct
  {
    m: 'm1', module: 1, title: 'Xcode Installation & Simulator Setup',
    doc: ['Apple: Xcode', 'https://developer.apple.com/documentation/xcode'],
    what: 'Xcode is Apple’s IDE for every Apple platform: code editor, compiler, Interface Builder, debugger, Simulator and Instruments in one app. It runs only on a Mac.',
    rules: [
      'Install Xcode from the Mac App Store (or developer.apple.com/download); the first launch installs extra components',
      'Command Line Tools: `xcode-select --install`; `xcrun simctl list` lists every simulator from Terminal',
      'Extra iOS simulator runtimes are downloaded in Xcode → Settings → Components (Platforms in older Xcode)',
      '⌘B build · ⌘R run · ⌘. stop · ⌘U run tests · ⇧⌘K clean build folder',
      'The Simulator has no camera and no real sensors, and it runs on the Mac’s CPU, so test those and performance on a real device',
    ],
    examples: [
      'Run on a simulator: pick a destination (for example iPhone 16) in the toolbar at the top of the window, then press ⌘R. Xcode builds, installs and launches the app in Simulator.',
      'After switching branches the build shows errors that do not match the code: clean the build folder (⇧⌘K), then build again (⌘B). If packages are missing, use File → Packages → Resolve Package Versions.',
    ],
    trap: 'The Simulator runs your app compiled for the Mac, so it is often faster than a real iPhone. Never judge performance, camera or sensor features on the Simulator.',
    task: 'Create a new iOS App project, run it on two different simulators, and rotate one with ⌘→.',
  },
  {
    m: 'm1', module: 1, title: 'Swift Playgrounds Basics',
    doc: ['Swift.org: Getting Started', 'https://www.swift.org/getting-started/'],
    what: 'A playground runs Swift as you type and shows each line’s result in a sidebar. It is the fastest way to learn and try ideas without building an app. In Xcode use File → New → Playground; the Swift Playgrounds app also runs on iPad and Mac.',
    rules: [
      'The results sidebar shows the value of each line; the eye (Quick Look) button previews it',
      'Files in the Sources folder are compiled as a separate module: mark what the page uses as `public`',
      '`import PlaygroundSupport` → `PlaygroundPage.current.setLiveView(...)` shows a live UIKit or SwiftUI view',
      'Async work (network calls, timers) needs `PlaygroundPage.current.needsIndefiniteExecution = true`, or the playground stops first',
      'Playgrounds are for experiments; they are not part of the shipped app',
    ],
    examples: [
      'var total = 0\nfor i in 1...5 {\n    total += i      // sidebar: (5 times)\n}\nprint(total)       // 15',
      'import SwiftUI\nimport PlaygroundSupport\n\nPlaygroundPage.current.setLiveView(\n    Text("Hello, Wipro").padding()\n)',
    ],
    trap: 'Helper code in the Sources folder is a separate module. If you forget `public`, the main page cannot see it and you get “cannot find in scope”.',
    task: 'In a playground, add up the even numbers from 1 to 100 with a loop and check the sidebar shows 2550.',
  },
  {
    m: 'm1', module: 1, title: 'Git & GitHub Integration in Xcode',
    doc: ['GitHub Docs: About Git & GitHub', 'https://docs.github.com/en/get-started/using-git/about-git'],
    what: 'Git records every change to your project so you can go back, branch and merge. GitHub hosts the repository online so your team and trainer can see it. Xcode has Git built in through the Integrate menu and the Source Control navigator (⌘2).',
    rules: [
      'Tick “Create Git repository on my Mac” when creating a project, or use Integrate → New Git Repository',
      'Commit with Integrate → Commit (⌥⌘C) and write a message saying what changed and why',
      'Navigator status letters: M modified, A added, ? untracked, D deleted, C conflict',
      'Add your GitHub account in Xcode → Settings → Accounts to clone, push and create remotes',
      'Ignore `xcuserdata/`, `DerivedData/` and `.DS_Store`; DO commit the .xcodeproj (project.pbxproj)',
      '`git pull` = fetch + merge; `commit` saves locally, `push` uploads to the remote',
    ],
    examples: [
      'git checkout -b feature/login\n# … edit files …\ngit add .\ngit commit -m "Add login screen"\ngit push -u origin feature/login',
      'A merge conflict in project.pbxproj after two people added files: open the file, keep both file references, delete the <<<<<<< ======= >>>>>>> markers, then build to confirm the project opens.',
    ],
    trap: 'Committing xcuserdata or DerivedData fills the repo with personal and generated files that conflict on every pull. Add them to .gitignore before the first commit.',
    task: 'Create a repo for a new project, make two commits, create a branch, and push it to GitHub from Xcode.',
  },

  // ---------------- Module 2 · 2–4 Nov
  {
    m: 'm1', module: 2, title: 'What is Swift & Swift Features',
    doc: ['Swift Book: About Swift', `${SB}/aboutswift/`],
    what: 'Swift is Apple’s modern, compiled, open-source language (announced 2014, open source since 2015). It is used for iOS, iPadOS, macOS, watchOS, tvOS and visionOS, and it also runs on Linux and Windows.',
    rules: [
      'Type-safe with type inference: type mismatches are caught at compile time',
      'Optionals make “no value” explicit, so possible nil values are visible in the code',
      'Memory is managed by ARC (Automatic Reference Counting), not a garbage collector',
      'Value types (struct, enum) and protocols are the default building blocks (protocol-oriented programming)',
      'Compiled to native code through LLVM; the Swift 6 language mode adds compile-time data-race safety',
      'Works with Objective-C code in the same app',
    ],
    examples: [
      'let name = "Asha"     // inferred String\nlet score = 92       // inferred Int\n// score = "A"       ❌ compile error: score is a constant of type Int',
      'Swift has no semicolons at line ends, no header files, and no implicit fall-through in switch, so a whole class of C bugs cannot happen.',
    ],
    trap: 'Swift is not interpreted and not garbage-collected. “Swift uses garbage collection” is a classic wrong option: it uses ARC.',
    task: 'Write three lines that would misbehave in C (nil access, type mismatch, integer overflow) and see how Swift stops each one.',
  },
  {
    m: 'm1', module: 2, title: 'Constants, Variables & Type Inference',
    doc: ['Swift Book: The Basics', `${SB}/thebasics/`],
    what: '`let` declares a constant (set once) and `var` a variable. Swift works out the type from the first value (type inference), and it never converts between number types on its own.',
    rules: [
      'Prefer `let`; use `var` only when the value really changes',
      'Inference: `42` → Int, `3.14` → Double, `"a"` → String, `true` → Bool',
      'No implicit conversion: write `Double(count) * rate`, not `count * rate`',
      'Type annotation `let limit: Int` can be assigned exactly once later, before it is read',
      '`let` on a struct value freezes all its properties; `let` on a class reference fixes only the reference',
      'Underscores make big numbers readable: `1_000_000`',
    ],
    examples: [
      'let price = 99\nlet rate = 0.18\nlet tax = Double(price) * rate   // 17.82\n// let bad = price * rate        ❌ Int * Double',
      'let maxUsers: Int\nif isPremium {\n    maxUsers = 100\n} else {\n    maxUsers = 10\n}\nprint(maxUsers)   // a let can be set once, after declaration',
    ],
    trap: '`let x = 5.0` is a Double; `let y: Float = 5` is a Float. Double and Float cannot be mixed either: convert one of them.',
    task: 'Declare a struct and a class with one `var` property each, store both in `let` constants, and try to change the property. Note which one compiles.',
  },
  {
    m: 'm1', module: 2, title: 'Swift Operators',
    doc: ['Swift Book: Basic Operators', `${SB}/basicoperators/`],
    what: 'Operators are the symbols that combine values. Most work as in other languages, but Swift adds safety: overflow traps, `=` returns nothing, and there is no `++`.',
    rules: [
      'Integer division truncates: `7 / 2 == 3`; the remainder takes the sign of the left side: `-7 % 3 == -1`',
      'Overflow crashes at run time; `&+`, `&-`, `&*` wrap on purpose',
      'Ranges: `a...b` includes b, `a..<b` excludes b, one-sided `arr[2...]`',
      '`a ?? b` gives b when a is nil; `cond ? x : y` is the ternary operator',
      '`==` compares values; `===` checks two class references point to the same instance',
      'No `++` or `--` (removed in Swift 3): use `+= 1`',
    ],
    examples: [
      'let a: Int8 = 127\n// let b = a + 1     ❌ overflow crash\nlet c = a &+ 1        // -128 (wraps around)',
      'let nums = [10, 20, 30, 40]\nprint(nums[1..<3])   // [20, 30]\nprint(nums[2...])    // [30, 40]',
    ],
    trap: '`-7 % 3` is -1 in Swift, not 2. `%` is a remainder operator, not mathematical modulo.',
    task: 'Print 17 / 5, 17 % 5, -17 % 5 and 17.0 / 5 and explain each result.',
  },
  {
    m: 'm1', module: 2, title: 'Collections (Array, Set, Dictionary)',
    doc: ['Swift Book: Collection Types', `${SB}/collectiontypes/`],
    what: 'Swift has three main collections. An Array is an ordered list, a Set holds unique items with no order, and a Dictionary maps keys to values. All three are value types.',
    rules: [
      'Array: ordered, allows duplicates; an index out of range crashes',
      'Set: unordered, unique elements, which must be Hashable; `contains` is fast',
      'Dictionary: keys must be Hashable; `dict[key]` returns an Optional',
      'Value types with copy-on-write: `var b = a` makes an independent copy',
      '`first`, `last`, `randomElement()` and `min()` return Optionals; check `isEmpty` rather than `count == 0`',
      'Counting pattern: `counts[key, default: 0] += 1`',
    ],
    examples: [
      'var a = [1, 2, 3]\nvar b = a\nb.append(4)\nprint(a)   // [1, 2, 3]: a is unchanged',
      'var counts: [Character: Int] = [:]\nfor ch in "banana" {\n    counts[ch, default: 0] += 1\n}\n// b: 1, a: 3, n: 2 (order not guaranteed)',
    ],
    trap: 'The order of a Dictionary or Set is not guaranteed and can change between runs. Sort the keys when order matters.',
    task: 'Count how many times each word appears in a sentence using a Dictionary, then print the words sorted by count.',
  },
  {
    m: 'm1', module: 2, title: 'Enumerations (Enums)',
    doc: ['Swift Book: Enumerations', `${SB}/enumerations/`],
    what: 'An enum defines a fixed group of related cases, such as the states of a screen or the methods of a payment. Swift enums can carry data (associated values) and have methods.',
    rules: [
      'A `switch` over an enum must be exhaustive (cover every case)',
      'Raw values: Int raw values auto-increment; String raw values default to the case name',
      '`init?(rawValue:)` is failable: it returns an Optional',
      'Associated values attach data to a case: `case failure(String)`',
      '`CaseIterable` gives `allCases`; enums can have methods and computed properties but NOT stored instance properties',
      '`indirect` marks a recursive case',
    ],
    examples: [
      'enum Planet: Int { case mercury = 1, venus, earth }\nprint(Planet.earth.rawValue)    // 3\nprint(Planet(rawValue: 9))     // nil',
      'enum Payment {\n    case cash\n    case upi(id: String)\n    case card(last4: String)\n}\nlet p = Payment.upi(id: "ravi@okaxis")\nswitch p {\ncase .cash:              print("Cash")\ncase .upi(let id):       print("UPI \\(id)")\ncase .card(let last4):   print("Card ••\\(last4)")\n}',
    ],
    trap: 'A `default:` in a switch over your own enum hides missing cases. When you add a case later, the compiler can no longer warn you.',
    task: 'Model a screen’s state as `enum LoadState { case idle, loading, loaded([String]), failed(String) }` and write a switch that prints a message for each.',
  },
  {
    m: 'm1', module: 2, title: 'Structures (Struct) vs Classes',
    doc: ['Swift Book: Structures and Classes', `${SB}/classesandstructures/`],
    what: 'Both group data and behaviour. A struct is a value type: each copy is independent. A class is a reference type: every variable points to the same shared object.',
    rules: [
      'Struct assignment copies; class assignment shares one instance',
      'Structs get a free memberwise initializer; classes need an `init` unless every property has a default',
      'Only classes have inheritance, `deinit`, identity (`===`) and reference counting',
      'A struct method that changes its properties must be `mutating`',
      'Apple’s advice: start with a struct; choose a class for identity, shared mutable state, inheritance or Objective-C interop',
    ],
    examples: [
      'struct S { var n = 0 }\nclass C { var n = 0 }\n\nvar s1 = S(); var s2 = s1; s2.n = 5\nlet c1 = C(); let c2 = c1; c2.n = 5\nprint(s1.n, c1.n)   // 0 5',
      'struct Counter {\n    var value = 0\n    mutating func increment() { value += 1 }\n}\nvar c = Counter()\nc.increment()     // ok: c is a var\n// let k = Counter(); k.increment()  ❌ k is a let',
    ],
    trap: 'A class stored inside a struct breaks value semantics. Copying the struct copies only the reference, so both copies share the same object.',
    task: 'Write a `struct Student` and a `class Teacher`, copy each into a second variable, change the copy, and print both originals.',
  },
  {
    m: 'm1', module: 2, title: 'Access Control (private, public, open)',
    doc: ['Swift Book: Access Control', `${SB}/accesscontrol/`],
    what: 'Access control decides which code can see a type or member. It hides internal details so other code can only use what you intend.',
    rules: [
      'From most open to most restricted: `open` → `public` → `package` → `internal` (default) → `fileprivate` → `private`',
      '`open`: usable AND subclassable/overridable outside the module; `public`: usable, but not subclassable outside',
      '`internal` (when you write nothing): visible in the whole module, for example your app target',
      '`fileprivate`: the same file; `private`: the enclosing declaration plus its extensions in the same file',
      '`private(set) var`: anyone can read, only the type itself can write',
    ],
    examples: [
      'struct BankAccount {\n    private(set) var balance = 0\n    mutating func deposit(_ amount: Int) {\n        guard amount > 0 else { return }\n        balance += amount\n    }\n}\nvar acc = BankAccount()\nacc.deposit(500)\nprint(acc.balance)        // 500\n// acc.balance = 1_000_000 ❌ setter is private',
      'A networking framework marks `open class APIClient` so apps can subclass it, but `public struct Endpoint`, which apps can use but not change.',
    ],
    trap: '`public` classes in a framework cannot be subclassed by the app using it. You need `open` for that.',
    task: 'Give a `User` struct a `private` password and a `private(set)` login count, and check which lines outside the struct fail to compile.',
  },
  {
    m: 'm1', module: 2, title: 'Swift Optionals & Unwrapping',
    doc: ['Swift Book: Optionals', `${SB}/thebasics/#Optionals`],
    what: 'An Optional (`T?`) is either a value or `nil`. Swift makes you unwrap it before use, so “no value” can never surprise you at run time.',
    rules: [
      '`if let x = opt { }` or the shorthand `if let x { }` unwraps for the block',
      '`guard let x else { return }` unwraps for the REST of the scope; its else must exit (return, throw, break, continue)',
      '`!` force-unwraps and crashes on nil: use it only when nil is impossible',
      'Optional chaining `a?.b?.c` returns an Optional and stops at the first nil',
      '`??` supplies a default; `Int("12")` returns `Int?`; `opt.map { }` transforms a value that is there',
    ],
    examples: [
      'func greet(_ name: String?) {\n    guard let name else {\n        print("No name")\n        return\n    }\n    print("Hi \\(name)")   // name is a String here\n}',
      'let n = Int("42a")    // nil, because it is not a number\nlet value = n ?? 0   // 0',
    ],
    trap: 'Optional chaining always gives an Optional: `user?.address.city` is `String?` even though `city` itself is a plain String.',
    task: 'Read an age from a String with `Int(_:)`, unwrap it with `guard let`, and print a message for both a valid and an invalid input.',
  },
  {
    m: 'm1', module: 2, title: 'ARC & Memory Management (Weak/Unowned)',
    doc: ['Swift Book: Automatic Reference Counting', `${SB}/automaticreferencecounting/`],
    what: 'ARC counts the strong references to every class instance. When the count reaches zero, `deinit` runs and the memory is freed. Leaks happen when objects keep each other alive.',
    rules: [
      'Each strong reference adds 1; the instance is freed at 0',
      'Retain cycle: two objects with strong references to each other are never freed (a memory leak)',
      '`weak`: does not keep the object alive; must be `var` and Optional; becomes nil automatically',
      '`unowned`: does not keep it alive and is not Optional; it CRASHES if used after the object is freed, so use it only when the other object always lives at least as long',
      'Closures capture strongly: use `[weak self]` in escaping closures that self stores',
      'Structs and enums are not reference-counted (ARC is for class instances)',
    ],
    examples: [
      'class Person {\n    var flat: Flat?\n    deinit { print("Person freed") }\n}\nclass Flat {\n    weak var tenant: Person?   // weak breaks the cycle\n    deinit { print("Flat freed") }\n}\nvar p: Person? = Person()\nvar f: Flat? = Flat()\np?.flat = f; f?.tenant = p\np = nil   // "Person freed"\nf = nil   // "Flat freed"',
      'class Timer2 {\n    var onTick: (() -> Void)?\n    var count = 0\n    func start() {\n        onTick = { [weak self] in self?.count += 1 }\n    }\n}',
    ],
    trap: '`unowned` is not “weak without the Optional” for free. Reading an unowned reference after its object is freed crashes the app.',
    task: 'Build the Person/Flat example without `weak`, set both to nil, and confirm no deinit prints. Then add `weak` and run it again.',
  },

  // ---------------- Module 3 · 5–13 Nov
  {
    m: 'm1', module: 3, title: 'Functions & Argument Labels',
    doc: ['Swift Book: Functions', `${SB}/functions/`],
    what: 'Functions are named blocks of code. Swift functions read like sentences: each parameter can have an argument label used at the call and a different name used inside.',
    rules: [
      '`func name(label param: Type) -> Return`: the label is used at the call site, the parameter name inside the body',
      '`_` removes the label: `func square(_ x: Int)` is called as `square(4)`',
      'Default values: `func greet(name: String = "Guest")`',
      'Variadic `Int...` arrives as `[Int]`; `inout` with `&` lets the function change the caller’s variable',
      'Return several values with a tuple; a single-expression body returns implicitly',
      'Parameters are constants inside the function',
    ],
    examples: [
      'func move(from start: String, to end: String) -> String {\n    "\\(start) → \\(end)"\n}\nprint(move(from: "Pune", to: "Bengaluru"))',
      'func swapInts(_ a: inout Int, _ b: inout Int) {\n    let t = a; a = b; b = t\n}\nvar x = 1, y = 2\nswapInts(&x, &y)\nprint(x, y)   // 2 1',
    ],
    trap: 'You cannot change a parameter inside a function (`x += 1` is a compile error) unless it is marked `inout`.',
    task: 'Write `func stats(_ marks: Int...) -> (avg: Double, best: Int)` and call it with five marks.',
  },
  {
    m: 'm1', module: 3, title: 'Closures & Trailing Closure Syntax',
    doc: ['Swift Book: Closures', `${SB}/closures/`],
    what: 'A closure is a block of code you can pass around and call later, like a function without a name. It can capture variables from where it was created.',
    rules: [
      'Full form: `{ (a: Int, b: Int) -> Int in a + b }`; with inference and shorthand: `{ $0 + $1 }`',
      'Trailing closure: when the last argument is a closure, write it after the parentheses',
      'Closures capture variables by reference, so they see later changes; a capture list `[x]` copies the value at creation',
      'A closure parameter that is stored or called after the function returns must be `@escaping`',
      'Closures are reference types: two constants can point to the same closure and share its captured state',
    ],
    examples: [
      'func makeCounter() -> () -> Int {\n    var count = 0\n    return {\n        count += 1\n        return count\n    }\n}\nlet next = makeCounter()\nprint(next(), next(), next())   // 1 2 3',
      'var x = 1\nlet live = { print(x) }       // captures the variable\nlet snap = { [x] in print(x) } // copies 1 now\nx = 2\nlive()   // 2\nsnap()   // 1',
    ],
    trap: 'If self stores an escaping closure that uses `self`, each keeps the other alive: a retain cycle. Use `[weak self]`.',
    task: 'Write `func repeatTask(times: Int, task: () -> Void)` and call it with trailing-closure syntax.',
  },
  {
    m: 'm1', module: 3, title: 'Higher-Order Functions (map, filter, reduce)',
    doc: ['Swift Book: Closures', `${SB}/closures/`],
    what: 'Higher-order functions take a closure and apply it to a collection. They replace most hand-written loops with clear one-liners.',
    rules: [
      '`map`: transform every element; `filter`: keep the matching ones; `reduce(initial, combine)`: fold into one value',
      '`compactMap`: transform and drop nils; `flatMap`: flatten nested arrays',
      '`sorted(by:)`, `first(where:)` (stops at the first match), `contains(where:)`, `allSatisfy`',
      '`reduce(into:)` builds a dictionary or array efficiently',
      '`forEach` cannot break early: `return` inside it only skips the current element',
    ],
    examples: [
      'let marks = [45, 78, 92, 33, 66]\nlet passed = marks.filter { $0 >= 40 }.count    // 4\nlet total  = marks.reduce(0, +)                // 314\nlet grades = marks.map { $0 >= 75 ? "A" : "B" } // ["B", "A", "A", "B", "B"]',
      'let inputs = ["10", "x", "25"]\nlet numbers = inputs.compactMap { Int($0) }   // [10, 25]\nlet byLength = ["kiwi", "fig", "banana"].sorted { $0.count < $1.count }\n// ["fig", "kiwi", "banana"]',
    ],
    trap: '`map` with a failable conversion gives Optionals: `["1", "x"].map { Int($0) }` is `[Optional(1), nil]`. Use `compactMap` to drop the nils.',
    task: 'From an array of (name, marks) tuples, print the names of students above 60, sorted by marks, in one chain.',
  },
  {
    m: 'm1', module: 3, title: 'Protocols & Protocol Extensions',
    doc: ['Swift Book: Protocols', `${SB}/protocols/`],
    what: 'A protocol is a contract: a list of methods and properties a type promises to have. Protocol extensions give every conforming type a default implementation. This is the base of protocol-oriented programming.',
    rules: [
      'Property requirements say `{ get }` or `{ get set }`, never “stored” or “computed”',
      'Structs, enums and classes can all conform; a type can conform to many protocols',
      'Protocol extensions provide default implementations; a conforming type may replace them',
      'Requirements are dynamically dispatched; a method that exists ONLY in the extension is statically dispatched (the variable’s declared type decides)',
      '`mutating` in a requirement lets structs change themselves; `: AnyObject` limits a protocol to classes (needed for `weak var delegate`)',
    ],
    examples: [
      'protocol Shape {\n    var area: Double { get }\n}\nextension Shape {\n    func describe() -> String { "Area: \\(area)" }\n}\nstruct Square: Shape {\n    var side: Double\n    var area: Double { side * side }\n}\nprint(Square(side: 3).describe())   // Area: 9.0',
      'protocol LoginDelegate: AnyObject {\n    func didLogin(user: String)\n}\nclass LoginVC {\n    weak var delegate: LoginDelegate?   // needs AnyObject\n}',
    ],
    trap: 'If `bye()` is only in the protocol extension (not in the protocol), `let g: Greeter = Bot(); g.bye()` runs the EXTENSION’s version, even if Bot has its own `bye()`.',
    task: 'Make a `Describable` protocol with a default `describe()` in an extension, conform a struct and an enum, and override it in one of them.',
  },
  {
    m: 'm1', module: 3, title: 'Generics & Generic Constraints',
    doc: ['Swift Book: Generics', `${SB}/generics/`],
    what: 'Generics let you write one function or type that works with any type, safely. Array, Dictionary and Optional are themselves generic.',
    rules: [
      '`func swapValues<T>(_ a: inout T, _ b: inout T)`: T is decided at each call',
      'Constraints: `<T: Comparable>`, or a `where` clause: `where T: Equatable`',
      'Generic types: `struct Stack<Element> { … }`; use them as `Stack<Int>()`',
      'Protocols declare their own placeholder types with `associatedtype`',
      'Without a constraint you can only do what every type can do: no `==`, no `<`',
    ],
    examples: [
      'func largest<T: Comparable>(_ items: [T]) -> T? {\n    guard var best = items.first else { return nil }\n    for x in items where x > best { best = x }\n    return best\n}\nlargest([3, 9, 4])          // Optional(9)\nlargest(["kiwi", "apple"])  // Optional("kiwi")',
      'struct Stack<Element> {\n    private var items: [Element] = []\n    mutating func push(_ x: Element) { items.append(x) }\n    mutating func pop() -> Element? { items.popLast() }\n}',
    ],
    trap: '`func same<T>(_ a: T, _ b: T) -> Bool { a == b }` does not compile: T has to be constrained to `Equatable`.',
    task: 'Write a generic `Queue<Element>` with enqueue, dequeue and isEmpty, and test it with Int and String.',
  },
  {
    m: 'm1', module: 3, title: 'Extensions & Protocol Conformance',
    doc: ['Swift Book: Extensions', `${SB}/extensions/`],
    what: 'An extension adds new functionality to an existing type, even one you did not write, such as Int, String or UIViewController. It is also the clean place to add a protocol conformance.',
    rules: [
      'You can add computed properties, methods, initializers, subscripts and nested types',
      'You cannot add stored properties or override existing methods',
      'Put each conformance in its own extension: `extension ProfileVC: UITableViewDataSource { … }`',
      'An `init` written in a struct extension keeps the free memberwise initializer',
      'Conditional conformance: `extension Array: Summable where Element: Summable`',
    ],
    examples: [
      'extension Int {\n    var isEven: Bool { self % 2 == 0 }\n    func times(_ work: () -> Void) {\n        for _ in 0..<self { work() }\n    }\n}\nprint(10.isEven)     // true\n3.times { print("Hi") }',
      'struct User { let name: String; let age: Int }\nextension User: CustomStringConvertible {\n    var description: String { "\\(name) (\\(age))" }\n}\nprint(User(name: "Asha", age: 22))   // Asha (22)',
    ],
    trap: '`extension User { var visits = 0 }` fails: extensions must not contain stored properties. Use a computed property, or add the property to the type itself.',
    task: 'Add `extension String { var isValidEmail: Bool }` with a simple check, and try it on three strings.',
  },
  {
    m: 'm1', module: 3, title: 'Error Handling (throws, try, do-catch)',
    doc: ['Swift Book: Error Handling', `${SB}/errorhandling/`],
    what: 'Swift reports recoverable failures by throwing errors. The compiler makes every call that can fail visible with `try`, so failures are never silently ignored.',
    rules: [
      'Errors are types that conform to `Error`, usually an enum',
      'A function that can fail is marked `throws`; each call needs `try` inside `do-catch` or inside another throwing function',
      '`try?` turns the result into an Optional (nil on error); `try!` crashes on error',
      '`defer { }` runs when the scope exits, whether it returns or throws; several defers run in reverse order',
      'A catch-all `catch` has an implicit `error` constant; `catch LoginError.locked` matches one case',
      'Swift 6 typed throws: `func f() throws(LoginError)`',
    ],
    examples: [
      'enum LoginError: Error { case empty, tooShort }\n\nfunc validate(_ pw: String) throws {\n    if pw.isEmpty { throw LoginError.empty }\n    if pw.count < 8 { throw LoginError.tooShort }\n}\n\ndo {\n    try validate("abc")\n    print("OK")\n} catch LoginError.tooShort {\n    print("Use 8+ characters")\n} catch {\n    print("Other error: \\(error)")\n}',
      'func readFile() {\n    print("open")\n    defer { print("close") }   // always runs last\n    print("read")\n}\n// open, read, close',
    ],
    trap: '`try?` throws away the reason for the failure. That is fine for optional work, but wrong when the user needs to know what went wrong.',
    task: 'Write a throwing `withdraw(_:)` on a BankAccount that throws `insufficientFunds(needed:)`, and handle it with do-catch.',
  },

  // ---------------- Module 4 · 14 Nov
  {
    m: 'm1', module: 4, title: 'UIKit (Imperative) vs SwiftUI (Declarative)',
    doc: ['Apple: SwiftUI Tutorials', 'https://developer.apple.com/tutorials/swiftui'],
    what: 'UIKit (since 2008) is imperative: you create views and change them step by step. SwiftUI (2019, iOS 13+) is declarative: you describe the UI for the current state, and SwiftUI updates the screen when the state changes.',
    rules: [
      'UIKit: `UIViewController` + `UIView` classes, storyboards or code, Auto Layout constraints, `label.text = …` to update',
      'SwiftUI: views are lightweight structs; `body` is recomputed when `@State` / observed data changes',
      'UIKit inside SwiftUI: `UIViewRepresentable` / `UIViewControllerRepresentable`',
      'SwiftUI inside UIKit: `UIHostingController(rootView:)`',
      'SwiftUI layout uses stacks, frames and modifiers; live previews with `#Preview`',
    ],
    examples: [
      '// UIKit: change the view yourself\n@IBAction func tap(_ sender: UIButton) {\n    count += 1\n    countLabel.text = "\\(count)"\n}',
      '// SwiftUI: change the state; the view follows\nstruct CounterView: View {\n    @State private var count = 0\n    var body: some View {\n        Button("Tapped \\(count) times") { count += 1 }\n    }\n}',
    ],
    trap: 'In SwiftUI you do not “update the label”. You change the state and SwiftUI redraws. Keeping references to views is a UIKit habit that does not work in SwiftUI.',
    task: 'Build the same counter screen twice: once with a UIViewController and a UILabel, once with a SwiftUI View and @State.',
  },
];

// ---------------------------------------------------------------- questions

const q = (lesson: string) => qsFor('m1', lesson);

const xcode = q('Xcode Installation & Simulator Setup');
const play = q('Swift Playgrounds Basics');
const git = q('Git & GitHub Integration in Xcode');
const about = q('What is Swift & Swift Features');
const vars = q('Constants, Variables & Type Inference');
const ops = q('Swift Operators');
const coll = q('Collections (Array, Set, Dictionary)');
const en = q('Enumerations (Enums)');
const sc = q('Structures (Struct) vs Classes');
const acc = q('Access Control (private, public, open)');
const opt = q('Swift Optionals & Unwrapping');
const arc = q('ARC & Memory Management (Weak/Unowned)');
const fn = q('Functions & Argument Labels');
const clo = q('Closures & Trailing Closure Syntax');
const hof = q('Higher-Order Functions (map, filter, reduce)');
const pro = q('Protocols & Protocol Extensions');
const gen = q('Generics & Generic Constraints');
const ext = q('Extensions & Protocol Conformance');
const err = q('Error Handling (throws, try, do-catch)');
const ui = q('UIKit (Imperative) vs SwiftUI (Declarative)');

export const M1_QUESTIONS: WQuestion[] = [
  // Xcode
  xcode('beginner', 'Which Xcode shortcut builds the app and runs it on the selected destination?', ['⌘B', '⌘R', '⌘U', '⇧⌘K'], 1, '⌘R builds and runs. ⌘B only builds, ⌘U runs the tests, ⇧⌘K cleans the build folder.'),
  xcode('intermediate', 'Which of these can you NOT test properly on the iOS Simulator?', ['Auto Layout on different screen sizes', 'Dark Mode', 'Capturing a photo with the camera', 'Changing the app language'], 2, 'The Simulator has no camera hardware. Screen sizes, Dark Mode and localisation all work on the Simulator.'),
  xcode('beginner', 'Which Terminal command installs Xcode’s Command Line Tools?', ['xcode-select --install', 'brew install xcode', 'xcrun simctl install', 'swift package init'], 0, '`xcode-select --install` installs the Command Line Tools (git, clang, swift and so on). `xcrun simctl` manages simulators.'),
  xcode('intermediate', 'After switching Git branches, Xcode shows build errors for code that no longer exists. What is the best first step?', ['Reinstall Xcode', 'Delete the .xcodeproj file', 'Clean the build folder (⇧⌘K) and build again', 'Erase all simulators'], 2, 'Stale build products in DerivedData cause errors that do not match the code. Cleaning the build folder rebuilds from scratch. Deleting the project file would break the project.'),
  xcode('intermediate', 'Which command lists every available simulator device from Terminal?', ['xcodebuild -list', 'xcrun simctl list', 'simulator --devices', 'xcode-select -p'], 1, '`xcrun simctl list` prints the device types, runtimes and devices. `xcodebuild -list` lists a project’s targets and schemes; `xcode-select -p` prints the active developer folder.'),

  // Playgrounds
  play('beginner', 'Where does an Xcode playground show the value produced by each line?', ['In the results sidebar on the right', 'In the Issue navigator', 'Only in the Debug navigator', 'In the Report navigator'], 0, 'The results sidebar shows each line’s value (and “(n times)” inside loops). print output also appears in the console.'),
  play('intermediate', 'A struct in the playground’s Sources folder gives “cannot find type in scope” on the main page. Why?', ['Sources code only runs on a device', 'The struct is not marked public', 'The page needs `import Foundation`', 'Playgrounds cannot use structs'], 1, 'Sources is compiled as a separate module, so only `public` declarations are visible to the page.'),
  play('intermediate', 'A playground starts a URLSession request, but the response is never printed. What fixes it?', ['Add a print at the end of the page', 'Set `PlaygroundPage.current.needsIndefiniteExecution = true`', 'Wrap the request in DispatchQueue.main.sync', 'Rename the page to .swift'], 1, 'The playground ends when the top-level code finishes. needsIndefiniteExecution keeps it running so the async callback can fire. Calling main.sync from the main thread would deadlock.'),
  play('beginner', 'Which module gives you `PlaygroundPage` for live views?', ['Foundation', 'UIKit', 'PlaygroundSupport', 'XCTest'], 2, '`import PlaygroundSupport` provides PlaygroundPage, setLiveView and needsIndefiniteExecution.'),

  // Git
  git('beginner', 'In Xcode’s Project navigator a file shows the letter “M”. What does it mean?', ['The file is merged', 'The file is modified since the last commit', 'The file is missing', 'The file is moved'], 1, 'M = modified, A = added, ? = untracked, D = deleted, C = conflict.'),
  git('intermediate', 'Which of these should NOT be committed to the repository?', ['project.pbxproj', 'The Swift source files', 'The xcuserdata folder', 'Assets.xcassets'], 2, 'xcuserdata holds personal settings (open tabs, breakpoints) and conflicts constantly. The project file, sources and assets are the project itself.'),
  git('beginner', 'Which command creates a new branch called `feature` and switches to it?', ['git branch -d feature', 'git checkout -b feature', 'git merge feature', 'git push -b feature'], 1, '`git checkout -b feature` (or `git switch -c feature`) creates and switches. `git branch -d` deletes a branch.'),
  git('beginner', 'What is the difference between commit and push?', ['Commit uploads to GitHub; push saves locally', 'Commit saves a snapshot in your local repo; push uploads your commits to the remote', 'They are the same', 'Push creates a branch; commit merges it'], 1, 'Commits live in your local repository until you push them to the remote (for example GitHub).'),
  git('intermediate', 'What does `git pull` do?', ['Uploads local commits', 'Fetches the remote changes and merges them into the current branch', 'Deletes the local branch', 'Creates a pull request on GitHub'], 1, '`git pull` = `git fetch` + `git merge` (or rebase, if configured). A pull request is a GitHub feature, not a git command.'),

  // About Swift
  about('beginner', 'How does Swift manage the memory of class instances?', ['A tracing garbage collector', 'Automatic Reference Counting (ARC)', 'Manual malloc and free', 'The operating system frees memory when the app closes'], 1, 'Swift uses ARC: each strong reference is counted, and an instance is freed when its count reaches zero. There is no garbage-collector pause.'),
  about('beginner', 'Which statement about Swift is TRUE?', ['It is dynamically typed', 'It is type-safe and uses type inference', 'Every line must end with a semicolon', 'It only runs on iPhone'], 1, 'Swift checks types at compile time and infers them from values. Semicolons are optional, and it runs on all Apple platforms plus Linux and Windows.'),
  about('intermediate', 'What does the Swift 6 language mode add at compile time?', ['Garbage collection', 'Data-race safety checking', 'Multiple inheritance of classes', 'Null pointers'], 1, 'Swift 6 language mode makes the compiler report possible data races (strict concurrency checking).'),
  about('beginner', 'Where can Swift code run?', ['Only on iOS', 'Only on macOS and iOS', 'Apple platforms, plus Linux and Windows', 'Only inside Xcode'], 2, 'Swift is open source and has official toolchains for Linux and Windows as well as all Apple platforms.'),

  // Constants & variables
  vars('intermediate', 'let x = 10\nlet y = 2.5\nlet z = x * y\n\nWhat happens?', ['z is 25.0', 'z is 25', 'Compile error: cannot multiply Int and Double', 'z is 20'], 2, 'Swift never converts number types implicitly. Write `Double(x) * y` to get 25.0.'),
  vars('beginner', 'What type does Swift infer for `let pi = 3.14159`?', ['Float', 'Double', 'Decimal', 'CGFloat'], 1, 'A floating-point literal is inferred as Double unless you annotate another type.'),
  vars('intermediate', 'struct Point { var x = 0 }\nlet p = Point()\np.x = 5\n\nWhat happens?', ['p.x becomes 5', 'Compile error: p is a let constant', 'Runtime crash', 'Only a warning'], 1, 'A struct is a value type: a `let` instance is completely immutable, even its `var` properties.'),
  vars('intermediate', 'class Counter { var value = 0 }\nlet c = Counter()\nc.value = 5\nprint(c.value)\n\nWhat is printed?', ['Compile error: c is a let', '0', '5', 'Runtime crash'], 2, 'For a class, `let` fixes the reference, not the object. The object’s var properties can still change.'),
  vars('intermediate', 'let limit: Int\nlimit = 10\nprint(limit)\n\nWhat happens?', ['Compile error: a let must be set where it is declared', 'Prints 10', 'Prints 0', 'Runtime crash'], 1, 'A `let` can be declared first and assigned exactly once later, as long as it is set before it is read.'),
  vars('beginner', 'What is `let big = 1_000_000`?', ['A String "1_000_000"', 'A compile error', 'The Int 1000000', 'A Double'], 2, 'Underscores in number literals are ignored. They just make big numbers readable.'),

  // Operators
  ops('advanced', 'print(-7 % 3)\n\nWhat is printed?', ['2', '-1', '1', '-2'], 1, 'Swift’s `%` is a remainder: its sign follows the left operand. -7 = 3 × (-2) + (-1).'),
  ops('beginner', 'let a = 7\nlet b = 2\nprint(a / b)\n\nWhat is printed?', ['3.5', '4', '3', 'Compile error'], 2, 'Integer division truncates toward zero: 7 / 2 = 3. Use Double(a) / Double(b) for 3.5.'),
  ops('beginner', 'for i in 1..<4 { print(i, terminator: " ") }\n\nWhat is printed?', ['1 2 3 4', '1 2 3', '0 1 2 3', '2 3 4'], 1, '`..<` is a half-open range: it includes 1 but excludes 4.'),
  ops('beginner', 'let name: String? = nil\nprint(name ?? "Guest")\n\nWhat is printed?', ['nil', 'Optional("Guest")', 'Guest', 'Runtime crash'], 2, '`??` returns the right side when the left is nil, and the result is a plain String.'),
  ops('advanced', 'var x: UInt8 = 255\nx += 1\n\nWhat happens?', ['x becomes 0', 'x becomes 256', 'Runtime crash: arithmetic overflow', 'Compile error'], 2, 'Swift traps on overflow at run time. To wrap to 0 on purpose, use `x &+= 1`.'),
  ops('beginner', 'Which operator checks whether two class references point to the SAME object?', ['==', '===', '~=', '&=='], 1, '`===` compares identity (same instance). `==` compares values and needs Equatable.'),
  ops('beginner', 'var i = 0\ni++\n\nWhat happens?', ['i becomes 1', 'Compile error: ++ does not exist in Swift', 'i stays 0', 'Runtime crash'], 1, '`++` and `--` were removed in Swift 3. Write `i += 1`.'),

  // Collections
  coll('beginner', 'var a = [1, 2, 3]\nvar b = a\nb.append(4)\nprint(a)\n\nWhat is printed?', ['[1, 2, 3, 4]', '[1, 2, 3]', '[4]', 'Compile error'], 1, 'Arrays are value types. `b` is an independent copy (copy-on-write), so `a` is unchanged.'),
  coll('beginner', 'let s: Set = [1, 2, 2, 3, 3, 3]\nprint(s.count)\n\nWhat is printed?', ['6', '1', '3', 'Compile error: duplicate values'], 2, 'A Set keeps only unique elements: {1, 2, 3}.'),
  coll('intermediate', 'let ages = ["Ravi": 21]\nlet a = ages["Meena"]\n\nWhat are the type and value of a?', ['Int, 0', 'Int?, nil', 'Runtime crash', 'String, ""'], 1, 'A dictionary lookup returns an Optional, because the key may be missing.'),
  coll('beginner', 'let arr = [1, 2, 3]\nprint(arr[3])\n\nWhat happens?', ['Prints nil', 'Prints 3', 'Runtime crash: index out of range', 'Compile error'], 2, 'Array indices start at 0, so the valid indices are 0…2. An out-of-range index crashes. Use `arr.indices.contains(3)` to check first.'),
  coll('intermediate', 'You must check, very often, whether a username is already taken among 1 million names. Which collection is best?', ['Array', 'Set', 'Array of tuples', 'String with commas'], 1, 'A Set checks `contains` in constant time on average. An Array scans every element.'),
  coll('advanced', 'var d = ["a": 1]\nlet old = d.updateValue(5, forKey: "a")\nprint(old)\n\nWhat is printed?', ['5', 'Optional(1)', 'nil', 'Optional(5)'], 1, '`updateValue(_:forKey:)` returns the OLD value as an Optional (nil when the key was new).'),
  coll('intermediate', 'let a: Set = [1, 2, 3]\nlet b: Set = [2, 3, 4]\nprint(a.intersection(b).sorted())\n\nWhat is printed?', ['[1, 4]', '[2, 3]', '[1, 2, 3, 4]', '[1]'], 1, 'The intersection holds the elements in both sets. `sorted()` turns it into an ordered Array.'),

  // Enums
  en('beginner', 'enum Planet: Int { case mercury = 1, venus, earth }\nprint(Planet.earth.rawValue)\n\nWhat is printed?', ['2', '3', '0', 'earth'], 1, 'Int raw values auto-increment from the last one given: mercury 1, venus 2, earth 3.'),
  en('beginner', 'enum Direction: String { case north, south }\nprint(Direction.south.rawValue)\n\nWhat is printed?', ['1', 'south', 'Direction.south', 'Compile error'], 1, 'String raw values default to the case name.'),
  en('intermediate', 'What is the type of `Planet(rawValue: 5)`?', ['Planet', 'Planet? (Optional)', 'Int', 'It crashes when 5 is invalid'], 1, '`init?(rawValue:)` is failable. It returns nil when no case has that raw value.'),
  en('intermediate', 'Which of these can an enum NOT have?', ['Computed properties', 'Methods', 'Stored instance properties', 'Associated values'], 2, 'Enums cannot have stored instance properties. Data goes in associated values instead.'),
  en('beginner', 'A switch over an enum handles only some of its cases and has no `default`. What happens?', ['It compiles; missing cases are ignored', 'Compile error: switch must be exhaustive', 'Runtime crash for a missing case', 'Only a warning'], 1, 'A Swift switch must cover every possible value.'),
  en('intermediate', 'Which enum feature lets `case loaded(items: [String])` carry data?', ['Raw values', 'Associated values', 'CaseIterable', 'indirect'], 1, 'Associated values attach data to one case. Raw values are fixed constants for every case.'),

  // Struct vs class
  sc('beginner', 'struct User { var name: String }\nvar a = User(name: "Asha")\nvar b = a\nb.name = "Ravi"\nprint(a.name)\n\nWhat is printed?', ['Ravi', 'Asha', 'Compile error', 'nil'], 1, 'A struct is copied on assignment, so changing b does not touch a.'),
  sc('beginner', 'class User { var name: String; init(name: String) { self.name = name } }\nlet a = User(name: "Asha")\nlet b = a\nb.name = "Ravi"\nprint(a.name)\n\nWhat is printed?', ['Asha', 'Ravi', 'Compile error', 'nil'], 1, 'A class is a reference type: a and b point to the same object.'),
  sc('beginner', 'A struct method changes one of the struct’s properties. Which keyword must it have?', ['final', 'override', 'mutating', 'inout'], 2, 'Struct methods cannot change self unless they are marked `mutating`.'),
  sc('beginner', 'Which feature is available ONLY to classes?', ['Methods', 'Protocol conformance', 'Initializers', 'Inheritance'], 3, 'Structs can have methods, initializers and protocols, but only classes inherit from other classes.'),
  sc('advanced', 'class Box { var v = 1 }\nstruct Wrapper { var box = Box() }\nvar w1 = Wrapper()\nlet w2 = w1\nw1.box.v = 9\nprint(w2.box.v)\n\nWhat is printed?', ['1', '9', 'Compile error: w2 is a let', 'Runtime crash'], 1, 'Copying the struct copies only the reference to the same Box, so both wrappers share one Box.'),
  sc('intermediate', 'Which types automatically get a memberwise initializer?', ['Classes only', 'Structs only', 'Both structs and classes', 'Neither'], 1, 'Only structs get a memberwise init (for example `User(name:)`). Classes need an explicit init unless every property has a default.'),
  sc('beginner', 'Where can you write a `deinit`?', ['Structs', 'Enums', 'Classes', 'Protocols'], 2, 'Only class instances are reference-counted and destroyed, so only classes have deinit.'),

  // Access control
  acc('beginner', 'What access level does a declaration get when you write none?', ['private', 'public', 'internal', 'fileprivate'], 2, '`internal` is the default: visible anywhere in the same module (your app target).'),
  acc('intermediate', 'In a framework, which access level lets apps SUBCLASS your class?', ['public', 'open', 'internal', 'fileprivate'], 1, '`public` allows use but not subclassing or overriding outside the module. `open` allows both.'),
  acc('beginner', 'What does `private(set) var score = 0` mean?', ['Nobody can read it', 'Anyone (who can see it) can read it, but only the type itself can change it', 'It can be set only once', 'It is a constant'], 1, 'The getter keeps the normal access level; the setter becomes private.'),
  acc('intermediate', 'Can an extension of a type, in the SAME file, use that type’s `private` members?', ['No, never', 'Yes (since Swift 4)', 'Only if the members are static', 'Only from a subclass'], 1, 'Since Swift 4, private members are visible in extensions of the same type in the same file.'),
  acc('intermediate', 'Which order goes from MOST restrictive to LEAST restrictive?', ['open, public, internal, fileprivate, private', 'private, fileprivate, internal, public, open', 'private, internal, fileprivate, open, public', 'fileprivate, private, internal, public, open'], 1, 'private (declaration) < fileprivate (file) < internal (module) < public (other modules can use) < open (other modules can subclass).'),

  // Optionals
  opt('beginner', 'let n = Int("12a")\nprint(n)\n\nWhat is printed?', ['12', '0', 'nil', 'Runtime crash'], 2, '`Int(_ string:)` is failable and returns nil when the text is not a whole number.'),
  opt('advanced', 'let s: String? = "Hi"\nprint(s)\n\nWhat is printed?', ['Hi', 'Optional("Hi")', 'nil', 'Compile error'], 1, 'Printing an Optional shows its wrapper (with a compiler warning). Unwrap it, or use `s ?? ""`, to print just Hi.'),
  opt('intermediate', 'struct Address { var city: String }\nstruct User { var address: Address? }\nlet u = User(address: nil)\nlet c = u.address?.city\n\nWhat is the type of c?', ['String', 'String?', 'Address?', 'Compile error'], 1, 'Optional chaining always makes the result Optional. Here c is nil.'),
  opt('beginner', 'What must the `else` branch of a `guard let` do?', ['Print an error', 'Exit the current scope (return, throw, break or continue)', 'Assign a default value', 'Nothing; it is optional'], 1, 'guard promises the value exists after it, so its else must leave the scope.'),
  opt('beginner', 'var x: Int? = nil\nprint(x! + 1)\n\nWhat happens?', ['Prints 1', 'Prints nil', 'Runtime crash: unexpectedly found nil', 'Compile error'], 2, 'Force-unwrapping nil with `!` crashes the app.'),
  opt('advanced', 'let a: Int? = 5\nlet b = a.map { $0 * 2 }\nprint(b as Any)\n\nWhat is printed?', ['10', 'Optional(10)', 'nil', 'Compile error: map is only for arrays'], 1, '`Optional.map` runs the closure only if there is a value, and the result stays Optional.'),
  opt('intermediate', 'Which unwrap keeps the unwrapped value available for the REST of the function?', ['if let', 'guard let', 'Optional chaining', 'The ?? operator'], 1, '`guard let` puts the unwrapped name in scope after the guard. `if let` only inside its braces.'),

  // ARC
  arc('advanced', 'class A { var b: B?; deinit { print("A gone") } }\nclass B { var a: A?; deinit { print("B gone") } }\nvar a: A? = A()\nvar b: B? = B()\na?.b = b\nb?.a = a\na = nil\nb = nil\n\nWhat is printed?', ['A gone, B gone', 'B gone, A gone', 'Nothing', 'Runtime crash'], 2, 'A and B hold strong references to each other (a retain cycle). Their counts never reach 0, so no deinit runs. That is a memory leak.'),
  arc('intermediate', 'class A { var b: B? }\nclass B { var a: A? }\n\nAn A and a B point at each other, so neither is ever freed. What is the simplest fix?', ['Make the classes structs', 'Declare `weak var a: A?` in B', 'Call deinit manually', 'Use `let` instead of `var`'], 1, 'A weak reference does not add to the count, so A can be freed, and then B is freed too.'),
  arc('beginner', 'A `weak` reference must be…', ['let and non-optional', 'var and Optional', 'static', 'private'], 1, 'ARC sets a weak reference to nil when the object goes away, so it must be a var of Optional type.'),
  arc('beginner', 'When does a class instance’s `deinit` run?', ['When the app goes to the background', 'When its strong reference count reaches zero', 'Every time a variable goes out of scope', 'Only when you call it'], 1, 'ARC calls deinit as soon as the last strong reference disappears.'),
  arc('intermediate', 'What happens if you access an `unowned` reference after its object has been freed?', ['It returns nil', 'Runtime crash', 'The object is recreated', 'A compile error'], 1, 'unowned assumes the object is still alive. Accessing it after deallocation crashes, so use weak when that can happen.'),
  arc('advanced', 'class VC {\n    var count = 0\n    var onTap: (() -> Void)?\n    func setup() { onTap = { self.count += 1 } }\n}\n\nWhat is the problem?', ['None', 'A retain cycle: VC holds the closure, which holds VC strongly', 'Compile error: self is not allowed in closures', 'count is never incremented'], 1, 'The stored closure captures self strongly, and self stores the closure. Use `{ [weak self] in self?.count += 1 }`.'),
  arc('beginner', 'Does ARC manage struct values?', ['Yes, exactly like classes', 'No, ARC is for class instances (reference types)', 'Only structs larger than 1 KB', 'Only structs marked final'], 1, 'Value types are copied, not shared, so they need no reference counting (a class stored inside one still is counted).'),

  // Functions
  fn('beginner', 'func greet(person name: String) { print("Hi \\(name)") }\n\nWhich call is correct?', ['greet("Asha")', 'greet(name: "Asha")', 'greet(person: "Asha")', 'greet(person name: "Asha")'], 2, 'The argument label `person` is used at the call site. `name` is only used inside the function.'),
  fn('intermediate', 'func addOne(_ x: inout Int) { x += 1 }\nvar n = 5\naddOne(&n)\nprint(n)\n\nWhat is printed?', ['5', '6', 'Compile error', '1'], 1, '`inout` passes the variable in and writes the change back to it. The call must use `&`.'),
  fn('beginner', 'func total(_ nums: Int...) -> Int { nums.reduce(0, +) }\nprint(total(1, 2, 3))\n\nWhat is printed?', ['[1, 2, 3]', '6', '3', 'Compile error'], 1, 'A variadic parameter collects the arguments into an [Int].'),
  fn('intermediate', 'func f(x: Int) {\n    x += 1\n}\n\nWhat happens?', ['x becomes x + 1', 'Compile error: x is a let constant', 'Runtime crash', 'Only a warning'], 1, 'Function parameters are constants. Use `inout`, or copy to a local var.'),
  fn('intermediate', 'func minMax(_ a: [Int]) -> (min: Int, max: Int) {\n    (a.min()!, a.max()!)\n}\nlet r = minMax([4, 9, 1])\nprint(r.max - r.min)\n\nWhat is printed?', ['8', '5', '3', 'Compile error'], 0, 'The tuple elements are named, so r.max = 9 and r.min = 1, giving 8.'),
  fn('beginner', 'func greet(_ name: String = "Guest") -> String { "Hi \\(name)" }\nprint(greet())\n\nWhat is printed?', ['Hi', 'Hi Guest', 'Compile error: missing argument', 'Hi nil'], 1, 'A default parameter value is used when the argument is left out.'),

  // Closures
  clo('intermediate', 'func makeCounter() -> () -> Int {\n    var count = 0\n    return { count += 1; return count }\n}\nlet c = makeCounter()\n_ = c()\nprint(c())\n\nWhat is printed?', ['1', '2', '0', 'Compile error'], 1, 'The closure captures `count` and keeps it alive between calls: the first call gives 1, the second 2.'),
  clo('intermediate', 'var x = 1\nlet show = { print(x) }\nx = 2\nshow()\n\nWhat is printed?', ['1', '2', 'nil', 'Compile error'], 1, 'Closures capture the variable, not a snapshot, so they see the latest value.'),
  clo('advanced', 'var x = 1\nlet show = { [x] in print(x) }\nx = 2\nshow()\n\nWhat is printed?', ['1', '2', 'nil', 'Compile error'], 0, 'A capture list copies the value when the closure is created.'),
  clo('intermediate', 'A function saves its closure parameter in an array to call later. What must the parameter be marked?', ['@autoclosure', '@escaping', 'inout', 'lazy'], 1, 'A closure that outlives the function call escapes it, and Swift requires @escaping.'),
  clo('beginner', 'let nums = [3, 1, 2]\nprint(nums.sorted { $0 > $1 })\n\nWhat is printed?', ['[1, 2, 3]', '[3, 2, 1]', '[3, 1, 2]', 'Compile error'], 1, '`$0 > $1` sorts in descending order. The closure is written in trailing form.'),
  clo('beginner', 'Which call is the trailing-closure form of `UIView.animate(withDuration: 0.3, animations: { v.alpha = 0 })`?', ['UIView.animate { v.alpha = 0 }(withDuration: 0.3)', 'UIView.animate(withDuration: 0.3) { v.alpha = 0 }', 'UIView.animate(0.3) -> { v.alpha = 0 }', 'UIView { v.alpha = 0 }.animate(0.3)'], 1, 'The last closure argument moves after the parentheses, and its label is dropped.'),
  clo('advanced', 'func makeCounter() -> () -> Int {\n    var count = 0\n    return { count += 1; return count }\n}\nlet a = makeCounter()\nlet b = makeCounter()\n_ = a(); _ = a()\nprint(b())\n\nWhat is printed?', ['3', '1', '2', '0'], 1, 'Each call to makeCounter creates a new `count`, so b has its own counter starting from 0.'),

  // Higher-order functions
  hof('beginner', 'print([1, 2, 3].map { $0 * $0 })\n\nWhat is printed?', ['[1, 4, 9]', '[2, 4, 6]', '14', '[1, 2, 3]'], 0, '`map` transforms every element, here squaring it.'),
  hof('beginner', 'print(["1", "x", "3"].compactMap { Int($0) })\n\nWhat is printed?', ['[1, nil, 3]', '[1, 3]', '[Optional(1), Optional(3)]', '4'], 1, '`compactMap` drops the nil results and unwraps the rest.'),
  hof('intermediate', 'print([1, 2, 3, 4].reduce(10, +))\n\nWhat is printed?', ['10', '20', '24', '[11, 12, 13, 14]'], 1, '`reduce` starts at 10 and adds each element: 10 + 1 + 2 + 3 + 4 = 20.'),
  hof('beginner', 'print([[1, 2], [3]].flatMap { $0 })\n\nWhat is printed?', ['[[1, 2], [3]]', '[1, 2, 3]', '[3, 3]', '6'], 1, '`flatMap` flattens one level of nesting.'),
  hof('advanced', 'let r = [5, 8, 2, 9].filter { $0 > 4 }.map { $0 * 10 }.first\nprint(r as Any)\n\nWhat is printed?', ['50', 'Optional(50)', 'Optional(80)', '[50, 80, 90]'], 1, 'filter → [5, 8, 9], map → [50, 80, 90], and `.first` is an Optional.'),
  hof('advanced', 'What is the type of `["1", "x"].map { Int($0) }`?', ['[Int]', '[Int?]', 'Int?', '[String]'], 1, '`Int(_:)` returns Int?, so map gives [Int?]: [Optional(1), nil].'),
  hof('beginner', 'Which function stops at the FIRST element that matches?', ['filter', 'map', 'first(where:)', 'forEach'], 2, '`first(where:)` returns as soon as it finds a match. filter always checks every element.'),
  hof('advanced', 'var out: [Int] = []\n[1, 2, 3, 4].forEach { n in\n    if n == 3 { return }\n    out.append(n)\n}\nprint(out)\n\nWhat is printed?', ['[1, 2]', '[1, 2, 4]', '[1, 2, 3, 4]', '[]'], 1, '`return` inside forEach only ends the closure call for that element; it does not stop the loop.'),

  // Protocols
  pro('advanced', 'protocol Greeter { func hello() }\nextension Greeter {\n    func hello() { print("ext hello") }\n    func bye() { print("ext bye") }\n}\nstruct Bot: Greeter {\n    func hello() { print("Bot hello") }\n    func bye() { print("Bot bye") }\n}\nlet g: Greeter = Bot()\ng.hello()\ng.bye()\n\nWhat is printed?', ['Bot hello, Bot bye', 'ext hello, ext bye', 'Bot hello, ext bye', 'ext hello, Bot bye'], 2, 'hello() is a protocol requirement, so it is dynamically dispatched to Bot. bye() exists only in the extension, so it is statically dispatched: g’s declared type (Greeter) decides.'),
  pro('intermediate', 'A protocol requires `var name: String { get }`. Which can satisfy it?', ['Only a computed property', 'Only a `let` stored property', 'A let, a var or a computed property', 'Only a static property'], 2, '`{ get }` means at least readable. Any readable property works; `{ get set }` would need a settable one.'),
  pro('intermediate', 'For `weak var delegate: MyDelegate?` to compile, the protocol must…', ['Be marked @objc', 'Inherit from AnyObject', 'Have no methods', 'Be private'], 1, 'weak only works with class instances, so the protocol must be class-only (`protocol MyDelegate: AnyObject`).'),
  pro('beginner', 'A protocol method should let structs change their own properties. How is it declared in the protocol?', ['func reset()', 'mutating func reset()', 'final func reset()', 'override func reset()'], 1, 'Mark it `mutating` in the protocol. Classes implement it without the keyword.'),
  pro('beginner', 'Can one struct conform to several protocols?', ['No, only one', 'Yes, as many as needed', 'Only if they are related', 'Only classes can conform'], 1, 'For example `struct User: Codable, Hashable, Identifiable`.'),
  pro('intermediate', 'What does a default implementation in a protocol extension give you?', ['Conforming types must still write the method', 'Conforming types get the method automatically and may provide their own', 'The protocol becomes a class', 'It works only for classes'], 1, 'Protocol extensions share behaviour across every conforming type. That is protocol-oriented programming.'),

  // Generics
  gen('intermediate', 'func same<T>(_ a: T, _ b: T) -> Bool { a == b }\n\nWhat happens?', ['Compiles and works for any type', 'Compile error: T must conform to Equatable', 'Runtime crash for classes', 'Works only for Int'], 1, 'An unconstrained T does not support ==. Write `<T: Equatable>`.'),
  gen('intermediate', 'struct Stack<Element> {\n    private var items: [Element] = []\n    mutating func push(_ x: Element) { items.append(x) }\n    mutating func pop() -> Element? { items.popLast() }\n}\nvar s = Stack<String>()\ns.push("a"); s.push("b")\nprint(s.pop() ?? "-")\n\nWhat is printed?', ['a', 'b', '-', 'Optional("b")'], 1, 'A stack is last-in, first-out. `?? "-"` unwraps the Optional result.'),
  gen('intermediate', 'func largest<T: Comparable>(_ a: [T]) -> T? { a.max() }\nprint(largest(["pear", "apple", "mango"]) ?? "")\n\nWhat is printed?', ['apple', 'mango', 'pear', 'Compile error'], 2, 'Strings compare alphabetically: p comes after m and a, so pear is largest.'),
  gen('beginner', 'Which keyword declares a placeholder type inside a protocol?', ['typealias', 'associatedtype', 'generic', 'some'], 1, 'For example, `protocol Container { associatedtype Item }`.'),
  gen('beginner', 'Which of these is a generic type from the standard library?', ['Int', 'Bool', 'Array<Element>', 'Character'], 2, 'Array, Dictionary<Key, Value> and Optional<Wrapped> are all generic.'),

  // Extensions
  ext('beginner', 'extension User {\n    var visits = 0\n}\n\nWhat happens?', ['Adds a visits property', 'Compile error: extensions must not contain stored properties', 'Runtime crash', 'Works only for classes'], 1, 'Extensions can add computed properties but not stored ones.'),
  ext('beginner', 'extension String {\n    var shout: String { uppercased() + "!" }\n}\nprint("hi".shout)\n\nWhat is printed?', ['hi!', 'HI!', 'HI', 'Compile error'], 1, 'A computed property added in an extension works on every String.'),
  ext('intermediate', 'Can an extension override a method that the type already has?', ['Yes, always', 'No', 'Only for structs', 'Only with the `override` keyword'], 1, 'Extensions add new functionality; they cannot override existing members.'),
  ext('advanced', 'You write `init(name: String)` in an EXTENSION of `struct User { var name: String; var age: Int }`. What about the memberwise `User(name:age:)`?', ['It is removed', 'It is still available', 'It becomes private', 'Compile error'], 1, 'Writing an init in an extension keeps the memberwise initializer. Writing it in the struct body removes it.'),
  ext('beginner', 'extension Int {\n    func squared() -> Int { self * self }\n}\nprint(4.squared() + 1)\n\nWhat is printed?', ['16', '17', '25', 'Compile error'], 1, '4 × 4 = 16, plus 1 = 17. Extensions can add methods even to built-in types.'),

  // Error handling
  err('intermediate', 'func test() {\n    defer { print("A") }\n    defer { print("B") }\n    print("C")\n}\ntest()\n\nWhat is printed (in order)?', ['A B C', 'C A B', 'C B A', 'B A C'], 2, 'defer blocks run when the scope exits, in REVERSE order of declaration.'),
  err('intermediate', 'enum ParseError: Error { case bad }\nfunc parse(_ s: String) throws -> Int {\n    guard let n = Int(s) else { throw ParseError.bad }\n    return n\n}\nlet v = try? parse("7x")\nprint(v as Any)\n\nWhat is printed?', ['7', 'nil', 'bad', 'Runtime crash'], 1, '`try?` turns a thrown error into nil.'),
  err('beginner', 'What happens when a call marked `try!` throws an error?', ['It returns nil', 'Runtime crash', 'The error is ignored', 'It retries'], 1, '`try!` asserts that no error will be thrown. If one is, the app crashes.'),
  err('beginner', 'You call a `throws` function without writing `try`. What happens?', ['It works normally', 'Compile error', 'Runtime crash', 'Only a warning'], 1, 'Swift requires `try` on every call that can throw, so failure points are visible.'),
  err('beginner', 'enum ParseError: Error { case bad }\nfunc parse(_ s: String) throws -> Int {\n    guard let n = Int(s) else { throw ParseError.bad }\n    return n\n}\ndo {\n    let n = try parse("12")\n    print(n * 2)\n} catch {\n    print("failed")\n}\n\nWhat is printed?', ['12', '24', 'failed', 'nil'], 1, '"12" parses fine, so no error is thrown and 24 is printed.'),
  err('intermediate', 'Inside a plain `catch { }` block with no pattern, what holds the thrown error?', ['A constant named `error`', 'A constant named `e`', 'Nothing; it is lost', 'self.error'], 0, 'A catch with no pattern binds the error to an implicit local constant called `error`.'),

  // Advanced mix: the questions that separate a 60% score from a 90% one
  coll('advanced', 'var nums = [1, 2, 3]\nfor n in nums {\n    nums.append(n)\n}\nprint(nums.count)\n\nWhat is printed?', ['3', '6', 'It loops forever', 'Runtime crash: mutated while iterating'], 1, 'for-in iterates over a copy of the array taken when the loop starts (value semantics), so it runs 3 times and appends 3 items: 6.'),
  en('advanced', 'enum Shape {\n    case circle(r: Double)\n    case rect(w: Double, h: Double)\n}\nlet s = Shape.rect(w: 2, h: 3)\nif case let .rect(w, h) = s {\n    print(w * h)\n}\n\nWhat is printed?', ['6', '6.0', 'Nothing is printed', 'Compile error'], 1, '`if case let` matches one case and binds its associated values. 2.0 × 3.0 is a Double, printed as 6.0.'),
  clo('advanced', 'var closures: [() -> Int] = []\nfor i in 1...3 {\n    closures.append { i * 10 }\n}\nprint(closures.map { $0() })\n\nWhat is printed?', ['[30, 30, 30]', '[10, 20, 30]', '[0, 10, 20]', 'Compile error'], 1, 'Each loop iteration has its own constant `i`, so each closure captures a different value. (In some other languages all three would print 30.)'),
  err('advanced', 'enum E: Error { case failed }\nfunc work() throws {\n    defer { print("cleanup") }\n    print("start")\n    throw E.failed\n}\ndo { try work() } catch { print("caught") }\n\nWhat is printed (in order)?', ['start, caught', 'start, cleanup, caught', 'cleanup, start, caught', 'start, caught, cleanup'], 1, 'defer runs when work() exits, and throwing is also an exit. So cleanup prints before the error reaches the catch.'),
  opt('advanced', 'class Dog { func bark() { print("Woof") } }\nvar d: Dog? = nil\nlet r = d?.bark()\nprint(r == nil)\n\nWhat is printed?', ['Woof, then true', 'true', 'false', 'Runtime crash'], 1, 'd is nil, so the optional chain stops and bark() is never called. Calling a Void method through optional chaining gives `Void?`, which is nil here.'),
  gen('advanced', 'func describe<T>(_ x: T) -> String { "generic" }\nfunc describe(_ x: Int) -> String { "int" }\nprint(describe(5), describe("a"))\n\nWhat is printed?', ['generic generic', 'int generic', 'int int', 'Compile error: ambiguous call'], 1, 'When both overloads fit, Swift picks the more specific, non-generic one: Int → "int". A String only fits the generic one.'),
  hof('advanced', 'let words = ["apple", "avocado", "banana"]\nlet groups = words.reduce(into: [Character: Int]()) {\n    $0[$1.first!, default: 0] += 1\n}\nprint(groups["a"] ?? 0)\n\nWhat is printed?', ['1', '2', '3', 'Optional(2)'], 1, '`reduce(into:)` gives a mutable result ($0) and each element ($1). Two words start with “a”. `?? 0` unwraps the lookup.'),

  // UIKit vs SwiftUI
  ui('beginner', 'Which statement describes SwiftUI?', ['Imperative: you change views step by step', 'Declarative: you describe the UI for the current state', 'A replacement for Swift the language', 'Only for macOS'], 1, 'In SwiftUI you declare what the UI should look like for a given state. UIKit is the imperative framework.'),
  ui('intermediate', 'How do you show a SwiftUI view inside an existing UIKit app?', ['UIViewRepresentable', 'UIHostingController', 'UINavigationController', 'UIStoryboardSegue'], 1, 'UIHostingController(rootView:) wraps a SwiftUI view in a UIViewController. Representable goes the other way.'),
  ui('intermediate', 'You need a UIKit view (for example a custom camera preview) inside a SwiftUI screen. What do you use?', ['UIHostingController', 'UIViewRepresentable', '@State', 'NavigationStack'], 1, 'UIViewRepresentable wraps a UIView so it can be used as a SwiftUI View.'),
  ui('beginner', 'A SwiftUI View is usually a…', ['class that inherits UIView', 'struct that conforms to View', 'enum', 'protocol extension'], 1, 'SwiftUI views are lightweight value types that conform to the View protocol.'),
  ui('beginner', 'In SwiftUI, what happens when a `@State` property changes?', ['Nothing until you call setNeedsDisplay()', 'The view’s body is computed again and the screen updates', 'The app restarts the screen', 'You must update the labels yourself'], 1, 'SwiftUI tracks the state and recomputes body, then updates only what changed.'),
];
