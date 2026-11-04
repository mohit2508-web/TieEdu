/**
 * Module cheat sheets from the owner's "Guess Papers by Module" (Part 2),
 * word for word. Every lesson of a module shows its module's sheet in Train.
 */
export interface CheatSheet {
  title: string;
  tables: Array<{ title?: string; head: string[]; rows: string[][] }>;
  /** Quick facts: "Label: text" lines. */
  facts: string[];
  /** Question patterns and how to solve them. */
  patterns: string[];
}

const M1: CheatSheet = {
  title: 'Cheat sheet: Module 1 (Setup)',
  tables: [{ title: 'Git in six commands', head: ['Command', 'What it does'], rows: [
    ['git init / git clone', 'Start a repo / copy a remote one'], ['git add', 'Stage changes'], ['git commit -m', 'Save staged changes locally'],
    ['git push', 'Upload commits to GitHub'], ['git pull', 'Fetch and merge remote changes'], ['git branch / git merge', 'Make a branch / combine branches'],
  ] }],
  facts: [
    'Workflow order: Add, Commit, Push (ACP). Commit is local only.',
    'Xcode runs on macOS only. The Simulator has no real camera, so test hardware on a device.',
    'Playgrounds are for quick experiments, not for shipping apps.',
    'Put build and user files in .gitignore: DerivedData, xcuserdata, .DS_Store.',
  ],
  patterns: [
    'A command question: match the verb. Start = init, copy = clone, upload = push, download and merge = pull.',
    'An order question: think Add, Commit, Push.',
    'A conflict question: the answer is always to resolve the markers, then add and commit. Never delete .git or force push.',
  ],
};

const M2: CheatSheet = {
  title: 'Cheat sheet: Module 2 (Swift basics)',
  tables: [{ title: 'Value vs reference', head: ['', 'struct / enum', 'class'], rows: [
    ['Type', 'Value (copied)', 'Reference (shared)'], ['Inheritance', 'No', 'Yes'],
    ['Change own properties', 'Needs mutating', 'Free'], ['let instance', 'Fully frozen', 'Pointer fixed, properties still change'],
  ] }],
  facts: [
    'Optionals toolkit: if let and guard let (safe), ?? (default), ?. (optional chaining), ! (force: crashes on nil).',
    'Type defaults: whole number = Int, decimal = Double, text = String, true/false = Bool. Int / Int = Int.',
    'Collections: Array = ordered, duplicates allowed. Set = unique, no order. Dictionary = key-value, lookup returns an optional.',
    'Access levels (open to closed): open, public, internal (default), fileprivate, private.',
    'ARC: strong (default) keeps alive. weak = optional, becomes nil. unowned = non-optional, crashes if used after free. Use weak when the other object may disappear first.',
  ],
  patterns: [
    'Code-output with struct vs class: struct = copy, class = shared.',
    'Output with ints: check the types first for integer division.',
    'Crash questions: ! on nil, and unowned used after free.',
    'Leak questions: look for two strong references pointing at each other.',
  ],
};

const M3: CheatSheet = {
  title: 'Cheat sheet: Module 3 (Swift in depth)',
  tables: [{ title: 'map, filter, reduce', head: ['Function', 'Job', 'Example result'], rows: [
    ['map', 'Transform each element', '[1,2,3].map { $0 * 2 } = [2,4,6]'],
    ['filter', 'Keep those that pass', '[1,2,3,4].filter { $0 > 2 } = [3,4]'],
    ['reduce', 'Combine into one value', '[1,2,3].reduce(0, +) = 6'],
  ] }],
  facts: [
    'In reduce, $0 is the running result and $1 is the next element.',
    'Error handling keywords: throw (raise), throws (function can fail), try (call it), do-catch (handle), try? (nil on failure), try! (crash on failure).',
    'Protocols and generics: protocol = promise. Protocol extension = default implementation. Generic T = placeholder. A colon after T adds a constraint.',
    'Extensions: can add methods, computed properties and initializers. They cannot add stored properties.',
    'Closures: they capture values from their context. For a stored closure that uses self, write [weak self].',
  ],
  patterns: [
    'Output questions: work through the closure one element at a time and track the types.',
    'Reduce questions: note the starting value first.',
    'Which-keyword questions: match the idea (inout needs &, try? gives optional).',
    'Cycle questions: stored closure plus self means [weak self].',
  ],
};

