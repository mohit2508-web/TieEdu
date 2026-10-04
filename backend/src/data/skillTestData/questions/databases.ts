import type { QuestionBank } from '../types';

// 8 database skills × 10 questions each.
export const BANK: QuestionBank = {
  // ── sql ────────────────────────────────────────────────────────────────────
  sql: [
    ['SELECT & Filters', 'beginner', 'single_choice', 'Which clause filters rows in a SELECT?', ['WHERE', 'ORDER BY', 'GROUP BY', 'HAVING'], [0], 'WHERE filters rows before grouping; HAVING filters groups after.'],
    ['SELECT & Filters', 'beginner', 'single_choice', 'What does SELECT * FROM t return?', ['Only primary key columns', 'All columns of table t', 'First row only', 'Table structure only'], [1], '* selects every column.'],
    ['SELECT & Filters', 'beginner', 'single_choice', 'Which clause sorts the result set?', ['SORT', 'ORDER BY', 'ARRANGE', 'INDEX'], [1], 'ORDER BY col ASC|DESC sorts rows.'],
    ['JOINs', 'intermediate', 'single_choice', 'A INNER JOIN returns:', ['All rows from both tables', 'Only rows with matches in both tables', 'All left rows', 'No rows'], [1], 'Inner join keeps matching pairs only.'],
    ['JOINs', 'intermediate', 'single_choice', 'A LEFT JOIN returns:', ['Only matched rows', 'All left-table rows plus matches (NULL if none)', 'All right rows', 'Cartesian product'], [1], 'Unmatched right columns become NULL.'],
    ['JOINs', 'advanced', 'single_choice', 'A self join is:', ['Joining a table with itself', 'Joining two tables twice', 'Joining a table to NULL', 'Illegal'], [0], 'Useful for hierarchical data like employee–manager in one table.'],
    ['GROUP BY & Aggregation', 'intermediate', 'single_choice', 'Which clause filters groups after aggregation?', ['WHERE', 'HAVING', 'ORDER BY', 'DISTINCT'], [1], 'HAVING applies conditions to grouped results (e.g. COUNT(*) > 5).'],
    ['GROUP BY & Aggregation', 'intermediate', 'single_choice', 'What does COUNT(DISTINCT col) count?', ['All rows', 'Number of unique non-null values in col', 'Null values', 'Table rows in disk'], [1], 'Distinct removes duplicates before counting.'],
    ['Subqueries', 'advanced', 'single_choice', 'A correlated subquery:', ['Runs once independently', 'References columns from the outer query and executes per row', 'Cannot be nested', 'Must return one row'], [1], 'It re-evaluates for each outer row (can be slower).'],
    ['Indexes', 'intermediate', 'single_choice', 'An index primarily improves:', ['INSERT always', 'Retrieval speed on indexed columns', 'JOIN-free queries only', 'Storage size'], [1], 'Reads get faster; writes pay a small maintenance cost.'],
  ],

  // ── mysql ──────────────────────────────────────────────────────────────────
  mysql: [
    ['Syntax & Types', 'beginner', 'single_choice', 'Which type stores variable-length strings up to 65,535 bytes?', ['CHAR', 'VARCHAR', 'TEXT only', 'BLOB'], [1], 'VARCHAR(n) stores up to n characters with a length prefix.'],
    ['Syntax & Types', 'beginner', 'single_choice', 'Which keyword sets an auto-incrementing primary key?', ['AUTO_INCREMENT', 'IDENTITY', 'SERIAL', 'SEQUENCE'], [0], 'AUTO_INCREMENT is MySQL-specific (SERIAL is MySQL shorthand too but AUTO_INCREMENT is standard).'],
    ['JOINs', 'intermediate', 'single_choice', 'What does the following return? SELECT * FROM a JOIN b ON a.id = b.a_id;', ['Cartesian product', 'Rows matching on the condition', 'Only a rows', 'Nothing'], [1], 'JOIN ... ON filters the combination by the predicate.'],
    ['JOINs', 'intermediate', 'single_choice', 'LEFT JOIN differs from INNER JOIN by:', ['Including all rows from the left table', 'Being faster always', 'Requiring an index', 'Sorting results'], [0], 'Non-matching left rows are kept with NULLs on the right.'],
    ['Indexes', 'intermediate', 'single_choice', 'A composite index (a, b, c) can efficiently serve:', ['Only queries filtering on c', 'Queries on a; a+b; a+b+c (leftmost prefix)', 'Only exact full match', 'Any column order'], [1], 'B-tree indexes follow the leftmost-prefix rule.'],
    ['Indexes', 'advanced', 'single_choice', 'Which index type suits full-text search in MySQL?', ['FULLTEXT index', 'Primary index', 'Spatial only', 'Hash on id'], [0], "FULLTEXT supports MATCH ... AGAINST queries."],
    ['Stored Procedures', 'intermediate', 'single_choice', 'Stored procedures help by:', ['Storing procedures as files', 'Executing stored logic on the server (less network round-trips)', 'Replacing indexes', 'Encrypting data'], [1], 'Server-side logic reduces client code and network chatter.'],
    ['Stored Procedures', 'advanced', 'single_choice', 'What is a SQL injection risk inside procedures?', ['None ever', 'Dynamic SQL with concatenated input', 'Only in SELECT', 'Only with InnoDB'], [1], 'Concatenating user input into dynamic SQL is still injectable — use parameters.'],
    ['Administration', 'intermediate', 'single_choice', 'Which engine is MySQL’s default transactional storage engine?', ['MyISAM', 'InnoDB', 'Memory', 'CSV'], [1], 'InnoDB supports transactions, FKs and row-level locking.'],
    ['Administration', 'beginner', 'single_choice', 'Which command backs up a MySQL database?', ['mysqlbackup only', 'mysqldump', 'dump.sql', 'mysqlcopy'], [1], 'mysqldump produces SQL statements to recreate the data.'],
  ],

  // ── postgresql ─────────────────────────────────────────────────────────────
  postgresql: [
    ['SQL Basics', 'beginner', 'single_choice', 'PostgreSQL is:', ['A NoSQL document store', 'An open-source object-relational database', 'An in-memory cache only', 'A file system'], [1], 'Postgres is an ACID, extensible RDBMS.'],
    ['SQL Basics', 'intermediate', 'single_choice', 'What does ::type do in Postgres?', ['Casts a value to the given type', 'Creates a table', 'Comments the line', 'Escapes strings'], [0], "SELECT '42'::int casts text to integer."],
    ['Advanced Queries', 'intermediate', 'single_choice', 'Which keyword combines results of two SELECTs (by default removing duplicates)?', ['UNION', 'JOIN', 'INTERSECT ALL', 'MERGE'], [0], 'UNION deduplicates; UNION ALL keeps duplicates.'],
    ['Advanced Queries', 'advanced', 'single_choice', 'DISTINCT ON (expr) in Postgres keeps:', ['All distinct rows', 'The first row per distinct value of expr (per ORDER BY)', 'Only NULL rows', 'Random rows'], [1], 'Postgres-specific: unique rows per expression with chosen ordering.'],
    ['Indexing', 'intermediate', 'multiple_choice', 'Which index types does PostgreSQL support?', ['B-tree', 'Hash', 'GIN / GiST', 'Stack index'], [0, 1, 2], 'Postgres supports B-tree, Hash, GiST, GIN, BRIN and more.'],
    ['Indexing', 'advanced', 'single_choice', 'A partial index is:', ['An index on some columns only', 'An index restricted to a WHERE-subset of rows', 'A temporarily disabled index', 'A reverse index'], [1], 'Smaller index for hot subsets: CREATE INDEX ... WHERE condition.'],
    ['JSON & Arrays', 'intermediate', 'single_choice', 'Which operator extracts a JSON field in Postgres?', ["-> and ->>", 'dot only', '::json', 'GET json'], [0], "-> returns json, ->> returns text, e.g. data->>'name'."],
    ['JSON & Arrays', 'advanced', 'single_choice', 'GIN index is especially good for:', ['Serial numbers', 'JSONB containment / array membership queries', 'Single row lookup by id', 'Timestamps'], [1], 'GIN accelerates @>, ? operators on jsonb/arrays.'],
    ['Administration', 'intermediate', 'single_choice', 'Which command creates a database in psql?', ['CREATE DATABASE name;', 'new db name', 'db:create name', 'ADD DATABASE name'], [0], 'CREATE DATABASE name; (not inside a transaction).'],
    ['Administration', 'advanced', 'single_choice', 'MVCC in Postgres means:', ['Multi-version concurrency control — readers do not block writers', 'Two databases merged', 'Manual locks always', 'Single version only'], [0], 'Old row versions stay visible to long-running readers.'],
  ],

  // ── mongodb ────────────────────────────────────────────────────────────────
  mongodb: [
    ['CRUD Operations', 'beginner', 'single_choice', 'What is the basic unit of data in MongoDB?', ['Row', 'Document (BSON)', 'Cell', 'Record group'], [1], 'Documents (JSON-like BSON) live in collections.'],
    ['CRUD Operations', 'beginner', 'single_choice', 'Which command inserts one document?', ['insertOne', 'put', 'addRow', 'createDoc'], [0], 'collection.insertOne({...}) adds a single document.'],
    ['CRUD Operations', 'intermediate', 'single_choice', 'db.users.updateOne({age: {$gt: 30}}, {$set: {vip: true}}) does what?', ['Deletes users > 30', 'Updates the first matching document setting vip: true', 'Inserts', 'Returns all users'], [1], 'updateOne affects at most one matching document.'],
    ['Queries & Indexes', 'intermediate', 'single_choice', 'Which query matches embedded field "address.city"?', ['{"address.city": "Paris"}', '{"address": "city"}', 'address->city', '{"city": 1}'], [0], 'Dotted paths navigate nested documents.'],
    ['Queries & Indexes', 'intermediate', 'single_choice', 'What does createIndex({email: 1}) build?', ['Ascending index on email', 'Descending table', 'Text search only', 'Unique constraint automatically'], [0], '1 = ascending, -1 = descending; uniqueness needs {unique: true}.'],
    ['Aggregation', 'intermediate', 'single_choice', 'The aggregation pipeline processes documents through:', ['A sequence of stages ($match, $group, ...)', 'SQL joins only', 'Random functions', 'Single filter'], [0], 'Stages transform documents progressively like a pipeline.'],
    ['Aggregation', 'advanced', 'single_choice', 'Which stage groups documents like GROUP BY?', ['$group', '$match', '$project', '$sort'], [0], '$group with _id defines the grouping key and accumulators.'],
    ['Schema Design', 'advanced', 'single_choice', 'Embedding related data in one document is preferred when:', ['Data is queried together and is document-sized', 'Data grows unbounded (arrays may exceed 16MB)', 'Always', 'Never'], [0], 'Reference when data is large/unbounded; embed when it is accessed as a unit.'],
    ['Replication', 'intermediate', 'single_choice', 'A MongoDB replica set provides:', ['Automatic failover and redundancy', 'Full-text search only', 'Caching only', 'Schema validation'], [0], 'A primary accepts writes; secondaries replicate and can take over.'],
    ['Replication', 'beginner', 'single_choice', 'Default MongoDB document _id field is:', ['Optional', 'A unique identifier (ObjectId)', 'Always an integer', 'The primary key name only'], [1], '_id is required and uniquely identifies each document.'],
  ],

  // ── redis ──────────────────────────────────────────────────────────────────
  redis: [
    ['Data Types', 'beginner', 'single_choice', 'Which Redis type stores an ordered set of unique strings with scores?', ['SET', 'ZSET (sorted set)', 'LIST', 'HASH'], [1], 'Sorted sets order members by score — great for leaderboards.'],
    ['Data Types', 'beginner', 'single_choice', 'Redis HASH is best for:', ['Storing object-like field/value pairs', 'Storing only numbers', 'Queues', 'Pub/sub only'], [0], 'HSET/HGET manage multiple fields per key.'],
    ['Data Types', 'intermediate', 'single_choice', 'LPUSH + RPOP implements which structure?', ['Queue (FIFO)', 'Stack (LIFO) only', 'Set', 'Bitmap'], [0], 'Push left, pop right → first-in first-out queue.'],
    ['Commands', 'beginner', 'single_choice', 'Which command sets a key with an expiry in seconds?', ['EXPIRE / SET key val EX seconds', 'SAVE', 'TTL', 'PERSIST'], [0], 'SET k v EX 300 sets TTL directly; EXPIRE sets it separately.'],
    ['Commands', 'intermediate', 'single_choice', 'What does INCR key do?', ['Decrements', 'Atomically increments by 1', 'Resets to 0', 'Converts to string'], [1], 'INCR is atomic — safe for counters under concurrency.'],
    ['Commands', 'intermediate', 'single_choice', 'Which command pattern prevents cache stampede best?', ['SETNX with TTL (or locking) on rebuild', 'Delete everything', 'Use only GET', 'Disable expiry'], [0], 'Only one process builds the value while others wait/retry.'],
    ['Expiry & Persistence', 'intermediate', 'single_choice', 'Redis persistence options include:', ['RDB snapshots and AOF logs', 'Only JPEG export', 'SQL dumps', 'No persistence ever'], [0], 'RDB = point-in-time snapshots; AOF = append-only command log.'],
    ['Expiry & Persistence', 'beginner', 'true_false', 'Expired Redis keys are removed automatically.', ['True', 'False'], [0], 'Keys expire lazily on access and actively via background sweeps.'],
    ['Pub/Sub', 'intermediate', 'single_choice', 'Redis Pub/Sub is used for:', ['Publishing books', 'Message broadcasting to subscribers', 'Persistent job queues with acks (Streams do this)', 'Compression'], [1], 'Classic pub/sub is fire-and-forget; use Streams for durable queues.'],
    ['Lua Scripting', 'advanced', 'single_choice', 'Why use Redis Lua scripts?', ['To run atomic multi-command logic server-side', 'To store Lua files', 'To replace persistence', 'To add SQL'], [0], 'Scripts execute atomically — no interleaving between commands.'],
  ],

  // ── oracle ─────────────────────────────────────────────────────────────────
  oracle: [
    ['SQL Basics', 'beginner', 'single_choice', 'In Oracle, ROWNUM is used to:', ['Limit returned rows', 'Sort rows', 'Create tables', 'Count indexes'], [0], 'SELECT * FROM t WHERE ROWNUM <= 10 limits output (use FETCH FIRST in 12c+).'],
    ['SQL Basics', 'intermediate', 'single_choice', 'Which clause is mandatory in a DELETE statement?', ['FROM', 'WHERE (to avoid deleting all rows accidentally)', 'GROUP BY', 'ORDER BY'], [1], 'DELETE FROM t deletes everything — add WHERE to scope it.'],
    ['PL/SQL', 'intermediate', 'single_choice', 'PL/SQL blocks end with:', ['END;', 'STOP', 'FINISH', 'CLOSE'], [0], 'DECLARE … BEGIN … EXCEPTION … END;'],
    ['PL/SQL', 'intermediate', 'single_choice', 'What does a cursor do in PL/SQL?', ['Compiles SQL', 'Iterates result rows of a query', 'Deletes tables', 'Backs up data'], [1], 'Explicit cursors: OPEN → FETCH loop → CLOSE.'],
    ['PL/SQL', 'advanced', 'single_choice', 'WHEN OTHERS exception handler catches:', ['Only ORA errors you listed', 'All unhandled exceptions', 'Warnings only', 'Nothing'], [1], 'Use it as a catch-all (re-raise after logging).'],
    ['Joins & Subqueries', 'intermediate', 'single_choice', 'Which Oracle syntax joins tables in the WHERE clause (old style)?', ['Comma join with equality in WHERE', 'LATERAL only', 'NATURAL always', 'USING-only'], [0], 'Old-style: FROM a, b WHERE a.id = b.id (ANSI JOIN preferred).'],
    ['Joins & Subqueries', 'advanced', 'single_choice', 'What does MERGE do?', ['Merges tables physically', 'Inserts or updates based on a match (upsert)', 'Only deletes', 'Only selects'], [1], 'MERGE INTO ... USING ... WHEN MATCHED THEN UPDATE / NOT MATCHED THEN INSERT.'],
    ['Indexes', 'intermediate', 'single_choice', 'A bitmap index suits:', ['High-cardinality OLTP columns', 'Low-cardinality columns in data warehouses', 'Primary keys always', 'Unindexed columns'], [1], 'Bitmaps are compact for few distinct values with many rows.'],
    ['Backup & Recovery', 'advanced', 'single_choice', 'Oracle’s REDO log primarily enables:', ['Logins', 'Recovery of committed transactions (write-ahead logging)', 'Index building', 'User audits only'], [1], 'Redo records changes so recovery can replay them.'],
    ['Backup & Recovery', 'intermediate', 'single_choice', 'What does ARCHIVELOG mode enable?', ['No backups ever', 'Point-in-time recovery by retaining all redo', 'Faster inserts only', 'Disabling indexes'], [1], 'Archived redo allows restoring to any point before corruption.'],
  ],

  // ── nosql ──────────────────────────────────────────────────────────────────
  nosql: [
    ['Key-Value Stores', 'beginner', 'single_choice', 'Key-value stores are optimized for:', ['Complex joins', 'Simple lookups by key', 'Ad-hoc SQL analytics', 'Graph traversal'], [1], 'O(1)-style GET/SET access — e.g. Redis/DynamoDB.'],
    ['Key-Value Stores', 'beginner', 'single_choice', 'Which is a key-value database?', ['Redis', 'PostgreSQL', 'Neo4j', 'Snowflake'], [0], 'Redis maps keys to values; Neo4j is a graph DB; Postgres is relational.'],
    ['Document Stores', 'beginner', 'single_choice', 'Document stores typically store:', ['Rows in fixed tables', 'JSON/BSON documents in collections', 'Nodes and edges only', 'Column families only'], [1], 'MongoDB/Couchbase store flexible JSON-like documents.'],
    ['Document Stores', 'intermediate', 'single_choice', 'Schema flexibility in document DBs means:', ['No data types at all', 'Each document can differ; structure evolves without ALTER TABLE', 'Indexes are optional forever', 'No queries'], [1], 'Fields can be added per document as requirements change.'],
    ['Column Families', 'intermediate', 'single_choice', 'Wide-column stores (Cassandra/HBase) organize data as:', ['Rows of a single table', 'Rows keyed by partition with dynamic columns', 'Documents', 'Files'], [1], 'Column families group columns per row key — tuned for writes.'],
    ['Graph Databases', 'intermediate', 'single_choice', 'Graph databases excel at:', ['Aggregating sums', 'Traversal of relationships (friends, recommendations)', 'Storing blobs', 'Caching'], [1], 'Neo4j follows edges cheaply where SQL joins get expensive.'],
    ['Graph Databases', 'beginner', 'single_choice', 'In a property graph, nodes and edges can have:', ['No properties', 'Key-value properties', 'Only IDs', 'SQL types only'], [1], 'Both entities and relationships carry properties/labels.'],
    ['CAP Theorem', 'intermediate', 'single_choice', 'During a network partition, a CP system chooses:', ['Availability over consistency', 'Consistency over availability', 'Neither', 'Partitioning only'], [1], 'CP systems reject/redirect requests rather than serve stale data.'],
    ['CAP Theorem', 'intermediate', 'single_choice', 'An AP system under partition:', ['Rejects writes always', 'Continues serving, possibly stale reads', 'Shuts down', 'Becomes SQL'], [1], 'Availability with eventual consistency (e.g. Dynamo-style).'],
    ['Consistency Models', 'advanced', 'single_choice', 'Eventual consistency implies:', ['Instant agreement', 'Replicas converge if no new writes occur', 'No replication', 'Strong ordering'], [1], 'Convergence is guaranteed over time, not immediately.'],
  ],

  // ── mssql ──────────────────────────────────────────────────────────────────
  mssql: [
    ['T-SQL Basics', 'beginner', 'single_choice', 'Which language extension does SQL Server use?', ['T-SQL', 'PL/pgSQL', 'PL/SQL', 'MySQL SQL'], [0], 'Transact-SQL adds variables, TRY/CATCH and more.'],
    ['T-SQL Basics', 'beginner', 'single_choice', 'How do you declare a variable in T-SQL?', ['DECLARE @x INT', 'let x: int', 'SET VAR x', 'CREATE @x'], [0], 'DECLARE @x INT = 0;'],
    ['Joins & Subqueries', 'intermediate', 'single_choice', 'TOP 10 in a SELECT does what?', ['Updates 10 rows', 'Returns at most 10 rows', 'Tops up a table', 'Sorts 10 columns'], [1], 'SELECT TOP (10) ... limits output rows.'],
    ['Joins & Subqueries', 'intermediate', 'single_choice', 'What is the difference between DELETE and TRUNCATE?', ['No difference', 'TRUNCATE removes all rows with minimal logging and cannot have a WHERE', 'DELETE is faster always', 'TRUNCATE logs every row'], [1], 'DELETE can be row-targeted with WHERE; TRUNCATE clears the whole table.'],
    ['Indexes', 'intermediate', 'single_choice', 'A clustered index in SQL Server:', ['Is optional and non-unique', 'Defines the physical/logical order of table data — one per table', 'Exists many per table', 'Only covers text'], [1], 'Data rows live in leaf pages of the clustered index.'],
    ['Indexes', 'advanced', 'single_choice', 'A covering index lets a query:', ['Skip locks', 'Satisfy all columns from the index without table lookups', 'Avoid transactions', 'Run on the client'], [1], 'Include non-key columns (INCLUDE) to avoid key lookups.'],
    ['Stored Procedures', 'beginner', 'single_choice', 'Which statement creates a stored procedure?', ['CREATE PROCEDURE', 'BUILD PROC', 'MAKE PROCEDURE', 'PROC NEW'], [0], 'CREATE PROCEDURE name AS BEGIN ... END.'],
    ['Stored Procedures', 'intermediate', 'single_choice', 'What does sp_executesql provide?', ['Dynamic SQL execution with parameters (safe from injection)', 'Backup', 'Login', 'Index rebuild'], [0], 'Parameterized dynamic SQL avoids string concatenation risks.'],
    ['Administration', 'intermediate', 'single_choice', 'What is a transaction log used for?', ['UI logging', 'Recording transactions for recovery and point-in-time restore', 'Caching plans only', 'Emails'], [1], 'The log captures changes so backups can replay/restore them.'],
    ['Administration', 'beginner', 'single_choice', 'Which isolation level prevents dirty reads and allows non-repeatable reads?', ['READ UNCOMMITTED', 'READ COMMITTED', 'SERIALIZABLE', 'SNAPSHOT'], [1], 'READ COMMITTED blocks dirty reads; stronger levels block more anomalies.'],
  ],
};
