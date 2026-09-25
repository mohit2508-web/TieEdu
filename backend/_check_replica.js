const { Pool } = require('pg');
const p = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000,
});
(async () => {
  const r = await p.query(
    `SELECT id,
            jsonb_array_length(doc->'users')    AS users,
            jsonb_array_length(doc->'orders')   AS orders,
            jsonb_array_length(doc->'companies') AS companies,
            jsonb_array_length(doc->'audit')     AS audit,
            pg_column_size(doc)                  AS doc_bytes,
            updated_at
       FROM app_state WHERE id = 'main'`
  );
  console.log(JSON.stringify(r.rows, null, 2));
  await p.end();
})().catch((e) => { console.log('FAIL', e.message); process.exit(1); });