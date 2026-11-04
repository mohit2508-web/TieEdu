/** Final (13 Dec 2026): Modules 11–12, testing and Instruments. Practice questions, not past papers. */
import { qsFor, type WLesson, type WQuestion } from './types';

export const FINAL_LESSONS: WLesson[] = [
  {
    m: 'final', module: 11, title: 'Unit Testing with XCTest & Mocks', doc: ['Apple: XCTest', 'https://developer.apple.com/documentation/xctest'],
    what: 'Unit tests check small pieces of logic automatically. XCTest runs them inside Xcode (⌘U). Mocks replace real dependencies (network, database) with fakes you control, so tests are fast and repeatable.',
    rules: [
      'Subclass `XCTestCase`; each test method starts with `test` and takes no arguments',
      '`@testable import MyApp` gives the tests access to `internal` code',
      'Assertions: `XCTAssertEqual`, `XCTAssertTrue`, `XCTAssertNil`, `XCTAssertThrowsError`, `XCTFail`',
      '`setUp()` runs before EACH test and `tearDown()` after; async code: `func testX() async throws` or `XCTestExpectation` + `wait(for:timeout:)`',
      'Mock through a protocol: the code depends on `protocol WeatherService`; the app passes the real one and the test passes a mock (dependency injection)',
      'Swift Testing (Xcode 16+) is the newer style: `@Test func …` with `#expect(…)`',
    ],
    examples: [
      'protocol WeatherService { func temperature() async throws -> Int }\n\nstruct Advice {\n    let service: WeatherService\n    func text() async throws -> String {\n        try await service.temperature() > 35 ? "Stay inside" : "Go out"\n    }\n}\n\nstruct MockWeather: WeatherService {\n    let value: Int\n    func temperature() async throws -> Int { value }\n}\n\nfinal class AdviceTests: XCTestCase {\n    func testHotDay() async throws {\n        let a = Advice(service: MockWeather(value: 40))\n        let t = try await a.text()\n        XCTAssertEqual(t, "Stay inside")\n    }\n}',
      'func testInvalidEmailThrows() {\n    XCTAssertThrowsError(try Validator.check(email: "abc")) { error in\n        XCTAssertEqual(error as? ValidationError, .badEmail)\n    }\n}',
    ],
    trap: 'A unit test that calls the real API is slow and fails whenever the network or server data changes (flaky). Inject a mock instead.',
    task: 'Write 3 XCTests for a LoginViewModel (valid, bad email, short password), using a mock AuthService.',
  },
  {
    m: 'final', module: 12, title: 'Xcode Instruments (Time Profiler, Leaks)', doc: ['Apple: Instruments Tutorials', 'https://developer.apple.com/tutorials/instruments'],
    what: 'Instruments records what your app does over time: CPU, memory, leaks, hangs, energy. Use it to find WHY an app is slow or growing in memory, instead of guessing.',
    rules: [
      'Open it with Product → Profile (⌘I); it builds Release-like and launches Instruments',
      'Time Profiler: where CPU time goes; tick “Invert Call Tree” and “Hide System Libraries” to see your heaviest functions',
      'Leaks: memory no longer reachable (often retain cycles); Allocations: memory growth over time (persistent bytes)',
      'Hangs: the main thread was blocked, so the UI froze; move the work off main',
      'Profile on a REAL device for real numbers; Xcode’s Memory Graph Debugger also shows retain cycles quickly',
    ],
    examples: [
      'Scrolling stutters: record with Time Profiler, scroll, stop. The inverted call tree shows `DateFormatter.init` called 2,000 times inside cellForRowAt. Fix: create one shared formatter.',
      'Memory grows by 20 MB each time you open and close a screen: Allocations shows the view controllers persisting, and Leaks/Memory Graph shows a closure capturing self strongly. Fix: `[weak self]`.',
    ],
    trap: 'Profiling a Debug build on the Simulator gives misleading numbers: Debug is unoptimised and the Mac’s CPU is much faster. Profile Release on a device.',
    task: 'Create a deliberate retain cycle, open and close the screen 5 times, and find it with the Memory Graph Debugger and Leaks.',
  },
];

const q = (lesson: string) => qsFor('final', lesson);
const xt = q('Unit Testing with XCTest & Mocks');
const ins = q('Xcode Instruments (Time Profiler, Leaks)');

