# SEO Growth Plan — make TieEdu the top result for placement prep

> Status: **plan only.** Written 2026-11-02 from a live audit of https://tieedu.in.
> Goal from the owner: when a student searches **"TieEdu"**, **"Infosys preparation"**, a course, a
> company, a comparison or reviews, TieEdu should be at the top.

---

## 0. Honest expectations (read first)

Nobody can *guarantee* the #1 spot on Google — rankings are Google's decision, and anyone promising
"100% top" is selling something. What we **can** do is everything that decides rankings, done properly:

| Search type | Example | Realistic target | Time |
|---|---|---|---|
| **Brand** | "TieEdu", "tieedu.in", "Tie Edu" | **#1** (it is our name) | 2–6 weeks after the fixes + Search Console |
| **Long-tail company** | "Infosys SE exam pattern 2027", "Infosys SE interview questions for freshers" | Top 3–10 | 1–4 months per page |
| **Comparisons** | "Infosys vs TCS salary for freshers" | Top 10 | 2–4 months |
| **Course / skill test** | "free python course with certificate", "DBMS skill test online free" | Top 10–20, rising | 3–6 months |
| **Head terms** | "Infosys preparation", "placement preparation" | Page 1 is possible, #1 is hard — PrepInsta, GeeksforGeeks, IndiaBix, FACE Prep, Unstop, AmbitionBox have years of authority and thousands of backlinks | 6–12+ months, not guaranteed |

The path to the head terms is: win the **brand** and **hundreds of specific long-tail searches** first;
authority built there lifts the big terms later.

---

## 1. Audit — what the live site has today (2026-11-02)

| Check | Result |
|---|---|
| Indexing allowed (no `noindex`, robots allows all) | ✅ |
| `robots.txt` sitemap pointed to tieedu.com | ✅ fixed in code (commit d5ae130), needs deploy |
| Brand structured data (Organization / WebSite) on home | ✅ added in d5ae130, needs deploy |
| **Sitemap** | ⚠️ only **53 URLs**: 40 courses, **5 companies**, legal pages. **Missing: 107 skill tests, tracks, interview course, feed posts** |
| Company pages | ✅ good title, description, H1, canonical, **FAQ + Breadcrumb** schema, server-rendered |
| Course pages | ✅ Course + AggregateRating (real ratings only) + FAQ + Breadcrumb |
| **Skill-test pages** | ❌ rendered in the browser only — Google sees the title **" skill test · TieEdu"** with no name and no content |
| `/companies`, `/compare`, `/skill-test`, `/drops`, `/mock-interview` | ⚠️ no canonical, no structured data |
| Private pages (`/prep/...`, account, welcome, admin, TPO) | ⚠️ not marked `noindex` — wastes crawl budget, risks "Sign in" pages in results |
| Speed (server response) | ✅ home 0.33 s, company page 0.76 s (good; full Core Web Vitals to be measured in Search Console) |
| Google Search Console | ✅ domain verified (DNS TXT present) — sitemap not submitted yet |
| Content depth | ⚠️ only **5 published companies**; each company is one page — competitors have 10–20 pages per company |

---

## 2. Technical SEO (foundation — must be perfect)

