// ============================================================================
// SKILL TEST CATALOG — 100 skills across 10 categories.
// Each skill carries its topics; questions live in ./questions/*.ts keyed by slug.
// ============================================================================

export interface CatalogSkill {
  name: string;
  slug: string;
  category: string;
  description: string;
  shortDescription: string;
  tags: string[];
  isPopular: boolean;
  totalQuestions: number;
  avgCompletionTime: number;
  topics: string[];
}

const DEFAULTS = { totalQuestions: 10, avgCompletionTime: 15 };

const S = (
  name: string,
  slug: string,
  category: string,
  shortDescription: string,
  tags: string[],
  topics: string[],
  description?: string,
  isPopular?: boolean,
): CatalogSkill => ({
  name,
  slug,
  category,
  description: description || `Test your ${name} skills with a free assessment covering ${topics.slice(0, 3).join(', ')} and more.`,
  shortDescription,
  tags,
  isPopular: !!isPopular,
  ...DEFAULTS,
  topics,
});

// Java keeps its full 30-question bank (35 seeded, 30 per attempt).
const javaSkill: CatalogSkill = {
  name: 'Java Programming',
  slug: 'java',
  category: 'Programming',
  description: 'Test your Java fundamentals, OOP, Collections, Multithreading, JVM and more.',
  shortDescription: 'Java assessment',
  tags: ['java', 'oop', 'programming'],
  isPopular: true,
  totalQuestions: 30,
  avgCompletionTime: 30,
  topics: ['Java Basics', 'OOP', 'Collections', 'Exception Handling', 'Multithreading', 'JVM', 'Java 8+'],
};

