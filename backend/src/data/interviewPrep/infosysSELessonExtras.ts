/**
 * Lesson reader extras for the Infosys SE Train lessons (INFOSYS_SE_3T_UX_PLAN §3),
 * keyed by lesson title: a plain "what it is", two more worked examples, and a
 * pattern that picks the lesson's practice questions from the Infosys bank.
 */
export interface LessonExtra { what: string; examples: string[]; match: RegExp }

export const LESSON_EXTRAS: Record<string, LessonExtra> = {
  'Percentages: price and consumption': {
    what: 'Percent means "out of 100". Infosys asks it as price rises/falls, salary changes and successive discounts. Always find the base (old value) first.',
    examples: [
      'Salary up 20% then down 20%: 20 − 20 − 400/100 = −4% → a 4% loss overall.',
      '30 is what % of 120? 30/120 × 100 = 25%.',
    ],
    match: /price of a commodity|consumption|increase|decrease|percent/i,
  },
  'Profit and loss': {
    what: 'Cost price (CP) is what you pay, selling price (SP) is what you get. Gain or loss is always measured on CP.',
    examples: [
      'CP ₹400, SP ₹500 → profit 100, profit% = 100/400 × 100 = 25%.',
      'Sold at ₹840 with 20% loss → CP = 840 × 100/80 = ₹1050.',
    ],
    match: /profit|loss|losing|gain|trader|sells|cost price|selling price|marked|discount/i,
  },
  'Time and work, pipes and cisterns': {
    what: 'Think of work as 1 whole job. Each person or pipe finishes a fraction of it every hour; add the fractions to work together.',
    examples: [
      'A in 10 days, B in 15 days: 1/10 + 1/15 = 1/6 → 6 days together.',
      'A and B together 12 days, A alone 20 days: B = 1/12 − 1/20 = 1/30 → 30 days.',
    ],
    match: /pipe|tank|cistern|fill|work|days/i,
  },
  'Speed, distance, boats and streams': {
    what: 'Distance = speed × time. Trains, boats and races are the same formula with the right relative speed.',
    examples: [
      'Train 150 m long at 54 km/h (15 m/s) crosses a pole in 150/15 = 10 s.',
      'Boat 10 km/h, stream 2 km/h: 24 km downstream takes 24/12 = 2 h.',
    ],
    match: /boat|stream|speed|km\/h|train|distance/i,
  },
  'Ratios, ages and mixtures': {
    what: 'A ratio a:b means the amounts are ax and bx. Find x from the one fact given, then answer.',
    examples: [
      '₹1200 shared 3:5 → 3/8 × 1200 = ₹450 and ₹750.',
      '40 L milk-water 3:1; add 10 L water → milk 30, water 20 → 3:2.',
    ],
    match: /ages?|mixture|milk|ratio/i,
  },
  'Number system shortcuts': {
    what: 'Divisibility, remainders, unit digits and factorial zeros. One rule each saves long division.',
    examples: [
      'Unit digit of 7^23: cycle 7,9,3,1 (length 4); 23 mod 4 = 3 → 3.',
      '123456 divisible by 3? Digit sum 21 → yes.',
    ],
    match: /zeros|factorial|digit|divisib|remainder|prime|x \+ 1\/x|bells|toll|lcm|hcf/i,
  },
  'Probability and combinations': {
    what: 'Combinations count choices (order does not matter), permutations count arrangements (order matters). Probability = favourable ÷ total.',
    examples: [
      'Choose 2 of 5 people: 5C2 = 10.',
      'Two dice, sum 7: 6 favourable of 36 → 1/6.',
    ],
    match: /probab|bag|ways|choose|select|dice|coin|card/i,
  },
  'Averages and data interpretation': {
    what: 'Average = total ÷ count. For charts and tables, read the units first and work with totals, not averages.',
    examples: [
      'Avg of 5 numbers is 20; one removed, avg of 4 is 18 → removed = 100 − 72 = 28.',
      'Sales 200 → 250: growth = 50/200 = 25%.',
    ],
    match: /average|next two questions|table|chart|mean/i,
  },
  'Syllogisms': {
    what: 'Two or three statements, then conclusions. Draw circles (Venn diagrams) and accept only what is true in every drawing.',
    examples: [
      'All cats are animals; some animals are pets → "Some cats are pets" does NOT follow.',
      'All A are B; all B are C → All A are C (follows).',
    ],
    match: /all |some |no |conclusion|statement/i,
  },
  'Coding and decoding': {
    what: 'A word is changed by a fixed rule (letter shift, reversal, position numbers). Find the rule on the example, apply it once.',
    examples: [
      'CAT → DBU (+1 each) so DOG → EPH.',
      'A=1…Z=26: BAD = 2+1+4 = 7.',
    ],
    match: /code|coded|written as|language/i,
  },
  'Blood relations': {
    what: 'Draw a small family tree: + for male, − for female, horizontal line for siblings, vertical for parent-child.',
    examples: [
      '"Pointing to a man, Riya says: his mother is my mother\'s only daughter" → Riya is his mother.',
      'A is B\'s sister, B is C\'s father → A is C\'s aunt.',
    ],
    match: /father|mother|brother|sister|son|daughter|related|uncle/i,
  },
  'Direction sense': {
    what: 'Draw every turn on paper with North up. Right turn from North faces East; distance from start uses Pythagoras.',
    examples: [
      '4 km North, then 3 km East → 5 km from start, towards North-East.',
      'Facing South, turn left → facing East.',
    ],
    match: /north|south|east|west|direction|turn|left|right/i,
  },
  'Seating arrangement': {
    what: 'Fix one definite person first, then place the others from the strongest clue. Circular: facing centre means left = clockwise.',
    examples: [
      '5 in a row, C in the middle, A at an end next to B → A B C _ _.',
      'Round table of 6: opposite of seat 1 is seat 4.',
    ],
    match: /sit|seat|row|circle|table|facing|arrange/i,
  },
  'Data sufficiency, assumptions and ranking': {
    what: 'Decide if the statements are ENOUGH, not the answer itself. Ranking: total = rank from top + rank from bottom − 1.',
    examples: [
      'Rank 7th from top and 12th from bottom → 18 students.',
      'Is x even? (1) x² is even → enough.',
    ],
    match: /rank|sufficient|assum|statement|position/i,
  },
  'Reading comprehension': {
    what: 'Read the questions first, then the passage. The answer is stated or directly implied; never use outside knowledge.',
    examples: [
      'Main idea questions: pick the option that covers the whole passage, not one paragraph.',
      'Tone questions: look at adjectives the author uses (critical, neutral, hopeful).',
    ],
    match: /passage|author|paragraph|according/i,
  },
  'Para jumbles': {
    what: 'Find the opening sentence (introduces the topic, no "this/he/however"), then link pairs with pronouns and connectors.',
    examples: [
      'A sentence starting with "However" is never first.',
      '"He" in sentence C needs the person to be named in an earlier sentence.',
    ],
    match: /order|sequence|arrange|sentence/i,
  },
  'Sentence correction and fill in the blanks': {
    what: 'Check subject-verb agreement, tense, prepositions and articles, in that order.',
    examples: [
      '"Each of the boys have…" → "Each of the boys has…".',
      '"She is good ___ maths" → at.',
    ],
    match: /error|correct|blank|grammat|fill/i,
  },
  'Vocabulary and idioms': {
    what: 'Synonyms, antonyms and idioms. Use the sentence context and word roots when you do not know the word.',
    examples: [
      '"Benevolent" (bene = good) → kind.',
      '"Hit the nail on the head" → describe exactly right.',
    ],
    match: /synonym|antonym|meaning|idiom|word/i,
  },
  'Tracing loops': {
    what: 'Make a table with one column per variable and one row per loop pass. Update it line by line; never guess.',
    examples: [
      'i=1; while i<20: i=i*2 → 1,2,4,8,16,32 → loop runs 5 times.',
      'sum=0; for i 1..5: sum+=i → 15.',
    ],
    match: /loop|while|for |print|output/i,
  },
  'Nested loops and counting': {
    what: 'Inner loop runs fully for each outer pass. Count = outer passes × inner passes (or a sum if inner depends on outer).',
    examples: [
      'for i 1..4, for j 1..3 → 12 prints.',
      'for i 1..n, for j 1..i → n(n+1)/2.',
    ],
    match: /nested|times|count|for /i,
  },
  'Recursion': {
    what: 'A function calls itself on a smaller input until a base case. Write the calls going down, then add results coming back up.',
    examples: [
      'f(n) = n + f(n−1), f(0)=0 → f(4) = 10.',
      'fib(5) with fib(0)=0, fib(1)=1 → 5.',
    ],
    match: /recurs|fun\(|function|return/i,
  },
  'Arrays, digits and bits': {
    what: 'Digit loops use n%10 (last digit) and n/10 (drop it). Bits: & keeps common 1s, | combines, ^ flips different bits, << doubles.',
    examples: [
      'Reverse 123 with r=r*10+n%10 → 321.',
      '5 & 3 = 1, 5 | 3 = 7, 5 ^ 3 = 6.',
    ],
    match: /array|digit|bit|&|\^|<<|%/i,
  },
  'Scheduling and truth/lie puzzles': {
    what: 'Make a grid (people × days/slots). Fill certainties first, then test each "liar" case and keep the one with no contradiction.',
    examples: [
      'If A says "B lies" and B says "A lies", exactly one of them tells the truth.',
      'Mon–Fri, P before Q, Q on Wed → P on Mon or Tue.',
    ],
    match: /day|week|truth|lie|schedule|monday/i,
  },
  'Classic logic and 4×4 grids': {
    what: 'Each row and column has every value once. Start with the row or column that has the most filled cells.',
    examples: [
      'Row has 1, 3, _ , 4 → missing is 2.',
      'If a column already has 2, no other cell in it can be 2.',
    ],
    match: /grid|sudoku|row|column|puzzle/i,
  },
  'Writing task: the email': {
    what: 'Infosys gives a situation and keywords; you write a short formal email. Graded on structure, grammar and using every keyword.',
    examples: [
      'Structure: Subject → greeting → purpose (1 line) → details (2–3 lines) → request/next step → sign-off.',
      'Use every given keyword exactly once, in a natural sentence.',
    ],
    match: /email|mail|write/i,
  },
};