const M4: CheatSheet = {
  title: 'Cheat sheet: Module 4 (UI paradigms)',
  tables: [{ head: ['', 'UIKit', 'SwiftUI'], rows: [
    ['Style', 'Imperative: you update views', 'Declarative: UI follows state'], ['Building block', 'UIView and UIViewController', 'struct View with body'],
    ['Layout', 'Storyboards, Auto Layout', 'Stacks, modifiers'], ['Refresh', 'reloadData or set properties', 'Change @State and it redraws'],
    ['Minimum iOS', 'Older versions', 'iOS 13 and later'],
  ] }],
  facts: [
    'Mixing them: UIHostingController puts SwiftUI inside UIKit. UIViewRepresentable puts UIKit inside SwiftUI.',
    'Modifier order: each modifier wraps the view before it, so order changes the result.',
  ],
  patterns: [
    'Which-framework questions: look for the keywords. Storyboard, IBOutlet, viewDidLoad mean UIKit. body, @State, modifiers mean SwiftUI.',
    'Interop questions: remember the direction. Hosting hosts SwiftUI. Representable represents UIKit.',
    'Version questions: SwiftUI means iOS 13 or later.',
    'Look and refresh questions: UIKit needs a manual refresh, SwiftUI follows state.',
  ],
};

const M5_6: CheatSheet = {
  title: 'Cheat sheet: Modules 5–6 (Architecture and concurrency)',
  tables: [{ head: ['', 'MVC', 'MVVM'], rows: [
    ['Layers', 'Model, View, Controller', 'Model, View, ViewModel'], ['Where logic lives', 'Often the view controller', 'The ViewModel'], ['Testing', 'Harder', 'Easier'],
  ] }],
  facts: [
    'Life-cycle order: viewDidLoad, viewWillAppear, viewDidAppear, viewWillDisappear, viewDidDisappear. App states: Not running, Inactive, Active, Background, Suspended.',
    'GCD: main queue = UI, serial. global queue = background work, concurrent. async = don\'t wait. sync = wait. Never call main.sync from the main thread.',
    'Swift concurrency: async marks a function that can pause. await marks the pause. Task { } starts async work from normal code. A task group runs many child tasks. An actor protects its own state. @MainActor means run on the main thread.',
  ],
  patterns: [
    'Which-queue questions: UI work goes to main, heavy work to a background queue.',
    'Order questions: Load, Will, Did.',
    'Keyword questions: you can only await inside async code, and calling an actor from outside needs await.',
    'Freeze questions: a sync call on the same queue it runs on is a deadlock.',
  ],
};

const M7_8: CheatSheet = {
  title: 'Cheat sheet: Modules 7–8 (Networking and UIKit)',
  tables: [{ title: 'HTTP status codes', head: ['Status', 'Meaning'], rows: [
    ['200', 'OK'], ['201', 'Created'], ['400', 'Bad request'], ['401', 'Unauthorized'], ['404', 'Not found'], ['500', 'Server error'],
  ] }],
  facts: [
    'Fetch and decode recipe: 1. Build the URL. 2. let (data, _) = try await URLSession.shared.data(from: url) 3. let model = try JSONDecoder().decode(Model.self, from: data) 4. Wrap in do-catch, and update UI on the main actor.',
    'Codable tips: Codable = Encodable + Decodable. Use CodingKeys when names differ. Use optionals for keys that may be missing.',
    'UIKit quick rules: every visible element is a UIView. IBOutlet = a handle on a view. IBAction = what happens on an event. DataSource supplies rows, Delegate handles taps. Reuse cells with dequeueReusableCell. Auto Layout needs enough constraints for position and size.',
  ],
  patterns: [
    'Code-recipe questions: look for try await plus decode, and for the tuple result.',
    'Missing-key questions: required property throws, optional becomes nil.',
    'Thread questions: network callbacks are off main, UI goes back to main.',
    'Which-protocol questions: show data = DataSource, react to taps = Delegate.',
  ],
};