export const FINAL_QUESTIONS: WQuestion[] = [
  xt('beginner', 'Which methods does XCTest run as tests?', ['Any public method', 'Methods in an XCTestCase subclass whose names start with “test” and take no arguments', 'Methods marked @objc', 'Only setUp()'], 1, 'XCTest finds test methods by their name prefix.'),
  xt('beginner', 'Which assertion checks that two values are equal?', ['XCTAssertTrue', 'XCTAssertEqual', 'XCTAssertNil', 'XCTFail'], 1, 'XCTAssertEqual(a, b) fails with both values shown when they differ.'),
  xt('intermediate', 'When does setUp() run?', ['Once per test class', 'Before EACH test method', 'After all tests', 'Only when a test fails'], 1, 'Each test gets a fresh setup, so tests stay independent.'),
  xt('intermediate', 'How do you test a ViewModel that uses a network service without hitting the network?', ['Turn Wi-Fi off', 'Make it depend on a protocol and inject a mock that returns fixed data', 'Use a sleep', 'Test only the UI'], 1, 'Dependency injection through a protocol lets the test swap in a fake.'),
  xt('intermediate', 'protocol WeatherService { func temp() -> Int }\nstruct MockWeather: WeatherService { func temp() -> Int { 40 } }\nstruct Advice {\n    let svc: WeatherService\n    func text() -> String { svc.temp() > 35 ? "Stay inside" : "Go out" }\n}\nXCTAssertEqual(Advice(svc: MockWeather()).text(), "Go out")\n\nWhat is the result?', ['The test passes', 'The test fails: text() returns "Stay inside"', 'Compile error', 'It crashes'], 1, 'The mock returns 40 > 35, so the advice is "Stay inside" and the assertion fails.'),
  xt('intermediate', 'How do you write a test for an async function?', ['You cannot test async code', 'Mark the test `async throws` and `await` the call (or use XCTestExpectation for callbacks)', 'Use DispatchQueue.main.sync', 'Use sleep(5)'], 1, 'XCTest supports async test methods; expectations handle completion-handler code.'),
  xt('beginner', 'What does `@testable import MyApp` allow?', ['Running tests faster', 'Test code can use the app’s internal types and methods', 'Importing UIKit', 'Skipping failing tests'], 1, 'Without it, tests see only public API.'),
  xt('beginner', 'Which shortcut runs all tests in Xcode?', ['⌘R', '⌘U', '⌘B', '⌘I'], 1, '⌘U tests, ⌘R runs, ⌘B builds, ⌘I profiles.'),
  xt('advanced', 'A test passes on your Mac but fails on CI about 1 run in 5. Most likely cause?', ['XCTest is random', 'The test depends on real network, time or shared state; isolate it with mocks and a fresh setUp', 'CI uses a different Swift', 'The test name is too long'], 1, 'Flaky tests usually share state or depend on outside systems. Make them deterministic.'),
  xt('intermediate', 'Which assertion checks that a call throws?', ['XCTAssertNil', 'XCTAssertThrowsError(try f())', 'XCTAssertEqual', 'XCTAssertNoThrow'], 1, 'XCTAssertThrowsError passes only if the expression throws, and its closure lets you inspect the error.'),

  ins('beginner', 'Which instrument shows where your app spends CPU time?', ['Leaks', 'Time Profiler', 'Allocations', 'Network'], 1, 'Time Profiler samples the call stacks to show the hot functions.'),
  ins('beginner', 'Which instrument finds memory that can no longer be reached (for example from a retain cycle)?', ['Time Profiler', 'Leaks', 'Energy Log', 'Core Animation'], 1, 'Leaks detects unreachable allocations; the Memory Graph shows the cycle.'),
  ins('beginner', 'How do you launch Instruments for your app from Xcode?', ['⌘R', 'Product → Profile (⌘I)', '⌘U', 'Debug → Attach'], 1, 'Profile builds the app and opens the Instruments template picker.'),
  ins('intermediate', 'Where should you profile performance for reliable numbers?', ['A Debug build on the Simulator', 'A Release (Profile) build on a real device', 'Only in previews', 'In a playground'], 1, 'Debug is unoptimised, and the Simulator uses the Mac’s CPU and memory.'),
  ins('intermediate', 'In Time Profiler, what helps you find YOUR slowest function fastest?', ['Show all system libraries', 'Invert Call Tree + Hide System Libraries', 'Record for 1 ms', 'Use Leaks'], 1, 'Inverting puts the heaviest leaf functions at the top, and hiding system frames leaves your code.'),
  ins('advanced', 'Memory grows by about 20 MB every time you push and pop a screen. Which tools show why?', ['Time Profiler only', 'Allocations (persistent growth) plus Leaks or the Memory Graph Debugger (what keeps it alive)', 'Network instrument', 'Console logs'], 1, 'Allocations shows the growth; the memory graph shows the strong reference (often a closure capturing self).'),
  ins('intermediate', 'The UI freezes for 2 seconds after tapping Save. What will Instruments most likely show?', ['A leak', 'A hang: the main thread was busy (for example saving a big file synchronously)', 'Too many threads', 'Low battery'], 1, 'Any long work on the main thread blocks touch handling and drawing. Move it to a background task.'),
  ins('advanced', 'Time Profiler shows DateFormatter() created thousands of times inside cellForRowAt. Best fix?', ['Add more threads', 'Create one formatter once (static or cached) and reuse it', 'Use Leaks', 'Reduce the font size'], 1, 'DateFormatter is expensive to create. Reusing one removes the hot spot.'),
  ins('beginner', 'Which Xcode debugger feature shows a live graph of objects and their references, to spot retain cycles?', ['View Debugger', 'Memory Graph Debugger', 'Breakpoint navigator', 'Report navigator'], 1, 'The Memory Graph Debugger (in the debug bar) marks leaked objects and shows who retains them.'),
];
