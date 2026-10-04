import type { QuestionBank } from '../types';

// 13 career/business skills × 10 questions each.
export const BANK: QuestionBank = {
  // ── quantitative-aptitude ──────────────────────────────────────────────────
  'quantitative-aptitude': [
    ['Number System', 'beginner', 'single_choice', 'What is 15% of 200?', ['15', '25', '30', '35'], [2], '15/100 × 200 = 30.'],
    ['Number System', 'beginner', 'single_choice', 'The smallest prime number is:', ['0', '1', '2', '3'], [2], '2 is the only even prime number.'],
    ['Number System', 'intermediate', 'single_choice', 'The LCM of 4 and 6 is:', ['2', '12', '24', '20'], [1], 'LCM(4,6) = 12; HCF = 2; product = LCM × HCF.'],
    ['Percentages & Ratios', 'beginner', 'single_choice', 'If a price rises from 80 to 100, the increase is:', ['20%', '25%', '30%', '15%'], [1], '20/80 × 100 = 25%.'],
    ['Percentages & Ratios', 'intermediate', 'single_choice', 'A:B = 2:3 and B:C = 4:5, then A:C equals:', ['8:15', '2:5', '6:15', '10:12'], [0], 'Make B equal: A:B = 8:12, B:C = 12:15 → A:C = 8:15.'],
    ['Profit, Loss & Interest', 'intermediate', 'single_choice', 'CP 400, SP 460 → profit %?', ['10%', '15%', '12%', '20%'], [1], 'Profit 60 → 60/400 × 100 = 15%.'],
    ['Profit, Loss & Interest', 'intermediate', 'single_choice', 'Simple interest on 5000 at 8% for 2 years is:', ['400', '800', '600', '1000'], [1], 'SI = PRT/100 = 5000×8×2/100 = 800.'],
    ['Time, Speed & Distance', 'intermediate', 'single_choice', 'A train 150 m long crosses a pole in 10 s. Speed?', ['15 km/h', '54 km/h', '36 km/h', '72 km/h'], [1], '15 m/s = 15 × 18/5 = 54 km/h.'],
    ['Time, Speed & Distance', 'intermediate', 'single_choice', 'A person walks 6 km in 1.5 hours. Speed?', ['3 km/h', '4 km/h', '5 km/h', '6 km/h'], [1], '6/1.5 = 4 km/h.'],
    ['Algebra', 'beginner', 'single_choice', 'If x + 5 = 12, then x equals:', ['5', '6', '7', '17'], [2], 'x = 12 − 5 = 7.'],
  ],

  // ── logical-reasoning ──────────────────────────────────────────────────────
  'logical-reasoning': [
    ['Series & Patterns', 'beginner', 'single_choice', 'Next in series: 2, 6, 12, 20, 30, ?', ['40', '42', '44', '36'], [1], 'Differences 4,6,8,10,12 → 30+12 = 42.'],
    ['Series & Patterns', 'intermediate', 'single_choice', 'Next: 3, 9, 27, 81, ?', ['162', '243', '324', '128'], [1], 'Powers of 3 → 3⁵ = 243.'],
    ['Series & Patterns', 'intermediate', 'single_choice', 'Find the odd one: Rose, Lotus, Marigold, Mango', ['Rose', 'Lotus', 'Marigold', 'Mango'], [3], 'Mango is a fruit; the rest are flowers.'],
    ['Coding-Decoding', 'intermediate', 'single_choice', 'If CAT = 24 (C=3, A=1, T=20), then DOG equals:', ['24', '26', '28', '20'], [1], 'D=4, O=15, G=7 → 4+15+7 = 26.'],
    ['Coding-Decoding', 'intermediate', 'single_choice', 'In a code, RAIN is written as SBJO. How is WATER written?', ['XBUPS', 'XBVSF', 'XAUFS', 'YBVSF'], [0], 'Each letter shifts +1 → W→X, A→B, T→U, E→F, R→S = XBUPS.'],
    ['Blood Relations', 'intermediate', 'single_choice', 'Pointing to a photo, “She is the daughter of my grandfather’s only son.” She is his:', ['Cousin', 'Sister', 'Aunt', 'Mother'], [1], 'Grandfather’s only son = his father; his father’s daughter = his sister.'],
    ['Blood Relations', 'advanced', 'single_choice', 'A is B’s brother, C is A’s mother, D is C’s father. E is B’s father. D is B’s:', ['Brother', 'Father', 'Uncle', 'Son'], [1], 'D is C’s husband and father of A/B → D is B’s father.'],
    ['Direction Sense', 'beginner', 'single_choice', 'Walk 5 m north, then 5 m east. Final direction from start?', ['North', 'East', 'North-East', 'South-West'], [2], 'Both components → diagonal North-East.'],
    ['Direction Sense', 'intermediate', 'single_choice', 'A person facing south turns left, then left again. Facing:', ['North', 'South', 'East', 'West'], [0], 'South → left turn faces east; left turn again faces north.'],
    ['Seating & Syllogisms', 'intermediate', 'single_choice', 'Statements: All cats are animals. Conclusion: Some animals are cats is:', ['False', 'True (valid converse)', 'Invalid always', 'Cannot be determined'], [1], 'If all cats are animals, then those cats are some animals — valid.'],
  ],

  // ── verbal-ability ─────────────────────────────────────────────────────────
  'verbal-ability': [
    ['Grammar & Usage', 'beginner', 'single_choice', 'Choose the correct sentence:', ['He don’t like coffee.', 'He doesn’t like coffee.', 'He not like coffee.', 'He doesn’t likes coffee.'], [1], 'Third person singular uses doesn’t + base verb.'],
    ['Grammar & Usage', 'beginner', 'single_choice', '“She ___ to school every day.”', ['go', 'goes', 'going', 'gone'], [1], 'Third person singular present adds -es (goes).'],
    ['Grammar & Usage', 'intermediate', 'single_choice', 'Identify the tense: “I have finished my work.”', ['Simple present', 'Present perfect', 'Past perfect', 'Future'], [1], 'have/has + past participle = present perfect.'],
    ['Vocabulary', 'beginner', 'single_choice', 'Synonym of “abundant”:', ['Scarce', 'Plentiful', 'Tiny', 'Rare'], [1], 'Abundant = existing in large quantities.'],
    ['Vocabulary', 'intermediate', 'single_choice', 'Antonym of “benevolent”:', ['Kind', 'Generous', 'Malevolent', 'Helpful'], [2], 'Benevolent = well-meaning; malevolent = wishing harm.'],
    ['Vocabulary', 'intermediate', 'single_choice', '“Meticulous” most nearly means:', ['Careless', 'Extremely careful about detail', 'Quick-tempered', 'Talkative'], [1], 'Meticulous attention to detail.'],
    ['Sentence Correction', 'intermediate', 'single_choice', 'Correct: “One of my friends ___ a doctor.”', ['are', 'is', 'were', 'have'], [1], '“One of my friends” — subject is “one” → singular verb.'],
    ['Sentence Correction', 'intermediate', 'single_choice', 'Choose the correct preposition: “She has been working ___ 2015.”', ['for', 'since', 'from', 'by'], [1], 'since + point in time; for + duration.'],
    ['Comprehension', 'intermediate', 'single_choice', 'In comprehension, the main idea is best found by:', ['Reading only the first word', 'Identifying the topic sentence and repeated themes', 'Counting paragraphs', 'Skipping the conclusion'], [1], 'Topic sentences and recurring keywords reveal central themes.'],
    ['Para Jumbles', 'advanced', 'single_choice', 'To reorder sentences logically you should look for:', ['Sentence length', 'Cohesive links (pronoun references, transition words) and a time/logical sequence', 'Alphabetical order', 'Longest sentence first'], [1], 'Pronouns and connectors (however, therefore) chain sentences.'],
  ],

  // ── data-interpretation ────────────────────────────────────────────────────
  'data-interpretation': [
    ['Tables', 'beginner', 'single_choice', 'In a table of sales by month, total annual sales = ?', ['Average of rows', 'Sum of all monthly values', 'Maximum value', 'First value only'], [1], 'Annual total is the sum across months.'],
    ['Tables', 'intermediate', 'single_choice', 'If Q1 = 200 and Q2 = 250, growth from Q1 to Q2 is:', ['20%', '25%', '30%', '50/200 = 25% but stated as 20%'], [1], '50/200 × 100 = 25%.'],
    ['Tables', 'intermediate', 'single_choice', 'Share of a row in a total of 400 with value 50 equals:', ['5%', '12.5%', '20%', '25%'], [1], '50/400 = 1/8 = 12.5%.'],
    ['Bar & Line Charts', 'beginner', 'single_choice', 'In a bar chart, bar height represents:', ['Time period', 'Magnitude of the category value', 'Frequency of errors', 'Legend'], [1], 'Length encodes value — compare across categories.'],
    ['Bar & Line Charts', 'intermediate', 'single_choice', 'A line chart over months shows:', ['Part-to-whole only', 'Trend/change over time', 'Distribution shape', 'Correlation pairs'], [1], 'Line charts excel at trends across a continuous axis.'],
    ['Pie Charts', 'beginner', 'single_choice', 'A sector covering 90° of a pie chart represents what share of the total?', ['10%', '25%', '50%', '75%'], [1], '90/360 = 25%.'],
    ['Pie Charts', 'intermediate', 'single_choice', 'If a category is 20% of a total 1500, its value is:', ['250', '300', '350', '400'], [1], '0.20 × 1500 = 300.'],
    ['Caselets', 'advanced', 'single_choice', 'In a caselet, before calculating you should:', ['Guess numbers', 'Translate the paragraph into variables/relations systematically', 'Skip data', 'Assume equal values'], [1], 'Convert text to equations/tables first to avoid errors.'],
    ['Calculation Tricks', 'intermediate', 'single_choice', 'Successive discounts of 10% and 10% equal a single discount of:', ['20%', '19%', '18%', '21%'], [1], '0.9 × 0.9 = 0.81 → 19% total.'],
    ['Calculation Tricks', 'beginner', 'single_choice', 'To find the average of 10 numbers summing to 550:', ['50', '55', '60', '45'], [1], '550/10 = 55.'],
  ],

  // ── spoken-english ─────────────────────────────────────────────────────────
  'spoken-english': [
    ['Fluency & Pace', 'beginner', 'single_choice', 'Ideal speaking pace for presentations is:', ['As fast as possible', 'Conversational with purposeful pauses', 'One word per second', 'No pauses ever'], [1], 'Pauses let listeners process; rushing causes confusion.'],
    ['Fluency & Pace', 'beginner', 'single_choice', 'Filler words like “um” and “ah” are best handled by:', ['Adding more of them', 'Replacing with brief pauses', 'Speaking faster', 'Ignoring meaning'], [1], 'Silence sounds more confident than fillers.'],
    ['Pronunciation', 'beginner', 'single_choice', 'Word stress means:', ['Volume of the word', 'Which syllable is emphasized (e.g. re-CORD vs REC-ord)', 'Speaking speed', 'Spelling rules'], [1], 'Correct stress changes meaning and intelligibility.'],
    ['Pronunciation', 'intermediate', 'single_choice', 'Linking in natural speech is:', ['Pronouncing every word separately', 'Connecting adjacent words smoothly (e.g. turn_it_up)', 'Accent removal', 'Shouting'], [1], 'Native speech links words — essential for listening too.'],
    ['Grammar in Speech', 'beginner', 'single_choice', 'In conversation, present simple is often used for:', ['Only past events', 'Habits, facts and routines', 'Hypotheticals only', 'Never'], [1], '“I work every day” states a routine/fact.'],
    ['Grammar in Speech', 'intermediate', 'single_choice', '“I have been living here ___ 2018.”', ['for', 'since', 'from', 'during'], [1], 'since + starting point.'],
    ['Everyday Phrases', 'beginner', 'single_choice', 'Polite ways to disagree include:', ['“You are wrong.”', '“I see your point, but I think...”', '“Nonsense.”', 'Silence always'], [1], 'Acknowledge first, then present your view respectfully.'],
    ['Everyday Phrases', 'beginner', 'single_choice', 'To ask someone to repeat you can say:', ['Say again? (rude)', '“Sorry, could you say that again?”', 'What?', 'Repeat now.'], [1], 'Polite requests keep conversations smooth.'],
    ['Confidence & Listening', 'intermediate', 'single_choice', 'Active listening involves:', ['Waiting to speak', 'Listening to understand and paraphrasing before responding', 'Interrupting often', 'Multitasking'], [1], 'Paraphrasing confirms understanding.'],
    ['Confidence & Listening', 'beginner', 'single_choice', 'Improving spoken English quickly requires:', ['Only grammar books', 'Daily speaking practice with feedback', 'Watching without sound', 'Memorizing long words only'], [1], 'Practice + correction drives fluency.'],
  ],

  // ── business-communication ─────────────────────────────────────────────────
  'business-communication': [
    ['Email & Writing', 'beginner', 'single_choice', 'A good email subject line is:', ['Long and detailed', 'Clear and specific about the action/topic', 'Vague like “Hi”', 'All caps always'], [1], 'Recipients prioritize based on the subject.'],
    ['Email & Writing', 'beginner', 'single_choice', 'The BLUF principle in emails means:', ['Bottom Line Up Front — key point first', 'Be lengthy always', 'Use formal tone only', 'Forward to everyone'], [0], 'State purpose/ask early; details follow.'],
    ['Email & Writing', 'intermediate', 'single_choice', 'When replying-all is appropriate:', ['For every email always', 'Only when all recipients genuinely need the reply', 'Never', 'Only to managers'], [1], 'Respect inboxes; reply directly when others are irrelevant.'],
    ['Meetings & Presentations', 'intermediate', 'single_choice', 'An effective meeting starts with:', ['Immediate brainstorming', 'A clear agenda and desired outcomes', 'Small talk for 30 minutes', 'No notes'], [1], 'Agenda + goal keep time and focus.'],
    ['Meetings & Presentations', 'intermediate', 'single_choice', 'In presentations, the “so what?” test checks:', ['Slide aesthetics', 'Whether each point explains why the audience should care', 'Font size', 'Duration'], [1], 'Every data point needs relevance to the audience.'],
    ['Meetings & Presentations', 'beginner', 'single_choice', 'To handle questions you do not know:', ['Guess confidently', 'Acknowledge and follow up with a real answer later', 'Ignore the person', 'End the meeting'], [1], 'Honesty + prompt follow-up preserves credibility.'],
    ['Etiquette', 'beginner', 'single_choice', 'In business settings, being punctual means:', ['Exactly on time or slightly early', '10 minutes late is fine', 'Whenever possible', 'After others arrive'], [0], 'Punctuality signals respect for others’ time.'],
    ['Etiquette', 'intermediate', 'single_choice', 'Handshake/email tone in global teams should be:', ['Slang-heavy', 'Neutral, respectful and culturally considerate', 'Overly informal', 'Avoid all pleasantries'], [1], 'Adapt tone to diverse audiences; clarity over jargon.'],
    ['Report Writing', 'intermediate', 'single_choice', 'A standard report structure is:', ['Random sections', 'Title → Executive summary → Findings → Recommendations → Appendices', 'Appendices first', 'Only charts'], [1], 'Executives often read only the summary — make it complete.'],
    ['Persuasion', 'advanced', 'single_choice', 'Strong persuasive business writing relies on:', ['Emotion only', 'Evidence plus audience-centered benefits', 'Repeated caps', 'Threats'], [1], 'Data + “what’s in it for them” moves decisions.'],
  ],

  // ── interview-skills ───────────────────────────────────────────────────────
  'interview-skills': [
    ['Resume Basics', 'beginner', 'single_choice', 'A good resume should ideally be:', ['2–3 pages with every detail', '1–2 pages tailored to the role with quantified achievements', 'Half a line', 'A biography'], [1], 'Concise, relevant and results-oriented.'],
    ['Resume Basics', 'beginner', 'single_choice', 'Resume achievements are strongest when:', ['Listed as job duties', 'Quantified with numbers (%, ₹, users, time saved)', 'Written in paragraph form', 'Without dates'], [1], '“Reduced build time 40%” beats “worked on builds”.'],
    ['Resume Basics', 'intermediate', 'single_choice', 'A resume is usually scanned for:', ['6–7 seconds initially', 'An hour', 'Exactly 30 seconds of deep reading', 'Days'], [0], 'Clear headings and scannable bullets matter.'],
    ['Common Questions', 'beginner', 'single_choice', 'Best answer to “Tell me about yourself”:', ['Childhood story', 'A concise professional summary: present, relevant past, why this role', 'Personal family details', 'Salary expectations'], [1], 'Keep it 60–90 seconds and role-relevant.'],
    ['Common Questions', 'intermediate', 'single_choice', '“What is your greatest weakness?” — strongest approach:', ['Perfect person with none', 'A real but manageable weakness with steps you are taking', 'A fake weakness like “too perfectionist” only', 'Blame a past manager'], [1], 'Self-awareness + growth action reads honestly.'],
    ['Behavioral Stories', 'intermediate', 'single_choice', 'The STAR method stands for:', ['Skill, Task, Action, Result', 'Situation, Task, Action, Result', 'Start, Time, Act, Reply', 'Story, Talk, Aim, Repeat'], [1], 'Structure behavioral answers with STAR for clarity.'],
    ['Behavioral Stories', 'intermediate', 'single_choice', 'For “team conflict” questions you should:', ['Say you never conflict', 'Describe the situation, your listening, compromise and outcome', 'Criticize the colleague fully', 'Avoid the question'], [1], 'Show collaboration and resolution, not blame.'],
    ['Technical Rounds', 'intermediate', 'single_choice', 'When stuck on a technical problem, you should:', ['Give up silently', 'Think aloud, state assumptions, attempt a solution, ask clarifying questions', 'Guess randomly', 'Change topic'], [1], 'Interviewers evaluate your problem-solving process.'],
    ['HR Round & Offers', 'intermediate', 'single_choice', 'When asked “Why should we hire you?”:', ['Flattery', 'Map your relevant skills/evidence to the role’s needs', 'Say you need money', 'Criticize competitors'], [1], 'Connect your proof points to their requirements.'],
    ['HR Round & Offers', 'intermediate', 'single_choice', 'Salary negotiation should be based on:', ['Random number', 'Market range, your value and the role scope — discussed professionally', 'Threats to leave', 'First number with no research'], [1], 'Know the band; justify with impact; stay professional.'],
  ],

  // ── digital-marketing ──────────────────────────────────────────────────────
  'digital-marketing': [
    ['Fundamentals', 'beginner', 'single_choice', 'Digital marketing refers to:', ['Only TV ads', 'Promoting products through digital channels (search, social, email, web)', 'Print flyers', 'Cold calls only'], [1], 'Channels include SEO, SEM, social, email and content.'],
    ['Fundamentals', 'beginner', 'single_choice', 'A funnel in marketing describes:', ['Water pipelines', 'The journey from awareness → interest → action', 'Only website menus', 'Email fonts'], [1], 'Each stage needs different messaging and metrics.'],
    ['Fundamentals', 'intermediate', 'single_choice', 'KPI stands for:', ['Key Performance Indicator', 'Keyword Page Index', 'Key Promotion Idea', 'KPI is not a term'], [0], 'KPIs measure progress toward goals (CTR, CPA, ROAS).'],
    ['Paid Ads', 'intermediate', 'single_choice', 'CPC in advertising means:', ['Cost Per Click', 'Clicks Per Campaign', 'Cost Per Conversion', 'Customer Product Category'], [0], 'Advertisers pay each time a user clicks the ad.'],
    ['Paid Ads', 'intermediate', 'single_choice', 'ROAS of 4 means:', ['4 clicks', 'Revenue is 4× the ad spend', '4 impressions', '4% growth'], [1], 'Return on Ad Spend = revenue / ad cost.'],
    ['Content & Email', 'beginner', 'single_choice', 'Email marketing remains effective because:', ['It is free always', 'It offers direct, permissioned access with strong ROI', 'Social algorithms favor it', 'It replaces SEO'], [1], 'Owned audience — not subject to social algorithm changes.'],
    ['Content & Email', 'intermediate', 'single_choice', 'A good email subject line aims to:', ['Mislead for opens', 'Be relevant and specific to earn qualified opens', 'Be as long as possible', 'Include 10 emojis always'], [1], 'Open rate means nothing without engagement and trust.'],
    ['Analytics', 'intermediate', 'single_choice', 'Conversion rate = ?', ['Clicks / Impressions', 'Conversions / Visitors × 100', 'Visitors / Revenue', 'Bounces / Sessions'], [1], 'Percentage of visitors who complete the desired goal.'],
    ['Analytics', 'beginner', 'single_choice', 'Google Analytics primarily measures:', ['Ad bid prices only', 'Website traffic and user behavior', 'Social post colors', 'Email delivery to spam'], [1], 'Sessions, sources, behavior and conversions.'],
    ['Strategy', 'advanced', 'single_choice', 'A content strategy should be driven by:', ['Random trends', 'Audience research, search intent and business goals', 'Only competitor logos', 'Budget alone'], [1], 'Map content to what the audience actually seeks.'],
  ],

  // ── seo ────────────────────────────────────────────────────────────────────
  seo: [
    ['Keyword Research', 'beginner', 'single_choice', 'A “long-tail keyword” is:', ['A very long sentence', 'A specific, lower-volume multi-word query', 'A branded keyword only', 'A meta keyword'], [1], 'Less competition, higher intent (e.g. “buy running shoes size 10”).'],
    ['Keyword Research', 'beginner', 'single_choice', 'Search intent categories include:', ['Informational, navigational, transactional, commercial', 'Only transactional', 'Random only', 'Meta-only'], [0], 'Match content type to intent (guide vs product page).'],
    ['Keyword Research', 'intermediate', 'single_choice', 'Keyword difficulty estimates:', ['How hard it is to rank on page 1 for that term', 'Exact search cost', 'Word count only', 'Bounce rate'], [0], 'Balance difficulty with business relevance and volume.'],
    ['On-Page SEO', 'beginner', 'single_choice', 'The title tag should contain:', ['50+ keywords stuffed', 'The primary keyword naturally, within ~60 characters', 'Only the brand name', 'Nothing important'], [1], 'It is a primary relevance and CTR signal.'],
    ['On-Page SEO', 'intermediate', 'single_choice', 'Header tags (H1–H6) help by:', ['Coloring text', 'Structuring content for readers and search engines', 'Speeding servers', 'Hosting images'], [1], 'One H1 per page; logical H2/H3 hierarchy below.'],
    ['On-Page SEO', 'intermediate', 'single_choice', 'Internal linking mainly helps by:', ['Increasing ad revenue directly', 'Distributing link equity and helping crawlers discover pages', 'Replacing content', 'Boosting social shares only'], [1], 'Contextual links improve site architecture and rankings.'],
    ['Technical SEO', 'intermediate', 'single_choice', 'robots.txt is used to:', ['Rank pages', 'Instruct crawlers which paths to access or avoid', 'Compress images', 'Host sitemaps'], [1], 'It is a directive, not a guarantee — use noindex for content control.'],
    ['Technical SEO', 'intermediate', 'single_choice', 'A slow Core Web Vital (LCP) mainly harms:', ['Keyword research tools', 'User experience and rankings', 'Domain age', 'Backlink counts'], [1], 'Page experience is a ranking consideration.'],
    ['Link Building', 'intermediate', 'single_choice', 'A quality backlink is:', ['Any bought link', 'An editorially given link from a relevant, authoritative page', 'A directory spam link', 'A comment footer link'], [1], 'Relevance and trust beat raw quantity.'],
    ['Analytics', 'beginner', 'single_choice', 'Google Search Console helps you:', ['Edit ad bids', 'See search performance, indexing status and issues', 'Design logos', 'Send emails'], [1], 'Queries, clicks, coverage and enhancement reports.'],
  ],

  // ── social-media-marketing ─────────────────────────────────────────────────
  'social-media-marketing': [
    ['Platform Strategy', 'beginner', 'single_choice', 'Platform choice should be driven by:', ['Every platform equally always', 'Where the target audience actually spends time', 'Personal preference only', 'The logo colors'], [1], 'B2B → LinkedIn; visual brands → Instagram; etc.'],
    ['Platform Strategy', 'beginner', 'single_choice', 'A content calendar helps by:', ['Guaranteeing virality', 'Planning consistent, timely posting aligned to goals', 'Replacing analytics', 'Auto-creating content'], [1], 'Consistency and planning beat last-minute posts.'],
    ['Content & Creatives', 'intermediate', 'single_choice', 'Short-form video performs well because:', ['It is always educational', 'It matches platform algorithms and quick consumption habits', 'It costs the most', 'It has no competition'], [1], 'Reels/Shorts get strong algorithmic distribution.'],
    ['Content & Creatives', 'intermediate', 'single_choice', 'User-generated content is valuable because it:', ['Is free to fabricate', 'Builds authentic trust and social proof', 'Avoids copyright entirely', 'Only works for luxury brands'], [1], 'Real customer stories convert better than ads.'],
    ['Community', 'intermediate', 'single_choice', 'Community management involves:', ['Only posting promotional content', 'Responding to comments/messages and nurturing followers', 'Buying followers', 'Ignoring criticism'], [1], 'Engagement builds loyalty and reduces churn.'],
    ['Community', 'beginner', 'single_choice', 'Handling negative comments best means:', ['Deleting all criticism', 'Responding promptly, professionally and taking issues offline when needed', 'Arguing publicly', 'Ignoring forever'], [1], 'Others are watching how you handle complaints.'],
    ['Ads & Targeting', 'intermediate', 'single_choice', 'Audience lookalike targeting is used to:', ['Reach existing customers only', 'Find new users similar to your best customers', 'Block users', 'Measure reach only'], [1], 'Seed with converters; platforms model similar profiles.'],
    ['Ads & Targeting', 'intermediate', 'single_choice', 'A/B testing social creatives means:', ['Testing two variants to see which performs better', 'Posting twice daily', 'Using two platforms', 'Double budget'], [0], 'Change one variable at a time for valid learnings.'],
    ['Metrics', 'beginner', 'single_choice', 'Engagement rate measures:', ['Follower count growth only', 'Interactions (likes, comments, shares) relative to reach/followers', 'Ad spend', 'Posting frequency'], [1], 'Quality of interaction, not just size.'],
    ['Metrics', 'intermediate', 'single_choice', 'Reach vs impressions:', ['Both identical', 'Reach = unique users; impressions = total times shown', 'Reach = views; impressions = clicks', 'Impressions = unique users'], [1], 'Same post seen twice = 1 reach, 2 impressions.'],
  ],

  // ── financial-accounting ───────────────────────────────────────────────────
  'financial-accounting': [
    ['Accounting Basics', 'beginner', 'single_choice', 'The accounting equation is:', ['Assets = Liabilities + Capital (Equity)', 'Assets = Liabilities − Income', 'Profit = Assets + Cash', 'Revenue = Expense + Loss'], [0], 'The foundation of double-entry bookkeeping.'],
    ['Accounting Basics', 'beginner', 'single_choice', 'Capital in accounting means:', ['Money in the safe only', 'Owner’s claim on the business (assets − liabilities)', 'Revenue earned', 'Bank loan only'], [1], 'Equity/owner’s funds.'],
    ['Journal & Ledger', 'beginner', 'single_choice', 'A journal records transactions:', ['After the trial balance', 'Chronologically as they occur', 'Only at year end', 'Alphabetically'], [1], 'The journal (day book) is the book of original entry.'],
    ['Journal & Ledger', 'intermediate', 'single_choice', 'In double entry, every transaction has:', ['One entry only', 'Equal debit and credit effects', 'No effect', 'Only debits'], [1], 'Total debits = total credits for each transaction.'],
    ['Journal & Ledger', 'intermediate', 'single_choice', 'Buying machinery for cash: entry is:', ['Debit cash, credit machinery', 'Debit machinery, credit cash', 'Debit capital, credit cash', 'No entry'], [1], 'Asset (machinery) increases → debit; asset (cash) decreases → credit.'],
    ['Trial Balance', 'intermediate', 'single_choice', 'A trial balance:', ['Proves accuracy completely', 'Lists debit/credit balances to check arithmetical equality', 'Is a final account', 'Shows only cash'], [1], 'Equal totals do not rule out all errors (e.g. omission).'],
    ['Final Accounts', 'intermediate', 'single_choice', 'Trading account calculates:', ['Net profit after tax', 'Gross profit (sales − cost of goods sold)', 'Capital only', 'Dividends'], [1], 'COGS = opening stock + purchases − closing stock.'],
    ['Final Accounts', 'intermediate', 'single_choice', 'Balance sheet shows:', ['Profit over a period', 'Financial position (assets, liabilities, equity) at a date', 'Cash flows only', 'Sales trends'], [1], 'A snapshot, not a performance statement.'],
    ['Ratios', 'advanced', 'single_choice', 'Current ratio = ?', ['Current assets / Current liabilities', 'Profit / Sales', 'Capital / Assets', 'Debt / Equity'], [0], 'Liquidity measure — ability to cover short-term obligations.'],
    ['Ratios', 'advanced', 'single_choice', 'Debt-equity ratio compares:', ['Sales to expenses', 'Total debt to shareholders’ equity', 'Cash to bank', 'Profit to dividend'], [1], 'Measures financial leverage and solvency risk.'],
  ],

  // ── project-management ─────────────────────────────────────────────────────
  'project-management': [
    ['Project Lifecycle', 'beginner', 'single_choice', 'A project is best defined as:', ['A permanent job role', 'A temporary endeavor with a start and end to create a unique outcome', 'Daily operations', 'A single task'], [1], 'Temporary + unique deliverable distinguishes projects from operations.'],
    ['Project Lifecycle', 'beginner', 'single_choice', 'The typical project phases are:', ['Initiating → Planning → Executing → Monitoring → Closing', 'Executing only', 'Closing first', 'Random'], [0], 'Phases structure governance and deliverables.'],
    ['Project Lifecycle', 'intermediate', 'single_choice', 'A project charter authorizes:', ['Daily standups', 'The project and gives the PM authority', 'Only the budget after delivery', 'Team hiring only'], [1], 'Charter states objectives, scope, sponsor and PM.'],
    ['Planning & Scheduling', 'intermediate', 'single_choice', 'A Work Breakdown Structure (WBS) is:', ['A Gantt chart', 'A hierarchical decomposition of scope into manageable work packages', 'A risk list', 'A status email'], [1], 'If it is not in the WBS, it is not in the project.'],
    ['Planning & Scheduling', 'intermediate', 'single_choice', 'Critical path method identifies:', ['The easiest tasks', 'The longest sequence of dependent tasks determining minimum duration', 'Random tasks', 'Cost only'], [1], 'Delay on the critical path delays the whole project.'],
    ['Agile & Scrum', 'intermediate', 'single_choice', 'In Scrum, the Product Backlog is ordered by:', ['Task size only', 'Value, risk and dependency (priority)', 'Alphabetical', 'Team preference'], [1], 'Highest value first maximizes ROI per sprint.'],
    ['Agile & Scrum', 'beginner', 'single_choice', 'The Daily Scrum is for:', ['Long problem-solving deep dives', 'Syncing progress, plans and impediments in ≤15 min', 'Stakeholder demos only', 'Retrospectives only'], [1], 'A quick synchronization, not a status meeting for managers.'],
    ['Risk & Quality', 'intermediate', 'single_choice', 'A risk register tracks:', ['Known issues only', 'Identified risks with probability, impact and responses', 'Team birthdays', 'Vendor invoices'], [1], 'Risks are uncertain; issues are realized risks.'],
    ['Risk & Quality', 'advanced', 'single_choice', 'Risk response strategies for threats include:', ['Avoid, mitigate, transfer, accept', 'Ignore always', 'Escalate only', 'Delete budget'], [0], 'Choose based on cost vs impact trade-off.'],
    ['Stakeholders', 'intermediate', 'single_choice', 'Stakeholder analysis maps people by:', ['Location only', 'Power/interest to tailor engagement approach', 'Salary', 'Tenure'], [1], 'High power/interest → manage closely.'],
  ],

  // ── ms-office ──────────────────────────────────────────────────────────────
  'ms-office': [
    ['Word', 'beginner', 'single_choice', 'Ctrl+B in MS Word does:', ['Bold', 'Italic', 'Underline', 'Paste'], [0], 'Ctrl+B toggles bold formatting.'],
    ['Word', 'beginner', 'single_choice', 'Styles in Word are used to:', ['Apply consistent formatting (headings, fonts) across a document quickly', 'Change screen brightness', 'Protect against viruses', 'Insert images only'], [0], 'Styles also power the Navigation pane and TOC.'],
    ['Word', 'intermediate', 'single_choice', 'A Table of Contents in Word is best generated by:', ['Typing manually', 'References → Table of Contents using heading styles', 'Copy-paste from web', 'Insert symbol'], [1], 'Heading styles make it auto-updatable.'],
    ['Excel', 'beginner', 'single_choice', 'Which function adds numbers in cells A1:A10?', ['SUM(A1:A10)', 'ADD(A1:A10)', 'TOTAL(A1:A10)', 'PLUS(A1:A10)'], [0], '=SUM(A1:A10).'],
    ['Excel', 'beginner', 'single_choice', 'A cell reference $A$1 is:', ['Relative', 'Absolute — does not change when copied', 'Mixed', 'Invalid'], [1], '$ locks column and row when filling/copying formulas.'],
    ['Excel', 'intermediate', 'single_choice', 'An IF formula does:', ['Sorts data', 'Returns one value if a condition is TRUE, another if FALSE', 'Formats cells', 'Deletes rows'], [1], '=IF(B2>=60,"Pass","Fail").'],
    ['Excel', 'intermediate', 'single_choice', 'VLOOKUP with range_lookup FALSE does:', ['Approximate match always', 'Exact match search', 'Vertical sorting', 'Horizontal lookup'], [1], 'FALSE forces exact matches (safer for IDs/names).'],
    ['PowerPoint', 'beginner', 'single_choice', 'Slide Master is used to:', ['Play music', 'Define consistent layout/design across all slides at once', 'Print slides', 'Compress files'], [1], 'Change fonts/logos once — updates every slide.'],
    ['PowerPoint', 'beginner', 'single_choice', 'Best practice for slide text is:', ['Paste full paragraphs', 'Keep points short with visual support', 'Use 10+ animations per slide', 'Never use headings'], [1], 'Slides support your talk — they are not a document.'],
    ['Formatting', 'intermediate', 'multiple_choice', 'Which are keyboard shortcuts in MS Office?', ['Ctrl+C (copy)', 'Ctrl+Z (undo)', 'Ctrl+S (save)', 'Ctrl+Q = quit all apps always'], [0, 1, 2], 'Ctrl+C/Z/S are universal; Ctrl+Q does not quit Office apps.'],
  ],
};