export const SKILL_CATALOG: CatalogSkill[] = [
  javaSkill,

  // ── Programming (13) ────────────────────────────────────────────────────────
  S('Python Programming', 'python', 'Programming', 'Python assessment', ['python', 'programming'], ['Python Basics', 'Data Types', 'Functions', 'OOP', 'Error Handling'], 'Assess your Python skills across core concepts, data structures and best practices.', true),
  S('C++ Programming', 'cpp', 'Programming', 'C++ assessment', ['cpp', 'programming'], ['C++ Basics', 'Pointers', 'OOP', 'STL', 'Memory Management'], 'Evaluate C++ concepts including STL, pointers, memory management and OOP.'),
  S('C Programming', 'c', 'Programming', 'C assessment', ['c', 'programming'], ['C Basics', 'Arrays & Strings', 'Pointers', 'Functions', 'Memory & File I/O'], 'Test your C programming fundamentals — pointers, memory, arrays and file handling.'),
  S('TypeScript', 'typescript', 'Programming', 'TypeScript assessment', ['typescript', 'javascript'], ['Types & Interfaces', 'Generics', 'Functions', 'Classes', 'Advanced Types'], 'Evaluate TypeScript type system, generics, interfaces and tooling.', true),
  S('Go Programming', 'go', 'Programming', 'Go assessment', ['go', 'golang'], ['Syntax & Types', 'Concurrency', 'Structs & Interfaces', 'Error Handling', 'Standard Library'], 'Test your Go skills — goroutines, channels, structs and error handling.'),
  S('Rust Programming', 'rust', 'Programming', 'Rust assessment', ['rust', 'systems'], ['Ownership & Borrowing', 'Types & Traits', 'Concurrency', 'Error Handling', 'Cargo'], 'Evaluate Rust ownership, borrowing, traits and safe concurrency.'),
  S('Ruby Programming', 'ruby', 'Programming', 'Ruby assessment', ['ruby', 'rails'], ['Syntax & Types', 'Blocks & Procs', 'OOP', 'Modules', 'Enumerable'], 'Test your Ruby syntax, blocks, OOP and Enumerable mastery.'),
  S('PHP Programming', 'php', 'Programming', 'PHP assessment', ['php', 'web'], ['Syntax & Types', 'Arrays', 'Functions', 'OOP', 'Web & Databases'], 'Evaluate PHP fundamentals, arrays, OOP and web integration.'),
  S('Kotlin Programming', 'kotlin', 'Programming', 'Kotlin assessment', ['kotlin', 'android'], ['Syntax & Null Safety', 'Functions', 'OOP', 'Collections', 'Coroutines'], 'Test your Kotlin skills — null safety, coroutines and idiomatic Kotlin.'),
  S('Swift Programming', 'swift', 'Programming', 'Swift assessment', ['swift', 'ios'], ['Syntax & Types', 'Optionals', 'Collections', 'OOP & Protocols', 'Concurrency'], 'Evaluate Swift optionals, protocols, collections and modern concurrency.'),
  S('C# Programming', 'csharp', 'Programming', 'C# assessment', ['csharp', 'dotnet'], ['Syntax & Types', 'OOP', 'LINQ', 'Async/Await', '.NET Basics'], 'Test your C# skills — OOP, LINQ, async/await and .NET fundamentals.', true),
  S('R Programming', 'r-lang', 'Programming', 'R assessment', ['r', 'statistics'], ['Syntax & Types', 'Data Frames', 'Functions', 'Statistics', 'Visualization'], 'Evaluate R programming for data analysis, statistics and visualization.'),

  // ── Web Development (15) ────────────────────────────────────────────────────
  S('HTML', 'html', 'Web Development', 'HTML assessment', ['html', 'web'], ['Document Structure', 'Semantic Tags', 'Forms', 'Media', 'Tables & Lists'], 'Test your HTML structure, semantics, forms and accessibility basics.', true),
  S('CSS', 'css', 'Web Development', 'CSS assessment', ['css', 'styling'], ['Selectors & Box Model', 'Layout & Flexbox', 'Grid', 'Responsive Design', 'Transitions & Animations'], 'Evaluate CSS selectors, Flexbox, Grid and responsive design skills.', true),
  S('JavaScript', 'javascript', 'Web Development', 'JS assessment', ['javascript', 'web'], ['JS Basics', 'ES6+', 'Async/Await', 'DOM', 'Closures'], 'Evaluate JavaScript fundamentals, ES6+, async patterns and DOM concepts.', true),
  S('React JS', 'react', 'Web Development', 'React assessment', ['react', 'frontend'], ['Components & JSX', 'Props & State', 'Hooks', 'Rendering & Lists', 'Routing & Data Fetching'], 'Test your React skills — components, hooks, state management and rendering.', true),
  S('Angular', 'angular', 'Web Development', 'Angular assessment', ['angular', 'frontend'], ['Components & Templates', 'Directives & Pipes', 'Services & DI', 'RxJS', 'Routing'], 'Evaluate Angular components, dependency injection, RxJS and routing.'),
  S('Vue JS', 'vue', 'Web Development', 'Vue assessment', ['vue', 'frontend'], ['Basics & Syntax', 'Reactivity', 'Components', 'Computed & Watchers', 'Vuex & Router'], 'Test your Vue.js reactivity, components, computed properties and router.'),
  S('Next.js', 'nextjs', 'Web Development', 'Next.js assessment', ['nextjs', 'react'], ['Pages & Routing', 'SSR & SSG', 'API Routes', 'Data Fetching', 'Rendering & Optimization'], 'Evaluate Next.js routing, server rendering, data fetching and optimization.', true),
  S('Node.js', 'nodejs', 'Web Development', 'Node.js assessment', ['nodejs', 'backend'], ['Event Loop', 'Modules', 'File System', 'Streams', 'Error Handling'], 'Test your Node.js event loop, modules, streams and async patterns.', true),
  S('Express.js', 'expressjs', 'Web Development', 'Express assessment', ['express', 'nodejs', 'backend'], ['Routing', 'Middleware', 'Request & Response', 'Error Handling', 'Security'], 'Evaluate Express routing, middleware, error handling and security practices.'),
  S('Django', 'django', 'Web Development', 'Django assessment', ['django', 'python', 'backend'], ['Models & ORM', 'Views & URLs', 'Templates', 'Forms', 'Admin & Auth'], 'Test your Django ORM, views, templates, forms and authentication.'),
  S('Flask', 'flask', 'Web Development', 'Flask assessment', ['flask', 'python', 'backend'], ['Routing', 'Templates', 'Forms', 'REST APIs', 'Extensions'], 'Evaluate Flask routing, templates, REST APIs and extensions.'),
  S('Laravel', 'laravel', 'Web Development', 'Laravel assessment', ['laravel', 'php', 'backend'], ['Routing & Controllers', 'Blade Templates', 'Eloquent ORM', 'Auth', 'Artisan & Migrations'], 'Test your Laravel routing, Eloquent, Blade and authentication knowledge.'),
  S('Tailwind CSS', 'tailwind', 'Web Development', 'Tailwind assessment', ['tailwind', 'css'], ['Utilities & Variants', 'Layout', 'Responsive & States', 'Components', 'Configuration'], 'Evaluate Tailwind utility classes, responsive design and configuration.'),
  S('REST API Design', 'rest-api', 'Web Development', 'REST API assessment', ['api', 'backend'], ['HTTP Methods', 'Status Codes', 'Resource Design', 'Versioning & Auth', 'Pagination & Filtering'], 'Test your REST API design — methods, status codes, auth and best practices.'),
  S('Web Fundamentals', 'web-fundamentals', 'Web Development', 'Web basics assessment', ['http', 'dns', 'web'], ['HTTP & HTTPS', 'DNS', 'Browser Rendering', 'Cookies & Storage', 'CORS & Security'], 'Evaluate HTTP, DNS, browser rendering, storage and CORS fundamentals.'),

  // ── Core CS (12) ────────────────────────────────────────────────────────────
  S('DSA', 'dsa', 'Core CS', 'DSA assessment', ['dsa', 'algorithms'], ['Arrays', 'Linked Lists', 'Stacks & Queues', 'Trees', 'Graphs', 'Sorting'], 'DSA fundamentals — arrays, trees, graphs, sorting and problem-solving concepts.', true),
  S('DBMS', 'dbms', 'Core CS', 'DBMS assessment', ['dbms', 'database'], ['ER Model', 'Normalization', 'Transactions', 'Indexing', 'Concurrency'], 'Database Management System concepts — normalization, transactions, indexing.'),
  S('Operating Systems', 'os', 'Core CS', 'OS assessment', ['os', 'systems'], ['Processes', 'Threads', 'Memory Management', 'Scheduling', 'Deadlocks', 'File Systems'], 'OS concepts — processes, threads, memory management, scheduling and deadlocks.'),
  S('Computer Networks', 'cn', 'Core CS', 'Networks assessment', ['networking', 'cn'], ['OSI & TCP/IP Models', 'IP Addressing', 'Routing', 'Transport Layer', 'DNS & HTTP', 'Security'], 'Test your networking — OSI model, TCP/IP, routing, DNS and protocols.', true),
  S('Theory of Computation', 'toc', 'Core CS', 'ToC assessment', ['toc', 'theory'], ['Automata', 'Regular Expressions', 'Context-Free Grammars', 'Pumping Lemma', 'Complexity Classes'], 'Evaluate finite automata, grammars, pumping lemma and complexity classes.'),
  S('Compiler Design', 'compiler-design', 'Core CS', 'Compiler assessment', ['compiler', 'cs'], ['Lexical Analysis', 'Parsing', 'Syntax Trees', 'Semantic Analysis', 'Code Generation'], 'Test your compiler — lexing, parsing, semantic analysis and code generation.'),
  S('Discrete Mathematics', 'discrete-math', 'Core CS', 'Discrete Math assessment', ['math', 'discrete'], ['Set Theory', 'Logic & Proofs', 'Combinatorics', 'Graph Theory', 'Relations & Functions'], 'Evaluate sets, logic, proofs, combinatorics and discrete structures.'),
  S('Computer Architecture', 'computer-architecture', 'Core CS', 'Architecture assessment', ['architecture', 'hardware'], ['Number Systems', 'Data Representation', 'CPU Design', 'Memory Hierarchy', 'Pipelining'], 'Test your computer architecture — number systems, CPU, cache and pipelining.'),
  S('Software Engineering', 'software-engineering', 'Core CS', 'SE assessment', ['software', 'engineering'], ['SDLC', 'Testing', 'Design Patterns', 'Agile & Scrum', 'Version Control'], 'Evaluate SDLC, testing, design patterns and Agile methodologies.', true),
  S('OOP Concepts', 'oop', 'Core CS', 'OOP assessment', ['oop', 'programming'], ['Classes & Objects', 'Encapsulation', 'Inheritance', 'Polymorphism', 'Abstraction'], 'Test your OOP — encapsulation, inheritance, polymorphism and abstraction.', true),
  S('System Design', 'system-design', 'Core CS', 'System design assessment', ['system-design', 'architecture'], ['Scalability Basics', 'Databases & Caching', 'Load Balancing', 'Message Queues', 'Design Trade-offs'], 'Evaluate scalability, caching, load balancing and system design trade-offs.', true),
  S('Cyber Security', 'cyber-security', 'Core CS', 'Security assessment', ['security', 'cyber'], ['Threats & Attacks', 'Cryptography', 'Web Security', 'Network Security', 'Authentication'], 'Test your security — threats, cryptography, web attacks and defences.', true),

  // ── Databases (8) ───────────────────────────────────────────────────────────
  S('SQL', 'sql', 'Databases', 'SQL assessment', ['sql', 'database'], ['SELECT & Filters', 'JOINs', 'GROUP BY', 'Subqueries', 'Indexes'], 'Test your SQL querying skills from basics to advanced joins and subqueries.', true),
  S('MySQL', 'mysql', 'Databases', 'MySQL assessment', ['mysql', 'sql'], ['Syntax & Types', 'JOINs', 'Indexes', 'Stored Procedures', 'Administration'], 'Evaluate MySQL syntax, indexing, procedures and administration.'),
  S('PostgreSQL', 'postgresql', 'Databases', 'PostgreSQL assessment', ['postgresql', 'sql'], ['SQL Basics', 'Advanced Queries', 'Indexing', 'JSON & Arrays', 'Administration'], 'Test your PostgreSQL — advanced SQL, JSON support, indexing and admin.'),
  S('MongoDB', 'mongodb', 'Databases', 'MongoDB assessment', ['mongodb', 'nosql'], ['CRUD Operations', 'Queries & Indexes', 'Aggregation', 'Schema Design', 'Replication'], 'Evaluate MongoDB queries, aggregation pipeline, schema and replication.', true),
  S('Redis', 'redis', 'Databases', 'Redis assessment', ['redis', 'cache'], ['Data Types', 'Commands', 'Expiry & Persistence', 'Pub/Sub', 'Lua Scripting'], 'Test your Redis data types, persistence, pub/sub and scripting.'),
  S('Oracle SQL', 'oracle', 'Databases', 'Oracle assessment', ['oracle', 'sql'], ['SQL Basics', 'PL/SQL', 'Joins & Subqueries', 'Indexes', 'Backup & Recovery'], 'Evaluate Oracle SQL, PL/SQL, indexing and database administration.'),
  S('NoSQL', 'nosql', 'Databases', 'NoSQL assessment', ['nosql', 'database'], ['Key-Value Stores', 'Document Stores', 'Column Families', 'Graph Databases', 'CAP Theorem'], 'Test your NoSQL models — document, key-value, column, graph and CAP theorem.'),
  S('MS SQL Server', 'mssql', 'Databases', 'MS SQL assessment', ['mssql', 'sql'], ['T-SQL Basics', 'Joins & Subqueries', 'Indexes', 'Stored Procedures', 'Administration'], 'Evaluate T-SQL, indexes, stored procedures and SQL Server administration.'),

  // ── Data Science & AI (14) ──────────────────────────────────────────────────
  S('Data Analysis with Pandas', 'pandas', 'Data Science & AI', 'Pandas assessment', ['pandas', 'python', 'data'], ['Series & DataFrame', 'Indexing & Filtering', 'GroupBy', 'Merging & Joining', 'Cleaning'], 'Test your pandas — DataFrames, groupby, merging and data cleaning.', true),
  S('Statistics', 'statistics', 'Data Science & AI', 'Statistics assessment', ['statistics', 'math'], ['Descriptive Statistics', 'Probability', 'Distributions', 'Hypothesis Testing', 'Regression'], 'Evaluate descriptive stats, probability, distributions and hypothesis testing.', true),
  S('Machine Learning', 'machine-learning', 'Data Science & AI', 'ML assessment', ['ml', 'ai'], ['Supervised Learning', 'Unsupervised Learning', 'Model Evaluation', 'Feature Engineering', 'Overfitting'], 'Test your ML — regression, classification, clustering, evaluation and tuning.', true),
  S('Deep Learning', 'deep-learning', 'Data Science & AI', 'Deep Learning assessment', ['dl', 'ai'], ['Neural Networks', 'Backpropagation', 'CNNs', 'RNNs & Transformers', 'Optimization'], 'Evaluate neural networks, backprop, CNNs, RNNs and optimizers.', true),
  S('Natural Language Processing', 'nlp', 'Data Science & AI', 'NLP assessment', ['nlp', 'ai'], ['Text Preprocessing', 'Tokenization', 'Embeddings', 'Modeling', 'Transformers'], 'Test your NLP — tokenization, embeddings, transformers and language models.'),
  S('Computer Vision', 'computer-vision', 'Data Science & AI', 'CV assessment', ['cv', 'ai'], ['Image Basics', 'Convolutions', 'CNN Architectures', 'Detection & Segmentation', 'Vision Transformers'], 'Evaluate image processing, CNNs, object detection and vision transformers.'),
  S('TensorFlow', 'tensorflow', 'Data Science & AI', 'TensorFlow assessment', ['tensorflow', 'ai'], ['Tensors & Operations', 'Keras API', 'Training Loops', 'CNNs & RNNs', 'Deployment'], 'Test your TensorFlow — tensors, Keras, training loops and deployment.'),
  S('PyTorch', 'pytorch', 'Data Science & AI', 'PyTorch assessment', ['pytorch', 'ai'], ['Tensors & Autograd', 'nn.Module', 'Training Loop', 'Data Loading', 'Deployment'], 'Evaluate PyTorch tensors, autograd, nn.Module and training workflows.'),
  S('Generative AI & LLMs', 'generative-ai', 'Data Science & AI', 'GenAI assessment', ['llm', 'genai', 'ai'], ['LLM Basics', 'Transformers', 'Prompt Engineering', 'RAG & Fine-Tuning', 'Evaluation & Safety'], 'Test your knowledge of LLMs, prompting, RAG, fine-tuning and safety.', true),
  S('Data Visualization', 'data-visualization', 'Data Science & AI', 'Visualization assessment', ['visualization', 'data'], ['Chart Types', 'Exploratory Analysis', 'Dashboards', 'Color & Design', 'Storytelling'], 'Evaluate chart selection, dashboards, design principles and storytelling.'),
  S('Power BI', 'power-bi', 'Data Science & AI', 'Power BI assessment', ['powerbi', 'bi'], ['Data Import', 'Data Model & DAX', 'Visuals', 'Reports & Dashboards', 'Publishing'], 'Test your Power BI — data modeling, DAX, visuals and publishing.', true),
  S('Tableau', 'tableau', 'Data Science & AI', 'Tableau assessment', ['tableau', 'bi'], ['Connect & Prepare', 'Calculated Fields', 'Visuals', 'Parameters & Actions', 'Dashboards'], 'Evaluate Tableau data prep, calculations, parameters and dashboards.'),
  S('Microsoft Excel', 'excel', 'Data Science & AI', 'Excel assessment', ['excel', 'office'], ['Formulas & Functions', 'Pivot Tables', 'Charts', 'Lookup Functions', 'Data Tools'], 'Test your Excel formulas, pivot tables, charts and lookup functions.', true),
  S('Apache Spark', 'spark', 'Data Science & AI', 'Spark assessment', ['spark', 'bigdata'], ['RDDs & DataFrames', 'Transformations & Actions', 'Spark SQL', 'Optimization', 'Streaming'], 'Evaluate Spark DataFrames, SQL, optimization and structured streaming.'),

  // ── Cloud & DevOps (14) ─────────────────────────────────────────────────────
  S('AWS', 'aws', 'Cloud & DevOps', 'AWS assessment', ['aws', 'cloud'], ['Core Services', 'Compute & Storage', 'Networking', 'Security & IAM', 'Serverless'], 'Test your AWS — EC2, S3, IAM, networking and serverless services.', true),
  S('Microsoft Azure', 'azure', 'Cloud & DevOps', 'Azure assessment', ['azure', 'cloud'], ['Core Services', 'Compute & Storage', 'Networking', 'Identity & Security', 'DevOps on Azure'], 'Evaluate Azure compute, storage, identity and DevOps services.'),
  S('Google Cloud', 'gcp', 'Cloud & DevOps', 'GCP assessment', ['gcp', 'cloud'], ['Core Services', 'Compute & Storage', 'Networking', 'BigQuery & Data', 'IAM & Security'], 'Test your GCP — Compute Engine, BigQuery, networking and IAM.'),
  S('Docker', 'docker', 'Cloud & DevOps', 'Docker assessment', ['docker', 'containers'], ['Images & Containers', 'Dockerfile', 'Volumes & Networks', 'Compose', 'Registry & Security'], 'Evaluate Docker images, Dockerfile, networking, Compose and security.', true),
  S('Kubernetes', 'kubernetes', 'Cloud & DevOps', 'K8s assessment', ['kubernetes', 'k8s'], ['Pods & Deployments', 'Services & Networking', 'Config & Secrets', 'Storage', 'Scaling & Troubleshooting'], 'Test your Kubernetes pods, services, config maps, scaling and debugging.', true),
  S('CI/CD', 'ci-cd', 'Cloud & DevOps', 'CI/CD assessment', ['cicd', 'devops'], ['Pipelines', 'Build & Test Automation', 'Deployment Strategies', 'Artifact Management', 'Quality Gates'], 'Evaluate CI/CD pipelines, automated testing, deployment strategies and gates.'),
  S('Terraform', 'terraform', 'Cloud & DevOps', 'Terraform assessment', ['terraform', 'iac'], ['HCL Basics', 'Resources & State', 'Modules', 'Remote State', 'Workspaces & Secrets'], 'Test your Terraform HCL, state management, modules and best practices.'),
  S('Ansible', 'ansible', 'Cloud & DevOps', 'Ansible assessment', ['ansible', 'automation'], ['Playbooks', 'Inventory & Modules', 'Roles', 'Variables & Templates', 'Galaxy & Security'], 'Evaluate Ansible playbooks, roles, variables and automation workflows.'),
  S('Linux', 'linux', 'Cloud & DevOps', 'Linux assessment', ['linux', 'os'], ['File System', 'Permissions', 'Shell Commands', 'Processes & Services', 'Networking & Logs'], 'Test your Linux — file system, permissions, processes and shell usage.', true),
  S('Bash Scripting', 'bash', 'Cloud & DevOps', 'Bash assessment', ['bash', 'shell'], ['Variables & Operators', 'Control Flow', 'Functions', 'Text Tools', 'Automation'], 'Evaluate bash variables, loops, functions, grep/sed/awk and scripting.'),
  S('Git', 'git', 'Cloud & DevOps', 'Git assessment', ['git', 'version-control'], ['Basics & Staging', 'Branching', 'Merging & Rebasing', 'Remote & Collaboration', 'History & Recovery'], 'Test your Git — commits, branches, merge/rebase, remotes and recovery.', true),
  S('Jenkins', 'jenkins', 'Cloud & DevOps', 'Jenkins assessment', ['jenkins', 'cicd'], ['Pipelines', 'Freestyle Jobs', 'Plugins', 'Security', 'Distributed Builds'], 'Evaluate Jenkins pipelines, jobs, plugins and build security.'),
  S('DevOps Fundamentals', 'devops', 'Cloud & DevOps', 'DevOps assessment', ['devops', 'culture'], ['DevOps Culture', 'CI/CD', 'Infrastructure as Code', 'Monitoring & Logging', 'Site Reliability'], 'Test DevOps culture, CI/CD, IaC, monitoring and SRE practices.', true),
  S('Web Servers', 'web-servers', 'Cloud & DevOps', 'Web servers assessment', ['nginx', 'apache', 'server'], ['HTTP Handling', 'Nginx Configuration', 'Apache Configuration', 'Reverse Proxy & TLS', 'Performance & Security'], 'Evaluate web server configuration, reverse proxies, TLS and performance.'),

  // ── Mobile & Game Dev (5) ───────────────────────────────────────────────────
  S('Android Development', 'android', 'Mobile & Game Dev', 'Android assessment', ['android', 'mobile'], ['Activities & Fragments', 'Layouts', 'Intents & Navigation', 'Data & Storage', 'Networking'], 'Test Android activities, layouts, intents, storage and networking.', true),
  S('Flutter', 'flutter', 'Mobile & Game Dev', 'Flutter assessment', ['flutter', 'mobile'], ['Widgets & Layouts', 'State Management', 'Navigation', 'Networking & Storage', 'Platform Channels'], 'Evaluate Flutter widgets, state management, navigation and integrations.', true),
  S('React Native', 'react-native', 'Mobile & Game Dev', 'React Native assessment', ['reactnative', 'mobile'], ['Components & JSX', 'Styling', 'Navigation', 'State & Data', 'Native Modules'], 'Test React Native components, styling, navigation and native modules.'),
  S('iOS Development', 'ios', 'Mobile & Game Dev', 'iOS assessment', ['ios', 'swift'], ['SwiftUI Basics', 'Layouts & Modifiers', 'State & Data', 'Navigation', 'Networking'], 'Evaluate SwiftUI layouts, state, navigation and data flow.'),
  S('Unity Game Development', 'unity', 'Mobile & Game Dev', 'Unity assessment', ['unity', 'gamedev'], ['Scenes & GameObjects', 'C# Scripting', 'Physics & Collisions', 'Animation', 'UI & Publishing'], 'Test Unity scenes, scripting, physics, animation and game UI.'),

  // ── Design & Creative (6) ───────────────────────────────────────────────────
  S('Figma', 'figma', 'Design & Creative', 'Figma assessment', ['figma', 'ui'], ['Frames & Layers', 'Auto Layout', 'Components & Variants', 'Prototyping', 'Design Systems'], 'Evaluate Figma frames, auto layout, components and prototyping.', true),
  S('UI/UX Design', 'ui-ux', 'Design & Creative', 'UI/UX assessment', ['uiux', 'design'], ['User Research', 'Information Architecture', 'Wireframes & Mockups', 'Usability Principles', 'Accessibility'], 'Test user research, IA, wireframing, usability and accessibility.', true),
  S('Adobe Photoshop', 'photoshop', 'Design & Creative', 'Photoshop assessment', ['photoshop', 'design'], ['Layers & Masks', 'Selections', 'Retouching', 'Typography', 'Export & Output'], 'Evaluate layers, masks, selections, retouching and exports.'),
  S('Adobe Illustrator', 'illustrator', 'Design & Creative', 'Illustrator assessment', ['illustrator', 'vector'], ['Paths & Pen Tool', 'Shapes & Boolean Ops', 'Color & Gradients', 'Typography', 'Export & Assets'], 'Test the pen tool, shapes, gradients, type and asset export.'),
  S('Premiere Pro', 'premiere-pro', 'Design & Creative', 'Premiere assessment', ['video', 'editing'], ['Timeline & Editing', 'Cuts & Transitions', 'Audio', 'Color Correction', 'Export & Formats'], 'Evaluate video editing, transitions, audio, color and export settings.'),
  S('Graphic Design', 'graphic-design', 'Design & Creative', 'Graphic design assessment', ['design', 'visual'], ['Design Principles', 'Typography', 'Color Theory', 'Layout & Composition', 'Branding'], 'Test design principles, typography, color theory and composition.'),

  // ── Career & Aptitude (7) ───────────────────────────────────────────────────
  S('Quantitative Aptitude', 'quantitative-aptitude', 'Career & Aptitude', 'Quant aptitude assessment', ['aptitude', 'quant'], ['Number System', 'Percentages & Ratios', 'Profit, Loss & Interest', 'Time, Speed & Distance', 'Algebra'], 'Test arithmetic, percentages, time-speed-distance and algebra.', true),
  S('Logical Reasoning', 'logical-reasoning', 'Career & Aptitude', 'Reasoning assessment', ['reasoning', 'aptitude'], ['Series & Patterns', 'Coding-Decoding', 'Blood Relations', 'Direction Sense', 'Seating & Syllogisms'], 'Evaluate series, coding, blood relations, directions and syllogisms.', true),
  S('Verbal Ability', 'verbal-ability', 'Career & Aptitude', 'Verbal ability assessment', ['verbal', 'english'], ['Grammar & Usage', 'Vocabulary', 'Sentence Correction', 'Comprehension', 'Para Jumbles'], 'Test grammar, vocabulary, comprehension and sentence correction.', true),
  S('Data Interpretation', 'data-interpretation', 'Career & Aptitude', 'DI assessment', ['di', 'aptitude'], ['Tables', 'Bar & Line Charts', 'Pie Charts', 'Caselets', 'Calculation Tricks'], 'Evaluate table, chart and caselet interpretation with quick calculations.'),
  S('Spoken English', 'spoken-english', 'Career & Aptitude', 'Spoken English assessment', ['english', 'communication'], ['Fluency & Pace', 'Pronunciation', 'Grammar in Speech', 'Everyday Phrases', 'Confidence & Listening'], 'Test spoken fluency, pronunciation, listening and everyday communication.'),
  S('Business Communication', 'business-communication', 'Career & Aptitude', 'Business comm assessment', ['communication', 'business'], ['Email & Writing', 'Meetings & Presentations', 'Etiquette', 'Report Writing', 'Persuasion'], 'Evaluate professional writing, meetings, presentations and etiquette.'),
  S('Interview Skills', 'interview-skills', 'Career & Aptitude', 'Interview prep assessment', ['interview', 'career'], ['Resume Basics', 'Common Questions', 'Behavioral Stories', 'Technical Rounds', 'HR Round & Offers'], 'Test resume basics, behavioral answers, technical and HR round readiness.', true),

  // ── Business & Marketing (6) ────────────────────────────────────────────────
  S('Digital Marketing', 'digital-marketing', 'Business & Marketing', 'Digital marketing assessment', ['marketing', 'digital'], ['Fundamentals', 'Paid Ads', 'Content & Email', 'Analytics', 'Strategy'], 'Test digital marketing fundamentals, ads, content, analytics and strategy.', true),
  S('SEO', 'seo', 'Business & Marketing', 'SEO assessment', ['seo', 'marketing'], ['Keyword Research', 'On-Page SEO', 'Technical SEO', 'Link Building', 'Analytics'], 'Evaluate keyword research, on-page, technical SEO and link building.'),
  S('Social Media Marketing', 'social-media-marketing', 'Business & Marketing', 'SMM assessment', ['social', 'marketing'], ['Platform Strategy', 'Content & Creatives', 'Community', 'Ads & Targeting', 'Metrics'], 'Test social strategy, content, community management and paid targeting.'),
  S('Financial Accounting', 'financial-accounting', 'Business & Marketing', 'Accounting assessment', ['accounting', 'finance'], ['Accounting Basics', 'Journal & Ledger', 'Trial Balance', 'Final Accounts', 'Ratios'], 'Evaluate accounting fundamentals, journals, ledgers, final accounts and ratios.'),
  S('Project Management', 'project-management', 'Business & Marketing', 'PM assessment', ['pmp', 'management'], ['Project Lifecycle', 'Planning & Scheduling', 'Agile & Scrum', 'Risk & Quality', 'Stakeholders'], 'Test project lifecycle, scheduling, Agile, risk and stakeholder management.'),
  S('MS Office', 'ms-office', 'Business & Marketing', 'MS Office assessment', ['office', 'msword'], ['Word', 'Excel', 'PowerPoint', 'Formatting', 'Shortcuts & Tools'], 'Evaluate Word, Excel and PowerPoint core skills and productivity tools.'),
];
