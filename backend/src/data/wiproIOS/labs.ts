/**
 * Wipro iOS lab assignments, from the owner's "Swift iOS Lab Assignment
 * Handbook" (2026-11-04). One entry per lab or assessment; Project Pulse turns
 * each into a task with its own repo folder (lib/pulse/packs.ts), and the prep
 * Lab tab lists them with the student's Pulse status.
 *
 * `module` is OUR module number (index.ts MODULES); the handbook numbers its
 * modules differently. Due dates follow the course compressed to end on the
 * 15 Nov Wipro test (owner, 2026-11-04).
 */
export interface Lab {
  id: string; code: string; title: string; module: number; milestone: 'm1' | 'm2' | 'm3' | 'm4' | 'final';
  due: string; kind: 'lab' | 'assessment' | 'capstone';
  objective: string; tasks: string[]; submit: string; extension?: string;
}

const L = (id: string, code: string, title: string, module: number, milestone: Lab['milestone'], due: string, objective: string, tasks: string[], submit: string, extension?: string, kind: Lab['kind'] = 'lab'): Lab =>
  ({ id, code, title, module, milestone, due, kind, objective, tasks, submit, extension });

export const LABS: Lab[] = [
  // Handbook Module 1: Swift language fundamentals
  L('lab-1a', '1A', 'Swift Basics, Variables, Types, and Operators', 2, 'm1', '2026-11-06', "Use Swift's type system and operators to solve small programming problems.", [
    "Build a command-line Swift program or Playground that stores a student's name, roll number, marks in five subjects, and attendance percentage.",
    'Calculate total, average, percentage, and pass/fail status using constants and variables with appropriate types.',
    'Demonstrate arithmetic, comparison, logical, compound-assignment, and nil-coalescing operators in separate examples.',
    'Use if/else and switch to assign a grade and print a formatted result.',
    'Validate boundary values such as 0, 100, a failing mark, and an invalid attendance value.',
  ], 'Swift source file plus a test table containing at least 8 input/output cases.', 'Refactor grade calculation into a reusable function and explain why each variable is a let or var.'),
  L('lab-1b', '1B', 'Access Control and Encapsulation', 2, 'm1', '2026-11-06', 'Choose suitable access levels and prevent invalid changes to model data.', [
    'Create a BankAccount type with a private balance and public deposit/withdraw methods.',
    'Reject zero/negative deposits, withdrawals larger than the balance, and invalid account setup.',
    'Demonstrate private, fileprivate, internal, and public access in a small multi-file project; explain which levels are visible in your example.',
    'Expose only the operations that callers need; do not make the balance freely writable.',
  ], 'Project with at least two Swift files and a short note explaining each access modifier.', 'Add a transaction history and make it read-only to external callers.'),
  L('lab-1c', '1C', 'Collections and Enums', 2, 'm1', '2026-11-06', 'Store and transform related data using Array, Set, Dictionary, and enum.', [
    'Maintain an array of course names; add, remove, sort, filter, and search courses.',
    'Use a Set to remove duplicate student IDs and report unique count.',
    'Use a Dictionary to map student IDs to marks; find the topper and students below a threshold.',
    'Create an enum for task priority or order status and use switch to display user-friendly labels.',
    'Explain when Array, Set, and Dictionary are the best fit.',
  ], 'Working source code and output for each collection operation.', 'Create an enum with associated values, such as an API result carrying success data or an error message.'),
  L('lab-1d', '1D', 'Optionals and Safe Unwrapping', 2, 'm1', '2026-11-06', 'Handle missing values without force-unwrapping.', [
    "Create a function that looks up a student's marks by ID and returns an optional result.",
    'Demonstrate if let, guard let, optional chaining, and the nil-coalescing operator.',
    'Handle a missing dictionary key and an empty text field gracefully.',
    'Search the project for force unwraps and remove them unless you can justify a guaranteed invariant.',
  ], 'Source code plus a short explanation of each optional-handling technique.', 'Create a small profile model where address and phone are optional but name is required.'),
  L('lab-1e', '1E', 'Classes, Structs, ARC, and Memory', 2, 'm1', '2026-11-06', 'Compare value and reference types and observe ownership behaviour.', [
    'Model a Course using a struct and a CourseManager using a class.',
    'Copy each value and modify the copy; record how struct and class behaviour differs.',
    'Create two related reference types, such as Teacher and Classroom, and use weak/unowned only where ownership guarantees make sense.',
    'Demonstrate how a strong reference cycle can occur with closures or related objects, then fix it using a capture list or weak reference.',
    'Explain value/reference semantics and ARC ownership rather than assuming every value always lives on the stack.',
  ], 'Source code and a short lab report describing observed value/reference behaviour and how the retain cycle was prevented.', 'Use deinit logging to observe when a class instance is released.'),

  // Handbook Module 2: functions and advanced Swift
  L('lab-2a', '2A', 'Functions and Higher-Order Functions', 3, 'm1', '2026-11-06', 'Decompose logic into reusable functions and use map, filter, reduce, and sorted.', [
    'Write functions to calculate a mean, find the maximum, validate an email-like input, and format a display name.',
    'Given an array of transactions, use filter to select expenses, map to transform them, and reduce to calculate the total.',
    'Sort students by marks and then by name for ties.',
    'Compare a loop-based solution with a higher-order-function solution and explain readability trade-offs.',
    'Use clear parameter labels and return types.',
  ], 'At least 5 functions, a small test table, and a paragraph comparing approaches.', 'Compose filter/map/reduce into a report that lists total spending by category.'),
  L('lab-2b', '2B', 'Closures', 3, 'm1', '2026-11-06', 'Pass behaviour as a value and understand closure syntax and capture.', [
    'Sort a list of students with a closure.',
    'Create a function that accepts a completion closure and call it after a simulated operation.',
    'Use trailing-closure syntax and shorthand argument names, then rewrite one example with explicit names.',
    'Create a counter closure and explain captured state.',
    'Avoid retain cycles when a long-lived object stores a closure that captures self.',
  ], 'Source code with comments on closure parameters, capture, and lifetime.', 'Build a simple retry helper that accepts a closure representing an operation.'),
  L('lab-2c', '2C', 'Protocols, Extensions, and Generics', 3, 'm1', '2026-11-06', 'Use abstraction and reuse without duplicating logic.', [
    'Define a protocol Displayable with a method or property, then conform Student and Course types.',
    'Write an extension that adds a useful computed property or helper to an existing type.',
    'Create a generic Stack<T> with push, pop, peek, and isEmpty.',
    'Add a protocol constraint to a generic function and demonstrate a valid and invalid use.',
    'Explain why an extension is not a substitute for a new type when stored state is required.',
  ], 'Compiling Swift project and at least 6 assertions or example checks.', 'Make Stack conform to a small custom protocol and test it with both Int and String.'),
  L('lab-2d', '2D', 'Error Handling', 3, 'm1', '2026-11-06', 'Model failures explicitly and handle them safely.', [
    'Create an enum ValidationError conforming to Error with cases for empty name, invalid mark, and invalid ID.',
    'Write a throwing student-registration function.',
    'Handle errors with do/catch and show a useful message for each case.',
    'Compare throws, optional return, and Result for a suitable example.',
    'Ensure the app does not crash for expected invalid input.',
  ], 'Source code and a table of success/failure cases.', 'Wrap a simulated network response in Result and transform errors into user-friendly messages.'),

  // Handbook Module 3: UIKit vs SwiftUI + Milestone 1
  L('lab-3', '3', 'Compare UIKit and SwiftUI', 4, 'm1', '2026-11-07', 'Recognise the differences between imperative UI construction and declarative UI.', [
    'Create the same simple screen in SwiftUI and UIKit: title, text field, button, and result label.',
    'In SwiftUI, use a state variable to update the result after button tap.',
    'In UIKit, connect controls to an action and update the label.',
    'Compare amount of code, state updates, layout approach, previews, and interoperability.',
    'Write a short recommendation for when a team might choose each approach.',
  ], 'Two small implementations or one project with two screens, screenshots, and a comparison table.', 'Embed a SwiftUI view in UIKit or a UIKit control in SwiftUI using the appropriate representable pattern.'),
  L('assessment-m1', 'M1', 'Assessment Milestone 1: Swift Foundations', 4, 'm1', '2026-11-07', '60–90 minutes. You may use documentation, but work independently.', [
    'Implement a gradebook using arrays/dictionaries and safe optionals.',
    'Create a generic Stack and demonstrate it with two element types.',
    'Fix a retain cycle in a provided code sample and explain the fix.',
    'Write a throwing validation function and handle two distinct errors.',
    'Viva: explain struct vs class, protocol vs inheritance, and map/filter/reduce.',
  ], 'Push all parts to this folder before the deadline.', undefined, 'assessment'),

  // Handbook Module 4: architecture and life cycle
  L('lab-4a', '4A', 'MVC and MVVM', 5, 'm2', '2026-11-08', 'Separate UI, state, and business logic into testable components.', [
    'Build a simple task-list app with add, complete, delete, and filter operations.',
    'First implement a small MVC version using a model, view, and view controller.',
    'Then implement an MVVM version with a Task model, TaskViewModel, and SwiftUI view or UIKit view.',
    'Move filtering and validation logic out of the view controller/view.',
    'Compare testability, responsibility boundaries, and the amount of wiring required.',
  ], 'Both versions or a clearly documented refactor, architecture diagram, screenshots, and a comparison note.', 'Add unit tests for view-model logic without launching the UI.'),
  L('lab-4b', '4B', 'App, Scene, and View Lifecycles', 5, 'm2', '2026-11-08', 'Understand lifecycle events and avoid putting unrelated work in lifecycle callbacks.', [
    'Add logging for app/scene lifecycle events available in the chosen project template.',
    'Add logging for view appearance/disappearance callbacks.',
    'Navigate between two screens and record which lifecycle methods fire.',
    'Move a lightweight refresh action to an appropriate lifecycle point and justify the choice.',
    'Do not assume a view appears only once; document repeated appearance behaviour.',
  ], 'Event log, short explanation, and screenshot of the two-screen app.', 'Persist a draft when the app backgrounds and restore it when the app returns.'),

  // Handbook Module 5: concurrency + Milestone 2
  L('lab-5a', '5A', 'GCD, Queues, and Main-Thread UI', 6, 'm2', '2026-11-09', 'Run work on appropriate queues and keep UI updates on the main actor/main queue.', [
    'Simulate a slow operation without blocking the main thread.',
    'Use DispatchQueue.global for background work and DispatchQueue.main for UI updates in a UIKit example.',
    'Use DispatchQueue.asyncAfter to simulate a delayed response.',
    'Add a loading indicator and disable duplicate submission while work is running.',
    'Use Xcode debugging tools or logging to identify which thread/queue executes each step.',
  ], 'Runnable app, event log, and explanation of why the UI must not be updated from a background queue.', 'Run two independent operations concurrently and collect their results safely.'),
  L('lab-5b', '5B', 'async/await and Task', 6, 'm2', '2026-11-09', 'Write readable asynchronous code and handle success, failure, and cancellation.', [
    'Create an async function that simulates fetching a list of products or courses.',
    'Call it from a Task and update the UI only after the result is ready.',
    'Represent loading, success, empty, and failure states.',
    'Add a cancel action and check cancellation where appropriate.',
    'Explain the difference between creating a Task and merely declaring an async function.',
  ], 'App source code with all four states demonstrated.', 'Use a throwing async function and show a retry action.'),
  L('lab-5c', '5C', 'Task Groups and Structured Concurrency', 6, 'm2', '2026-11-09', 'Run independent async operations concurrently while keeping results organised.', [
    'Simulate fetching details for 3–5 course IDs independently.',
    'Use a task group to launch the requests concurrently and gather results.',
    'Compare total elapsed time with a sequential implementation using simulated delays.',
    'Handle one child task failing; define whether the whole operation should fail or return partial results.',
    'Document cancellation and task lifetime.',
  ], 'Sequential-vs-concurrent timing notes, source code, and test output.', 'Add a maximum-concurrency limit or process a larger list in batches.'),
  L('lab-5d', '5D', 'Concurrency Safety', 6, 'm2', '2026-11-09', 'Recognise shared mutable state and avoid data races.', [
    'Create a small counter updated by concurrent work and observe the unsafe version.',
    'Fix the issue using an actor or another suitable synchronisation approach.',
    'Explain Sendable at a beginner level and avoid passing unsafe shared mutable objects across concurrency boundaries.',
    'Use compiler warnings as feedback and document any warning that remains.',
  ], 'Before/after implementation and a short explanation of the safety fix.', 'Write a test that repeatedly exercises the concurrent operation.'),
  L('assessment-m2', 'M2', 'Assessment Milestone 2: Architecture and Concurrency', 6, 'm2', '2026-11-10', 'Work independently; documentation allowed.', [
    'Refactor a task-list screen to MVVM and test the view-model logic.',
    'Fetch two independent data sources concurrently and combine the results.',
    'Demonstrate loading, success, error, and cancellation states.',
    'Explain why UI updates belong on the main actor/main queue.',
    'Viva: compare GCD, async/await, Task, and task groups.',
  ], 'Push all parts to this folder before the deadline.', undefined, 'assessment'),

  // Handbook Module 6: networking
  L('lab-6', '6', 'Build a Network-Driven Directory', 7, 'm3', '2026-11-10', 'Fetch JSON from a public test API, decode it into Swift models, and display results safely.', [
    'Choose a public, classroom-approved test API that returns a list of items; record the endpoint in the README.',
    'Define Codable model types that match the JSON response.',
    'Use URLSession with async/await and URLComponents/URLRequest where appropriate.',
    'Decode the response with JSONDecoder and display a list with a detail view.',
    'Handle invalid URL, non-success HTTP status, decoding failure, empty results, and network failure.',
    'Add loading and retry states; do not hard-code a successful response as if it came from the network.',
    'Keep networking code separate from the UI, ideally in a service or repository.',
  ], 'Project, API endpoint, screenshots for success and error states, and at least 5 test cases.', 'Add search or pagination, and explain how you would avoid sending too many requests.'),

  // Handbook Module 7: UIKit + Milestone 3
  L('lab-7a', '7A', 'UIKit Profile Form', 8, 'm3', '2026-11-11', 'Build a usable UIKit form with validation and responsive constraints.', [
    'Create a profile form with name, email, course, and submit controls using UIView and UIViewController.',
    'Use Auto Layout constraints; do not position controls with fixed screen coordinates.',
    'Validate required fields and show inline or alert-based errors.',
    'Use suitable keyboard types, content types, accessibility labels, and keyboard dismissal.',
    'Test on at least two simulator sizes and in portrait orientation.',
  ], 'Xcode project, screenshots at two screen sizes, and validation test cases.', 'Support Dynamic Type or add a dark-mode check.'),
  L('lab-7b', '7B', 'Storyboards, View Hierarchy, and Navigation', 8, 'm3', '2026-11-11', 'Navigate between screens and understand the UIKit view hierarchy.', [
    'Create a list screen and a detail screen using storyboards or programmatic UI, as directed by faculty.',
    'Pass a selected model object to the detail screen without relying on global variables.',
    'Use navigation controller push/pop or a clearly explained alternative.',
    'Inspect the view hierarchy in Xcode and identify the parent-child relationships.',
    'Avoid force-unwrapping outlets; handle missing setup safely.',
  ], 'Two-screen app, navigation flow diagram, and screenshots.', 'Add an empty state and a reusable custom table/collection view cell.'),
  L('lab-7c', '7C', 'UI Controls and View Lifecycle', 8, 'm3', '2026-11-11', 'Connect controls to state changes and use lifecycle methods appropriately.', [
    'Use at least four controls such as UIButton, UITextField, UISwitch, UISegmentedControl, UISlider, or UIDatePicker.',
    'Update a summary panel when controls change.',
    'Log viewDidLoad, viewWillAppear, viewDidAppear, viewWillDisappear, and viewDidDisappear during navigation.',
    'Explain which setup belongs in viewDidLoad and which refresh might belong in viewWillAppear.',
    'Check layout after keyboard presentation and dismissal.',
  ], 'Source code and a short lifecycle observation report.', 'Add a simple accessibility audit and correct missing labels or poor contrast.'),
  L('assessment-m3', 'M3', 'Assessment Milestone 3: Networking and UIKit', 8, 'm3', '2026-11-12', 'Work independently; documentation allowed.', [
    'Build a UIKit form with validation and Auto Layout.',
    'Decode a JSON response into Codable models and render a list.',
    'Show loading, empty, and failure states.',
    'Demonstrate navigation from a list to a detail screen.',
    'Viva: explain view hierarchy, constraints, URLSession, and Codable.',
  ], 'Push all parts to this folder before the deadline.', undefined, 'assessment'),

  // Handbook Module 8: SwiftUI
  L('lab-8a', '8A', 'SwiftUI App Structure and Views', 9, 'm4', '2026-11-12', 'Build a multi-view interface using small, reusable SwiftUI views.', [
    'Create a Course Explorer app with a title, course cards, category labels, and a detail screen.',
    'Use VStack, HStack, ZStack, ScrollView, List, and reusable custom views where appropriate.',
    'Use previews or simulator runs to iterate on layout.',
    'Keep view bodies readable by extracting subviews instead of nesting everything in one body.',
    'Add an empty state when there are no courses.',
  ], 'Working SwiftUI project, screenshots, and a brief component tree.', 'Add a reusable course-card component with configurable title, subtitle, and status.'),
  L('lab-8b', '8B', 'Navigation and Basic Template', 9, 'm4', '2026-11-12', 'Understand the SwiftUI app entry point and create predictable navigation.', [
    'Inspect the @main App entry point and the initial WindowGroup.',
    'Use NavigationStack and NavigationLink to move from a list to a detail view.',
    'Pass the selected model to the detail view.',
    'Add a toolbar action and a back-navigation path that behaves correctly.',
    'Explain how the app entry point differs from an individual View.',
  ], 'Source code and navigation screenshots.', 'Add a search screen or deep-link-like route within the app.'),
  L('lab-8c', '8C', 'State Management', 9, 'm4', '2026-11-12', 'Choose suitable state ownership and propagate changes through views.', [
    'Use @State for local view state, such as a search field or favourite toggle.',
    "Move shared course data into an observable model appropriate to the project's deployment target.",
    'Pass bindings to child views when they need to edit parent-owned state.',
    'Add and remove favourites; verify the list and detail views stay in sync.',
    'Explain when local state should remain local and when it should be shared.',
  ], 'Project with at least two views sharing state and a short note explaining each state wrapper used.', 'Persist favourites locally and restore them after relaunch.'),
  L('lab-8d', '8D', 'SwiftUI Layout and Form Interaction', 9, 'm4', '2026-11-12', 'Create a responsive form and handle validation declaratively.', [
    'Build an event registration form with text fields, a picker, a toggle, and a submit button.',
    'Use Form, Section, padding, spacing, and alignment deliberately.',
    'Show validation feedback and a success confirmation.',
    'Use disabled states when required fields are incomplete.',
    'Test long text, empty input, and small-screen layout.',
  ], 'Runnable form, screenshots, and test cases.', 'Add a review screen before final submission.'),

  // Handbook Module 9: project settings + Milestone 4
  L('lab-9', '9', 'Project Configuration Audit', 10, 'm4', '2026-11-13', 'Understand common target settings and configure app metadata safely.', [
    'Inspect project targets, bundle identifier, version, build number, deployment target, signing, and supported orientations.',
    "Locate the app's Info settings and identify relevant privacy usage descriptions if a permission is requested.",
    'Add a feature that uses no sensitive permission, then optionally add a faculty-approved permission such as photo-library access only if the lab requires it.',
    'If adding a permission, provide a clear user-facing purpose string and handle denied permission gracefully.',
    'Document which settings are per-project, per-target, or per-build configuration.',
  ], 'Configuration checklist with screenshots and a README section. Do not commit certificates, private keys, or secrets.', 'Create Debug and Release configuration notes and explain how their settings may differ.'),
  L('assessment-m4', 'M4', 'Assessment Milestone 4: SwiftUI and Configuration', 10, 'm4', '2026-11-14', 'Work independently; documentation allowed.', [
    'Create a SwiftUI list-detail flow using NavigationStack.',
    'Use state to add/remove favourites and keep two views in sync.',
    'Build a validated form with loading/success/error or confirmation states as appropriate.',
    'Explain the app entry point, bundle identifier, deployment target, and privacy usage descriptions.',
    'Viva: compare @State and bindings, and explain the role of the App and View types.',
  ], 'Push all parts to this folder before the deadline.', undefined, 'assessment'),

  // Handbook Modules 10–12: testing, Instruments, capstone
  L('lab-10a', '10A', 'XCTest Unit Tests', 11, 'final', '2026-11-14', 'Write automated tests for logic independently from the UI.', [
    'Create a test target if the starter project does not already include one.',
    'Test grade calculation, form validation, and one view-model operation.',
    'Include normal cases, boundary cases, and invalid input.',
    'Use descriptive test names and meaningful assertions.',
    'Where possible, inject a fake service or sample data instead of calling a live API.',
  ], 'Test target with at least 8 meaningful tests and a screenshot of the passing test run.', 'Add a test for an async service using deterministic mocked data.'),
  L('lab-10b', '10B', 'UI Automation with XCUITest', 11, 'final', '2026-11-14', 'Automate a key user journey through the interface.', [
    'Create one UI test that launches the app, enters form data, submits, and verifies a visible result.',
    'Use accessibility identifiers for controls that are otherwise difficult to locate reliably.',
    'Add a test for a validation error or empty state.',
    'Avoid unnecessary fixed sleeps; wait for expected UI elements.',
    'Explain the difference between a unit test and a UI test.',
  ], 'XCUITest source code and evidence of a successful run.', 'Automate a list-to-detail navigation journey.'),
  L('lab-11', '11', 'Instruments: Measure, Diagnose, Improve', 12, 'final', '2026-11-14', 'Use profiling tools to find and explain a measurable performance or memory issue.', [
    'Run the app on a simulator or device with a repeatable workload.',
    'Explore available Instruments such as Time Profiler, Allocations, or Leaks, depending on the installed Xcode version.',
    'Record a baseline observation before making changes.',
    'Investigate one issue: unnecessary repeated work, slow list rendering, retained objects, or excessive allocations.',
    'Make one targeted improvement and measure again.',
    'Write down the test conditions and avoid claiming a performance gain that the measurements do not support.',
  ], 'Before/after observations, screenshots or exported trace if permitted, and a one-page report.', 'Reproduce and fix a retain cycle from Lab 1E, then verify the object is released.'),
  L('capstone', 'Capstone', 'Capstone / Mini Project', 12, 'final', '2026-11-15', 'Pick Campus Companion, Personal Expense Tracker or Course Planner (or an equivalent idea). It must show the course’s core concepts, not just a static UI.', [
    'At least 3 meaningful screens or navigation destinations.',
    'At least one model and one reusable service/view-model/helper.',
    'At least one collection transformation or meaningful business rule.',
    'Use SwiftUI or UIKit consistently; interoperability is optional.',
    'At least 8 unit tests; UI tests are a bonus unless required by faculty.',
    'Handle empty/error states and input validation.',
    'README, architecture diagram, screenshots, and a short demo. No API secrets, private keys, or credentials in the repository.',
  ], 'Source in this folder, README (problem, users, features, setup, run steps, limitations), architecture diagram, screenshots or a 2–4 minute demo, test evidence and known bugs. Individual viva on your own contribution.', undefined, 'capstone'),
];

export const WIPRO_IOS_PACK = 'wipro-ios';
