import type { QuestionBank } from '../types';

// 15 web-development skills × 10 questions each.
export const BANK: QuestionBank = {
  // ── javascript ─────────────────────────────────────────────────────────────
  javascript: [
    ['JS Basics', 'beginner', 'single_choice', 'Which keyword declares a block-scoped variable?', ['var', 'let', 'global', 'define'], [1], 'let (and const) are block-scoped; var is function-scoped.'],
    ['JS Basics', 'beginner', 'true_false', 'NaN === NaN evaluates to true in JavaScript.', ['True', 'False'], [1], 'NaN is never equal to anything, including itself — use isNaN().'],
    ['ES6+', 'intermediate', 'single_choice', 'What does arrow function syntax do besides concise syntax?', ['Binds this to the defining scope', 'Creates a new thread', 'Disables arguments', 'Returns undefined'], [0], 'Arrow functions do not have their own this — they inherit from the enclosing scope.'],
    ['ES6+', 'intermediate', 'single_choice', 'What is the spread operator (...) used for?', ['Only for arrays', 'Expanding iterables into elements', 'Deleting values', 'Commenting'], [1], '... expands an array/string/object into individual elements or properties.'],
    ['Async/Await', 'intermediate', 'single_choice', 'What does await do in an async function?', ['Blocks the event loop', 'Pauses that function until the promise settles', 'Starts a thread', 'Throws immediately'], [1], 'await suspends the async function (not the thread) and resumes on resolution.'],
    ['Async/Await', 'advanced', 'single_choice', 'What is the output order: console.log(1); setTimeout(()=>log(2)); Promise.resolve().then(()=>log(3));?', ['1, 2, 3', '1, 3, 2', '3, 1, 2', '2, 3, 1'], [1], 'Sync first, then microtasks (promise), then macrotask (setTimeout).'],
    ['DOM', 'beginner', 'single_choice', 'Which method selects an element by its id?', ['querySelector("#id") only', 'document.getElementById("id")', 'document.byId()', 'getElement(id)'], [1], 'getElementById and querySelector("#id") both work; getElementById is direct.'],
    ['DOM', 'intermediate', 'single_choice', 'What does addEventListener("click", fn) do?', ['Replaces the element', 'Registers fn to run on click', 'Redirects the page', 'Creates a button'], [1], 'It attaches a listener without overwriting existing handlers.'],
    ['Closures', 'advanced', 'single_choice', 'What is a closure?', ['A loop construct', 'A function bundled with its lexical environment', 'A closed array', 'A type of promise'], [1], 'The inner function keeps access to outer variables even after the outer returns.'],
    ['Closures', 'advanced', 'single_choice', 'What does the following print? for (var i=0;i<3;i++) setTimeout(()=>print(i));', ['0 1 2', '3 3 3', '0 0 0', 'undefined'], [1], 'var is function-scoped so all callbacks see the final i = 3; use let for 0 1 2.'],
  ],

  // ── html ───────────────────────────────────────────────────────────────────
  html: [
    ['Document Structure', 'beginner', 'single_choice', 'Which tag is the root element of an HTML document?', ['<html>', '<body>', '<head>', '<document>'], [0], '<html> wraps <head> and <body>.'],
    ['Document Structure', 'beginner', 'single_choice', 'Which element contains metadata like <title>?', ['<meta> only', '<head>', '<header>', '<section>'], [1], '<head> holds title, meta, links and scripts.'],
    ['Semantic Tags', 'beginner', 'single_choice', 'Which tag represents the main navigation links?', ['<nav>', '<menu>', '<links>', '<aside>'], [0], '<nav> is the semantic container for navigation blocks.'],
    ['Semantic Tags', 'intermediate', 'multiple_choice', 'Which are semantic HTML elements?', ['<article>', '<section>', '<div>', '<header>'], [0, 1, 3], 'article, section and header convey meaning; div is generic/non-semantic.'],
    ['Forms', 'beginner', 'single_choice', 'Which attribute marks a form field as required?', ['must', 'required', 'validate', 'needed'], [1], 'The required attribute enforces non-empty submission.'],
    ['Forms', 'intermediate', 'single_choice', 'Which input type shows a date picker?', ['type="text"', 'type="date"', 'type="calendar"', 'type="day"'], [1], 'type="date" provides the native date picker.'],
    ['Media', 'beginner', 'single_choice', 'Which attribute provides fallback text for an image?', ['title', 'alt', 'text', 'caption'], [1], 'alt describes the image when it cannot be displayed.'],
    ['Media', 'intermediate', 'true_false', 'The <video> tag can include multiple <source> elements for different formats.', ['True', 'False'], [0], 'Browsers pick the first format they support.'],
    ['Tables & Lists', 'beginner', 'single_choice', 'Which tag defines a table row?', ['<tr>', '<td>', '<row>', '<th>'], [0], '<tr> holds <th>/<td> cells.'],
    ['Tables & Lists', 'intermediate', 'single_choice', 'Which list type numbers its items automatically?', ['<ul>', '<ol>', '<dl>', '<li>'], [1], '<ol> is an ordered (numbered) list; <ul> is unordered.'],
  ],

  // ── css ────────────────────────────────────────────────────────────────────
  css: [
    ['Selectors & Box Model', 'beginner', 'single_choice', 'Which selector targets elements with class="card"?', ['#card', '.card', 'card', '*card'], [1], '. is the class selector; # is for id.'],
    ['Selectors & Box Model', 'beginner', 'single_choice', 'What are the four parts of the box model?', ['margin, border, padding, content', 'width, height, depth, area', 'top, right, bottom, left', 'font, line, block, inline'], [0], 'Content is surrounded by padding, border and margin.'],
    ['Selectors & Box Model', 'intermediate', 'single_choice', 'What does box-sizing: border-box do?', ['Removes padding from width', 'Includes padding and border in the declared width', 'Ignores margins', 'Makes elements float'], [1], 'border-box makes width cover content + padding + border.'],
    ['Layout & Flexbox', 'intermediate', 'single_choice', 'In a flex container, what does justify-content control?', ['Cross-axis alignment', 'Main-axis alignment', 'Wrap direction', 'Item order'], [1], 'justify-content distributes space on the main axis; align-items handles the cross axis.'],
    ['Layout & Flexbox', 'intermediate', 'single_choice', 'Which property makes an element a flex container?', ['display: flex', 'position: flex', 'flex: true', 'layout: flexbox'], [0], 'display: flex (or inline-flex) establishes a flex formatting context.'],
    ['Grid', 'advanced', 'single_choice', 'What does grid-template-columns: repeat(3, 1fr) create?', ['3 columns each 1 fraction of space', '3 rows', 'A 3px column', '3 grids'], [0], 'repeat(3, 1fr) makes three equal-width columns.'],
    ['Responsive Design', 'beginner', 'single_choice', 'What does @media (max-width: 640px) do?', ['Applies styles only when viewport ≤ 640px', 'Sets max width of the element', 'Blocks all styles', 'Only works on phones'], [0], 'Media queries apply styles conditionally based on viewport characteristics.'],
    ['Responsive Design', 'intermediate', 'single_choice', 'Which unit is relative to the root font size?', ['em', 'rem', 'px', '%'], [1], 'rem refers to the root <html> size; em refers to the parent/element font size.'],
    ['Transitions & Animations', 'intermediate', 'single_choice', 'Which property animates changes over time?', ['transition', 'animate', 'timing-only', 'motion'], [0], 'transition: property duration defines smooth property changes.'],
    ['Transitions & Animations', 'advanced', 'single_choice', 'What does z-index control?', ['Text size', 'Stacking order of positioned elements', 'Opacity', 'Grid gap'], [1], 'z-index sets the vertical stacking order (requires positioning/stacking context).'],
  ],

  // ── react ──────────────────────────────────────────────────────────────────
  react: [
    ['Components & JSX', 'beginner', 'single_choice', 'What does JSX stand for?', ['JSON XML', 'JavaScript XML', 'Java Syntax Extension', 'JS Extra'], [1], 'JSX is a syntax extension compiled to React.createElement calls.'],
    ['Components & JSX', 'beginner', 'true_false', 'JSX expressions must have one parent element (or use a fragment).', ['True', 'False'], [0], 'Adjacent JSX elements need a wrapper like <>...</> or a single parent.'],
    ['Props & State', 'intermediate', 'single_choice', 'What are props in React?', ['Mutable component state', 'Read-only inputs passed to a component', 'Global variables', 'CSS styles'], [1], 'props flow downward from parent to child and are read-only.'],
    ['Props & State', 'intermediate', 'single_choice', 'Why should you never mutate this.state directly?', ['It causes a memory leak', 'React will not re-render reliably', 'It throws immediately', 'It resets props'], [1], 'Use setState/the updater function so React schedules a proper re-render.'],
    ['Hooks', 'intermediate', 'single_choice', 'What does useState return?', ['Just the new value', 'A pair: current state and setter', 'A promise', 'The previous state'], [1], 'const [value, setValue] = useState(initial).'],
    ['Hooks', 'intermediate', 'single_choice', 'When does a useEffect with [] run?', ['Every render', 'Once after the first render', 'Only on unmount', 'Never'], [1], 'An empty dependency array runs the effect once after mount.'],
    ['Hooks', 'advanced', 'single_choice', 'What does useCallback(fn, deps) do?', ['Caches the function between renders', 'Runs fn immediately', 'Memoizes a value not a function', 'Cancels the callback'], [0], 'useCallback returns a memoized function identity when deps are unchanged.'],
    ['Rendering & Lists', 'intermediate', 'single_choice', 'Why is a key needed when rendering lists?', ['For styling', 'To help React identify items across renders', 'To sort the list', 'To allow clicks'], [1], 'Keys let React match elements between updates efficiently.'],
    ['Routing & Data Fetching', 'advanced', 'single_choice', 'In React Router v6, which component renders matched route UI?', ['<Route path element>', '<RouterView>', '<Switch>', '<Match>'], [0], 'Route takes path and element props and renders element on match.'],
    ['Routing & Data Fetching', 'advanced', 'single_choice', 'Where should you fetch data inside a function component?', ['Directly in render body', 'Inside useEffect / data library', 'In the constructor', 'In JSX'], [1], 'Side effects like fetching belong in useEffect (or a data-fetching library).'],
  ],

  // ── angular ────────────────────────────────────────────────────────────────
  angular: [
    ['Components & Templates', 'beginner', 'single_choice', 'Which CLI command creates a component?', ['ng generate component name', 'angular new component', 'ng build component', 'create-component'], [0], 'ng g component name scaffolds component, template, styles and test.'],
    ['Components & Templates', 'beginner', 'single_choice', 'What does the @Component decorator do?', ['Runs on page load', 'Marks a class as a component with metadata', 'Imports modules', 'Defines a route'], [1], 'It supplies selector, template and styles metadata.'],
    ['Directives & Pipes', 'intermediate', 'single_choice', 'What does *ngIf do?', ['Loops over items', 'Conditionally renders an element', 'Binds text', 'Styles an element'], [1], '*ngIf adds/removes the element based on a condition.'],
    ['Directives & Pipes', 'intermediate', 'single_choice', 'What is the purpose of a pipe?', ['To connect to databases', 'To transform displayed values (e.g. date, currency)', 'To handle events', 'To create components'], [1], 'Pipes format values in templates — e.g. {{d | date}}.'],
    ['Services & DI', 'intermediate', 'single_choice', 'How is a service provided for injection?', ['new Service() everywhere', 'Via providers / providedIn: root', 'Import only', 'Global variable'], [1], 'DI resolves services registered in providers (or providedIn: root).'],
    ['Services & DI', 'advanced', 'single_choice', 'What does @Injectable({providedIn: "root"}) mean?', ['Service is a singleton at app root', 'Service is created per component', 'Service is disabled', 'Service is a pipe'], [0], 'It tree-shakable, app-wide singleton registration.'],
    ['RxJS', 'intermediate', 'single_choice', 'What is an Observable in Angular?', ['A promise variant', 'A stream of values over time', 'A component array', 'A route'], [1], 'Observables emit zero or more values asynchronously; subscribe to consume.'],
    ['RxJS', 'advanced', 'single_choice', 'Which operator transforms each emitted value?', ['map', 'filter-only', 'tap-only', 'combineAll'], [0], 'map projects each value; filter selects values; tap has side effects.'],
    ['Routing', 'beginner', 'single_choice', 'Which directive marks a link for the Angular router?', ['href only', 'routerLink', 'navLink', 'toLink'], [1], 'routerLink generates hrefs and navigates client-side.'],
    ['Routing', 'intermediate', 'single_choice', 'How are route parameters read?', ['document.URL parse', 'ActivatedRoute params (e.g. paramMap)', 'window.location', 'Route guard'], [1], 'ActivatedRoute exposes params/paramMap observables.'],
  ],

  // ── vue ────────────────────────────────────────────────────────────────────
  vue: [
    ['Basics & Syntax', 'beginner', 'single_choice', 'Which directive binds a value to an input?', ['v-model', 'v-bind-only', 'v-for', 'v-if'], [0], 'v-model creates two-way binding on form inputs.'],
    ['Basics & Syntax', 'beginner', 'single_choice', 'What does v-if do?', ['Loops', 'Conditionally renders the element', 'Styles', 'Watches data'], [1], 'v-if adds/removes the element; v-show toggles display.'],
    ['Reactivity', 'intermediate', 'single_choice', 'In Vue 3, reactivity is built on:', ['Proxies', 'Prototypes only', 'Polling', 'Manual dirty checks'], [0], 'Vue 3 uses JS Proxies to track property reads/writes.'],
    ['Reactivity', 'intermediate', 'single_choice', 'What does ref() return for a primitive?', ['The raw value only', 'An object with .value that is reactive', 'A function', 'A component'], [1], 'ref wraps values in a reactive object accessed via .value.'],
    ['Components', 'intermediate', 'single_choice', 'How do parents pass data to children?', ['Global variables', 'props', 'state only', 'localStorage'], [1], 'props are declared by the child and passed by the parent.'],
    ['Components', 'intermediate', 'single_choice', 'How does a child notify its parent?', ['Calling parent method directly', 'Emitting an event ($emit)', 'Mutating props', 'window.alert'], [1], 'The child emits an event the parent listens to.'],
    ['Computed & Watchers', 'beginner', 'single_choice', 'What is a computed property for?', ['DOM manipulation', 'Deriving and caching values from state', 'Routing', 'Styling only'], [1], 'computed values recalculate only when dependencies change.'],
    ['Computed & Watchers', 'intermediate', 'single_choice', 'When does a watcher run?', ['Only on mount', 'When watched data changes', 'On every paint', 'Never'], [1], 'watch executes a callback reactively on dependency changes.'],
    ['Vuex & Router', 'intermediate', 'single_choice', 'What is the single source of truth in a Vue app state?', ['Multiple globals', 'A centralized store (e.g. Pinia/Vuex)', 'Each component', 'The DOM'], [1], 'Central stores hold shared reactive state.'],
    ['Vuex & Router', 'beginner', 'single_choice', 'Which component switches pages without full reload?', ['v-if', '<router-view>', '<template>', 'v-for'], [1], '<router-view> renders the matched route component.'],
  ],

  // ── nextjs ─────────────────────────────────────────────────────────────────
  nextjs: [
    ['Pages & Routing', 'beginner', 'single_choice', 'In the Pages Router, what does pages/about.tsx create?', ['A component only', 'The /about route', 'A 404', 'A redirect'], [1], 'Files in pages/ map directly to URL routes.'],
    ['Pages & Routing', 'intermediate', 'single_choice', 'What is a dynamic route file like pages/[id].tsx used for?', ['Static pages only', 'Routes with URL parameters', 'API mocks', 'Stylesheets'], [1], 'Bracket folders capture path segments available via router.query.'],
    ['SSR & SSG', 'intermediate', 'single_choice', 'What does getServerSideProps do?', ['Renders at build time', 'Runs on every request on the server', 'Runs in the browser only', 'Skips data fetching'], [1], 'It enables per-request server-side rendering (SSR).'],
    ['SSR & SSG', 'intermediate', 'single_choice', 'What does getStaticProps provide?', ['Client-only data', 'Data baked in at build time (SSG)', 'Live websocket data', 'Auth tokens'], [1], 'Pages are pre-rendered at build time with this data.'],
    ['API Routes', 'intermediate', 'single_choice', 'Where do API routes live in the Pages Router?', ['app/api only', 'pages/api/*', 'server/api', 'routes/*'], [1], 'pages/api/*.ts exports handlers responding to HTTP requests.'],
    ['API Routes', 'advanced', 'true_false', 'API route handlers run on the server, so secrets in them are not exposed to the browser.', ['True', 'False'], [0], 'Server-side code never ships in the client bundle.'],
    ['Data Fetching', 'advanced', 'single_choice', 'In the App Router, how is data fetched in a Server Component?', ['useEffect only', 'Directly with async/await in the component', 'Only with Redux', 'getInitialProps always'], [1], 'App Router server components can await fetch/db calls directly.'],
    ['Rendering & Optimization', 'intermediate', 'single_choice', 'Which component opts a client-side feature (useState) into the client bundle?', ['"use client" at top', '"use server"', 'export default', 'require("client")'], [0], 'The "use client" directive marks the boundary for browser code.'],
    ['Rendering & Optimization', 'beginner', 'single_choice', 'What does next/image provide?', ['Only SVG support', 'Optimized responsive images with lazy loading', 'Video hosting', 'Icons only'], [1], 'next/image handles sizing, formats and lazy loading automatically.'],
    ['Rendering & Optimization', 'advanced', 'single_choice', 'What is hydration?', ['CSS loading', 'Attaching event handlers to server-rendered HTML in the browser', 'Database connection', 'Image decoding'], [1], 'The client takes over the static HTML rendered by the server.'],
  ],

  // ── nodejs ─────────────────────────────────────────────────────────────────
  nodejs: [
    ['Event Loop', 'beginner', 'single_choice', 'Is Node.js single-threaded?', ['Yes for JavaScript execution (with a thread pool for some I/O)', 'Yes, absolutely everything', 'No, one thread per request', 'It depends on the OS'], [0], 'The JS event loop is single-threaded; libuv uses a pool for file/DNS work.'],
    ['Event Loop', 'intermediate', 'single_choice', 'Which API is non-blocking in Node.js?', ['fs.readFileSync', 'fs.readFile (callback)', 'process.exit', 'JSON.parse'], [1], 'Async versions (readFile with callback/promises) do not block the event loop.'],
    ['Event Loop', 'advanced', 'single_choice', 'Where do setTimeout callbacks run relative to I/O callbacks?', ['Before them always', 'Timers phase runs before poll phase in each iteration', 'Never', 'Only on exit'], [1], 'The event loop processes timers, then pending, poll, check phases each cycle.'],
    ['Modules', 'beginner', 'single_choice', 'Which function exports values from a CommonJS module?', ['export default', 'module.exports', 'exports only via import', 'send()'], [1], 'module.exports defines the module’s public interface.'],
    ['Modules', 'intermediate', 'single_choice', 'What does require("./util") return?', ['Always undefined', 'The exported value of util.js', 'A promise', 'The file path'], [1], 'require is synchronous and returns module.exports (cached thereafter).'],
    ['File System', 'intermediate', 'single_choice', 'Which fs method returns a promise-based API?', ['fs.promises.readFile / util.promisify', 'fs.sync', 'fs.block', 'fs.quick'], [0], 'fs.promises (or promisified callbacks) enables async/await.'],
    ['Streams', 'advanced', 'single_choice', 'Why use streams for large files?', ['They use less CPU always', 'They process data in chunks with low memory', 'They are faster on SSD only', 'They encrypt data'], [1], 'Streams pipe chunks through instead of loading whole files into memory.'],
    ['Streams', 'advanced', 'single_choice', 'Which method pipes readable output into a writable?', ['connect()', 'pipe()', 'flow()', 'send()'], [1], 'readable.pipe(writable) chains stream transforms.'],
    ['Error Handling', 'intermediate', 'single_choice', 'What happens to an uncaught exception by default?', ['Ignored', 'Process crashes (with error printed)', 'Auto-restart', 'Logged to file'], [1], 'Without a handler the process exits — use process handlers or try/catch.'],
    ['Error Handling', 'beginner', 'single_choice', 'Which built-in module creates an HTTP server?', ['http', 'net-only', 'server', 'express'], [0], "require('http').createServer(handler) serves HTTP directly."],
  ],

  // ── expressjs ──────────────────────────────────────────────────────────────
  expressjs: [
    ['Routing', 'beginner', 'single_choice', 'How do you define a GET route in Express?', ['app.get("/path", handler)', 'route("/path")', 'GET /path handler', 'app.listen("/path")'], [0], 'app.get(path, handler) registers an HTTP GET route.'],
    ['Routing', 'beginner', 'single_choice', 'What does app.use(middleware) do?', ['Stops the server', 'Runs the middleware for matching requests', 'Redirects to "/"', 'Serves static files only'], [1], 'use registers middleware that runs for matching paths/methods.'],
    ['Routing', 'intermediate', 'single_choice', 'Which wildcard matches a route parameter like /users/:id?', ['req.params.id', 'req.query.id', 'req.body.id', 'req.id'], [0], 'Path parameters are exposed via req.params.'],
    ['Middleware', 'intermediate', 'single_choice', 'What must middleware do to pass control to the next layer?', ['return true', 'call next()', 'throw', 'res.end()'], [1], 'next() hands the request to the next matching middleware.'],
    ['Middleware', 'intermediate', 'single_choice', 'Where do you parse JSON request bodies (Express 4.16+)?', ['body-parser always', 'express.json()', 'req.json()', 'app.parse()'], [1], 'express.json() is built in and attaches parsed data to req.body.'],
    ['Middleware', 'advanced', 'single_choice', 'Order of middleware matters because:', ['Express sorts alphabetically', 'Requests flow top-to-bottom through the stack', 'It does not matter', 'Only the last one runs'], [1], 'The first middleware that matches and does not call next() handles the request.'],
    ['Request & Response', 'beginner', 'single_choice', 'How do you send a JSON response?', ['res.json(data)', 'res.send only', 'res.writeJson', 'return data'], [0], 'res.json serializes and sets the content-type header.'],
    ['Request & Response', 'beginner', 'single_choice', 'What does req.query contain?', ['URL path segments', 'Parsed query-string parameters', 'Headers only', 'Cookies only'], [1], '/search?q=abc → req.query.q === "abc".'],
    ['Error Handling', 'intermediate', 'single_choice', 'How are error-handling middleware identified?', ['Name must be handleError', 'Four arguments (err, req, res, next)', 'It throws always', 'It is registered last automatically'], [1], 'Functions with four parameters are treated as error handlers.'],
    ['Security', 'advanced', 'single_choice', 'Which header helps prevent clickjacking and MIME sniffing?', ['X-Frame-Options / helmet defaults', 'Accept', 'ETag', 'Content-Length'], [0], 'The helmet package sets secure headers including X-Frame-Options and X-Content-Type-Options.'],
  ],

  // ── django ─────────────────────────────────────────────────────────────────
  django: [
    ['Models & ORM', 'beginner', 'single_choice', 'What is a Django model?', ['A CSS class', 'A Python class mapped to a database table', 'A template', 'A URL'], [1], 'Each model class maps to a table; attributes to columns.'],
    ['Models & ORM', 'intermediate', 'single_choice', 'What does objects.all() return?', ['A raw SQL string', 'A QuerySet of all rows', 'A list of column names', 'None'], [1], 'QuerySets are lazy, chainable collections of model instances.'],
    ['Models & ORM', 'advanced', 'single_choice', 'What does select_related do?', ['Loads related rows in a JOIN (fewer queries)', 'Selects only some columns', 'Sorts results', 'Filters NULL rows'], [0], 'It follows foreign keys with a JOIN instead of separate queries.'],
    ['Views & URLs', 'beginner', 'single_choice', 'Which decorator marks a view to accept only GET?', ['@require_GET', '@get_only', '@safe', '@readonly'], [0], 'django.views.decorators.require_http_methods(["GET"]) or @require_GET.'],
    ['Views & URLs', 'intermediate', 'single_choice', 'What does urlpatterns in urls.py define?', ['CSS routes', 'Mapping of URL paths to views', 'Database routes', 'Static files'], [1], 'URLconf maps paths to view callables.'],
    ['Templates', 'beginner', 'single_choice', 'Which template tag loops over a list?', ['{% for item in items %}', '{{ loop items }}', '{% each %}', '<forEach>'], [0], 'Django template language uses {% for %} … {% endfor %}.'],
    ['Templates', 'intermediate', 'single_choice', 'What is the difference between {{ var }} and {% if %}?', ['No difference', '{{ }} outputs values; {% %} executes tags', '{% %} outputs; {{ }} checks', 'Both render HTML'], [1], 'Double braces interpolate; curly-percent braces are tag statements.'],
    ['Forms', 'intermediate', 'single_choice', 'How are Django forms validated?', ['Only in JavaScript', 'form.is_valid() checks bound data', 'Manually in SQL', 'On page load'], [1], 'Bound forms run validation exposing form.cleaned_data.'],
    ['Admin & Auth', 'beginner', 'single_choice', 'Which command creates database tables for migrations?', ['python manage.py migrate', 'makemigrations only', 'syncdb', 'runserver'], [0], 'makemigrations records changes; migrate applies them.'],
    ['Admin & Auth', 'beginner', 'single_choice', 'What is Django’s default auth object?', ['auth.User', 'Account', 'Member', 'Login'], [0], 'django.contrib.auth.models.User (customizable via AbstractUser).'],
  ],

  // ── flask ──────────────────────────────────────────────────────────────────
  flask: [
    ['Routing', 'beginner', 'single_choice', 'Which decorator registers a route?', ['@app.route("/path")', '@route', '@app.get only', '@url'], [0], '@app.route binds a URL to a view function.'],
    ['Routing', 'beginner', 'single_choice', 'How do you access a path variable like /user/<id>?', ['request.args', 'request.view_args["id"] / function arg id', 'request.body', 'session.id'], [1], 'Flask passes path variables as function arguments (and in view_args).'],
    ['Routing', 'intermediate', 'single_choice', 'What do request.args contain?', ['Form data', 'Query-string parameters', 'JSON body', 'Headers'], [1], 'request.args is a MultiDict of the query string.'],
    ['Templates', 'beginner', 'single_choice', 'Flask uses which template engine by default?', ['Jinja2', 'Twig', 'ERB', 'Handlebars'], [0], 'render_template uses Jinja2 templates.'],
    ['Templates', 'intermediate', 'single_choice', 'How do you escape user HTML in Jinja by default?', ['Manually with replace', 'autoescape is on for templates', 'It never escapes', 'Only in {{ }} when flagged'], [1], 'Jinja autoescapes template output to reduce XSS risk.'],
    ['Forms', 'intermediate', 'single_choice', 'Where is form data from a POST request read?', ['request.form', 'request.args', 'request.json only', 'session'], [0], 'request.form holds URL-encoded form fields; request.get_json() for JSON.'],
    ['REST APIs', 'intermediate', 'single_choice', 'How do you return JSON from a view?', ['jsonify(dict)', 'return dict only', 'print(json)', 'response.json()'], [0], 'jsonify serializes with proper headers.'],
    ['REST APIs', 'advanced', 'single_choice', 'Which decorator enables CORS for an API?', ['Cross-origin decorator from flask-cors (cors)', '@no-cors', '@allow-all', '@access'], [0], 'flask-cors provides CORS(app) or @cross_origin to allow other origins.'],
    ['Extensions', 'advanced', 'single_choice', 'What is Flask-SQLAlchemy used for?', ['Sending emails', 'ORM integration between Flask and SQLAlchemy', 'Building forms', 'Caching'], [1], 'It wires SQLAlchemy session/models into the Flask app context.'],
    ['Extensions', 'beginner', 'single_choice', 'How do you run a Flask app in development?', ['python app.py with app.run(debug=True)', 'flask compile', 'npm start', 'build & deploy'], [0], "app.run(debug=True) starts the dev server with auto-reload."],
  ],

  // ── laravel ────────────────────────────────────────────────────────────────
  laravel: [
    ['Routing & Controllers', 'beginner', 'single_choice', 'Where are most web routes defined?', ['routes/web.php', 'app/routes', 'public/index', 'config/routes'], [0], 'Laravel registers web routes in routes/web.php.'],
    ['Routing & Controllers', 'intermediate', 'single_choice', 'Which artisan command creates a controller?', ['make:controller', 'create:controller', 'gen:controller', 'new:controller'], [0], 'php artisan make:controller NameController.'],
    ['Blade Templates', 'beginner', 'single_choice', 'Which Blade directive prints escaped output?', ['{{ $var }}', '{!! $var !!}', '@print', '<%= %>'], [0], '{{ }} escapes HTML; {!! !!} outputs raw (XSS risk).'],
    ['Blade Templates', 'intermediate', 'single_choice', 'Which directive starts an if block?', ['@if', '{% if %}', '@conditional', '@when'], [0], 'Blade compiles @if/@else/@endif into PHP conditionals.'],
    ['Eloquent ORM', 'intermediate', 'single_choice', 'What does User::all() return?', ['SQL text', 'A collection of all user models', 'A count', 'The users table name'], [1], 'Eloquent queries return model collections.'],
    ['Eloquent ORM', 'advanced', 'single_choice', 'What does with("posts") achieve (eager loading)?', ['Creates posts', 'Loads relations in one extra query, avoiding N+1', 'Deletes posts', 'Sorts posts'], [1], 'Eager loading pre-fetches relationships to prevent N+1 queries.'],
    ['Auth', 'beginner', 'single_choice', 'Which artisan command scaffolds authentication?', ['make:auth (or Breeze starter kit)', 'auth:install', 'login:make', 'user:create'], [0], 'make:auth (legacy) or composer require laravel/breeze installs auth scaffolding.'],
    ['Auth', 'intermediate', 'single_choice', 'Which middleware protects routes requiring login?', ['auth', 'guest', 'verified-only', 'secure'], [0], "Route::middleware('auth')->group(...)."],
    ['Artisan & Migrations', 'beginner', 'single_choice', 'Which command applies pending migrations?', ['migrate', 'migration:run', 'db:sync', 'schema:update'], [0], 'php artisan migrate runs pending migrations.'],
    ['Artisan & Migrations', 'intermediate', 'single_choice', 'What does a migration file define?', ['CSS styles', 'Database schema changes (up/down)', 'Routes', 'Email templates'], [1], 'up() applies the change; down() reverses it.'],
  ],

  // ── tailwind ───────────────────────────────────────────────────────────────
  tailwind: [
    ['Utilities & Variants', 'beginner', 'single_choice', 'Which class sets text color in Tailwind?', ['text-blue-500', 'color-blue', 'c-blue', 'font-blue'], [0], 'text-* utilities set color; font-* sets family/weight.'],
    ['Utilities & Variants', 'beginner', 'single_choice', 'What does p-4 mean?', ['padding: 4px', 'padding: 1rem (4 × 0.25rem)', 'padding-top: 4', '4 pixels of margin'], [1], 'Tailwind spacing scale: 4 = 4 × 0.25rem = 1rem.'],
    ['Utilities & Variants', 'intermediate', 'single_choice', 'What does the md: prefix do?', ['Marks medium font', 'Applies the utility at the md breakpoint and up', 'Sets max width', 'Mobile only'], [1], 'md (≥768px) is min-width — styles apply from that breakpoint upward.'],
    ['Layout', 'intermediate', 'single_choice', 'Which class makes an element a flex container?', ['flex', 'd-flex', 'display-flex', 'flexbox'], [0], 'Tailwind maps display: flex to the .flex utility.'],
    ['Layout', 'intermediate', 'single_choice', 'What does grid-cols-3 do?', ['Sets 3 grid rows', 'Creates a 3-column grid', 'Adds gap of 3', 'Shows 3 items'], [1], 'grid-cols-3 defines three equal grid columns.'],
    ['Responsive & States', 'intermediate', 'single_choice', 'How do you style on hover?', ['hover:bg-blue-600', 'bg-blue-600:hover', ':hover bg', 'hovered-bg-blue'], [0], 'Variants stack: hover:, focus:, md:, dark:.'],
    ['Responsive & States', 'advanced', 'single_choice', 'Which class combo shows an element only on screens 640px and wider?', ['hidden sm:block', 'sm:block-only', 'show-sm', 'block sm:hidden'], [0], 'hidden sets display:none by default; sm:block re-enables it from 640px up.'],
    ['Components', 'intermediate', 'single_choice', 'What is @apply used for?', ['Imports JavaScript', 'Inlines Tailwind classes inside custom CSS', 'Applies animations', 'Compiles TS'], [1], '@apply lets you compose utilities in @layer rules.'],
    ['Components', 'beginner', 'single_choice', 'Which file lists Tailwind content to scan for classes?', ['tailwind.config.js content array', 'index.html only', 'package-lock', 'postcss-only'], [0], "The content globs tell the JIT compiler which class names to generate."],
    ['Configuration', 'advanced', 'single_choice', 'How do you add a custom color in Tailwind 3 config?', ['theme.extend.colors', 'Only via inline style', 'Add to HTML', 'New CSS file'], [0], 'theme.extend merges custom values without replacing defaults.'],
  ],

  // ── rest-api ───────────────────────────────────────────────────────────────
  'rest-api': [
    ['HTTP Methods', 'beginner', 'single_choice', 'Which HTTP method retrieves a resource without changing it?', ['GET', 'POST', 'PUT', 'DELETE'], [0], 'GET must be safe and idempotent.'],
    ['HTTP Methods', 'beginner', 'single_choice', 'Which method typically creates a new resource?', ['GET', 'POST', 'HEAD', 'OPTIONS'], [1], 'POST to a collection URI creates a resource.'],
    ['HTTP Methods', 'intermediate', 'true_false', 'PUT is idempotent — repeating it yields the same server state.', ['True', 'False'], [0], 'PUT replaces the resource with the same payload every time.'],
    ['Status Codes', 'beginner', 'single_choice', 'What does HTTP 201 mean?', ['OK', 'Created', 'Accepted, no content', 'Redirected'], [1], '201 Created accompanies successful resource creation.'],
    ['Status Codes', 'beginner', 'single_choice', 'Which status indicates a client error (bad request)?', ['500', '404', '400', '301'], [2], '4xx are client errors — 400 Bad Request, 404 Not Found, etc.'],
    ['Status Codes', 'intermediate', 'single_choice', 'When do you return 401 vs 403?', ['401 = not authenticated; 403 = authenticated but forbidden', 'Both mean missing page', '403 = not authenticated', '401 = forbidden'], [0], '401 needs login; 403 denies access even for logged-in users.'],
    ['Resource Design', 'intermediate', 'single_choice', 'Which URI is most RESTful for a single user?', ['/users/42', '/getUser?id=42', '/user/get/42', '/42/users/show'], [0], 'Nouns in plural path segments with an identifier.'],
    ['Versioning & Auth', 'intermediate', 'single_choice', 'How is a REST API commonly versioned?', ['As a URL segment or header (e.g. /v1/users)', 'By HTTP method only', 'Via cookies', 'Through CSS'], [0], '/v1/users or Accept/Authorization headers carrying a version.'],
    ['Versioning & Auth', 'intermediate', 'single_choice', 'Which scheme sends a token in the Authorization header?', ['Bearer token', 'Basic HTML', 'Cookie-only', 'Query key always'], [0], 'Authorization: Bearer <token> is standard for JWT/OAuth.'],
    ['Pagination & Filtering', 'beginner', 'single_choice', 'Which query params are common for pagination?', ['?page=2&limit=10', '?skip=true', '?offset-on', '?pg=2&size=only'], [0], 'page/limit (or offset/limit) are conventional pagination params.'],
  ],

  // ── web-fundamentals ───────────────────────────────────────────────────────
  'web-fundamentals': [
    ['HTTP & HTTPS', 'beginner', 'single_choice', 'What does HTTP stand for?', ['HyperText Transfer Protocol', 'High Tech Text Process', 'Hyperlink Text Package', 'Hosted Transfer Transport'], [0], 'HTTP is the application protocol that carries web content.'],
    ['HTTP & HTTPS', 'beginner', 'single_choice', 'What does HTTPS add over HTTP?', ['Faster speeds', 'TLS encryption and authentication', 'Larger pages', 'No servers needed'], [1], 'TLS encrypts traffic and authenticates the server via certificates.'],
    ['HTTP & HTTPS', 'intermediate', 'single_choice', 'What does a browser do with a 301 response?', ['Shows an error', 'Follows the permanent redirect', 'Reloads forever', 'Downloads a file'], [1], '301/302 redirect the client to a new location; 301 is permanent/cacheable.'],
    ['DNS', 'beginner', 'single_choice', 'What is DNS used for?', ['Styling pages', 'Resolving domain names to IP addresses', 'Compressing images', 'Encrypting emails'], [1], 'DNS translates names like example.com into IPs.'],
    ['DNS', 'intermediate', 'single_choice', 'Which record maps a hostname to an IPv4 address?', ['A record', 'MX record', 'CNAME', 'TXT'], [0], 'A → IPv4, AAAA → IPv6, MX → mail, CNAME → alias.'],
    ['Browser Rendering', 'intermediate', 'single_choice', 'What is the first step when a browser loads a page?', ['Execute JavaScript', 'Parse HTML into the DOM', 'Render final pixels', 'Download CSS'], [1], 'HTML parsing builds the DOM; CSS builds the CSSOM, then layout/paint.'],
    ['Browser Rendering', 'advanced', 'single_choice', 'What does reflow mean?', ['Reparsing HTML', 'Recalculating layout after size/position changes', 'Rebooting the browser', 'Reloading resources'], [1], 'Forced reflows are expensive — batch DOM reads/writes.'],
    ['Cookies & Storage', 'beginner', 'single_choice', 'Which storage is sent with every HTTP request to the domain?', ['localStorage', 'Cookies (with attributes)', 'sessionStorage', 'IndexedDB'], [1], 'Cookies are automatically included in request headers (subject to SameSite).'],
    ['Cookies & Storage', 'intermediate', 'single_choice', 'What is the max size of a cookie (practically)?', ['4KB per cookie (~50 per domain)', '5MB', 'Unlimited', '1MB'], [0], 'Cookies are limited to about 4KB each — use storage for larger data.'],
    ['CORS & Security', 'advanced', 'single_choice', 'What does CORS allow?', ['Running JS in the browser', 'Cross-origin requests permitted by the server’s response headers', 'Faster DNS', 'Encrypting cookies'], [1], 'The server’s Access-Control-Allow-Origin header opts origins in.'],
  ],
};
