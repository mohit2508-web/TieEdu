/** Milestone 4 (10 Dec 2026): Modules 9–10, SwiftUI and project setup. Practice questions, not past papers. */
import { qsFor, type WLesson, type WQuestion } from './types';

export const M4_LESSONS: WLesson[] = [
  {
    m: 'm4', module: 9, title: 'What is SwiftUI & App Structure', doc: ['Apple: SwiftUI Tutorials', 'https://developer.apple.com/tutorials/swiftui'],
    what: 'A SwiftUI app is a tree of small View structs. The entry point is a type that conforms to `App` and is marked `@main`; its `body` declares scenes such as `WindowGroup`.',
    rules: [
      '`@main struct MyApp: App { var body: some Scene { WindowGroup { ContentView() } } }`',
      'A View is a struct with `var body: some View`; `some View` is an opaque type (one concrete type, hidden)',
      'Modifiers return NEW views, so their order matters: `.padding().background(.yellow)` differs from `.background(.yellow).padding()`',
      'Views are recreated often and are cheap; keep changing data in property wrappers (`@State` …), not in plain vars',
      '`#Preview { ContentView() }` shows a live canvas in Xcode',
    ],
    examples: [
      '@main\nstruct ShopApp: App {\n    var body: some Scene {\n        WindowGroup {\n            ContentView()\n        }\n    }\n}\n\nstruct ContentView: View {\n    var body: some View {\n        VStack(spacing: 12) {\n            Image(systemName: "cart")\n            Text("Welcome").font(.title)\n        }\n        .padding()\n    }\n}\n#Preview { ContentView() }',
      'Text("Sale")\n    .padding()               // add space first\n    .background(.yellow)     // yellow fills text + padding\n    .clipShape(.capsule)',
    ],
    trap: 'A plain `var count = 0` inside a View cannot change from body (self is immutable), and it would be reset whenever the view is recreated. Use `@State`.',
    task: 'Create a new SwiftUI project and make a profile card with an image, a name and a bio, trying two different modifier orders.',
  },
  {
    m: 'm4', module: 9, title: 'SwiftUI Layouts (Stacks, Forms, Grids)', doc: ['Apple: SwiftUI Layout Fundamentals', 'https://developer.apple.com/documentation/swiftui/layout-fundamentals'],
    what: 'SwiftUI lays out views with stacks (VStack, HStack, ZStack), Spacer, frames, lists, forms and grids. The parent proposes a size, the child picks its own, and the parent places it.',
    rules: [
      'VStack: vertical, HStack: horizontal, ZStack: layered on top of each other (back to front)',
      '`Spacer()` takes the free space and pushes views apart; `.frame(maxWidth: .infinity)` fills the width',
      'Long scrolling content: `List`, or `ScrollView` + `LazyVStack`; lazy containers create rows only when they are visible',
      '`LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())])` gives a two-column grid',
      '`Form` with `Section` gives grouped, settings-style input screens',
    ],
    examples: [
      'HStack {\n    Image(systemName: "person.circle").font(.largeTitle)\n    VStack(alignment: .leading) {\n        Text("Asha Rao").bold()\n        Text("iOS Trainee").foregroundStyle(.secondary)\n    }\n    Spacer()                       // pushes the chevron to the right edge\n    Image(systemName: "chevron.right")\n}\n.padding()',
      'let cols = Array(repeating: GridItem(.flexible()), count: 3)\nScrollView {\n    LazyVGrid(columns: cols, spacing: 8) {\n        ForEach(photos) { p in PhotoTile(photo: p) }\n    }\n}',
    ],
    trap: 'A plain VStack inside a ScrollView with 5,000 rows builds all 5,000 views at once. Use LazyVStack or List.',
    task: 'Build a settings screen with Form: a Toggle, a Picker and a Stepper, in two Sections.',
  },
  {
    m: 'm4', module: 9, title: 'State Management (@State, @Binding, @Observable)', doc: ['Apple: Managing user interface state', 'https://developer.apple.com/documentation/swiftui/managing-user-interface-state'],
    what: 'In SwiftUI the UI is a function of state. Property wrappers tell SwiftUI who owns each piece of data and when to redraw.',
    rules: [
      '`@State private var`: simple value state owned by this view (counters, toggles, text)',
      '`@Binding var`: a two-way link to state owned by a parent; pass it with `$name`',
      '`@Observable class` (iOS 17+): views that read its properties update when they change; the view that creates it holds it in `@State`',
      'Share deep in the tree: `.environment(model)` and read it with `@Environment(Model.self)`',
      'Before iOS 17: `ObservableObject` + `@Published`, owned with `@StateObject` and passed with `@ObservedObject`',
    ],
    examples: [
      'struct Parent: View {\n    @State private var isOn = false\n    var body: some View {\n        VStack {\n            Text(isOn ? "ON" : "OFF")\n            Child(isOn: $isOn)        // pass a binding\n        }\n    }\n}\nstruct Child: View {\n    @Binding var isOn: Bool\n    var body: some View { Toggle("Power", isOn: $isOn) }\n}',
      '@Observable final class Cart {\n    var items: [String] = []\n}\nstruct ShopView: View {\n    @State private var cart = Cart()          // owner\n    var body: some View {\n        CartBadge().environment(cart)          // share down the tree\n    }\n}\nstruct CartBadge: View {\n    @Environment(Cart.self) private var cart\n    var body: some View { Text("\\(cart.items.count)") }\n}',
    ],
    trap: 'Giving a child its own `@State` copy of the parent’s value creates two sources of truth that drift apart. A child that edits the parent’s data takes a `@Binding`.',
    task: 'Make a parent with @State text and a child TextField bound to it, and show the text in the parent live.',
  },
  {
    m: 'm4', module: 9, title: 'NavigationStack & TabView', doc: ['Apple: NavigationStack', 'https://developer.apple.com/documentation/swiftui/navigationstack'],
    what: 'NavigationStack gives push/pop navigation with a back button. TabView gives a bottom tab bar. Together they make the skeleton of most apps.',
    rules: [
      '`NavigationStack { List { NavigationLink("Detail", value: item) } }` plus `.navigationDestination(for: Item.self) { DetailView(item: $0) }`',
      'Programmatic navigation: bind `NavigationStack(path: $path)`; append to push, set `path = []` (or a fresh `NavigationPath()`) to pop to root',
      'Set titles INSIDE the stack: `.navigationTitle("Home")` on its content',
      '`TabView { HomeView().tabItem { Label("Home", systemImage: "house") } … }`, with one NavigationStack per tab',
      '`NavigationView` is deprecated; use NavigationStack (or NavigationSplitView for iPad sidebars)',
    ],
    examples: [
      'struct Courses: View {\n    @State private var path: [Course] = []\n    var body: some View {\n        NavigationStack(path: $path) {\n            List(courses) { c in\n                NavigationLink(c.title, value: c)\n            }\n            .navigationTitle("Courses")\n            .navigationDestination(for: Course.self) { CourseDetail(course: $0) }\n        }\n    }\n    func goHome() { path.removeAll() }   // pop to root\n}',
      'TabView {\n    NavigationStack { HomeView() }\n        .tabItem { Label("Home", systemImage: "house") }\n    NavigationStack { ProfileView() }\n        .tabItem { Label("Profile", systemImage: "person") }\n}',
    ],
    trap: 'Wrapping the TabView in one NavigationStack (instead of a stack per tab) pushes screens over the tab bar and shares one back stack across all tabs.',
    task: 'Build a 2-tab app where the first tab lists 5 items and pushes a detail screen, with a “Back to list” button that pops to root.',
  },
  {
    m: 'm4', module: 10, title: 'Xcode Project Targets & Build Settings', doc: ['Apple: Xcode build system', 'https://developer.apple.com/documentation/xcode/build-system'],
    what: 'A project holds targets: each target builds one product (the app, a widget, a test bundle). Schemes choose which targets to build and with which configuration for Run, Test, Profile and Archive.',
    rules: [
      'Target = one product with its own files, settings, Info.plist and bundle identifier',
      'Scheme = what to build plus the configuration for each action (Run → Debug, Archive → Release by default)',
      'Two default configurations: Debug (no optimisation, debug symbols) and Release (optimised)',
      'Bundle Identifier: unique reverse-DNS (`com.company.app`); the Minimum Deployment target is the oldest iOS version allowed',
      'Swift compilation conditions such as `DEBUG` let `#if DEBUG` code differ per configuration',
    ],
    examples: [
      '#if DEBUG\nlet baseURL = URL(string: "https://dev.api.example.com")!\n#else\nlet baseURL = URL(string: "https://api.example.com")!\n#endif',
      'A “Staging” configuration copied from Release, plus a “MyApp-Staging” scheme that uses it, gives testers an optimised build pointing at the staging server.',
    ],
    trap: 'Adding a new file without ticking the app target in Target Membership compiles it nowhere, giving “Cannot find type in scope”.',
    task: 'Add a Unit Test target and a second scheme, and print a different value with #if DEBUG in Debug and in Release.',
  },
  {
    m: 'm4', module: 10, title: 'Info.plist Permissions & Configuration', doc: ['Apple: Information Property List', 'https://developer.apple.com/documentation/bundleresources/information-property-list'],
    what: 'Info.plist holds key–value settings the system reads about your app: name, version, supported orientations and, most importantly, the usage-description text shown when you ask for a permission.',
    rules: [
      'Every protected resource needs a usage key, or the app CRASHES when it asks: camera `NSCameraUsageDescription`, photos `NSPhotoLibraryUsageDescription`, location `NSLocationWhenInUseUsageDescription`, microphone `NSMicrophoneUsageDescription`',
      'The description string is shown to the user in the permission alert; say WHY you need access',
      '`CFBundleShortVersionString` = marketing version (1.2.0); `CFBundleVersion` = build number (45)',
      '`NSAppTransportSecurity` exceptions allow plain HTTP for specific domains (avoid them in production)',
      'Modern Xcode shows many keys in the target’s Info tab; build settings can fill them (`$(PRODUCT_NAME)`)',
    ],
    examples: [
      '<key>NSCameraUsageDescription</key>\n<string>We use the camera to scan your ID card for verification.</string>\n<key>NSLocationWhenInUseUsageDescription</key>\n<string>Your location shows nearby test centres.</string>',
      'let v = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "?"\nlet b = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "?"\nversionLabel.text = "Version \\(v) (\\(b))"',
    ],
    trap: 'Missing usage keys do not fail the build. The app compiles fine, then crashes the moment it requests the permission, often found only by testers.',
    task: 'Add photo-library access to an app: add the usage key, request access, and read the version and build in a label.',
  },
];