const M9_10: CheatSheet = {
  title: 'Cheat sheet: Modules 9–10 (SwiftUI and project)',
  tables: [{ head: ['Wrapper', 'Use it when'], rows: [
    ['@State', 'The view owns a simple value, or owns an @Observable model'],
    ['@Binding', "A child needs a two-way link to the parent's state (pass with $)"],
    ['@Observable', 'A model class whose changes should update views (iOS 17 and later)'],
    ['@Bindable', "You need bindings to an observable model's properties"],
    ['@Environment', 'Reading shared values, such as the colour scheme'],
  ] }],
  facts: [
    'Layout: VStack = vertical, HStack = horizontal, ZStack = layered. LazyVGrid for grids. List and Form for rows. ScrollView to scroll.',
    'Navigation: NavigationStack with NavigationLink pushes screens. TabView with .tabItem switches sections.',
    'Info.plist usage keys: NSCameraUsageDescription, NSPhotoLibraryUsageDescription, NSMicrophoneUsageDescription, NSLocationWhenInUseUsageDescription.',
    "Project: a target is a product to build, with its own build settings. The bundle identifier is the app's unique ID.",
  ],
  patterns: [
    'Which-wrapper questions: own it = @State, borrow it = @Binding, shared model = @Observable.',
    'Passing a binding: always $name.',
    'Permission questions: NS + feature + UsageDescription.',
    'Layout questions: match the letter. H, V, Z.',
  ],
};

const M11_12: CheatSheet = {
  title: 'Cheat sheet: Modules 11–12 (Quality)',
  tables: [
    { title: 'Assertions', head: ['Assertion', 'Passes when'], rows: [
      ['XCTAssertEqual(a, b)', 'a equals b'], ['XCTAssertTrue / XCTAssertFalse', 'The condition is true / false'],
      ['XCTAssertNil / XCTAssertNotNil', 'The value is nil / not nil'], ['XCTAssertThrowsError', 'The expression throws'], ['XCTFail', 'Never: it always fails'],
    ] },
    { title: 'Instruments', head: ['Instruments tool', 'Finds'], rows: [
      ['Time Profiler', 'Where CPU time goes (slow code)'], ['Allocations', 'Memory growth'], ['Leaks', 'Memory that is never freed'],
    ] },
  ],
  facts: [
    'Test anatomy: setUp runs before each test, test methods start with test, and tearDown runs after. Use Arrange, Act, Assert.',
    'Test doubles: stub = canned data. fake = a simple working stand-in. mock = also verifies calls. Inject them through a protocol.',
    'Spotting leaks: a closure stored on an object that also uses self, or two objects with strong references to each other. Fix with [weak self] or weak.',
  ],
  patterns: [
    'Which-tool questions: CPU = Time Profiler, never freed = Leaks, growing = Allocations.',
    'Test-design questions: depend on a protocol, inject a fake.',
    'Naming and lifecycle: test prefix, setUp before, tearDown after.',
    'Leak questions: look for strong self in a stored closure.',
  ],
};

/** Course module number → its cheat sheet. */
export const CHEAT_SHEETS: Record<number, CheatSheet> = {
  1: M1, 2: M2, 3: M3, 4: M4, 5: M5_6, 6: M5_6, 7: M7_8, 8: M7_8, 9: M9_10, 10: M9_10, 11: M11_12, 12: M11_12,
};
