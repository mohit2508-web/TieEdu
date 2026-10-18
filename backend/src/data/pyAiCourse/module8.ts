// Module 8 — Files & Real Data Workflows
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M8, COURSE_ID } from './helpers';

export const module8: CourseModule = {
  id: M8,
  course_id: COURSE_ID,
  title: 'Module 8 — Files & Real Data Workflows',
  summary:
    'Reading and writing CSV and JSON safely with encoding and context managers, fetching JSON APIs with requests (params, headers, errors, rate-limit courtesy), building a repeatable cleaning pipeline as functions, and saving results so an analysis survives the session it was made in.',
  sort_order: 8,
  lessons: [
    lesson(
      M8,
      'pyai-8-1',
      1,
      'CSV & JSON: Reading and Writing Data Safely',
      'Context managers, UTF-8, the json module, pandas round-trips with to_csv(index=False), and pathlib for paths that survive other people\'s machines.',
      18,
      nineBlocks({
        objectives: [
          'Read and write text files with open(), a with block and an explicit encoding',
          'Parse and write nested data with json.load and json.dump',
          'Round-trip a DataFrame through CSV with to_csv(index=False) and verify it',
          'Use pathlib.Path for paths that work across operating systems',
        ],
        hook:
          'An analysis that lives only in notebook memory dies with the kernel. Everything you produce must come from a file and go back to a file — and the two formats that carry almost all of it are CSV (flat tables) and JSON (nested structures). Reading them wrong (encoding, indexes, closed files) is the most common bug in every data pipeline on Earth.',
        concept: `**Files the safe way: with, encoding, pathlib.** Three habits, one block:
\`\`\`
from pathlib import Path

path = Path("data") / "notes.txt"
path.parent.mkdir(exist_ok=True)
with path.open("w", encoding="utf-8") as f:
    f.write("Pune x Kochi = good data")
\`\`\`
The \`with\` block closes the file even if an exception fires mid-write — no leaked handles, no half-flushed buffers. \`encoding="utf-8"\` is the default that should never be a guess: the same file opened as cp1252 on a Windows box turns every non-ASCII character into mojibake, silently. pathlib builds paths with \`/\` operators that work on Windows, macOS and Linux — no string concatenation, no hardcoded backslashes.

**CSV: simple on purpose.** Comma-separated values store no types, no formats and no formulas — which is exactly why every tool on Earth can read them. pandas is the right reader/writer for analysis:
\`\`\`
df.to_csv("out.csv", index=False)      # NEVER ship the index column by accident
df2 = pd.read_csv("out.csv")
\`\`\`
The golden rules: write with \`index=False\` (otherwise the 0..n-1 index comes back as a garbage "Unnamed: 0" column on the next load), and after a round-trip, verify with \`df.equals(df2)\` or at least dtypes and shape — CSV has no types, so an int column with one missing value comes back as float.

**JSON: structured, nested, typed-ish.** JSON stores dicts, lists, strings, numbers, booleans and null — the shape of API responses and config files. The standard library module handles the conversion:
\`\`\`
import json
payload = {"city": "Pune", "scores": [85, 92], "active": True}
with open("cfg.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=2, ensure_ascii=False)
with open("cfg.json", "r", encoding="utf-8") as f:
    back = json.load(f)
\`\`\`
\`indent=2\` makes the file reviewable in a diff; \`ensure_ascii=False\` keeps real Unicode characters instead of escaping them. One hard limit to remember: the string NaN is not valid JSON — json.dump on a float NaN raises ValueError unless you use allow_nan defaults knowingly, which is another reason pipelines store missing values as null on the JSON side.`,
        extras: [
          table(
            'CSV vs JSON — when each wins',
            ['Property', 'CSV', 'JSON'],
            [
              ['Shape', 'Rectangular tables', 'Nested dicts and lists'],
              ['Types stored', 'None — inferred on load', 'Strings, numbers, bools, null'],
              ['Best for', 'Rows of observations', 'API responses, configs, records with structure'],
              ['Human-diffable', 'With care', 'Yes, with indent='],
            ],
          ),
          code(
            'import json\nimport pandas as pd\nfrom pathlib import Path\n\nout = Path("output")\nout.mkdir(exist_ok=True)\n\ndf = pd.DataFrame({"city": ["Delhi", "Pune"], "revenue": [120, 90]})\ndf.to_csv(out / "sales.csv", index=False)\n\nwith (out / "sales.csv").open("r", encoding="utf-8") as f:\n    print(f.read())\n\nwith (out / "meta.json").open("w", encoding="utf-8") as f:\n    json.dump({"rows": len(df), "source": "manual"}, f, indent=2)',
            'safe_io.py',
            'python',
          ),
          warn(
            'open() without encoding is a time bomb',
            'On Windows the default is often cp1252; on Linux utf-8. The same notebook "works at home, breaks at work" until every open() carries encoding="utf-8".',
          ),
        ],
        worked: {
          title: 'Round-trip a table and a config through both formats',
          problem:
            'Write a two-row sales DataFrame to CSV (index=False), read it back and verify equality. Then write a nested records list to JSON with indent=2, read it back, and rebuild a DataFrame from the records to prove the structure survived.',
          steps: [
            {
              title: '1. CSV round-trip with verification',
              desc: 'to_csv with index=False writes only real columns; read_csv restores the table; equals() settles the round-trip question with one boolean.',
              code_snippet: 'import pandas as pd\n\ndf = pd.DataFrame({"city": ["Delhi", "Pune"], "revenue": [120, 90]})\ndf.to_csv("sales.csv", index=False)\ndf2 = pd.read_csv("sales.csv")\nprint(df.equals(df2))   # True',
            },
            {
              title: '2. Write nested records as JSON',
              desc: 'A list of row-dicts is the natural JSON shape for tabular data and the shape every API returns. indent=2 keeps the file reviewable.',
              code_snippet: 'import json\n\nrecords = [\n    {"city": "Delhi", "revenue": 120},\n    {"city": "Pune", "revenue": 90},\n]\nwith open("records.json", "w", encoding="utf-8") as f:\n    json.dump(records, f, indent=2, ensure_ascii=False)',
            },
            {
              title: '3. Read JSON back into Python, then into pandas',
              desc: 'json.load returns plain lists and dicts; pd.DataFrame consumes that list directly — the universal bridge between JSON APIs and analysis.',
              code_snippet: 'with open("records.json", "r", encoding="utf-8") as f:\n    back = json.load(f)\n\ndf3 = pd.DataFrame(back)\nprint(df3.shape)   # (2, 2)',
            },
            {
              title: '4. Note what CSV lost that JSON kept',
              desc: 'JSON kept booleans as booleans and nested dicts nested; CSV flattens everything to text and re-infers. Choose CSV for pure tables, JSON when structure matters.',
              code_snippet: 'print(pd.read_json("records.json").dtypes.tolist())   # [object, int64]',
            },
          ],
          solution:
            'CSV round-trip verified with equals() after writing index=False; JSON preserved the nested record structure through dump/load with readable indentation; and DataFrame(list_of_dicts) rebuilt the table from the JSON side. The formats are not interchangeable views of one truth — CSV flattens and forgets types, JSON keeps structure — so the pipeline picks per artifact.',
        },
        practice: {
          title: 'Own the round-trip',
          prompt:
            '(1) Create a DataFrame with a datetime column and a missing value; write it to CSV with index=False and date_format="%Y-%m-%d"; read it back with parse_dates=["date"] and compare dtypes. (2) Write the same frame to JSON with orient="records", indent=2 and inspect the file\'s first lines. (3) Use pathlib throughout: create an output/ directory with mkdir(exist_ok=True) and write both files inside it. (4) Deliberately write WITHOUT index=False once and observe the "Unnamed: 0" column on reload.',
          hint: 'orient="records" produces the list-of-row-dicts shape — the same shape pd.DataFrame accepts directly.',
        },
        mistakes: [
          {
            mistake: 'to_csv() without index=False, then a mystery column on reload',
            fix: 'The unnamed first column is the saved index. Make index=False a permanent habit for analysis exports (keep the index only when the index IS data, e.g. a time series you want back).',
          },
          {
            mistake: 'open() with no encoding and non-ASCII data',
            fix: 'Always encoding="utf-8" on both read and write. If a file was produced elsewhere, encoding="utf-8-sig" tolerates the BOM some Windows tools add.',
          },
          {
            mistake: 'Hand-concatenating paths with + or f-strings',
            fix: 'Path("data") / "sales.csv" composes correctly on every OS and exposes .open(), .exists(), .stem for free. String paths break on separators and quoting.',
          },
          {
            mistake: 'Assuming CSV round-trips are type-preserving',
            fix: 'CSV stores no types: int columns with NaN return as float, dates come back as text unless parse_dates is passed. Re-check dtypes after every load.',
          },
        ],
        exam: {
          question:
            'You wrote df.to_csv("out.csv") and on reload a column "Unnamed: 0" appeared. Explain why, give the fix, and state two things a JSON round-trip preserves that CSV does not.',
          answer:
            'to_csv defaults to index=True, so the DataFrame index was written as a leading column with no header meaning; on reload pandas saw an extra column of values with the placeholder header "Unnamed: 0". Fix: df.to_csv("out.csv", index=False) — or index=True deliberately when the index is genuine data you want restored with index_col=0 on load. JSON round-trips preserve (1) types — booleans stay booleans, numbers stay numbers — and (2) nesting — dicts inside dicts/lists keep their structure; CSV flattens to text and infers types on every load, losing both.',
          source: 'The single most common practical pandas file question in interviews and lab exams.',
        },
        summary: [
          'open files with a with block and encoding="utf-8" — closed handles and stable text, always.',
          'CSV: flat tables; write with to_csv(index=False); verify round-trips with equals/dtypes.',
          'JSON: nested structures; json.dump/load with indent=2, ensure_ascii=False; NaN is not valid JSON.',
          'pathlib.Path: compose paths with /, open with .open, mkdir(exist_ok=True).',
          'CSV forgets types and nesting — JSON keeps them; pick the format by what must survive.',
        ],
      }),
      [
        [
          'The main reason to write files inside a with block is:',
          [
            'It makes writes faster',
            'The file closes automatically even if an exception occurs',
            'It forces UTF-8',
            'It locks the file against other readers',
          ],
          1,
          'with guarantees close() on the way out — no leaked handles, no unclosed buffers after a crash.',
        ],
        [
          'df.to_csv("f.csv") then pd.read_csv("f.csv") shows an extra "Unnamed: 0" column because:',
          [
            'pandas adds a checksum column',
            'The index was written by default; fix with index=False',
            'The CSV dialect was wrong',
            'The file was saved twice',
          ],
          1,
          'index=True is the default — the saved index returns as a nameless column unless you suppress it.',
        ],
        [
          'Which pair correctly reads and writes a JSON file with the standard library?',
          [
            'json.read() / json.write()',
            'json.load(file) / json.dump(obj, file)',
            'json.parse() / json.stringify()',
            'json.loads() for files, json.dumps() for files',
          ],
          1,
          'load/dump work on file objects; loads/dumps work on strings — mixing them up is the classic confusion.',
        ],
        [
          'Passing encoding="utf-8" to open() matters because:',
          [
            'It compresses the file',
            'Default encoding differs across platforms, silently corrupting non-ASCII text',
            'It converts CSV to JSON',
            'It is required by the with statement',
          ],
          1,
          'Same file, different default encodings on Windows and Linux — explicit utf-8 ends the "works on my machine" bug.',
        ],
      ]
    ),
    lesson(
      M8,
      'pyai-8-2',
      2,
      'JSON APIs with requests: Params, Headers, Errors & Courtesy',
      'Making a robust GET request, parsing JSON into DataFrames, handling timeouts and HTTP errors, and being a polite API citizen with rate-limit courtesy.',
      19,
      nineBlocks({
        objectives: [
          'Send a GET request with query parameters and a descriptive User-Agent header',
          'Check responses with status codes and raise_for_status before parsing JSON',
          'Convert nested JSON results into a DataFrame',
          'Handle timeouts, HTTP errors and 429 rate limits with courtesy built in',
        ],
        hook:
          'Live weather, live prices, live sports scores — none of it is in any CSV you own. An API is a website for programs: you send an HTTP request, you get JSON back. Ten robust lines with requests separate the analyst who waits for exported files from the one who fetches the world.',
        concept: `**HTTP in one paragraph.** You send a request (method + URL + optional query parameters + optional headers) and receive a response (a status code, headers, and a body — usually JSON text). \`200\` means OK; \`404\` not found; \`401/403\` authentication/permission; \`429\` you are calling too fast; \`5xx\` their server broke, not you.

**The robust GET, every time.** requests is the standard client:
\`\`\`
import requests

r = requests.get(
    "https://api.example.com/posts",
    params={"userId": 1},                      # becomes ?userId=1
    headers={"User-Agent": "student-project/1.0 (contact: you@college)"},
    timeout=10,
)
r.raise_for_status()                           # raises HTTPError for 4xx/5xx
data = r.json()                                # parsed dict or list
\`\`\`
Four non-negotiables: **params** (never hand-build query strings — encoding escapes you), **headers** with a descriptive User-Agent (servers identify callers by it; anonymity is rude and sometimes blocked), **timeout** (without it a dead server hangs your kernel forever), and **raise_for_status()** before .json() — otherwise an HTML error page reaches json.loads and you debug the wrong error.

**Parsing into analysis shape.** API JSON is nested: a dict containing a list of row-dicts. The standard bridge: \`pd.DataFrame(data)\` for a top-level list, or \`pd.json_normalize(data["results"], max_level=1)\` to flatten one level of nesting into columns. Always \`print(list(data.keys()))\` or \`type(data)\` first — the shape is the API's contract, and you read it before you index into it.

**Errors and courtesy.** Wrap the call: \`requests.exceptions.Timeout\` and \`requests.exceptions.RequestException\` cover the failure families; retry small, fixed counts — not tight loops. The 429 contract: slow down, honour any Retry-After header, sleep and retry once or twice (time.sleep(3)). Courtesy rules that keep APIs free for everyone: send the User-Agent, cache responses to disk instead of refetching in a loop, don't hammer in for-loops without sleeps, and check the service's terms before bulk pulls. Keys never hard-code: put them in environment variables or a git-ignored file — a notebook with a pasted key is one screenshot away from someone else's bill.`,
        extras: [
          table(
            'Status codes you will actually meet',
            ['Code', 'Meaning', 'Your move'],
            [
              ['200', 'OK', 'Parse the body'],
              ['404', 'Wrong path/params', 'Check the URL — do not retry blindly'],
              ['401/403', 'Auth/permission', 'Fix credentials; never bypass'],
              ['429', 'Rate limited', 'Back off; honour Retry-After; sleep'],
              ['5xx', 'Server-side fault', 'Retry once or twice with delay; then stop'],
            ],
          ),
          code(
            'import requests\nimport pandas as pd\n\nr = requests.get(\n    "https://jsonplaceholder.typicode.com/posts",\n    params={"userId": 1},\n    headers={"User-Agent": "student-project/1.0"},\n    timeout=10,\n)\nr.raise_for_status()\nposts = r.json()\nprint(len(posts))                 # 10 posts for userId 1\n\ndf = pd.DataFrame(posts)\nprint(df[["id", "title"]].head())',
            'fetch_posts.py',
            'python',
          ),
          warn(
            'API keys are not content',
            'A committed key is a revoked key (and a bill). os.environ["API_KEY"] or a git-ignored .env file; never a pasted literal in a notebook you share.',
          ),
        ],
        worked: {
          title: 'Fetch live weather JSON and turn it into a DataFrame',
          problem:
            'Query the keyless Open-Meteo API for Pune current temperature and wind speed, with timeout and error handling. Parse the nested JSON, print the values, and flatten the current block into a one-row DataFrame.',
          steps: [
            {
              title: '1. Build the request with params',
              desc: 'params encodes the query string for us; the timeout guards the kernel. A descriptive User-Agent identifies the caller.',
              code_snippet: 'import requests\n\nr = requests.get(\n    "https://api.open-meteo.com/v1/forecast",\n    params={\n        "latitude": 18.52,\n        "longitude": 73.86,\n        "current": "temperature_2m,wind_speed_10m",\n        "timezone": "auto",\n    },\n    headers={"User-Agent": "student-project/1.0"},\n    timeout=10,\n)',
            },
            {
              title: '2. Check, then parse',
              desc: 'raise_for_status turns a 4xx/5xx into a clear HTTPError; only then does .json() run — on a body we know is JSON.',
              code_snippet: 'try:\n    r.raise_for_status()\nexcept requests.exceptions.HTTPError as err:\n    print("HTTP failed:", err)\n    raise\n\ndata = r.json()\nprint(data["current"]["temperature_2m"])   # e.g. 27.3',
            },
            {
              title: '3. Read the nested shape before indexing',
              desc: 'The body is a dict of blocks (current, current_units, latitude...). Printing keys first prevents KeyError from blind guessing.',
              code_snippet: 'print(sorted(data.keys()))\n# ["current", "current_units", "elevation", "latitude", ...]',
            },
            {
              title: '4. Flatten into a one-row table',
              desc: 'DataFrame on the "current" dict yields one row — the same tabular shape as a CSV load, ready for concat with historical pulls.',
              code_snippet: 'import pandas as pd\n\ndf = pd.DataFrame([data["current"]])\nprint(df)\n#    time  temperature_2m  wind_speed_10m\n# 0  ...             27.3           11.2',
            },
          ],
          solution:
            'A param-built GET with User-Agent and timeout; raise_for_status before parsing; keys inspected before indexing; the nested "current" block flattened into a one-row DataFrame with pandas. Five habits, zero hangs, zero mystery stack traces — the same skeleton every API fetch in your career will use.',
        },
        practice: {
          title: 'Fetch, fail, back off',
          prompt:
            'Using https://jsonplaceholder.typicode.com (a free dummy API): (1) fetch /todos?userId=1 with params and timeout; convert to a DataFrame and count completed items with a boolean mask; (2) fetch a bad path (/nonesuch) inside try/except requests.exceptions.HTTPError and print the status code from the response; (3) write a fetch_json(url, params) helper that always sets timeout=10, raises for status, retries ONCE after a 3-second sleep on failure, and returns the parsed JSON; (4) list two reasons your helper must never be called inside an unbounded for-loop.',
          hint: 'e.response.status_code carries the code even after raise_for_status throws.',
        },
        mistakes: [
          {
            mistake: 'No timeout on any request',
            fix: 'A hanging TCP connection freezes the notebook with no error. timeout=10 (or a (connect, read) tuple) is mandatory on every call you will ever write.',
          },
          {
            mistake: 'Calling r.json() before checking the status',
            fix: 'Error pages are HTML; json.loads raises a confusing JSONDecodeError that hides the real 404/500. raise_for_status() first — always.',
          },
          {
            mistake: 'Refetching in a tight loop because "the notebook re-ran"',
            fix: 'Cache responses to a local JSON file and load from disk on rerun. Free APIs still deserve it, and paid ones charge for it.',
          },
          {
            mistake: 'Pasting API keys into cells',
            fix: 'Keys in notebooks leak through screenshots, shares and git. Read from environment variables and keep a .env out of version control.',
          },
        ],
        exam: {
          question:
            'Write the checklist for a robust API fetch in Python: request construction, response validation, parsing, error handling and rate-limit courtesy.',
          answer:
            'Construction: requests.get(url, params={...}, headers={"User-Agent": "<descriptive caller id>"}, timeout=10) — params encodes the query safely, the User-Agent identifies you, the timeout prevents indefinite hangs. Validation: check r.status_code (or call r.raise_for_status()) BEFORE parsing, so an error page never reaches the JSON parser. Parsing: r.json() gives dict/list; inspect its shape (keys, types) and bridge to pandas with DataFrame(list) or json_normalize. Errors: catch requests.exceptions.Timeout and RequestException (HTTPError subclasses it after raise_for_status); retry small fixed counts with delays, never infinite loops. Courtesy: honour 429 by sleeping and honouring Retry-After before a bounded retry; cache responses to disk instead of refetching; keep request rates modest; never hard-code API keys — read them from the environment.',
          source: 'The "design a reliable API client" question in data-engineering interviews — and the exact rubric this course grades its own examples against.',
        },
        summary: [
          'API = HTTP request in, JSON body out; status codes are the contract.',
          'Non-negotiables: params, descriptive User-Agent, timeout, raise_for_status before .json().',
          'Inspect JSON shape before indexing; bridge to pandas with DataFrame or json_normalize.',
          'Handle Timeout and RequestException; bounded retries with sleeps, honour 429/Retry-After.',
          'Cache to disk, don\'t hammer loops, never paste keys — courtesy keeps APIs free.',
        ],
      }),
      [
        [
          'Why call r.raise_for_status() before r.json()?',
          [
            'It speeds up JSON parsing',
            'So a 4xx/5xx HTML error page never reaches the JSON parser and hides the real problem',
            'It is required by the requests library',
            'It decompresses the body',
          ],
          1,
          'Status checking first converts silent garbage-parse errors into a clear HTTPError naming the actual failure.',
        ],
        [
          'requests.get(url, params={"q": "data science"}) sends the query as:',
          [
            'A POST body',
            'The URL with ?q=data%20science — percent-encoded automatically',
            'A header',
            'A cookie',
          ],
          1,
          'params builds and escapes the query string for you — hand-concatenation forgets escaping and breaks on spaces and ampersands.',
        ],
        [
          'A well-behaved client handles HTTP 429 by:',
          [
            'Retrying instantly in a loop',
            'Sleeping, honouring Retry-After if present, and retrying a bounded number of times',
            'Switching URLs',
            'Raising and never retrying under any circumstances',
          ],
          1,
          '429 means slow down; a courtesy backoff keeps your access (and everyone\'s) working.',
        ],
        [
          'The safest way to include an API key in a script is:',
          [
            'A string literal in the source file',
            'Reading from an environment variable or git-ignored config',
            'A comment above the request',
            'The URL query string, committed to git',
          ],
          1,
          'Committed and screenshotted keys leak; environment variables keep secrets out of the code that travels.',
        ],
      ]
    ),
    lesson(
      M8,
      'pyai-8-3',
      3,
      'A Repeatable Cleaning Pipeline You Can Re-run',
      'Turning one-off cleaning clicks into a named, deterministic function: standardise columns, coerce types, strip strings, deduplicate, report every count.',
      19,
      nineBlocks({
        objectives: [
          'Standardise column names to snake_case with string methods',
          'Coerce dirty numerics with to_numeric(errors="coerce") and count the damage',
          'Strip and normalise string categories before they fragment groups',
          'Assemble the steps into a pure clean_sales(df) function with a report dict',
        ],
        hook:
          'You cleaned the CSV by hand last night — fixed 14 salaries, lower-cased three city names, dropped two duplicates. This morning the team sent a new export with the same problems plus four new ones. Cleaning that lives in notebook history is not cleaning; cleaning is a function you re-run.',
        concept: `**Why pipelines, not gestures.** A cleaning gesture is a cell you executed once and cannot explain. A cleaning pipeline is a **pure function**: same input frame, same output frame, every count visible. Purity matters because re-runs must be trustworthy — no dependence on which cells ran before, no mutation of the raw data you might need to re-audit.

**The step catalogue, in the order that catches the most damage:**
1. **Copy, never mutate raw.** \`df = raw.copy()\` — the raw file stays untouched on disk and in memory.
2. **Standardise column names.** \`df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")\` turns " Revenue ", "REVENUE" and "revenue (lakh)"-style variants into one snake_case vocabulary. (The last needs the extra .str.replace("(lakh)", "", regex=False) — strip units deliberately, not accidentally.)
3. **String hygiene.** \`df["city"] = df["city"].str.strip().str.title()\` — "delhi ", "DELHI" and "Delhi" collapse into one level, or your groupby reports three cities that are one city.
4. **Type coercion.** \`pd.to_numeric(df["revenue"], errors="coerce")\` converts what it can and turns what it cannot into NaN — then \`int((converted.isna() & old.notna()).sum())\` counts the casualties so nothing is lost silently.
5. **Missing values, stated.** Count with isna().sum(); fill or drop with the number in the log: "filled 3 ages with median 29; dropped 1 row missing revenue".
6. **Deduplicate.** \`df.drop_duplicates(subset=["order_id"], keep="first")\` — with the removed count printed.
7. **Reset and return.** \`df = df.reset_index(drop=True)\`; return (df, report).

**The shape of the function.** One function per source you trust (sales exports, survey dumps), parameterised only where behaviour genuinely varies (fill strategy), always returning a small report dict {step: count}. The report is the audit trail that makes the pipeline reviewable — and it is exactly what the capstone notebook of Lesson 10.4 will demand.`,
        extras: [
          code(
            'import pandas as pd\n\ndef clean_sales(raw: pd.DataFrame):\n    df = raw.copy()\n    report = {"rows_in": len(df)}\n\n    df.columns = (df.columns.str.strip().str.lower()\n                  .str.replace(" ", "_"))\n    df["city"] = df["city"].str.strip().str.title()\n\n    coerced = pd.to_numeric(df["revenue"], errors="coerce")\n    report["revenue_coerce_fail"] = int(\n        (coerced.isna() & df["revenue"].notna()).sum())\n    df["revenue"] = coerced\n\n    med = df["revenue"].median()\n    report["revenue_filled"] = int(df["revenue"].isna().sum())\n    df["revenue"] = df["revenue"].fillna(med)\n\n    before = len(df)\n    df = df.drop_duplicates(subset=["city"], keep="first")\n    report["dupes_removed"] = before - len(df)\n    report["rows_out"] = len(df)\n    return df.reset_index(drop=True), report',
            'pipeline.py',
            'python',
          ),
          tip(
            'Report counts like a dbt log',
            'rows_in, coercions, fills, drops — printed or returned per run. When tomorrow\'s export differs, the report shows WHERE it differed, not just that something did.',
          ),
          warn(
            'Pipelines are order-sensitive',
            'Strip strings before deduplicating (or "delhi" and "delhi " survive as two rows); coerce before filling (or you fill a string column). The order in the catalogue is the order that works.',
          ),
        ],
        worked: {
          title: 'Clean a deliberately dirty sales export',
          problem:
            'raw has columns [" City ", "Revenue", "Orders"] with values: Delhi/120/4, " delhi"/"1,300"/3, Pune/90/2, Kochi/None/2, plus a duplicate Delhi row. Write clean_sales(raw) that normalises city names, coerces revenue (comma-stripped first), fills the missing revenue with the median, removes duplicates by city and returns the cleaned frame with a report.',
          steps: [
            {
              title: '1. Build the dirty frame and copy it',
              desc: 'Reproduce the export exactly as it arrives, then work on a copy — the raw stays available for auditing every transformation against it.',
              code_snippet: 'import pandas as pd\n\nraw = pd.DataFrame({\n    " City ":  ["Delhi", " delhi", "Pune", "Kochi", "Delhi"],\n    "Revenue": ["120", "1,300", "90", None, "120"],\n    "Orders":  [4, 3, 2, 2, 4],\n})\ndf = raw.copy()',
            },
            {
              title: '2. Names, then strings, then numbers',
              desc: 'Column names are normalised first so every later line uses one vocabulary; city values collapse to title case; revenue loses its thousands separator before coercion.',
              code_snippet: 'df.columns = df.columns.str.strip().str.lower()\ndf["city"] = df["city"].str.strip().str.title()\ndf["revenue"] = pd.to_numeric(\n    df["revenue"].str.replace(",", "", regex=False),\n    errors="coerce",\n)',
            },
            {
              title: '3. Fill with the median, count the fill',
              desc: 'One NaN in revenue; the median of [120, 1300, 90, 120]... the median fill uses the column median. The count goes in the report — silent fills are how wrong numbers survive review.',
              code_snippet: 'report = {"revenue_filled": int(df["revenue"].isna().sum())}\nmed = df["revenue"].median()\ndf["revenue"] = df["revenue"].fillna(med)',
            },
            {
              title: '4. Deduplicate and report the delta',
              desc: 'After title-casing, the two Delhi rows are true duplicates by city; keep="first" retains the first. rows_in versus rows_out proves exactly what changed.',
              code_snippet: 'before = len(df)\ndf = df.drop_duplicates(subset=["city"], keep="first")\nreport["dupes_removed"] = before - len(df)\ndf = df.reset_index(drop=True)\nprint(report)   # {"revenue_filled": 1, "dupes_removed": 1}',
            },
          ],
          solution:
            'Five dirty features — padded header, case/whitespace-variant cities, comma-numbers, a missing revenue, a duplicate — were cleaned in the pipeline order: names, strings, numeric coercion, stated median fill, deduplication. The report dict carries the two counts that matter (1 fill, 1 dupe removed) and the cleaned frame comes back indexed 0..n-1. Re-run tomorrow\'s export through the same function and the report will name any new defect class.',
        },
        practice: {
          title: 'Pipeline for a second source',
          prompt:
            'Write clean_users(raw) for this frame: columns ["Name", " Age ", "City"] with rows: " asha "/"25"/"delhi"; "Ravi"/" "/\"Pune\"; "Meera"/None/"Kochi"; "Ravi"/"31"/"Pune ". Requirements: (1) normalise columns and string values; (2) age coerced with errors="coerce", with the number of whitespace-only ages counted as coercions; (3) missing ages filled with the median, count reported; (4) duplicates on name+city removed, count reported; (5) run it twice on the same raw input and assert the outputs are identical — prove purity.',
          hint: 'A whitespace-only age becomes NaN via to_numeric(errors="coerce") after .str.strip() — count isna() deltas before and after coercion.',
        },
        mistakes: [
          {
            mistake: 'Cleaning cells in place on the raw frame',
            fix: 'df = raw.copy() first, always. The raw is your audit trail; once mutated you can no longer prove what the original contained.',
          },
          {
            mistake: 'Deduplicating before stripping and normalising strings',
            fix: '"delhi" and "Delhi " are different rows until you normalise — dedup first and duplicates survive. Names and strings before drop_duplicates, every time.',
          },
          {
            mistake: 'to_numeric(errors="coerce") with no coercion count',
            fix: 'Coercion is lossy by design; the count of newly-NaN cells is the price tag. Without it, 40 typo\'d salaries vanish into the fill step unnoticed.',
          },
          {
            mistake: 'A pipeline whose output depends on cell execution order',
            fix: 'No reliance on globals, no in-place mutation, no randomness. Same input, same output — then re-running after a kernel restart is safe.',
          },
        ],
        exam: {
          question:
            'A raw sales export has padded headers, city names with mixed case and whitespace, comma-formatted revenue with one missing value, and duplicate rows. Lay out a cleaning pipeline in order, justifying the position of each step.',
          answer:
            '(1) Copy the raw frame — never mutate the source. (2) Standardise column names (strip, lower, spaces to underscores) so every later reference uses one vocabulary. (3) Clean string values — strip and title-case city — because category normalisation must precede deduplication ("delhi " vs "Delhi" are duplicates only after cleaning) and before any groupby. (4) Coerce revenue with to_numeric(errors="coerce") (after removing thousands separators), counting the newly-NaN cells so nothing disappears silently. (5) Handle missing values explicitly — fill with the stated median or drop with the reported row loss. (6) drop_duplicates on the business key with the removed count logged. (7) reset_index(drop=True) and return (clean_df, report). The order is forced by dependencies: strip before dedup, coerce before fill, count every lossy step — the report dict is what makes the pipeline auditable rather than merely executed.',
          source: "The 'design a data-cleaning function' question — the practical centre of analyst interviews and this course's capstone rubric.",
        },
        summary: [
          'Cleaning is a pure function: same input, same output, counts in a report dict.',
          'Order: copy → column names → string hygiene → type coercion → missing values → dedup → reset.',
          'to_numeric(errors="coerce") plus a coercion count turns silent data loss into a logged number.',
          'Strip before dedup — otherwise case and whitespace variants survive as separate rows.',
          'Never mutate the raw frame; the raw file and frame are the audit trail.',
        ],
      }),
      [
        [
          'Why does a cleaning pipeline start with df = raw.copy()?',
          [
            'It speeds up later steps',
            'To keep the raw data unmodified as an audit trail while you transform the copy',
            'pandas requires a copy before any assignment',
            'It converts dtypes to safe ones',
          ],
          1,
          'In-place mutation destroys the only evidence of what the source contained — copy first, always.',
        ],
        [
          'pd.to_numeric(s, errors="coerce") turns unparseable values into:',
          ['Exceptions', 'NaN', 'The string "error"', 'Zero'],
          1,
          'Coerce mode replaces failures with NaN so processing continues — which is why you must count the new NaNs.',
        ],
        [
          'Before drop_duplicates(subset=["city"]), you should first:',
          [
            'Sort the data',
            'Strip whitespace and normalise case on city — or variants survive as separate rows',
            'Fill NaNs',
            'Cast city to category dtype',
          ],
          1,
          'Deduplication compares values as they are; "delhi", "Delhi " and "DELHI" are three different values until cleaned.',
        ],
        [
          'A pipeline that reads a global variable set in an earlier cell is:',
          [
            'Idiomatic pandas',
            'Impure — re-running after a kernel restart may silently change results',
            'Faster than parameter passing',
            'Required for report dicts',
          ],
          1,
          'Hidden state breaks reproducibility; the whole point of a pipeline is that it runs correctly in any order, any day.',
        ],
      ]
    ),
    lesson(
      M8,
      'pyai-8-4',
      4,
      'Saving Results: Data, Figures & Reports That Survive the Session',
      'Exporting DataFrames and JSON summaries, saving figures with savefig, versioning outputs with pathlib, and the checklist that makes an analysis reproducible for someone else.',
      18,
      nineBlocks({
        objectives: [
          'Export cleaned DataFrames with to_csv(index=False) and to_json(orient="records")',
          'Save matplotlib figures at usable resolution before showing them',
          'Persist a metrics dictionary as JSON alongside the data it describes',
          'Organise outputs under an output/ directory with pathlib and stable filenames',
        ],
        hook:
          'The notebook ends with a beautiful chart and three printed metrics — and the kernel dies. Nothing exists: no file, no number, no chart. The final skill of real data work is unglamorous and non-negotiable: writing the results to disk so tomorrow\'s you, and the reviewer, can find them.',
        concept: `**Three artifacts, three savers.** Every finished analysis produces some mix of:
1. **Tabular data** — cleaned frames, summaries: \`df.to_csv(path, index=False)\` or \`df.to_json(path, orient="records", indent=2)\`. The records orientation writes the list-of-row-dicts shape every other tool ingests.
2. **Figures** — \`fig.savefig(path, dpi=150, bbox_inches="tight")\` BEFORE \`plt.show()\` (some backends clear the figure at show; scripts may never show at all). 100–150 dpi for screens, 300 for print; PNG for charts, SVG when someone will scale them.
3. **Small structured results** — the metrics of the day: \`json.dump({"mae": 45.2, "baseline_mae": 58.1}, f, indent=2)\`. A metrics JSON next to the data makes the headline numbers greppable and diffable forever.

**Dates and versioning.** Outputs accumulate. \`Path("output") / f"sales_clean_{date.today().isoformat()}.csv"\` stamps each run; keeping a stable \`sales_clean_latest.csv\` alongside (overwrite) gives downstream users one honest pointer. \`mkdir(parents=True, exist_ok=True)\` at the top of the script so a fresh clone runs without setup.

**What the export loses — know it.** CSV: no dtypes, no nesting, index suppressed by habit. JSON via pandas (orient="records"): dates become strings; NaN becomes null (good — NaN is invalid JSON). Floats: binary floating point does not round-trip bit-exact through decimal text for arbitrary precision — fine for analysis, not for money. If dtypes must survive exactly, re-apply parse_dates and coercion after load, or state the schema in a sidecar JSON.

**The reproducibility bundle.** The professional habit: one output/ directory per project containing cleaned data + metrics.json + figures + the report text. Anyone re-running your notebook (including the capstone grader, Lesson 10.4) checks that these files appear and match the numbers in the narrative. Save first, then narrate.`,
        extras: [
          code(
            'import json\nfrom pathlib import Path\nfrom datetime import date\nimport matplotlib.pyplot as plt\nimport pandas as pd\n\nout = Path("output")\nout.mkdir(exist_ok=True)\n\ndf = pd.DataFrame({"city": ["Delhi", "Pune"], "revenue": [120, 90]})\ndf.to_csv(out / "sales_clean.csv", index=False)\ndf.to_json(out / "sales_clean.json", orient="records", indent=2)\n\nmetrics = {"total_revenue": 210, "rows": 2, "generated": date.today().isoformat()}\nwith (out / "metrics.json").open("w", encoding="utf-8") as f:\n    json.dump(metrics, f, indent=2)\n\nfig, ax = plt.subplots(figsize=(6, 4))\nax.bar(df["city"], df["revenue"])\nfig.tight_layout()\nfig.savefig(out / "revenue_by_city.png", dpi=150, bbox_inches="tight")\nplt.show()',
            'save_results.py',
            'python',
          ),
          tip(
            'Savefig before show, every time',
            'In scripts show() may be a no-op and in some backends it finalises the figure. The PNG must exist before any display call runs.',
          ),
          warn(
            'metrics.json without its data is a rumour',
            'Always ship numbers with the file they came from and the date they were generated. A bare "accuracy: 91%" in a chat message is unauditable.',
          ),
        ],
        worked: {
          title: 'Write the full output bundle for a mini analysis',
          problem:
            'From the cleaned sales frame (Delhi 120, Pune 90, Kochi 75), produce: output/sales_clean.csv (index=False), output/metrics.json (total, top city, generated date), and output/revenue_by_city.png at 150 dpi — then reload the CSV and the JSON and verify the numbers match the in-memory originals.',
          steps: [
            {
              title: '1. Directory and tabular export',
              desc: 'mkdir(exist_ok=True) makes the script re-runnable from a clean checkout; index=False keeps the CSV free of phantom columns.',
              code_snippet: 'from pathlib import Path\nimport pandas as pd\n\nout = Path("output")\nout.mkdir(exist_ok=True)\n\ndf = pd.DataFrame({"city": ["Delhi", "Pune", "Kochi"],\n                   "revenue": [120, 90, 75]})\ndf.to_csv(out / "sales_clean.csv", index=False)',
            },
            {
              title: '2. Metrics as JSON, dated',
              desc: 'The headline numbers — total 285, top city Delhi — land in a greppable, diffable file stamped with the generation date.',
              code_snippet: 'import json\nfrom datetime import date\n\nmetrics = {\n    "total_revenue": int(df["revenue"].sum()),\n    "top_city": df.loc[df["revenue"].idxmax(), "city"],\n    "generated": date.today().isoformat(),\n}\nwith (out / "metrics.json").open("w", encoding="utf-8") as f:\n    json.dump(metrics, f, indent=2)',
            },
            {
              title: '3. Save the figure before showing it',
              desc: 'One bar chart of the same data; savefig with dpi=150 and tight bbox writes a screen-ready PNG that lives with its numbers.',
              code_snippet: 'import matplotlib.pyplot as plt\n\nfig, ax = plt.subplots(figsize=(6, 4))\nax.bar(df["city"], df["revenue"])\nax.set_ylabel("Revenue (lakh)")\nfig.tight_layout()\nfig.savefig(out / "revenue_by_city.png", dpi=150, bbox_inches="tight")\nplt.show()',
            },
            {
              title: '4. Verify the bundle round-trips',
              desc: 'Reload both files and compare against memory — the same discipline as Lesson 8.1\'s round-trip, now applied to the finished deliverable.',
              code_snippet: 'back = pd.read_csv(out / "sales_clean.csv")\nassert back["revenue"].sum() == 285\n\nwith (out / "metrics.json").open("r", encoding="utf-8") as f:\n    check = json.load(f)\nassert check["top_city"] == "Delhi"',
            },
          ],
          solution:
            'The output/ bundle is complete: sales_clean.csv (clean table), metrics.json (285 total, Delhi on top, stamped today), revenue_by_city.png (150 dpi, tight). Reload-and-assert closed the loop — the files on disk carry exactly the numbers in memory. This is the artifact shape the capstone notebook of Module 10 must produce.',
        },
        practice: {
          title: 'Bundle your own analysis',
          prompt:
            'Take any DataFrame you built in Modules 6–8 and produce a full output/: (1) cleaned CSV with index=False AND a JSON records export of the same frame; (2) metrics.json with at least three derived numbers and a generated date; (3) one figure saved at dpi=150; (4) a text report.txt written with a with block summarising shape and the metrics; (5) reload everything and run three asserts proving the bundle matches memory; (6) add a dated filename variant using today\'s ISO date and explain why both dated and latest copies exist.',
          hint: 'Path("output") / f"sales_{date.today().isoformat()}.csv" — f-strings compose the versioned name.',
        },
        mistakes: [
          {
            mistake: 'savefig after plt.show() in a script',
            fix: 'Save first, show second. Some backends finalise or clear the figure at show — the file comes out blank or missing.',
          },
          {
            mistake: 'Hardcoded absolute paths (C:/Users/you/...)',
            fix: 'Relative pathlib.Path("output") / "file.csv" runs on any machine from the project root — the difference between a portfolio others can run and a demo only you can repeat.',
          },
          {
            mistake: 'Metrics pasted into prose with no artifact',
            fix: 'Write metrics.json next to the data; the narrative can then cite a file a reviewer opens. Chat-pasted numbers cannot be audited.',
          },
          {
            mistake: 'Shipping float-heavy CSVs as if they were exact',
            fix: 'Decimal text round-trips are accurate to display precision, not bit-exact. Round explicitly (float_format or .round(3)) when the published precision is the contract.',
          },
        ],
        exam: {
          question:
            'You have finished an analysis in a notebook. List the artifacts you save to disk, the function used for each, and the settings that matter.',
          answer:
            '(1) The cleaned/derived table: df.to_csv(path, index=False) — index suppressed to avoid "Unnamed: 0" on reload; or to_json(orient="records", indent=2) when structure or inter-tool ingestion matters. (2) Figures: fig.savefig(path, dpi=150, bbox_inches="tight") called BEFORE plt.show(), at a resolution matching the medium (screen vs print). (3) Headline metrics: json.dump(dict, f, indent=2) into metrics.json with a generated date, so numbers are greppable and diffable. (4) Optional: a text report written via with open(...). All under a project-relative output/ directory created with mkdir(exist_ok=True), optionally versioned with the ISO date plus a latest copy. Verification: reload the CSV/JSON and assert equality against the in-memory originals — the bundle, not the notebook, is the deliverable.',
          source: 'The "how do you hand off an analysis" question in data-analyst interviews; also the grading rubric for this course\'s capstone.',
        },
        summary: [
          'Three artifacts: tables (to_csv/to_json), figures (savefig before show), metrics (json.dump).',
          'index=False on CSV exports; orient="records" JSON matches API/pandas conventions.',
          'mkdir(exist_ok=True) + pathlib paths = scripts that re-run on any machine.',
          'Version outputs with ISO dates; keep a latest copy as the stable pointer.',
          'Reload and assert after saving — the bundle must match memory or the analysis is unproven.',
        ],
      }),
      [
        [
          'The correct order for producing a chart file in a script is:',
          [
            'show() then savefig()',
            'savefig() then show() — some backends finalise the figure at show',
            'Either order, always',
            'show() only; files are automatic',
          ],
          1,
          'savefig first guarantees the PNG exists before any backend behaviour at display time.',
        ],
        [
          'df.to_json(path, orient="records", indent=2) writes:',
          [
            'Column-oriented JSON',
            'A JSON array of row-objects — the shape APIs and pd.DataFrame(list_of_dicts) expect',
            'CSV text with a .json extension',
            'A pickled frame',
          ],
          1,
          'records orientation is the list-of-dicts contract shared by APIs, JavaScript and pandas re-imports.',
        ],
        [
          'Why write metrics.json instead of only printing metrics in the notebook?',
          [
            'Printing is slower',
            'A persisted, dated JSON makes the numbers auditable, greppable and diffable after the kernel dies',
            'json.dump is required for figures',
            'Notebooks cannot display numbers',
          ],
          1,
          'Printed output dies with the session; an artifact survives and can be checked against the narrative.',
        ],
        [
          'For scripts that must run on any machine, paths should be:',
          [
            'Absolute Windows paths',
            'Project-relative, composed with pathlib.Path',
            'Environment-specific strings from input()',
            'Stored inside figure titles',
          ],
          1,
          'Path("output") / "file.csv" resolves from the working directory on every OS — portable by construction.',
        ],
      ]
    ),
  ],
};