const q = (lesson: string) => qsFor('m4', lesson);
const st = q('What is SwiftUI & App Structure');
const lay = q('SwiftUI Layouts (Stacks, Forms, Grids)');
const sm = q('State Management (@State, @Binding, @Observable)');
const nav = q('NavigationStack & TabView');
const tgt = q('Xcode Project Targets & Build Settings');
const pl = q('Info.plist Permissions & Configuration');

export const M4_QUESTIONS: WQuestion[] = [
  st('beginner', 'What is the entry point of a SwiftUI app?', ['AppDelegate.swift', 'A struct conforming to App, marked @main, with a WindowGroup in its body', 'main.storyboard', 'ContentView'], 1, 'The @main App type declares the scenes; WindowGroup creates the app’s windows.'),
  st('intermediate', 'What does `var body: some View` mean?', ['body can return any type at run time', 'body returns one specific View type that the compiler knows but hides (an opaque type)', 'body is optional', 'body returns AnyView'], 1, 'An opaque return type keeps the full type hidden but fixed, so SwiftUI can diff it efficiently.'),
  st('intermediate', 'Which code paints yellow behind the text AND its padding?', ['Text("Hi").background(.yellow).padding()', 'Text("Hi").padding().background(.yellow)', 'Both look the same', 'Neither'], 1, 'Each modifier wraps the result so far. Padding first, then background, covers the padded area.'),
  st('intermediate', 'struct V: View {\n    var count = 0\n    var body: some View {\n        Button("Tap") { count += 1 }\n    }\n}\n\nWhat happens?', ['count increments', 'Compile error: self is immutable, so count cannot be changed; use @State', 'Runtime crash', 'It works only in previews'], 1, 'View structs are immutable inside body. @State gives SwiftUI-managed storage that can change.'),
  st('beginner', 'Which macro shows a live preview of a view on the Xcode canvas?', ['@Preview', '#Preview', '@main', '#if DEBUG'], 1, '`#Preview { MyView() }` renders on the canvas.'),
  st('advanced', 'Why are SwiftUI views structs rather than classes?', ['Structs can inherit', 'They are cheap, throwaway descriptions of the UI; SwiftUI recreates and compares them often', 'Classes are not allowed in Swift', 'For Objective-C support'], 1, 'A View is a lightweight value that describes the UI; the real rendering state lives inside SwiftUI.'),

  lay('beginner', 'Which container layers its children on top of each other?', ['VStack', 'HStack', 'ZStack', 'LazyVGrid'], 2, 'ZStack overlays its children back to front, for example text on top of an image.'),
  lay('beginner', 'In an HStack, what does a Spacer() between two views do?', ['Adds 8 points', 'Takes all the free space, pushing the views to opposite edges', 'Hides a view', 'Nothing'], 1, 'Spacer expands to fill the available space along the stack’s axis.'),
  lay('intermediate', 'You must show 10,000 rows in a scrolling column. What should you use?', ['ScrollView + VStack', 'List, or ScrollView + LazyVStack', 'ZStack', '10,000 Text views in a Form'], 1, 'Lazy containers build rows only as they scroll into view.'),
  lay('beginner', 'How many columns does LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3)) show?', ['1', '3', 'As many as fit', '9'], 1, 'One GridItem per column: three flexible columns sharing the width.'),
  lay('intermediate', 'How do you make a button stretch to the full available width?', ['.padding(.infinity)', '.frame(maxWidth: .infinity)', '.scaleEffect(2)', '.fixedSize()'], 1, 'A maxWidth of .infinity lets the frame take all the width its parent proposes.'),
  lay('beginner', 'Which container gives a grouped, settings-style screen for input controls?', ['ZStack', 'Form', 'Canvas', 'GeometryReader'], 1, 'Form styles Toggles, Pickers and TextFields in platform-standard grouped sections.'),

  sm('beginner', 'Which property wrapper is for simple local state OWNED by a view?', ['@Binding', '@State', '@Environment', '@IBOutlet'], 1, '@State private var is the view’s own source of truth.'),
  sm('intermediate', 'A child view must change a Bool owned by its parent. What does the child declare, and how is it passed?', ['@State var on; pass on', '@Binding var on; pass $on', 'let on; pass on', '@Observable var on'], 1, 'A Binding is a two-way reference to the parent’s state. `$on` makes a binding from the @State.'),
  sm('intermediate', 'struct Parent: View {\n    @State private var on = false\n    var body: some View { VStack { Text(on ? "ON" : "OFF"); Child(on: $on) } }\n}\nstruct Child: View {\n    @Binding var on: Bool\n    var body: some View { Toggle("Power", isOn: $on) }\n}\n\nThe user flips the toggle. What does Parent show?', ['OFF, because the child has a copy', 'ON: the binding writes back to Parent’s state and Parent redraws', 'Compile error', 'Nothing changes until the app restarts'], 1, 'Both read and write the same storage through the binding.'),
  sm('intermediate', 'On iOS 17+, a view CREATES an @Observable model object. How should it hold it?', ['let model = Model()', '@State private var model = Model()', '@Binding var model', '@ObservedObject var model = Model()'], 1, '@State keeps the object alive across view re-creations. A plain property would be re-created each time.'),
  sm('advanced', 'Before iOS 17, a view creates an ObservableObject. Which wrapper keeps it alive across redraws?', ['@ObservedObject', '@StateObject', '@State', '@EnvironmentObject'], 1, '@StateObject owns it. @ObservedObject only observes one passed in, and creating it there can re-create it on every redraw.'),
  sm('intermediate', 'An @Observable Cart is needed by views 5 levels deep. What avoids passing it through every initializer?', ['A global var', '.environment(cart) at the top and @Environment(Cart.self) where it is needed', '@Binding at every level', 'NotificationCenter'], 1, 'The environment carries shared models down the view tree.'),

  nav('beginner', 'Which SwiftUI container gives push navigation with a back button (iOS 16+)?', ['TabView', 'NavigationStack', 'ZStack', 'Form'], 1, 'NavigationStack, plus NavigationLink or a path. NavigationView is deprecated.'),
  nav('intermediate', 'With NavigationLink(value: course), what tells SwiftUI which screen to show?', ['.sheet', '.navigationDestination(for: Course.self) { … }', '.tabItem', '.onAppear'], 1, 'Value-based links are resolved by a matching navigationDestination inside the stack.'),
  nav('advanced', 'NavigationStack(path: $path) with `@State var path: [Course]`, and the user is 4 screens deep. How do you return to the root?', ['dismiss() 4 times', 'path.removeAll() (or path = [])', 'Recreate the app', 'path.append(nil)'], 1, 'The stack mirrors the path array: empty path, root screen.'),
  nav('beginner', 'How do you give each TabView tab its icon and title?', ['.navigationTitle', '.tabItem { Label("Home", systemImage: "house") }', '.toolbar', '.badge only'], 1, 'tabItem (or the newer Tab API) sets the tab bar label and icon.'),
  nav('intermediate', 'Where does .navigationTitle("Home") go so that it shows?', ['On the NavigationStack itself', 'On the content view inside the NavigationStack', 'On the App struct', 'On the TabView'], 1, 'Titles are read from the view being shown inside the stack.'),
  nav('intermediate', 'An app has 3 tabs and each needs its own back stack. Which structure is right?', ['One NavigationStack around the TabView', 'A NavigationStack inside each tab', 'NavigationView around everything', 'No stacks'], 1, 'One stack per tab keeps the tab bar visible and keeps each tab’s history separate.'),

  tgt('beginner', 'What is a target in an Xcode project?', ['A device', 'A product that gets built (app, extension, test bundle) with its own files and settings', 'A Git branch', 'A simulator'], 1, 'One project can hold many targets, for example the app, a widget and unit tests.'),
  tgt('intermediate', 'What does a scheme decide?', ['The app icon', 'Which targets build and which configuration each action (Run, Test, Profile, Archive) uses', 'The bundle ID', 'Supported orientations'], 1, 'For example, Run uses Debug and Archive uses Release by default.'),
  tgt('intermediate', '#if DEBUG\nlet baseURL = "https://dev.api.example.com"\n#else\nlet baseURL = "https://api.example.com"\n#endif\n\nYou Archive the app for the App Store (Release). Which URL is used?', ['dev.api.example.com', 'api.example.com', 'Both', 'Compile error'], 1, 'DEBUG is defined only in the Debug configuration. Archive builds Release.'),
  tgt('beginner', 'What must the bundle identifier be?', ['The app’s display name', 'A unique reverse-DNS string such as com.company.app', 'The version number', 'Any text, duplicates allowed'], 1, 'It identifies the app to iOS and the App Store, so it must be unique.'),
  tgt('intermediate', 'A newly added Swift file gives “Cannot find type in scope” everywhere. Likely cause?', ['Swift version', 'The file is not ticked in the app target’s Target Membership', 'A missing import UIKit', 'A simulator issue'], 1, 'Files compile only into the targets they belong to.'),
  tgt('beginner', 'What does the Minimum Deployment target set?', ['The newest iOS supported', 'The oldest iOS version the app can be installed on', 'The Xcode version', 'The Swift version'], 1, 'APIs newer than this need #available checks.'),

  pl('intermediate', 'The app calls the camera without NSCameraUsageDescription in Info.plist. What happens?', ['The permission is denied quietly', 'The app crashes when it requests camera access', 'The build fails', 'The camera opens anyway'], 1, 'iOS terminates apps that request protected resources without a usage description.'),
  pl('beginner', 'Which key explains why you need location while the app is in use?', ['NSLocationUsage', 'NSLocationWhenInUseUsageDescription', 'UIRequiredLocation', 'CFBundleLocation'], 1, 'Its text is shown in the location permission alert.'),
  pl('beginner', 'Where does a usage description string appear?', ['Only in the logs', 'In the system permission alert shown to the user', 'On the App Store page', 'Nowhere'], 1, 'Write a clear reason; vague text gets refusals and App Review rejections.'),
  pl('intermediate', 'What is the difference between CFBundleShortVersionString and CFBundleVersion?', ['They are the same', 'Marketing version (1.2.0) vs build number (45)', 'Build number vs bundle ID', 'Swift version vs iOS version'], 1, 'Users see the version; every uploaded build needs a new build number.'),
  pl('beginner', 'Which key covers reading the user’s photo library?', ['NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription', 'NSContactsUsageDescription', 'NSMicrophoneUsageDescription'], 1, 'Photos have their own key (and NSPhotoLibraryAddUsageDescription for add-only).'),
  pl('advanced', 'A test server only works over http://. What allows it for that one domain?', ['Turning off Wi-Fi', 'An NSAppTransportSecurity → NSExceptionDomains entry for that domain', 'URLSession.allowHTTP = true', 'Nothing can allow it'], 1, 'ATS exceptions go in Info.plist. Keep them out of production builds when you can.'),
];
