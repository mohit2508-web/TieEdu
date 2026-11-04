/** Milestone 2 (25 Nov 2026): Modules 5–6, architecture and concurrency. Practice questions, not past papers. */
import { qsFor, type WLesson, type WQuestion } from './types';

const SB = 'https://docs.swift.org/swift-book/documentation/the-swift-programming-language';
const VC = 'https://developer.apple.com/documentation/uikit/uiviewcontroller';

export const M2_LESSONS: WLesson[] = [
  {
    m: 'm2', module: 5, title: 'MVC Architecture', doc: ['Apple: UIViewController', VC],
    what: 'Model–View–Controller splits an app into data and rules (Model), what the user sees (View), and the glue that connects them (Controller). In UIKit the controller is your UIViewController.',
    rules: [
      'Model: data and business rules; it knows nothing about the UI',
      'View: UIView subclasses and storyboard views; it shows data and sends user actions',
      'Controller: takes user actions (target-action, IBAction, delegates), updates the model, then refreshes the view',
      'The View and the Model never talk directly; the Controller sits in between',
      '“Massive View Controller”: when networking, parsing and formatting all end up in the controller. Move them out into the model or services',
    ],
    examples: [
      'struct Task { var title: String; var done = false }        // Model\n\nclass TaskListVC: UIViewController {                        // Controller\n    @IBOutlet weak var countLabel: UILabel!                    // View\n    var tasks: [Task] = []\n    @IBAction func addTapped(_ sender: UIButton) {\n        tasks.append(Task(title: "New"))                       // update model\n        countLabel.text = "\\(tasks.count) tasks"            // refresh view\n    }\n}',
      'Moving the API call out of the controller into `TaskService.fetch()` keeps the view controller short and lets you test the service on its own.',
    ],
    trap: 'In UIKit the View and the Controller are tightly coupled (the VC owns its view), which is why business logic piling up in the VC makes it hard to test.',
    task: 'Build a counter screen with a Counter model struct, a label and two buttons, keeping every rule in the model.',
  },
  {
    m: 'm2', module: 5, title: 'MVVM Architecture', doc: ['Hacking with Swift: Introducing MVVM', 'https://www.hackingwithswift.com/books/ios-swiftui/introducing-mvvm-into-your-swiftui-project'],
    what: 'Model–View–ViewModel adds a ViewModel between the model and the view. The ViewModel turns model data into ready-to-show values and handles user intent, with no UI code. That makes it easy to unit test.',
    rules: [
      'View: draws the UI and forwards user actions; no logic',
      'ViewModel: presentation state and logic (formatting, validation, loading); never imports UI views',
      'Model: plain data and domain rules',
      'SwiftUI: mark the ViewModel class `@Observable` (iOS 17+) or `ObservableObject` with `@Published`, so views update on change',
      'UIKit: bind with closures or Combine (`viewModel.onChange = { … }`)',
    ],
    examples: [
      '@Observable\nfinal class LoginViewModel {\n    var email = ""\n    var password = ""\n    var canSubmit: Bool { email.contains("@") && password.count >= 8 }\n}\n\nstruct LoginView: View {\n    @State private var vm = LoginViewModel()\n    var body: some View {\n        Form {\n            TextField("Email", text: $vm.email)\n            SecureField("Password", text: $vm.password)\n            Button("Log in") { }.disabled(!vm.canSubmit)\n        }\n    }\n}',
      'Unit test without any UI: `let vm = LoginViewModel(); vm.email = "a@b.in"; vm.password = "12345678"; XCTAssertTrue(vm.canSubmit)`.',
    ],
    trap: 'A ViewModel holding a UILabel or a SwiftUI View is just MVC again. The ViewModel exposes values such as Strings and Bools, and the view decides how to show them.',
    task: 'Refactor the counter screen into a CounterViewModel and write one XCTest for it.',
  },
  {
    m: 'm2', module: 5, title: 'App Life Cycle (AppDelegate / SceneDelegate / scenePhase)', doc: ['Apple: Managing your app’s life cycle', 'https://developer.apple.com/documentation/uikit/managing-your-app-s-life-cycle'],
    what: 'iOS moves your app between states: not running, inactive, active, background and suspended. The AppDelegate handles process-wide events; the SceneDelegate handles each window (scene). In SwiftUI you read `scenePhase`.',
    rules: [
      '`application(_:didFinishLaunchingWithOptions:)`: one-time setup when the process launches (AppDelegate)',
      '`scene(_:willConnectTo:options:)`: create the window and root view controller (SceneDelegate)',
      'Going home: `sceneWillResignActive` → `sceneDidEnterBackground`; coming back: `sceneWillEnterForeground` → `sceneDidBecomeActive`',
      'One AppDelegate per process; one scene per window (an iPad can show several)',
      'SwiftUI: `@main struct MyApp: App` plus `@Environment(\\.scenePhase)`, whose values are `.active`, `.inactive` and `.background`',
    ],
    examples: [
      'func sceneDidEnterBackground(_ scene: UIScene) {\n    // save drafts now: the app may be suspended or killed\n    DraftStore.shared.save()\n}',
      'struct ContentView: View {\n    @Environment(\\.scenePhase) private var phase\n    var body: some View {\n        Text("Hello")\n            .onChange(of: phase) { _, new in\n                if new == .background { DraftStore.shared.save() }\n            }\n    }\n}',
    ],
    trap: 'With scenes, window and UI setup belong in the SceneDelegate, not in didFinishLaunching. And `.inactive` is not background: it is the brief state for an incoming call, Control Center or the app switcher.',
    task: 'Add a print to each SceneDelegate method, run the app, go home, come back, and write down the order.',
  },
  {
    m: 'm2', module: 5, title: 'View Life Cycle (viewDidLoad vs onAppear)', doc: ['Apple: UIViewController', VC],
    what: 'A UIViewController gets callbacks as its view is loaded, shown and hidden. SwiftUI views have the simpler `onAppear`, `onDisappear` and `.task`.',
    rules: [
      'Order: `loadView` → `viewDidLoad` (once) → `viewWillAppear` → `viewIsAppearing` → `viewDidAppear`, then `viewWillDisappear` → `viewDidDisappear`',
      '`viewDidLoad`: one-time setup (subviews, constraints); sizes are not final yet',
      '`viewWillAppear`: runs every time the screen shows, for example when you come back from a pushed screen; refresh data here',
      'Final frames: `viewDidLayoutSubviews` or `viewIsAppearing`',
      'SwiftUI `onAppear` can run many times (tabs, navigation); `.task { }` runs async work and cancels it when the view disappears',
    ],
    examples: [
      'override func viewDidLoad() {\n    super.viewDidLoad()\n    setupTable()        // once\n}\noverride func viewWillAppear(_ animated: Bool) {\n    super.viewWillAppear(animated)\n    reloadCart()        // every time the screen shows\n}',
      'struct NewsView: View {\n    @State private var items: [String] = []\n    var body: some View {\n        List(items, id: \\.self) { Text($0) }\n            .task { items = await API.loadNews() }   // cancelled on disappear\n    }\n}',
    ],
    trap: 'Reading `view.frame` or `bounds` in viewDidLoad gives the storyboard size, not the device size. Do size-based work in viewDidLayoutSubviews.',
    task: 'Push a second screen from a first one, print every life-cycle method in both, and go back. See which methods run again.',
  },
  {
    m: 'm2', module: 6, title: 'Grand Central Dispatch (GCD) & Queues', doc: ['Apple: Dispatch (GCD)', 'https://developer.apple.com/documentation/dispatch'],
    what: 'GCD runs work on queues managed by the system. You choose the queue (main, or a background queue) and whether to wait for the work (sync) or not (async).',
    rules: [
      '`DispatchQueue.main` is serial and runs on the main thread; ALL UI updates go there',
      '`DispatchQueue.global(qos:)` is concurrent; QoS from highest: `.userInteractive` > `.userInitiated` > `.default` > `.utility` > `.background`',
      '`async` returns at once; `sync` waits; `DispatchQueue.main.sync` called from the main thread deadlocks',
      '`DispatchQueue(label:)` is serial by default; pass `attributes: .concurrent` for a concurrent queue',
      '`DispatchGroup` with `enter`/`leave` and `notify`: run code once after several tasks finish; `asyncAfter(deadline:)` delays work',
    ],
    examples: [
      'DispatchQueue.global(qos: .userInitiated).async {\n    let image = ImageResizer.resize(bigPhoto)   // heavy, off the main thread\n    DispatchQueue.main.async {\n        self.imageView.image = image            // UI on main\n    }\n}',
      'let group = DispatchGroup()\nfor url in urls {\n    group.enter()\n    download(url) { _ in group.leave() }\n}\ngroup.notify(queue: .main) { print("All downloads done") }',
    ],
    trap: 'Updating a UILabel from a background queue may seem to work, then crash or misbehave later. Xcode’s Main Thread Checker flags it, so always hop to main.',
    task: 'Sleep for 3 seconds on the main thread and see the UI freeze, then move the sleep to a global queue.',
  },
  {
    m: 'm2', module: 6, title: 'Async / Await Modern Concurrency', doc: ['Swift Book: Concurrency', `${SB}/concurrency/`],
    what: 'async/await lets you write asynchronous code that reads top to bottom, with no completion-handler pyramids. An `async` function can pause at each `await` without blocking the thread.',
    rules: [
      'Mark a function `async`; call it with `await`, which is a possible suspension point',
      'Throwing async function: `func load() async throws`, called with `try await`',
      'Call async code from sync code (viewDidLoad, a button action) with `Task { … }`',
      'Awaits written one after another run sequentially; `async let` starts work in parallel',
      'Many APIs have async versions: `try await URLSession.shared.data(from: url)`',
    ],
    examples: [
      'func loadProfile() async throws -> Profile {\n    let (data, _) = try await URLSession.shared.data(from: profileURL)\n    return try JSONDecoder().decode(Profile.self, from: data)\n}\n\n@IBAction func refresh(_ sender: Any) {\n    Task {\n        do { profile = try await loadProfile() }\n        catch { showError(error) }\n    }\n}',
      'async let user = api.user()\nasync let posts = api.posts()\nlet screen = try await Screen(user: user, posts: posts)   // both requests run at the same time',
    ],
    trap: '`await` does not block the thread, but it does pause YOUR function. Two awaits in a row take the sum of both times. Use `async let` or a task group to overlap them.',
    task: 'Rewrite a completion-handler network call with async/await, and call it from a button using Task.',
  },
  {
    m: 'm2', module: 6, title: 'Tasks & Task Groups', doc: ['Swift Book: Concurrency', `${SB}/concurrency/#Tasks-and-Task-Groups`],
    what: 'A Task is a unit of async work. A task group runs a dynamic number of child tasks in parallel and collects their results. Cancellation is cooperative: tasks check for it themselves.',
    rules: [
      '`Task { }` inherits the current actor (for example the main actor) and priority; `Task.detached { }` inherits nothing',
      '`let t = Task { … }` → read the result with `await t.value`; stop it with `t.cancel()`',
      'Cancellation is cooperative: check `Task.isCancelled` or call `try Task.checkCancellation()`',
      '`withTaskGroup(of:)` / `withThrowingTaskGroup(of:)`: `group.addTask { }`, then `for await result in group`',
      'Results arrive in completion order, not in the order you added them',
    ],
    examples: [
      'let thumbs = try await withThrowingTaskGroup(of: (Int, UIImage).self) { group in\n    for (i, url) in urls.enumerated() {\n        group.addTask { (i, try await loadImage(url)) }\n    }\n    var out = [Int: UIImage]()\n    for try await (i, img) in group { out[i] = img }\n    return out          // keyed by index, because order is not guaranteed\n}',
      'let search = Task {\n    for page in 1...10 {\n        try Task.checkCancellation()   // stops quickly after cancel()\n        try await load(page)\n    }\n}\n// user typed again:\nsearch.cancel()',
    ],
    trap: 'Calling `cancel()` does not stop a task by force. A loop that never checks `Task.isCancelled` keeps running.',
    task: 'Download 5 URLs in a task group, print the order they finish, then cancel the group halfway.',
  },
  {
    m: 'm2', module: 6, title: 'Actors & @MainActor Thread Safety', doc: ['Swift Book: Concurrency (Actors)', `${SB}/concurrency/#Actors`],
    what: 'An actor is a reference type that protects its own mutable state: only one task touches that state at a time, so data races cannot happen. `@MainActor` is the global actor for the main thread.',
    rules: [
      '`actor Bank { var balance = 0 }`: from outside, accessing it needs `await`',
      'Inside the actor, its own methods use its state synchronously',
      '`@MainActor` on a class, function or property makes it run on the main thread (view models, UI code)',
      'Reentrancy: at each `await` inside an actor method, other calls may run, so re-check state after an await',
      'Values passed between actors and tasks must be `Sendable`; Swift 6 checks this at compile time',
    ],
    examples: [
      'actor Counter {\n    private var value = 0\n    func increment() -> Int { value += 1; return value }\n}\nlet c = Counter()\nawait withTaskGroup(of: Void.self) { g in\n    for _ in 1...1000 { g.addTask { _ = await c.increment() } }\n}\nprint(await c.increment())   // 1001: no lost updates',
      '@MainActor\n@Observable final class FeedViewModel {\n    var posts: [Post] = []\n    func load() async {\n        posts = await api.fetchPosts()   // assignment happens on main\n    }\n}',
    ],
    trap: 'An actor removes data races but not logic races. `if balance >= x { await log(); balance -= x }` can still overdraw, because another call can run during the await.',
    task: 'Make 1000 concurrent increments on a class counter and then on an actor counter, and compare the final values.',
  },
];

