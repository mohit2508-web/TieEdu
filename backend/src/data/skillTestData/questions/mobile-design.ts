import type { QuestionBank } from '../types';

// 11 mobile/design skills × 10 questions each.
export const BANK: QuestionBank = {
  // ── android ────────────────────────────────────────────────────────────────
  android: [
    ['Activities & Fragments', 'beginner', 'single_choice', 'An Activity in Android is:', ['A database table', 'A single screen with a user interface', 'A background service', 'A build tool'], [1], 'Activities represent one screen; the system manages their lifecycle.'],
    ['Activities & Fragments', 'beginner', 'single_choice', 'Which lifecycle callback is called when the activity becomes visible?', ['onStart', 'onDestroy', 'onPause', 'onCreate only'], [0], 'onCreate → onStart → onResume as it becomes interactive.'],
    ['Activities & Fragments', 'intermediate', 'single_choice', 'A Fragment is:', ['A piece of UI with its own lifecycle that can be reused across activities', 'A permanent database', 'An app icon', 'A permission'], [0], 'Fragments make modular, reusable UI panels (and work on phones/tablets).'],
    ['Layouts', 'beginner', 'single_choice', 'Which layout arranges children in one row or column?', ['LinearLayout', 'FrameLayout only', 'AbsoluteLayout', 'TableLayout only'], [0], 'LinearLayout stacks children vertically or horizontally (orientation).'],
    ['Layouts', 'intermediate', 'single_choice', 'ConstraintLayout is used to:', ['Constrain views relative to each other and the parent for flexible flat hierarchies', 'Load network images', 'Manage permissions', 'Run background jobs'], [0], 'Flat hierarchy with constraints — good for complex responsive layouts.'],
    ['Intents & Navigation', 'beginner', 'single_choice', 'An Intent is used to:', ['Draw pixels', 'Request another component to perform an action (start activity, share)', 'Encrypt data', 'Format storage'], [1], 'Explicit intents name a component; implicit use actions/categories.'],
    ['Intents & Navigation', 'intermediate', 'single_choice', 'How do you pass data between activities?', ['Via Intent extras (key-value) / bundles', 'Global static variables', 'Direct memory sharing', 'SMS'], [0], 'putExtra on the intent; get extras in the target activity.'],
    ['Data & Storage', 'intermediate', 'multiple_choice', 'Which are local storage options on Android?', ['SharedPreferences', 'Room/SQLite database', 'Internal files', 'Redis server'], [0, 1, 2], 'SharedPreferences for small pairs; Room for structured data; files for blobs.'],
    ['Networking', 'intermediate', 'single_choice', 'Which library is commonly used for HTTP calls in modern Android?', ['Retrofit / OkHttp', 'Apache HttpClient only', 'URLConnection only', 'SMTP'], [0], 'Retrofit wraps OkHttp with typed API interfaces.'],
    ['Networking', 'advanced', 'single_choice', 'Why must network calls be off the main thread?', ['UI thread would freeze → ANR (Application Not Responding)', 'Threads are faster in Java', 'Android has no network on UI', 'To save battery only'], [0], 'Use coroutines/RxJava/executors to keep the UI responsive.'],
  ],

  // ── flutter ────────────────────────────────────────────────────────────────
  flutter: [
    ['Widgets & Layouts', 'beginner', 'single_choice', 'Everything in a Flutter UI is a:', ['Activity', 'Widget', 'Fragment', 'Component'], [1], 'Apps are trees of widgets (widgets compose other widgets).'],
    ['Widgets & Layouts', 'beginner', 'single_choice', 'What is the difference between StatelessWidget and StatefulWidget?', ['Stateless has no mutable state; Stateful can rebuild with state', 'Stateless is faster only', 'Stateful cannot have children', 'No difference'], [0], 'StatefulWidget holds a State object that can call setState().'],
    ['Widgets & Layouts', 'intermediate', 'single_choice', 'Which widget lays children out horizontally?', ['Row', 'Column', 'Stack only', 'ListView only'], [0], 'Row = horizontal; Column = vertical; wrap in Expanded/Flexible for sizing.'],
    ['State Management', 'intermediate', 'single_choice', 'setState in Flutter does what?', ['Restarts the app', 'Marks the widget dirty so it rebuilds with new state', 'Saves to disk', 'Sends network request'], [1], 'Rebuilds that widget subtree on next frame.'],
    ['State Management', 'intermediate', 'multiple_choice', 'Which are popular Flutter state-management approaches?', ['Provider', 'Riverpod', 'Bloc', 'Redux only in Flutter core'], [0, 1, 2], 'Provider/Riverpod/Bloc scale app state beyond simple setState.'],
    ['State Management', 'advanced', 'single_choice', 'Why is const on widgets beneficial?', ['Disables hot reload', 'Allows Flutter to reuse immutable widget instances (better performance)', 'Removes state', 'Adds animations'], [1], 'const widgets skip rebuilds when nothing changed.'],
    ['Navigation', 'beginner', 'single_choice', 'How do you open a new screen in Flutter?', ['Navigator.push(MaterialPageRoute(...))', 'startActivity(...)', 'Segue only', 'router.go always'], [0], 'Navigator manages a stack of routes (push/pop).'],
    ['Networking & Storage', 'intermediate', 'single_choice', 'Which package is standard for HTTP requests in Flutter?', ['http / dio', 'retrofit only native', 'axios is built-in', 'fetch lib'], [0], 'http or dio call REST APIs; responses are JSON-decoded with dart:convert.'],
    ['Networking & Storage', 'intermediate', 'single_choice', 'shared_preferences stores:', ['Large databases', 'Small key-value pairs (settings, flags)', 'Video files', 'SQLite only'], [1], 'For bigger structured data use sqflite/drift or a backend.'],
    ['Platform Channels', 'advanced', 'single_choice', 'Platform channels are used to:', ['Talk to native Android/iOS code from Flutter (plugins)', 'Change themes', 'Format code', 'Run unit tests'], [0], 'Method channels bridge Dart and platform-specific APIs.'],
  ],

  // ── react-native ───────────────────────────────────────────────────────────
  'react-native': [
    ['Components & JSX', 'beginner', 'single_choice', 'React Native lets you build:', ['Desktop-only apps', 'Mobile apps using React with native components', 'Pure native Swift apps', 'CLI tools only'], [1], 'Core views (View, Text, Image) map to native widgets.'],
    ['Components & JSX', 'beginner', 'single_choice', 'Which component displays text in React Native?', ['Text', 'Label', 'String', 'Paragraph'], [0], 'Styles are applied via the style prop with StyleSheet objects.'],
    ['Components & JSX', 'intermediate', 'single_choice', 'Why can’t you use div/p tags directly?', ['They are invalid in RN', 'RN maps to native components (View/Text), not HTML', 'They are too slow', 'They require CSS files'], [1], 'React Native renders native views, not a browser DOM.'],
    ['Styling', 'intermediate', 'single_choice', 'Flexbox in React Native defaults to:', ['column direction', 'row direction', 'grid', 'block'], [0], 'Unlike web CSS (row), RN flex default is column.'],
    ['Styling', 'intermediate', 'single_choice', 'StyleSheet.create is used to:', ['Create CSS files', 'Define reusable style objects efficiently', 'Build components', 'Route navigation'], [1], 'Keeps styles out of render and lets native optimize.'],
    ['Navigation', 'intermediate', 'single_choice', 'React Navigation provides:', ['Stack/tab/drawer navigation between screens', 'State persistence only', 'HTTP layer', 'Native modules'], [0], 'createNativeStackNavigator/createBottomTabNavigator set up flows.'],
    ['Navigation', 'beginner', 'single_choice', 'To pass params to a screen you use:', ['route.params', 'global vars only', 'localStorage', 'window.name'], [0], 'navigation.navigate("Details", {id: 1}) then route.params.id.'],
    ['State & Data', 'intermediate', 'single_choice', 'Where would you typically fetch API data?', ['Inside useEffect in a component (or a data layer)', 'In StyleSheet', 'During render directly', 'In the app icon'], [0], 'Fetch once on mount; guard against setState after unmount.'],
    ['State & Data', 'advanced', 'single_choice', 'Why avoid creating inline arrow functions inside render for FlatList items?', ['They allocate new function refs each render → item re-renders', 'They crash the app', 'They disable FlatList', 'They are illegal'], [0], 'use useCallback, memoized handlers, or item components.'],
    ['Native Modules', 'advanced', 'single_choice', 'Native modules are for:', ['Accessing platform APIs not exposed by JS (camera, sensors, file system)', 'Styling screens', 'Bundling assets only', 'Testing'], [0], 'Community modules (react-native-camera etc.) or custom native code.'],
  ],

  // ── ios ────────────────────────────────────────────────────────────────────
  ios: [
    ['SwiftUI Basics', 'beginner', 'single_choice', 'SwiftUI is:', ['A UI framework declaring interfaces in Swift', 'A database', 'An IDE', 'A testing tool only'], [0], 'Declarative UI: describe the view for a given state.'],
    ['SwiftUI Basics', 'beginner', 'single_choice', 'The entry point of a SwiftUI app is:', ['A struct conforming to the App protocol with a WindowGroup', 'main.m only', 'AppDelegate always', 'A XIB file'], [0], '@main struct MyApp: App { var body: some Scene { WindowGroup { ContentView() } } }.'],
    ['SwiftUI Basics', 'intermediate', 'single_choice', 'What does the body property return?', ['A String', 'Some View — the UI description', 'A UIViewController', 'An array'], [1], 'body computes the view hierarchy declaratively.'],
    ['Layouts & Modifiers', 'beginner', 'single_choice', 'Modifiers in SwiftUI:', ['Change a view’s appearance/behaviour (padding, font, frame)', 'Delete views', 'Access the network', 'Manage files'], [0], 'Modifiers return new view values — order matters.'],
    ['Layouts & Modifiers', 'intermediate', 'single_choice', 'HStack / VStack / ZStack arrange views:', ['Horizontally / vertically / layered (depth)', 'Only vertically', 'Randomly', 'As lists only'], [0], 'ZStack overlays children along the z-axis.'],
    ['State & Data', 'intermediate', 'single_choice', '@State is used for:', ['External model objects', 'Local mutable state owned by a view', 'Constants only', 'Environment services'], [1], '@State triggers re-render when it changes.'],
    ['State & Data', 'intermediate', 'single_choice', '@Binding provides:', ['A read-only copy', 'A two-way reference to state owned elsewhere', 'A network connection', 'An animation'], [1], 'Child views edit parent @State through bindings.'],
    ['State & Data', 'advanced', 'single_choice', '@ObservedObject vs @EnvironmentObject:', ['Observed: passed in; Environment: injected down the tree', 'Same thing', 'Environment is local only', 'Observed is global'], [0], 'EnvironmentObject avoids passing objects through every initializer.'],
    ['Navigation', 'beginner', 'single_choice', 'NavigationStack in SwiftUI is for:', ['Managing a hierarchy of pushed screens', 'Sorting arrays', 'GPU rendering', 'File I/O'], [0], 'navigationDestination and NavigationLink drive pushes.'],
    ['Networking', 'intermediate', 'single_choice', 'How is JSON typically decoded?', ['URLSession data + JSONDecoder into Codable structs', 'Manual string splitting', 'XMLParser only', 'CoreData only'], [0], 'Codable synthesizes Encodable/Decodable conformance.'],
  ],

  // ── unity ──────────────────────────────────────────────────────────────────
  unity: [
    ['Scenes & GameObjects', 'beginner', 'single_choice', 'In Unity, every object in the game world is a:', ['Canvas', 'GameObject', 'Prefab only', 'Script only'], [1], 'GameObjects hold Components that add behaviour/data.'],
    ['Scenes & GameObjects', 'beginner', 'single_choice', 'A Unity scene is:', ['A source code file', 'A screen/level containing GameObjects', 'A texture', 'A shader'], [1], 'Games transition between scenes (levels, menus).'],
    ['Scenes & GameObjects', 'intermediate', 'single_choice', 'Transform component controls:', ['Color grading', 'Position, rotation and scale of a GameObject', 'Physics material only', 'Audio volume'], [1], 'Every GameObject has a Transform.'],
    ['C# Scripting', 'beginner', 'single_choice', 'Which method runs once when the script is enabled?', ['Update()', 'Start()', 'Destroy()', 'Reset only'], [1], 'Start runs once before the first Update; Update runs every frame.'],
    ['C# Scripting', 'intermediate', 'single_choice', 'Time.deltaTime is used to:', ['Count frames only', 'Make movement frame-rate independent', 'Speed up time always', 'Log timing'], [1], 'distance = speed × deltaTime gives consistent speed across FPS.'],
    ['C# Scripting', 'intermediate', 'single_choice', 'Tags are used to:', ['Label GameObjects for identification (e.g. "Player")', 'Render 3D text', 'Compress assets', 'Buy assets'], [0], 'Compare with gameObject.tag in collision logic.'],
    ['Physics & Collisions', 'intermediate', 'single_choice', 'A Rigidbody component makes an object:', ['UI-only', 'Affected by physics (gravity, forces, collisions)', 'Static geometry', 'Invisible'], [1], 'Colliders define shape; Rigidbody enables dynamics.'],
    ['Physics & Collisions', 'intermediate', 'single_choice', 'OnCollisionEnter vs OnTriggerEnter:', ['First needs colliders + Rigidbody; second needs isTrigger collider', 'Identical', 'Trigger needs two rigidbodies', 'Collision only works in 2D'], [0], 'Trigger callbacks report overlap without physical response.'],
    ['Animation', 'beginner', 'single_choice', 'Animator Controller manages:', ['Keyframe transitions between animation states', 'Level loading', 'Shader code', 'Networking'], [0], 'Parameters and transitions drive which animation plays.'],
    ['UI & Publishing', 'beginner', 'single_choice', 'The Canvas is where:', ['2D/3D objects only', 'UI elements are rendered', 'Audio clips live', 'Scripts compile'], [1], 'Canvas renders UI (buttons, text, images) via the UI system.'],
  ],

  // ── figma ──────────────────────────────────────────────────────────────────
  figma: [
    ['Frames & Layers', 'beginner', 'single_choice', 'In Figma, a Frame is:', ['A background color', 'A container that holds and clips layers (like an artboard)', 'A plugin', 'A font'], [1], 'Frames are the building blocks of designs.'],
    ['Frames & Layers', 'beginner', 'single_choice', 'Layers are organized in the:', ['Layers panel', 'Toolbar only', 'File name', 'Canvas corner'], [0], 'Drag to reorder — top of panel = front of canvas.'],
    ['Frames & Layers', 'intermediate', 'single_choice', 'Grouping layers helps to:', ['Lock them permanently', 'Move/transform them together', 'Change file format', 'Export faster only'], [1], 'Group (Ctrl/Cmd+G) or better, use Frames.'],
    ['Auto Layout', 'intermediate', 'single_choice', 'Auto Layout does what?', ['Animates designs automatically', 'Makes frames resize content with padding/gap like flexbox', 'Exports code', 'Manages versions'], [1], 'Responsive rows/columns that adapt to content changes.'],
    ['Auto Layout', 'intermediate', 'single_choice', 'To make a button grow to fill width, set the layout to:', ['Fill container', 'Hug contents', 'Fixed width only', 'Auto off'], [0], 'Hug = fit content; Fill = expand; Fixed = exact size.'],
    ['Components & Variants', 'intermediate', 'single_choice', 'A Figma component is:', ['A static shape', 'A reusable master element — instances stay linked to it', 'A plugin only', 'A comment'], [1], 'Update the master → all instances update.'],
    ['Components & Variants', 'advanced', 'single_choice', 'Variants are used to:', ['Store multiple states/types of a component (hover, disabled, size) in one set', 'Split files', 'Add comments', 'Rotate objects'], [0], 'Switch instances between variants for states/sizes.'],
    ['Prototyping', 'intermediate', 'single_choice', 'Prototype mode is for:', ['Writing code', 'Linking frames with interactions to simulate flows', 'Managing fonts', 'Version history'], [1], 'Add hotspots, on-click navigate, smart animate transitions.'],
    ['Prototyping', 'beginner', 'single_choice', 'Comments in Figma are for:', ['Code review', 'Collaborative feedback pinned to the canvas', 'Animation timing', 'Color contrast only'], [1], 'Designers/devs discuss changes in context.'],
    ['Design Systems', 'advanced', 'single_choice', 'A design system in Figma typically includes:', ['Only mockups', 'Shared components, styles, tokens and documentation', 'Game assets', 'Marketing emails'], [1], 'Libraries keep teams consistent and speed delivery.'],
  ],

  // ── ui-ux ──────────────────────────────────────────────────────────────────
  'ui-ux': [
    ['User Research', 'beginner', 'single_choice', 'UX primarily concerns:', ['Visual polish only', 'The overall experience and usability for users', 'Code architecture', 'Server costs'], [1], 'UX = how it works and feels; UI = how it looks.'],
    ['User Research', 'beginner', 'single_choice', 'A user persona represents:', ['A real individual user', 'A fictional profile of a target user segment', 'A developer role', 'A company logo'], [1], 'Personas focus design decisions on real user needs.'],
    ['User Research', 'intermediate', 'single_choice', 'A usability test observes:', ['Code coverage', 'Users attempting tasks to find friction points', 'Color contrast only', 'Team velocity'], [1], 'Watch real users; fix what confuses them.'],
    ['Information Architecture', 'intermediate', 'single_choice', 'Information architecture is about:', ['Server topology', 'Organizing and labeling content so users find things', 'Typography choices', 'Ad budgets'], [1], 'Clear navigation, grouping and labelling.'],
    ['Information Architecture', 'beginner', 'single_choice', 'Card sorting is used to:', ['Design credit cards', 'Learn how users group and label categories', 'Sort colors', 'Prioritize bugs'], [1], 'Results inform menu structure and taxonomy.'],
    ['Wireframes & Mockups', 'beginner', 'single_choice', 'A wireframe is:', ['A high-fidelity final design', 'A low-fidelity structural sketch of a page', 'A user interview', 'A code file'], [1], 'Layout and hierarchy first; visual polish later.'],
    ['Wireframes & Mockups', 'intermediate', 'single_choice', 'A low-fidelity prototype is useful because:', ['It looks finished', 'It is fast to test structure before investing in visuals', 'It includes animations', 'It requires full copy'], [1], 'Cheap iteration before expensive polish.'],
    ['Usability Principles', 'intermediate', 'multiple_choice', 'Which are core usability heuristics (Nielsen)?', ['Visibility of system status', 'Match with real world', 'User control and freedom', 'Hidden navigation always'], [0, 1, 2], 'Clear status, familiar language and undo all matter; hidden nav hurts discoverability.'],
    ['Usability Principles', 'intermediate', 'single_choice', 'Fitts’s law suggests:', ['Bigger text is better', 'Target size and distance affect time to hit a target (make primary actions large/close)', 'More clicks are good', 'Scrolling beats clicking only'], [1], 'Large, reachable buttons reduce interaction cost.'],
    ['Accessibility', 'intermediate', 'single_choice', 'Minimum recommended contrast ratio for normal text (WCAG AA) is:', ['2:1', '3:1', '4.5:1', '7:1'], [2], '4.5:1 for normal text; 3:1 for large text (AAA needs 7:1).'],
  ],

  // ── photoshop ──────────────────────────────────────────────────────────────
  photoshop: [
    ['Layers & Masks', 'beginner', 'single_choice', 'Layers in Photoshop allow you to:', ['Edit elements independently without destroying others', 'Only draw pixels', 'Manage files only', 'Encrypt images'], [0], 'Non-destructive editing is based on layer separation.'],
    ['Layers & Masks', 'beginner', 'single_choice', 'A layer mask does what?', ['Deletes the layer', 'Hides or reveals parts of a layer non-destructively', 'Changes color mode', 'Flattens the image'], [1], 'Paint black to hide, white to reveal, gray for partial.'],
    ['Layers & Masks', 'intermediate', 'single_choice', 'Adjustment layers affect:', ['Only the pixels you paint', 'Underlying layers visually without permanently changing pixels', 'File size only', 'Vector paths'], [1], 'Brightness/Curves/Hue-Saturation as adjustable layers.'],
    ['Selections', 'beginner', 'single_choice', 'Which tool selects by color similarity?', ['Magic Wand / Select Subject', 'Text tool', 'Crop tool', 'Brush only'], [0], 'Tolerance controls how broad the color range is.'],
    ['Selections', 'intermediate', 'single_choice', 'The Pen tool creates:', ['Raster brush strokes only', 'Precise vector paths/anchor points for selections and shapes', 'Text', 'Gradients'], [1], 'Paths give clean, editable cutouts.'],
    ['Retouching', 'intermediate', 'single_choice', 'The Spot Healing Brush is best for:', ['Adding text', 'Removing small blemishes by sampling surrounding pixels', 'Cropping', 'Exporting'], [1], 'Content-aware sampling fixes spots quickly.'],
    ['Retouching', 'advanced', 'single_choice', 'Non-destructive retouching means:', ['Saving many PSD copies', 'Using layers/masks/smart objects so original pixels remain restorable', 'Always using eraser', 'Flattening early'], [1], 'History and smart objects preserve the source data.'],
    ['Typography', 'beginner', 'single_choice', 'Kerning refers to:', ['Line spacing', 'Space between individual letter pairs', 'Bold weight', 'Font size'], [1], 'Tracking = overall letter spacing; leading = line height.'],
    ['Typography', 'intermediate', 'single_choice', 'Raster type vs vector type: editable text stays sharp when:', ['Rasterized at 72dpi', 'Kept as live/shape type and scaled (vector) before rasterizing', 'Merged with background', 'Saved as JPEG'], [1], 'Rasterize only when necessary — you lose editability and sharpness.'],
    ['Export & Output', 'beginner', 'single_choice', 'Which format supports transparency?', ['JPEG', 'PNG', 'BMP only', 'PDF always'], [1], 'JPEG has no alpha; PNG (and GIF/WebP) supports transparency.'],
  ],

  // ── illustrator ────────────────────────────────────────────────────────────
  illustrator: [
    ['Paths & Pen Tool', 'beginner', 'single_choice', 'Adobe Illustrator creates which kind of artwork?', ['Raster only', 'Vector graphics (scalable paths)', 'Video', '3D models only'], [1], 'Vectors scale infinitely without quality loss.'],
    ['Paths & Pen Tool', 'beginner', 'single_choice', 'The Pen tool is used to:', ['Paint textures', 'Create paths with anchor points and curves', 'Type text', 'Sample colors'], [1], 'Click for corners, click-drag for smooth bezier curves.'],
    ['Paths & Pen Tool', 'intermediate', 'single_choice', 'To close a path you:', ['Double-click anywhere', 'Click the starting anchor point', 'Press Delete', 'Use the eraser'], [1], 'Closed paths can be filled as solid shapes.'],
    ['Shapes & Boolean Ops', 'beginner', 'single_choice', 'Pathfinder operations combine shapes by:', ['Linking files', 'Uniting, subtracting, intersecting shapes', 'Changing color only', 'Rasterizing'], [1], 'Unite merges; Minus Front subtracts the top shape.'],
    ['Shapes & Boolean Ops', 'intermediate', 'single_choice', 'The Shape Builder tool lets you:', ['Draw only rectangles', 'Interactively merge/erase overlapping regions', 'Import photos', 'Manage artboards'], [1], 'Drag across regions to unite; Alt-drag to remove.'],
    ['Color & Gradients', 'beginner', 'single_choice', 'A global swatch is useful because:', ['It is locked', 'Updating it updates all artwork using it', 'It cannot be exported', 'It slows rendering'], [1], 'Brand colors stay consistent across the file.'],
    ['Color & Gradients', 'intermediate', 'single_choice', 'CMYK is used for:', ['Web only', 'Print (cyan, magenta, yellow, key/black inks)', 'Audio files', '3D printing only'], [1], 'RGB for screens; CMYK for print production.'],
    ['Typography', 'intermediate', 'single_choice', 'Live type in Illustrator means:', ['Animated text', 'Text remains editable as characters', 'Flattened pixels', 'Exported only to PDF'], [1], 'Keep type live until final handoff when possible.'],
    ['Export & Assets', 'beginner', 'single_choice', 'Which format is best for web graphics needing transparency at small size?', ['TIFF', 'SVG or PNG (SVG for vector UI icons)', 'PSD', 'AI only'], [1], 'SVG is tiny for icons; PNG works for raster with alpha.'],
    ['Export & Assets', 'advanced', 'single_choice', 'Artboards help by:', ['Storing color profiles', 'Defining multiple export canvases (e.g. screen sizes) in one file', 'Adding fonts', 'Locking layers'], [1], 'Design multiple sizes and export each as a separate asset.'],
  ],

  // ── premiere-pro ───────────────────────────────────────────────────────────
  'premiere-pro': [
    ['Timeline & Editing', 'beginner', 'single_choice', 'The Premiere Pro timeline is where you:', ['Record audio only', 'Arrange and edit clips across tracks', 'Color grade only', 'Export final files only'], [1], 'V1/V2 video tracks and A1/A2 audio tracks hold clips.'],
    ['Timeline & Editing', 'beginner', 'single_choice', 'A sequence is:', ['A single clip', 'An edited arrangement with settings matching your output', 'A plugin', 'A project file only'], [1], 'Frame rate/resolution of the sequence defines the output.'],
    ['Timeline & Editing', 'intermediate', 'single_choice', 'Ripple edit (B) does what?', ['Deletes the clip', 'Trims and shifts all downstream clips to close gaps', 'Adds transitions', 'Renders preview'], [1], 'Keeps the timeline gap-free after a trim.'],
    ['Cuts & Transitions', 'beginner', 'single_choice', 'The Razor tool (C) is for:', ['Cutting/splitting clips at the playhead', 'Color matching', 'Audio mixing', 'Titles'], [0], 'Split, then delete or rearrange segments.'],
    ['Cuts & Transitions', 'intermediate', 'single_choice', 'J-cuts and L-cuts are:', ['Color presets', 'Audio/video split edits where one track leads/lags the other', 'Export formats', 'Marker types'], [1], 'Audio starts before (J) or continues after (L) the video cut — smoother dialogue.'],
    ['Audio', 'intermediate', 'single_choice', 'Clipping audio (peaking into red) results in:', ['Louder clean sound', 'Distortion', 'Smaller files', 'Better sync'], [1], 'Keep levels below 0 dB (typically −12 to −6 for dialogue).'],
    ['Audio', 'beginner', 'single_choice', 'Audio Waveform display helps you:', ['See amplitude to cut at silence beats', 'Color grade', 'Track motion', 'Manage bins'], [0], 'Visible peaks and silences guide precise edits.'],
    ['Color Correction', 'intermediate', 'single_choice', 'Lumetri Color panel is used for:', ['Exporting', 'Exposure, contrast, white balance and creative looks', 'Titling', 'Encoding'], [1], 'Correct first (neutral), then stylize.'],
    ['Color Correction', 'intermediate', 'single_choice', 'White balance fixes:', ['Motion blur', 'Unwanted color casts so whites look neutral', 'Frame rate', 'Resolution'], [1], 'Use the white balance selector on a neutral area.'],
    ['Export & Formats', 'beginner', 'single_choice', 'H.264 is commonly used for:', ['Web/video platforms (MP4) delivery', 'Raw camera footage only', 'Project files', 'Audio-only files'], [0], 'Good quality-to-size ratio for YouTube/web delivery.'],
  ],

  // ── graphic-design ─────────────────────────────────────────────────────────
  'graphic-design': [
    ['Design Principles', 'beginner', 'single_choice', 'Visual hierarchy is achieved by using:', ['Everything at the same size', 'Variation in size, color, weight and position to guide attention', 'Random placement', 'Only one color'], [1], 'The eye should know what to read first, second, third.'],
    ['Design Principles', 'beginner', 'single_choice', 'Contrast in design helps to:', ['Hide elements', 'Distinguish elements and create focal points', 'Reduce file size', 'Fix typos'], [1], 'Strong contrast makes key items stand out.'],
    ['Design Principles', 'intermediate', 'single_choice', 'White/negative space refers to:', ['Unused wasted area', 'Intentional empty space that improves readability and balance', 'Background image', 'Print margins only'], [1], 'Breathing room prevents clutter.'],
    ['Design Principles', 'intermediate', 'single_choice', 'Alignment should be:', ['Random for energy', 'Consistent along invisible grids/lines', 'Ignored in modern design', 'Centered always'], [1], 'Alignment creates order and connection between elements.'],
    ['Typography', 'beginner', 'single_choice', 'Pairing typefaces well usually means:', ['Using the same font everywhere', 'Combining fonts with clear contrast in while harmonizing', 'Using 5+ fonts', 'Only script fonts'], [1], 'Limit the palette — typically a serif + sans-serif pairing.'],
    ['Typography', 'intermediate', 'single_choice', 'Body text line length best practice is roughly:', ['10–20 characters', '45–90 characters (about 60–75 is ideal)', '200+ characters', 'One word per line'], [1], 'Comfortable line length prevents eye fatigue.'],
    ['Color Theory', 'beginner', 'single_choice', 'A complementary color pair is:', ['Two adjacent colors', 'Colors opposite on the color wheel', 'Any two colors', 'Shades of one color'], [1], 'Opposites create strong, vibrant contrast.'],
    ['Color Theory', 'intermediate', 'single_choice', 'Warm colors typically evoke:', ['Calm and distance', 'Energy, warmth and urgency', 'Sadness only', 'Neutrality'], [1], 'Reds/oranges/yellows advance; blues/greens recede.'],
    ['Layout & Composition', 'intermediate', 'single_choice', 'The rule of thirds suggests placing key elements:', ['Dead center always', 'Along a 3×3 grid’s lines and intersections', 'In corners only', 'Randomly'], [1], 'Creates more dynamic, balanced compositions.'],
    ['Branding', 'beginner', 'single_choice', 'A brand style guide typically documents:', ['Server specs', 'Logo usage, colors, typography and voice', 'Employee schedules', 'Source code style'], [1], 'Consistency across all touchpoints builds recognition.'],
  ],
};