1. **Server-render the skill-test pages** (`/skill-test/[slug]`, overview) so Google gets the name, description, topics, number of questions, certificate info and FAQs in the HTML.
2. **Complete sitemap**, split into a sitemap index: `sitemap-pages`, `sitemap-courses`, `sitemap-companies` (+ company sub-pages), `sitemap-skill-tests`, `sitemap-tracks`, `sitemap-compare`, `sitemap-guides`, `sitemap-feed`. Real `lastmod` dates from the data, not "today".
3. **Canonical URL on every public page**; strip tracking/filter params (`?utm`, `?em`, catalogue filters) from canonicals.
4. **`noindex`** on private and thin pages: `/prep/*`, `/account*`, `/welcome`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/admin*`, `/tpo*`, `/school*`, `/parent*`, `/p/*` unless the passport is public, search/filter result variants.
5. **Titles & descriptions** written to match how students search, e.g.
   `Infosys Systems Engineer 2027: Exam Pattern, Syllabus, Questions & Prep Plan | TieEdu` (≤ 60 chars where possible, keyword first, year in titles that are time-bound).
6. **One H1 per page**, logical H2/H3, descriptive image `alt`, breadcrumbs visible + in schema.
7. **Open Graph + Twitter cards** on every public page (share previews on WhatsApp/LinkedIn bring clicks and links).
8. **Core Web Vitals**: keep LCP < 2.5 s on 4G, CLS ≈ 0 (ads already reserve space), lazy-load below-the-fold images, preload the hero font only.
9. **Search Console + Bing Webmaster Tools**: submit sitemaps; **IndexNow** ping to Bing/Yandex whenever a company/course/guide is published or updated.
10. **404 & redirects**: helpful 404 with search; 301s for any renamed slugs (keep a slug-history table).

---

## 3. Structured data (rich results) per page type

| Page | Schema | Rich result it can earn |
|---|---|---|
| Home | Organization, WebSite (✅ added) | Brand knowledge panel, logo, sitelinks |
| Company hub | FAQPage, BreadcrumbList (✅), **+ ItemList of rounds** | FAQ / breadcrumb display |
| Company sub-pages (new) | Article (with `dateModified`, author/reviewer), FAQPage, BreadcrumbList | Fresh, dated results |
| Course | Course, AggregateRating (✅ real only), FAQ, Breadcrumb | Course rich results with stars |
| Course catalogue | ItemList of Course (✅) | Course list carousel |
| Skill test | **Quiz / LearningResource** + FAQPage + Breadcrumb | Practice/education results |
| Compare page (new) | Article + FAQPage + Table markup | Comparison snippets |
| Guides (new) | Article, HowTo where it is a real step-by-step | How-to results |
| Interview experiences (new) | Article (DiscussionForumPosting for community posts) | "Discussions and forums" results |

**Reviews — strict rule:** only **real** ratings from students who finished a course (already how it works). Google ignores self-written reviews on Organization pages and penalises fake ones; fake reviews are also illegal under India's consumer-protection rules on online reviews. We *will* make collecting real reviews easy (see §7).

---

## 4. Keyword map (what students actually type)

| Cluster | Example searches | Our page |
|---|---|---|
| Brand | tieedu, tie edu, tieedu reviews, tieedu courses | Home, /about, /reviews |
| Company — overview | infosys systems engineer preparation | /company/infosys-systems-engineer |
| Company — pattern | infosys se exam pattern 2027, infosys online test sections | …/exam-pattern |
| Company — syllabus | infosys se syllabus, infosys pseudocode questions | …/syllabus |
| Company — questions | infosys interview questions for freshers, infosys hr interview questions | …/interview-questions, …/hr-interview |
| Company — salary & eligibility | infosys se salary 2027, infosys eligibility criteria backlog | …/salary-eligibility |
| Company — process | infosys hiring process for freshers 2027 | …/hiring-process |
| Company — experience | infosys se interview experience | …/experiences |
| Compare | infosys vs tcs, infosys se vs dse, tcs nqt vs infosys | /compare/infosys-vs-tcs |
| Courses | free python course with certificate, os for placements | /courses/… |
| Skill tests | dbms test online free, aptitude test with certificate | /skill-test/… |
| Guides | how to prepare for placements in 3rd year, 30 day infosys plan | /guides/… |

Final keyword list (with search volumes) is built in Search Console + Google Keyword Planner after launch, and refreshed monthly.

---

## 5. Content plan — the biggest lever

### 5.1 Company "silos" (per company, 7–8 strong pages instead of 1)
`/company/<slug>` (hub) → `exam-pattern` · `syllabus` · `interview-questions` · `hr-interview` · `hiring-process` · `salary-eligibility` · `experiences` · `prep-plan` (public summary of the Train·Test·Track plan).
- Each page: 800–1,500 words of **unique, accurate** content, a dated "Updated <month year>", sources, an FAQ block, and links to the matching test/course.
- Built from the company data we already hold (rounds, patterns, questions, CTC) — **no invented numbers**, same rule as the rest of the site.
- Start with **Infosys SE** (flagship), then TCS NQT, Accenture, Wipro, Cognizant, Capgemini, HCLTech, Tech Mahindra, LTIMindtree, IBM… — publish the 30 company records already in the database as they are fact-checked.

### 5.2 Comparison pages
`/compare/<a>-vs-<b>` for real pairs students search (Infosys vs TCS, Infosys SE vs DSE, TCS NQT Ninja vs Digital, Accenture vs Cognizant…). Table + verdict + FAQs. Only pairs we have data for.

### 5.3 Skill-test landing pages
Server-rendered: what it tests, topics, number of questions, time, difficulty, sample question, certificate, FAQs → "Start free test".

### 5.4 Guides (blog) — 2 per week
"Infosys SE in 30 days", "Placement roadmap for 2027 batch", "Pseudocode questions explained", "Upcoming off-campus drives this month" (monthly, fresh). Author/reviewer box (E-E-A-T).

### 5.5 Interview experiences (community)
Public, moderated pages from the existing debrief feature (with the student's permission, anonymised) — fresh, unique, exactly what students search ("… interview experience").

### Quality rules (protect against Google penalties)
No thin pages, no copy-paste between companies, no mass AI-generated filler (Google's "scaled content abuse" policy). Every page must answer a real search better than the current #1.

---

## 6. Internal linking
Company hub ↔ its sub-pages ↔ matching skill tests ↔ courses ↔ compare pages ↔ guides. Breadcrumbs everywhere. Footer "Popular companies" and "Popular tests" lists. "Related" blocks at the end of every page. Descriptive anchor text ("Infosys SE exam pattern"), never "click here".

---

## 7. Authority & reviews (off-site)
- **Backlinks:** college partner pages (TPO portal "Powered by TieEdu" badge linking back), LinkedIn articles, guest posts on education blogs, student-club partnerships, press release on launch.
- **YouTube:** short videos per company ("Infosys SE pattern in 5 minutes") — videos rank in Google too and link back.
- **Communities:** genuine answers on Reddit/Quora/LinkedIn with links where helpful (no spam).
- **Google Business Profile** for TieEdu Technologies (if you have an address) → brand panel with **Google reviews**.
- **Real reviews:** ask students right after a certificate or a good test score to rate the course (on-site, already exists) and to leave a Google/Trustpilot review; a public `/reviews` page showing only verified reviews.

---

## 8. Measurement
Search Console (impressions, clicks, positions, indexing errors), Bing Webmaster, Core Web Vitals report, a 50-keyword rank sheet checked monthly, and conversions (signups from organic). Monthly SEO report: what moved, what to fix.

---

## 9. Build order

| # | What | Who | Size |
|---|---|---|---|
| S1 | Deploy d5ae130 + submit sitemap & request indexing in Search Console + Bing | You (I guide) | XS |
| S2 | Technical fixes: skill-test SSR, full split sitemaps, canonicals, noindex private pages, OG tags, titles | Me | M |
| S3 | Structured data for skill tests, compare, catalogue pages; IndexNow | Me | S |
| S4 | **Infosys SE silo** (8 pages) as the template | Me (content drafted from our data, you review facts) | M |
| S5 | Compare pages + skill-test landing pages | Me | M |
| S6 | Guides section (CMS in admin) + first 6 guides | Me + you | M |
| S7 | Public interview-experience pages (opt-in, anonymised) | Me | M |
| S8 | Reviews page + review-request emails | Me | S |
| S9 | Roll the silo to every published company | Me + fact-check by you | L (ongoing) |
| S10 | Off-site: YouTube, LinkedIn, college backlinks, Google Business Profile | You (I give a checklist) | ongoing |

## 10. What I need from you
- Run the deploy + Search Console steps (S1).
- Which companies to publish next (only fact-checked ones go live).
- Someone to review facts on company pages before they publish.
- Business address (for Google Business Profile, optional).