const q = (lesson: string) => qsFor('m2', lesson);
const mvc = q('MVC Architecture');
const mvvm = q('MVVM Architecture');
const app = q('App Life Cycle (AppDelegate / SceneDelegate / scenePhase)');
const life = q('View Life Cycle (viewDidLoad vs onAppear)');
const gcd = q('Grand Central Dispatch (GCD) & Queues');
const aw = q('Async / Await Modern Concurrency');
const task = q('Tasks & Task Groups');
const act = q('Actors & @MainActor Thread Safety');

export const M2_QUESTIONS: WQuestion[] = [
  mvc('beginner', 'In MVC, which layer talks to both the Model and the View?', ['Model', 'View', 'Controller', 'None; they talk directly'], 2, 'The Controller takes user actions, updates the model and refreshes the view. Model and View never talk directly.'),
  mvc('intermediate', 'What does “Massive View Controller” describe?', ['A controller with too many subviews', 'A view controller that holds networking, parsing, formatting and business logic', 'A controller used on iPad', 'A storyboard with many screens'], 1, 'It is the common MVC failure: everything ends up in the UIViewController, which becomes hard to read and test.'),
  mvc('intermediate', 'Where should the rule “an order over ₹500 gets free delivery” live in MVC?', ['In the UILabel subclass', 'In the Model (or a service it uses)', 'In the storyboard', 'In AppDelegate'], 1, 'Business rules belong to the model, so they can be reused and tested without any UI.'),
  mvc('beginner', 'How does a UIButton tap usually reach the controller?', ['The model observes the button', 'Target-action, for example an @IBAction', 'Through NotificationCenter only', 'The button calls the model directly'], 1, 'UIControls use target-action: a control event (.touchUpInside) calls a method on the target, usually the view controller.'),
  mvc('intermediate', 'In classic MVC, should the View read the Model directly?', ['Yes, always', 'No, the Controller passes it the data to show', 'Only in SwiftUI', 'Only for structs'], 1, 'The controller mediates, which keeps views reusable and independent of the data layer.'),

  mvvm('beginner', 'What is the ViewModel’s job in MVVM?', ['Draw the UI', 'Hold presentation state and logic as plain values, with no UI views', 'Store data in a database', 'Replace the model'], 1, 'The ViewModel turns model data into view-ready values (strings, flags) and handles user intent.'),
  mvvm('intermediate', 'Why is MVVM easier to unit test than MVC?', ['Its views are faster', 'The ViewModel is plain Swift with no UI, so tests can create it and check its values', 'It needs no tests', 'XCTest only works with MVVM'], 1, 'There is no UIViewController or view to set up, so you just create the ViewModel and assert on its properties.'),
  mvvm('intermediate', 'On iOS 17+, what makes a SwiftUI view refresh when a property of its view model class changes?', ['@IBOutlet', 'Marking the class @Observable', 'lazy var', 'Making the class final'], 1, 'The @Observable macro tracks which properties a view reads and re-renders it when they change. Before iOS 17: ObservableObject + @Published.'),
  mvvm('beginner', 'struct LoginViewModel {\n    var email = ""\n    var isValid: Bool { email.contains("@") && email.count > 5 }\n}\nvar vm = LoginViewModel()\nvm.email = "a@b.in"\nprint(vm.isValid)\n\nWhat is printed?', ['true', 'false', 'nil', 'Compile error'], 0, '"a@b.in" contains @ and has 6 characters (more than 5), so isValid is true.'),
  mvvm('intermediate', 'A ViewModel has a property `let titleLabel: UILabel`. What is wrong?', ['Nothing', 'The ViewModel now depends on the UI; it should expose `var title: String` instead', 'UILabel must be var', 'It should be a UIButton'], 1, 'A ViewModel must not know about views. It exposes values, and the view decides how to display them.'),

  app('beginner', 'Which AppDelegate method runs once at launch for one-time setup (analytics, SDKs)?', ['application(_:didFinishLaunchingWithOptions:)', 'viewDidLoad()', 'sceneDidBecomeActive(_:)', 'applicationWillTerminate(_:)'], 0, 'didFinishLaunchingWithOptions is the process-level launch hook. viewDidLoad belongs to a view controller.'),
  app('intermediate', 'In a scene-based app, where are the window and root view controller created?', ['application(_:didFinishLaunchingWithOptions:)', 'scene(_:willConnectTo:options:) in SceneDelegate', 'viewWillAppear', 'Info.plist only'], 1, 'Each scene (window) is set up in the SceneDelegate’s willConnectTo method.'),
  app('intermediate', 'The user swipes up to the Home screen. Which SceneDelegate calls happen, in order?', ['sceneDidEnterBackground, then sceneWillResignActive', 'sceneWillResignActive, then sceneDidEnterBackground', 'sceneDidDisconnect only', 'sceneWillEnterForeground, then sceneDidBecomeActive'], 1, 'The app first stops being active (inactive), then moves to the background.'),
  app('beginner', 'In SwiftUI, how do you know whether the app is active or in the background?', ['UIApplication.shared.state only', '@Environment(\\.scenePhase)', '@State var phase', 'AppDelegate is required'], 1, 'scenePhase is .active, .inactive or .background. React to it with .onChange(of:).'),
  app('advanced', 'An iPad user opens two windows of your app side by side. How many AppDelegates and scenes are there?', ['2 AppDelegates, 2 scenes', '1 AppDelegate, 2 scenes', '1 AppDelegate, 1 scene', '2 AppDelegates, 1 scene'], 1, 'There is one AppDelegate per process and one scene per window. That is why UI setup lives in the SceneDelegate.'),
  app('advanced', 'An incoming-call banner or the app switcher appears over your running app. What is scenePhase?', ['.background', '.inactive', '.active', '.suspended'], 1, '.inactive: the app is visible but not receiving events. It is not in the background yet.'),

  life('beginner', 'Which UIViewController method runs only ONCE, when the view is loaded into memory?', ['viewWillAppear', 'viewDidLoad', 'viewDidAppear', 'viewDidLayoutSubviews'], 1, 'viewDidLoad runs once per view controller instance. The appear methods run every time the screen is shown.'),
  life('beginner', 'What is the correct order when a screen is shown?', ['viewDidAppear → viewWillAppear → viewDidLoad', 'viewDidLoad → viewWillAppear → viewDidAppear', 'viewWillAppear → viewDidLoad → viewDidAppear', 'loadView → viewDidAppear → viewDidLoad'], 1, 'Load once, then will-appear, then did-appear.'),
  life('intermediate', 'A cart screen must show updated items every time the user comes back to it from a pushed screen. Where should it reload?', ['viewDidLoad', 'viewWillAppear', 'init', 'deinit'], 1, 'viewDidLoad does not run again when you pop back; viewWillAppear does.'),
  life('advanced', 'In viewDidLoad, `view.bounds.width` gives 375 on a 430-point-wide iPhone. Why?', ['A bug in UIKit', 'Layout has not happened yet, so it is still the storyboard size; read it in viewDidLayoutSubviews', 'Bounds are always wrong', 'The simulator scale'], 1, 'Final sizes are known only after layout: viewDidLayoutSubviews or viewIsAppearing.'),
  life('intermediate', 'What is true about SwiftUI’s onAppear?', ['It runs exactly once per app launch', 'It can run several times, for example when switching tabs or navigating back', 'It runs before init', 'It is the same as viewDidLoad'], 1, 'onAppear fires whenever the view appears, so do not assume one call.'),
  life('advanced', 'Which SwiftUI modifier starts async work when a view appears and cancels it automatically when the view disappears?', ['.onAppear { Task { } }', '.task { }', '.onChange', '.refreshable'], 1, '.task ties the async work to the view’s lifetime. A Task started in onAppear is not cancelled for you.'),

  gcd('beginner', 'On which queue must UIKit views be updated?', ['Any global queue', 'DispatchQueue.main', 'A custom serial queue', 'The background QoS queue'], 1, 'UIKit is not thread-safe, so all UI work belongs on the main thread (main queue).'),
  gcd('intermediate', 'print("A")\nDispatchQueue.global().async { print("B") }\nprint("C")\n\nWhat can you say about the output?', ['Always A B C', 'A prints first; B and C can come in either order', 'Always B A C', 'B never prints'], 1, 'async returns immediately, so C usually prints right away. B runs on another thread at some point, and the order of B and C is not guaranteed.'),
  gcd('advanced', 'Code on the main thread calls `DispatchQueue.main.sync { … }`. What happens?', ['It runs immediately', 'Deadlock: main waits for a block that can only run when main is free', 'It runs on a background thread', 'A compile error'], 1, 'sync waits for the block, but the block is queued behind the code that is waiting. The app freezes or crashes.'),
  gcd('intermediate', 'What kind of queue is `DispatchQueue(label: "com.app.db")` by default?', ['Concurrent', 'Serial', 'The main queue', 'A global queue'], 1, 'Custom queues are serial unless you pass `attributes: .concurrent`, which makes them good for protecting shared state.'),
  gcd('intermediate', 'You start 5 downloads and want one callback when ALL have finished. What do you use?', ['DispatchSemaphore on main', 'DispatchGroup with enter/leave and notify', 'asyncAfter', 'A for loop with sleep'], 1, 'DispatchGroup counts the pending work, and notify fires once the count reaches zero.'),
  gcd('beginner', 'Which QoS is the highest priority, for work the user is waiting on right now (animations, UI)?', ['.background', '.utility', '.userInteractive', '.default'], 2, 'From highest: userInteractive > userInitiated > default > utility > background.'),

  aw('beginner', 'What does `await` mark?', ['A function that is slow', 'A possible suspension point where the function can pause without blocking the thread', 'A background thread', 'An error'], 1, 'At an await the function may suspend; the thread is free to do other work until the result is ready.'),
  aw('beginner', 'How do you call an async function from viewDidLoad (a synchronous method)?', ['Just call it', 'Wrap it in Task { await … }', 'Use DispatchQueue.main.sync', 'Mark viewDidLoad async'], 1, 'Task creates an async context from sync code. You cannot make UIKit’s overrides async.'),
  aw('intermediate', 'func a() async -> Int { 1 }\nfunc b() async -> Int { 2 }\nasync let x = a()\nasync let y = b()\nlet s = await x + y\n\nWhat is true?', ['a and b run one after another; s = 3', 'a and b run concurrently; s = 3', 'Compile error', 's = 12'], 1, '`async let` starts both immediately as child tasks, and the await collects both results.'),
  aw('beginner', 'How do you call `func load() async throws -> Data`?', ['await try load()', 'try await load()', 'async try load()', 'load()!'], 1, 'Write `try await`, in that order.'),
  aw('intermediate', 'let u = await fetchUser()     // 2 s\nlet p = await fetchPosts()    // 3 s\n\nAbout how long does this take, and how can you shorten it?', ['3 s; it is already parallel', '5 s; use async let to run both at once (~3 s)', '2 s', '0 s, because await does not wait'], 1, 'Sequential awaits add up. `async let` overlaps them, so the total is the slower one, about 3 s.'),
  aw('intermediate', 'Which line loads data with URLSession using async/await?', ['let data = URLSession.shared.dataTask(with: url)', 'let (data, response) = try await URLSession.shared.data(from: url)', 'let data = await URLSession(url)', 'URLSession.shared.async(url)'], 1, 'data(from:) is async throws and returns (Data, URLResponse).'),

  task('intermediate', 'How does Task cancellation work in Swift?', ['The task is killed instantly', 'It is cooperative: the task must check Task.isCancelled or call Task.checkCancellation()', 'Only detached tasks can be cancelled', 'Cancellation is not supported'], 1, 'cancel() only sets a flag. Well-behaved code (and many system APIs) checks it and stops early.'),
  task('advanced', 'Inside a @MainActor view model method you write `Task { self.items = await load() }`. Where does the assignment to items run?', ['On a random background thread', 'On the main actor, because Task { } inherits the current actor', 'Nowhere; it is a compile error', 'On a detached thread'], 1, 'Task { } inherits the actor context. Task.detached would not.'),
  task('beginner', 'You need to download a list of N images in parallel and collect them all. What fits best?', ['A for loop with await', 'withTaskGroup / withThrowingTaskGroup', 'DispatchQueue.main.sync', 'Timer'], 1, 'A task group runs a dynamic number of child tasks concurrently and gathers their results.'),
  task('intermediate', 'let total = await withTaskGroup(of: Int.self) { group in\n    for i in 1...3 { group.addTask { i * i } }\n    var sum = 0\n    for await v in group { sum += v }\n    return sum\n}\nprint(total)\n\nWhat is printed?', ['6', '14', '9', '[1, 4, 9]'], 1, '1 + 4 + 9 = 14. The order they finish does not matter for a sum.'),
  task('beginner', 'let t = Task { 42 }\nHow do you get the 42?', ['t.result', 'await t.value', 't()', 't.get()'], 1, '`value` is async: await it to get the task’s result (or `try await` for a throwing task).'),
  task('advanced', 'In what order do results arrive in `for await r in group`?', ['The order addTask was called', 'Completion order: whichever child task finishes first', 'Alphabetical order', 'Random, but always the same'], 1, 'Results come as children finish. Carry an index when order matters.'),

  act('beginner', 'What does an actor guarantee?', ['Its code runs on the main thread', 'Only one task at a time accesses its mutable state, so there are no data races', 'Its methods never suspend', 'It is a value type'], 1, 'An actor serialises access to its isolated state.'),
  act('intermediate', 'actor Counter {\n    var n = 0\n    func inc() { n += 1 }\n}\nfunc tap(c: Counter) {\n    c.inc()\n}\n\nWhat happens?', ['Compiles; n becomes 1', 'Compile error: calling an actor method from outside needs await, in an async context', 'Runtime crash', 'n is 0'], 1, 'Cross-actor calls are asynchronous: `await c.inc()` inside an async function or a Task.'),
  act('beginner', 'What does `@MainActor` on a view model class do?', ['Makes it a singleton', 'Makes its properties and methods run on the main thread', 'Makes it thread-unsafe', 'Turns it into an actor type that runs in the background'], 1, 'The main actor is the global actor for the main thread, which makes it safe to drive UI state.'),
  act('beginner', 'Are actors value types or reference types?', ['Value types', 'Reference types', 'Neither', 'Value types unless marked final'], 1, 'Actors are reference types like classes, but they have isolation and no inheritance.'),
  act('advanced', 'actor Wallet {\n    var balance = 100\n    func pay(_ x: Int) async {\n        guard balance >= x else { return }\n        await log("paying")\n        balance -= x\n    }\n}\n\nTwo pay(80) calls run at the same time. What can happen?', ['Always one succeeds', 'Balance can go to -60: during `await log` the other call runs and passes the same guard', 'Deadlock', 'Compile error'], 1, 'Actor reentrancy: at an await other calls may interleave. Check the state again after the await, or deduct before it.'),
  act('intermediate', 'Which protocol marks a type as safe to pass between tasks and actors?', ['Codable', 'Sendable', 'Hashable', 'Identifiable'], 1, 'Sendable types (value types with Sendable members, actors, immutable final classes) can cross concurrency boundaries; Swift 6 checks this.'),
];
