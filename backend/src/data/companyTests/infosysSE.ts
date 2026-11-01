/**
 * Infosys SE question bank (generated from infosys-se.json by scripts/parseInfosysPdfs.py).
 * A .ts module so it ships inside the compiled server (tsc does not copy .json).
 */
export const INFOSYS_SE_BANK: Array<{ source: string; topic: string; difficulty: string; question: string; options: string[]; correct: number; explanation: string; code: boolean }> = [
 {
  "source": "Guess Paper Set-3 Q1",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "The present ages of a father and his son are in the ratio 5 : 3. After 8 years the ratio of their ages will be 3 :\n2. What is the father’s present age?",
  "options": [
   "32 years",
   "48 years",
   "40 years",
   "24 years"
  ],
  "correct": 2,
  "explanation": "Let the ages be 5x and 3x. After 8 years: (5x + 8)/(3x + 8) = 3/2. Cross-multiplying gives 10x + 16 = 9x + 24, so x = 8. Father = 5 × 8 = 40 years.\n\nMemory trick: Write ages as ratio multiples (px, qx), then add the SAME number of years to both.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q2",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "How many zeros are there at the end of 100! (the factorial of 100)?",
  "options": [
   "23",
   "24",
   "20",
   "25"
  ],
  "correct": 1,
  "explanation": "Trailing zeros = number of factors of 5 = 100/5  + 100/25  + 100/125  + … = 20 + 4 = 24.⌊ ⌋ ⌊ ⌋ ⌊ ⌋\n\nMemory trick: Count the 5s: divide by 5, 25, 125 … and add the quotients.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q3",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "The next two questions are based on the table below, which shows annual sales of two products.\nYear Product A (₹ lakh) Product B (₹ lakh)\n2021 140 90\n2022 80 150\n2023 190 160\n2024 130 150\n\n(Refer to the table.) What is the approximate percentage increase in TOTAL sales (A + B) from 2021 to 2024?",
  "options": [
   "21.7%",
   "17.9%",
   "26.7%",
   "-7.1%"
  ],
  "correct": 0,
  "explanation": "Total 2021 = 140 + 90 = 230; total 2024 = 130 + 150 = 280. Increase = 50/230 × 100 = 21.7%.\n\nMemory trick: Percentage change is always change ÷ OLD value (the earlier year).",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q4",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "The next two questions are based on the table below, which shows annual sales of two products.\nYear Product A (₹ lakh) Product B (₹ lakh)\n2021 140 90\n2022 80 150\n2023 190 160\n2024 130 150\n\n(Refer to the same table.) In which year did Product A show the highest percentage growth over the previous year?",
  "options": [
   "2023",
   "2022",
   "2024",
   "2021"
  ],
  "correct": 0,
  "explanation": "Growth of Product A: 2022 = -60/140 = -42.9%; 2023 = +110/80 = 137.5%; 2024 = -60/190 = - 31.6%. The highest percentage growth is in 2023.\n\nMemory trick: Compare percentages (change ÷ previous year), not rupee changes. The first year has no previous year, so it can never be the answer.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q5",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "If x + 1/x = 7, what is the value of x² + 1/x²?",
  "options": [
   "51",
   "48",
   "49",
   "47"
  ],
  "correct": 3,
  "explanation": "Square both sides: (x + 1/x)² = x² + 2 + 1/x². So x² + 1/x² = 7² − 2 = 47.\n\nMemory trick: Square x + 1/x and subtract 2.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q6",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "The price of a commodity rises by 100%. By what percentage must a household reduce its consumption so that its expenditure stays the same?",
  "options": [
   "55%",
   "50%",
   "100%",
   "45%"
  ],
  "correct": 1,
  "explanation": "Reduction = p/(100 + p) × 100 = 100/200 × 100 = 50%. (Check: price 100 → 200; to keep spending 100 you can buy 100/200 of the old quantity, a fall of 50%.)\n\nMemory trick: Price up by p%: cut consumption by p/(100+p). The two percentages are never equal.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q7",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "A man travels from town A to town B at 40 km/h and returns by the same route at 60 km/h. What is his average speed for the whole journey?",
  "options": [
   "48 km/h",
   "45 km/h",
   "24 km/h",
   "50 km/h"
  ],
  "correct": 0,
  "explanation": "For equal distances, average speed = 2ab/(a + b) = 2 × 40 × 60/(40 + 60) = 4800/100 = 48 km/h. The simple mean 50 is wrong because more time is spent at the lower speed.\n\nMemory trick: Equal distances: harmonic mean 2ab/(a+b), never the plain average.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q8",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "A 56-litre mixture contains milk and water in the ratio 5 : 3. How much water must be added to make the ratio of milk to water 5 : 6?",
  "options": [
   "42 litres",
   "28 litres",
   "21 litres",
   "14 litres"
  ],
  "correct": 2,
  "explanation": "Milk = 35 L and water = 21 L. Milk stays 35 L, so water must become 35 × 6/5 = 42 L. Water to add = 42 − 21 = 21 L.\n\nMemory trick: In ‘add water’ problems the milk quantity is the anchor: it never changes.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q9",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "Pipes A and B can fill a tank in 15 hours and 20 hours respectively, while pipe C can empty the full tank in 30 hours. If all three are opened together, how long will the empty tank take to fill?",
  "options": [
   "14 hours",
   "8.57 hours",
   "12 hours",
   "11.57 hours"
  ],
  "correct": 2,
  "explanation": "Net rate = 1/15 + 1/20 − 1/30 = 1/12 of the tank per hour. Time = 1 ÷ (1/12) = 12 hours.\n\nMemory trick: Add filling rates, subtract emptying rates, then take the reciprocal.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q10",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "The average of 6 numbers is 41. When one number is removed, the average of the remaining numbers becomes 35. What is the number that was removed?",
  "options": [
   "175",
   "246",
   "65",
   "71"
  ],
  "correct": 3,
  "explanation": "Sum of all 6 numbers = 6 × 41 = 246. Sum of the remaining 5 numbers = 5 × 35 = 175. Removed number = 246 − 175 = 71.\n\nMemory trick: Removed number = old total − new total. Always convert averages to totals first.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q11",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "Statements: No dogs are cats. No cats are birds.\nConclusions: I. Some cats are not dogs.  II. Some birds are cats.",
  "options": [
   "Both conclusions follow",
   "Only conclusion I follows",
   "Only conclusion II follows",
   "Neither conclusion follows"
  ],
  "correct": 1,
  "explanation": "Conclusion I follows: it is true in every possible Venn diagram that satisfies the statements. Conclusion II does not follow: in a diagram where the only kinds of members are (cats but neither dogs nor birds; dogs that are also birds but not cats), both statements hold but the conclusion is false.\n\nMemory trick: ‘No’ statements are reversible, and a definite negative link survives chaining with an ‘All’ statement.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q12",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "Statements: Some books are not pens. All books are tables.\nConclusions: I. All pens are tables.  II. Some tables are not pens.",
  "options": [
   "Neither conclusion follows",
   "Only conclusion II follows",
   "Only conclusion I follows",
   "Both conclusions follow"
  ],
  "correct": 1,
  "explanation": "Conclusion I does not follow: in a diagram where the only kinds of members are (pens but neither books nor tables; books that are also tables but not pens), both statements hold but the conclusion is false. Conclusion II follows: it is true in every possible Venn diagram that satisfies the statements.\n\nMemory trick: A conclusion follows only if it holds in EVERY Venn diagram; ‘Some’ statements reverse, ‘All’ statements do not.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q13",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "In a certain code, PAPER is written as OYMAM. Using the same rule, how will SMILE be written?",
  "options": [
   "VKLJH",
   "TOLPJ",
   "UOKNG",
   "RKFHZ"
  ],
  "correct": 3,
  "explanation": "Compare letter by letter: P→O (-1) A→Y (-2) P→M (-3) E→A (-4) R→M (-5). The rule is −1, −2, −3, −4, −5. Applying it to SMILE gives RKFHZ.\n\nMemory trick: Shifts that grow by 1 each place (here backwards) are the classic ‘progressive shift’ pattern.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q14",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "In a certain code language: ‘pink gold blue’ is written ‘fe wi mo’, ‘red blue green’ is written ‘hu mo ga’, and ‘gold red grey’ is written ‘wi hu pa’. What is the code for ‘green’?",
  "options": [
   "wi",
   "ga",
   "fe",
   "mo"
  ],
  "correct": 1,
  "explanation": "‘blue’ is common to sentences 1 and 2, and ‘mo’ is common to their codes, so blue = mo. ‘gold’ is common to sentences 1 and 3, so gold = wi. ‘red’ is common to sentences 2 and 3, so red = hu. In the sentence containing ‘green’, the only code left over after removing the known codes is ‘ga’.\n\nMemory trick: Find the word common to two sentences, then the code common to the same two codes. Repeat, and the leftover pair matches.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q15",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "Pointing to a photograph, Anil says, “She is the daughter of the only son of my father’s father.” How is the girl related to Anil?",
  "options": [
   "Niece",
   "Aunt",
   "Sister",
   "Cousin"
  ],
  "correct": 2,
  "explanation": "The only son of Anil’s father’s father is Anil’s father. The daughter of Anil’s father is Anil’s sister.\n\nMemory trick: The ‘only son’ of your father’s father must be your father: go up two generations, then come down one.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q16",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "Pointing to a boy, Meera says, “He is the son of my mother’s only brother.” How is the boy related to Meera?",
  "options": [
   "Brother",
   "Uncle",
   "Nephew",
   "Cousin"
  ],
  "correct": 3,
  "explanation": "Meera’s mother’s only brother is Meera’s maternal uncle. His son is Meera’s cousin.\n\nMemory trick: Your parent’s sibling’s child is always your cousin.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q17",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "A man walks 6 km towards the north, turns left and walks 10 km, turns left and walks 11 km, turns right and walks 2 km. How far is he now from his starting point, in a straight line?",
  "options": [
   "12 km",
   "29 km",
   "17 km",
   "13 km"
  ],
  "correct": 3,
  "explanation": "Take the start as (0, 0) with east as +x and north as +y. north 6 km → (0, 6); west 10 km → (- 10, 6); south 11 km → (-10, -5); west 2 km → (-12, -5). Distance = √(-12² + -5²) = √169 = 13 km.\n\nMemory trick: Convert every leg to coordinates, then use Pythagoras on the net east-west and north-south displacement.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q18",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "A man is facing south. He turns 90° clockwise and then 135° clockwise. Which direction is he facing now?",
  "options": [
   "East",
   "South-west",
   "North-east",
   "North-west"
  ],
  "correct": 2,
  "explanation": "Use bearings (North 0°, East 90°, South 180°, West 270°); clockwise adds, anticlockwise subtracts: 180° (South) → 270° (West) → 45° (North-east). He is facing North-east.\n\nMemory trick: Bearings make turns arithmetic: clockwise = add degrees, anticlockwise = subtract, then read the compass.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q19",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "Questions in this set are based on the information below. Six friends A, B, C, D, E and F sit in a row of six chairs, all facing north. The chairs are numbered 1 to 6 from the left end to the right end (as seen by the people sitting). (i) C sits somewhere to the left of A. (ii) F sits somewhere to the left of D. (iii) E sits somewhere to the left of B. (iv) A does not sit next to F. (v) E sits at one of the two extreme ends. (vi) D sits second to the right of A.\n\n(Seating arrangement) Who sits on chair number 2?",
  "options": [
   "F",
   "D",
   "A",
   "B"
  ],
  "correct": 0,
  "explanation": "Method: place the clue that fixes a chair or a block first (end-chair, ‘second to the right’, ‘between’), then attach the remaining clues one by one. The only order that satisfies every clue is E F C A B D (chairs 1 to 6). Chair 2 is occupied by F.\n\nMemory trick: Fix the block clues first, then fill chairs using the ‘end’ and ‘not at the end’ clues.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q20",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "Questions in this set are based on the information below. Six friends A, B, C, D, E and F sit in a row of six chairs, all facing north. The chairs are numbered 1 to 6 from the left end to the right end (as seen by the people sitting). (i) C sits somewhere to the left of A. (ii) F sits somewhere to the left of D. (iii) E sits somewhere to the left of B. (iv) A does not sit next to F. (v) E sits at one of the two extreme ends. (vi) D sits second to the right of A.\n\n(Same arrangement) Who sits immediately to the right of A?",
  "options": [
   "B",
   "F",
   "D",
   "C"
  ],
  "correct": 0,
  "explanation": "Method: place the clue that fixes a chair or a block first (end-chair, ‘second to the right’, ‘between’), then attach the remaining clues one by one. The only order that satisfies every clue is E F C A B D (chairs 1 to 6). A is on chair 4, so the person on chair 5, B, sits immediately to A’s right.\n\nMemory trick: Facing north, ‘right’ means towards the higher chair numbers.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q21",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "Questions in this set are based on the information below. Six friends A, B, C, D, E and F sit in a row of six chairs, all facing north. The chairs are numbered 1 to 6 from the left end to the right end (as seen by the people sitting). (i) C sits somewhere to the left of A. (ii) F sits somewhere to the left of D. (iii) E sits somewhere to the left of B. (iv) A does not sit next to F. (v) E sits at one of the two extreme ends. (vi) D sits second to the right of A.\n\n(Same arrangement) How many persons sit between C and D?",
  "options": [
   "None",
   "Three",
   "Two",
   "One"
  ],
  "correct": 2,
  "explanation": "Method: place the clue that fixes a chair or a block first (end-chair, ‘second to the right’, ‘between’), then attach the remaining clues one by one. The only order that satisfies every clue is E F C A B D (chairs 1 to 6). C is on chair 3 and D is on chair 6, so 3−1 = 2 persons sit between them.\n\nMemory trick: Persons between two chairs = difference of chair numbers − 1.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q22",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "What is the age of Meera?\nI. Meera is 4 years older than Neha.\nII. The sum of the ages of Meera and Neha is 44 years.",
  "options": [
   "Both statements together are needed",
   "Statement I alone is sufficient",
   "Statement II alone is sufficient",
   "Neither is sufficient even together"
  ],
  "correct": 0,
  "explanation": "From I alone: M = N + 4 (two unknowns). From II alone: M + N = 44 (two unknowns). Together: 2N + 4 = 44, so N = 20 and M = 24. Both are needed.\n\nMemory trick: Test each statement ALONE first, then combine. If each gives one equation in two unknowns, you need both.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q23",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "What is the speed of the train?\nI. It covers 360 km in 5 hours.\nII. The train is longer than 100 metres.",
  "options": [
   "Neither is sufficient even together",
   "Both statements together are needed",
   "Statement II alone is sufficient",
   "Statement I alone is sufficient"
  ],
  "correct": 3,
  "explanation": "Speed = distance/time = 360/5 = 72 km/h, so Statement I alone is enough. Statement II gives only a length, not a speed.\n\nMemory trick: Speed needs distance AND time. If one statement gives both, it is sufficient on its own.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q24",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "Statement: The government has decided to subsidise solar panels for rural households to reduce their dependence on diesel generators.\nWhich of the following is an assumption implicit in this decision?\nI. Rural households are more likely to adopt solar panels if they are subsidised. II. Diesel generators will be completely banned in villages.",
  "options": [
   "Only assumption I is implicit",
   "Both assumptions are implicit",
   "Only assumption II is implicit",
   "Neither assumption is implicit"
  ],
  "correct": 0,
  "explanation": "The subsidy makes sense only if it encourages adoption, so I is implicit. Nothing in the decision says diesel generators will be banned, so II is not implicit.\n\nMemory trick: Negate the assumption: if the decision collapses when it is false, it is implicit.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q25",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "In a class of 50 students, Rohit ranks 18th from the top. Mohan is 6 places below Rohit. What is Mohan’s rank from the bottom?",
  "options": [
   "24th",
   "28th",
   "26th",
   "27th"
  ],
  "correct": 3,
  "explanation": "Mohan’s rank from the top = 18 + 6 = 24. Rank from the bottom = 50 − 24 + 1 = 27.\n\nMemory trick: Rank from bottom = total − rank from top + 1.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q26",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Passage 1\nFarmers in several districts have begun using inexpensive soil sensors that send readings to a mobile app. The app does not give orders; it suggests when to water and how much fertiliser to apply, based on the moisture and nutrient levels it records. Early users report that they now spend less on fertiliser and that their yields have become more even from one field to the next. Agricultural experts, however, warn that the technology works well only when the readings are accurate, and that sensors left in the soil for several seasons can drift. Some farmers have also complained that the advice arrives in English, which many of them find hard to read. Experts therefore argue that the true test of the technology is not the sophistication of its sensors but whether ordinary farmers can understand, trust and act on what the app tells them.\n\nWhich statement best expresses the central idea of the passage?",
  "options": [
   "Farm technology succeeds only if farmers can understand and trust it.",
   "Soil sensors have made fertiliser unnecessary for most small farmers in the region.",
   "Sensors are too inaccurate to be used on small farms with limited income.",
   "Mobile apps should replace the advice of agricultural experts in every district."
  ],
  "correct": 0,
  "explanation": "The passage describes the benefits of the sensors, then their limits, and ends by saying the real test is whether farmers understand, trust and act on the advice.\n\nMemory trick: Main idea = the author’s closing sentence in your own words.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q27",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Passage 1\nFarmers in several districts have begun using inexpensive soil sensors that send readings to a mobile app. The app does not give orders; it suggests when to water and how much fertiliser to apply, based on the moisture and nutrient levels it records. Early users report that they now spend less on fertiliser and that their yields have become more even from one field to the next. Agricultural experts, however, warn that the technology works well only when the readings are accurate, and that sensors left in the soil for several seasons can drift. Some farmers have also complained that the advice arrives in English, which many of them find hard to read. Experts therefore argue that the true test of the technology is not the sophistication of its sensors but whether ordinary farmers can understand, trust and act on what the app tells them.\n\nWhich problem do experts mention about sensors left in the soil for several seasons?",
  "options": [
   "They stop sending any data to the mobile app at all.",
   "They become too costly for most farmers to replace each year.",
   "They release chemicals that slowly damage the growing crops.",
   "Their readings can drift from the true values."
  ],
  "correct": 3,
  "explanation": "The passage says sensors left in the soil for several seasons ‘can drift’, meaning their readings become less accurate.\n\nMemory trick: For detail questions, find the exact sentence and match its meaning, not a similar-sounding idea.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q28",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Passage 1\nFarmers in several districts have begun using inexpensive soil sensors that send readings to a mobile app. The app does not give orders; it suggests when to water and how much fertiliser to apply, based on the moisture and nutrient levels it records. Early users report that they now spend less on fertiliser and that their yields have become more even from one field to the next. Agricultural experts, however, warn that the technology works well only when the readings are accurate, and that sensors left in the soil for several seasons can drift. Some farmers have also complained that the advice arrives in English, which many of them find hard to read. Experts therefore argue that the true test of the technology is not the sophistication of its sensors but whether ordinary farmers can understand, trust and act on what the app tells them.\n\nAccording to the passage, which is true of the app?",
  "options": [
   "It works equally well with or without accurate sensor readings.",
   "It recommends water and fertiliser amounts from recorded readings.",
   "It sends instructions that every farmer is required to follow strictly.",
   "It gives its advice in the local language of each farmer using it."
  ],
  "correct": 1,
  "explanation": "The app ‘does not give orders’; it suggests watering and fertiliser amounts based on the moisture and nutrient levels it records. Its advice comes in English, not local languages, and it depends on accurate readings.\n\nMemory trick: Reject options that contradict a sentence in the passage; the true option restates one.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q29",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Passage 1\nFarmers in several districts have begun using inexpensive soil sensors that send readings to a mobile app. The app does not give orders; it suggests when to water and how much fertiliser to apply, based on the moisture and nutrient levels it records. Early users report that they now spend less on fertiliser and that their yields have become more even from one field to the next. Agricultural experts, however, warn that the technology works well only when the readings are accurate, and that sensors left in the soil for several seasons can drift. Some farmers have also complained that the advice arrives in English, which many of them find hard to read. Experts therefore argue that the true test of the technology is not the sophistication of its sensors but whether ordinary farmers can understand, trust and act on what the app tells them.\n\nThe word ‘sophistication’ as used in the last sentence most nearly means:",
  "options": [
   "technical advancement",
   "low price",
   "popularity among users",
   "ease of use"
  ],
  "correct": 0,
  "explanation": "‘Sophistication of its sensors’ refers to how advanced and complex the sensors are, i.e. technical advancement.\n\nMemory trick: Replace the word with each option and keep the one that preserves the sentence’s meaning.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q30",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Passage 2\nMany predicted that the spread of the internet would empty public libraries. Instead, visits to libraries in several cities have risen over the past decade, although fewer people now come to borrow printed books. Librarians say that visitors increasingly arrive to use free internet access, attend skill-building workshops or simply find a quiet place to study. Some libraries have added recording studios and coding clubs, turning shelves of books into shared workshops. Critics argue that these additions drift away from the traditional purpose of a library. Supporters respond that a library has always been a place where knowledge is shared, and that only the form of that knowledge has changed.\n\nWhat is the main idea of the passage?",
  "options": [
   "Libraries are surviving by adapting to new ways of sharing knowledge.",
   "Printed books are no longer of any use to library visitors today.",
   "The internet has made public libraries completely unnecessary in cities.",
   "Recording studios are the most important service a library offers now."
  ],
  "correct": 0,
  "explanation": "The passage shows libraries gaining visitors by adding new services, and supporters say only the form of knowledge sharing has changed.\n\nMemory trick: Main idea covers the whole passage, not one example like the recording studios.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q31",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Passage 2\nMany predicted that the spread of the internet would empty public libraries. Instead, visits to libraries in several cities have risen over the past decade, although fewer people now come to borrow printed books. Librarians say that visitors increasingly arrive to use free internet access, attend skill-building workshops or simply find a quiet place to study. Some libraries have added recording studios and coding clubs, turning shelves of books into shared workshops. Critics argue that these additions drift away from the traditional purpose of a library. Supporters respond that a library has always been a place where knowledge is shared, and that only the form of that knowledge has changed.\n\nAccording to the passage, why do many visitors now come to libraries?",
  "options": [
   "To watch films in the library’s large recording theatres.",
   "To use the internet, attend workshops or study quietly.",
   "To borrow printed books in larger numbers than before.",
   "To sell their old books to the library at fair prices."
  ],
  "correct": 1,
  "explanation": "The librarians quoted say visitors arrive for free internet access, skill-building workshops or a quiet place to study.\n\nMemory trick: Look for the sentence that begins with ‘Librarians say…’: it lists the reasons.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q32",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Passage 2\nMany predicted that the spread of the internet would empty public libraries. Instead, visits to libraries in several cities have risen over the past decade, although fewer people now come to borrow printed books. Librarians say that visitors increasingly arrive to use free internet access, attend skill-building workshops or simply find a quiet place to study. Some libraries have added recording studios and coding clubs, turning shelves of books into shared workshops. Critics argue that these additions drift away from the traditional purpose of a library. Supporters respond that a library has always been a place where knowledge is shared, and that only the form of that knowledge has changed.\n\nWhich can be inferred about library use over the past decade?",
  "options": [
   "Library visits fell because people stopped borrowing books.",
   "Visits have grown even as book borrowing has declined.",
   "Both visits and book borrowing have grown at the same pace.",
   "Only large cities have seen any change in library visits."
  ],
  "correct": 1,
  "explanation": "The passage says visits have risen while fewer people come to borrow printed books, so visits grew even as borrowing declined.\n\nMemory trick: An inference must follow directly from two stated facts; here: visits rose, borrowing fell.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q33",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Passage 2\nMany predicted that the spread of the internet would empty public libraries. Instead, visits to libraries in several cities have risen over the past decade, although fewer people now come to borrow printed books. Librarians say that visitors increasingly arrive to use free internet access, attend skill-building workshops or simply find a quiet place to study. Some libraries have added recording studios and coding clubs, turning shelves of books into shared workshops. Critics argue that these additions drift away from the traditional purpose of a library. Supporters respond that a library has always been a place where knowledge is shared, and that only the form of that knowledge has changed.\n\nWhat is the critics’ main objection to the new library services?",
  "options": [
   "They move libraries away from their traditional purpose.",
   "They are used only by a very small number of people.",
   "They make the quiet study areas noisy for other readers.",
   "They cost far more than the libraries can afford to spend."
  ],
  "correct": 0,
  "explanation": "Critics argue the additions ‘drift away from the traditional purpose of a library’.\n\nMemory trick: Attribute each view to the right group: critics object, supporters defend.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q34",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Rearrange the sentences to form a coherent paragraph.\nP. Many people believe that talent alone decides who becomes a skilled musician. Q. Regular, focused effort therefore matters more than raw talent.\nR. Students who practise a little every day often overtake those who practise in occasional long bursts. S. Research on practice, however, tells a different story.",
  "options": [
   "PSQR",
   "PRSQ",
   "PSRQ",
   "QSRP"
  ],
  "correct": 2,
  "explanation": "The paragraph opens with a popular belief; ‘however’ introduces the contrasting research; the third sentence gives the evidence; ‘therefore’ draws the conclusion. Correct order: P–S–R–Q.\n\nMemory trick: A sentence starting with ‘however’ must follow the idea it contradicts; ‘therefore’ goes last.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q35",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Rearrange the sentences to form a coherent paragraph.\nP. A mobile phone can interrupt work even when it is not in use.\nQ. This is why many offices now ask employees to keep phones in drawers during meetings. R. The rule seems small, but it helps people concentrate for longer.\nS. Simply having it on the desk draws part of our attention towards it.",
  "options": [
   "PQRS",
   "PQSR",
   "PSQR",
   "PRSQ"
  ],
  "correct": 2,
  "explanation": "The claim comes first, then the explanation (‘simply having it on the desk’), then ‘This is why’ gives the consequence, and the last sentence comments on the rule just mentioned. Correct order: P–S– Q–R.\n\nMemory trick: ‘This is why…’ always follows the reason it refers to; ‘The rule’ points back to a rule already stated.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q36",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Rearrange the sentences to form a coherent paragraph.\nP. Understanding the difference can save both money and food.\nQ. Every year, thousands of tonnes of food are thrown away by households.\nR. Much of it is edible and is discarded only because it has passed a ‘best before’ date. S. Such dates, however, indicate quality rather than safety.",
  "options": [
   "QSPR",
   "PRSQ",
   "QPRS",
   "QRSP"
  ],
  "correct": 3,
  "explanation": "The problem (food thrown away) is stated first, then its cause (the date), then ‘however’ clarifies what such dates mean, and the last sentence gives the benefit of understanding. Correct order: Q– R–S–P.\n\nMemory trick: ‘Such dates’ refers back to the ‘best before’ date already mentioned.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q37",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Choose the grammatically correct sentence.",
  "options": [
   "Each of the students are submitting an assignment.",
   "Each of the student has submitted an assignment.",
   "Each of the students have submitted an assignment.",
   "Each of the students has submitted an assignment."
  ],
  "correct": 3,
  "explanation": "‘Each’ is singular and takes a singular verb (‘has’); the noun after ‘of’ must be plural (‘students’).\n\nMemory trick: ‘Each’, ‘every’, ‘one of’ + singular verb.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q38",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Choose the grammatically correct sentence.",
  "options": [
   "She is good at mathematics and fond to music.",
   "She is good at mathematics and fond of music.",
   "She is good on mathematics and fond with music.",
   "She is good in mathematics and fond for music."
  ],
  "correct": 1,
  "explanation": "The fixed phrases are ‘good at’ and ‘fond of’.\n\nMemory trick: Learn adjective + preposition pairs: good AT, fond OF, afraid OF, interested IN.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q39",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Choose the grammatically correct sentence.",
  "options": [
   "Her handwriting is better than her brother.",
   "Her handwriting is best than that of her brother.",
   "Her handwriting is better than that of her brother.",
   "Her handwriting is more better than that of her brother."
  ],
  "correct": 2,
  "explanation": "Handwriting must be compared with handwriting (‘that of her brother’), not with a person. ‘More better’ and ‘best than’ are both incorrect forms.\n\nMemory trick: Compare like with like: handwriting with handwriting, so use ‘that of’.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q40",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "The manager asked the team to ______ the report before sending it to the client.",
  "options": [
   "reproduce",
   "proofread",
   "proclaim",
   "preview"
  ],
  "correct": 1,
  "explanation": "‘Proofread’ means to check a text for mistakes before it is finalised; the other words do not fit with ‘the report’.\n\nMemory trick: Read the full sentence and test each option for meaning AND grammar.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q41",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "She was so ______ by the sudden news that she could not speak.",
  "options": [
   "overwhelmed",
   "overlooked",
   "overturned",
   "overestimated"
  ],
  "correct": 0,
  "explanation": "‘Overwhelmed’ means emotionally overpowered; the other words do not describe a feeling.\n\nMemory trick: Pick the word that matches the result in the sentence (could not speak = strong emotion).",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q42",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Neither of the two answers ______ correct.",
  "options": [
   "are",
   "have been",
   "is",
   "were"
  ],
  "correct": 2,
  "explanation": "‘Neither’ takes a singular verb, so ‘is’.\n\nMemory trick: Neither / either / each / one + singular verb.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q43",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Choose the word closest in meaning to METICULOUS.",
  "options": [
   "thorough",
   "doubtful",
   "careless",
   "hurried"
  ],
  "correct": 0,
  "explanation": "‘Meticulous’ means showing great attention to detail, i.e. thorough.\n\nMemory trick: Link to the root: ‘meticulous’ people check every detail.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q44",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Choose the word most nearly opposite in meaning to SCARCE.",
  "options": [
   "insufficient",
   "inadequate",
   "plentiful",
   "deficient"
  ],
  "correct": 2,
  "explanation": "‘Scarce’ means in short supply; its opposite is ‘plentiful’. The other three words are close to scarce.\n\nMemory trick: Spot which options are synonyms of the given word; the antonym is the odd one out.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q45",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "What does the idiom ‘to break the ice’ mean?",
  "options": [
   "to start a friendly talk",
   "to make a risky decision quickly",
   "to destroy a frozen surface completely",
   "to end a friendship suddenly"
  ],
  "correct": 0,
  "explanation": "The idiom means to ease awkwardness at the beginning of a meeting by starting a conversation.\n\nMemory trick: Picture the ice as the cold silence between strangers.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q46",
  "topic": "pseudocode",
  "difficulty": "intermediate",
  "question": "What is the output of the following pseudocode?\n\na = 1\ns = 0\nwhile (a <= 100)\n    s = s + a\n    a = a * 3\nend while\nprint s",
  "options": [
   "243",
   "120",
   "121",
   "364"
  ],
  "correct": 2,
  "explanation": "Dry run (value of a added to s in each pass): a=1, s=1; a=3, s=4; a=9, s=13; a=27, s=40; a=81, s=121. The loop stops when a becomes 243, which is more than 100. Output s = 121.\n\nMemory trick: Make a two-column table of a and s; check the loop condition (<= versus <) BEFORE each pass.",
  "code": true
 },
 {
  "source": "Guess Paper Set-3 Q47",
  "topic": "pseudocode",
  "difficulty": "intermediate",
  "question": "What is the output of the following pseudocode?\n\ncount = 0\nfor i = 1 to 4\n    for j = i to 4\n        if ((i + j) mod 2 == 0)\n            count = count + 1\n        end if\n    end for\nend for\nprint count",
  "options": [
   "5",
   "7",
   "8",
   "6"
  ],
  "correct": 3,
  "explanation": "Count row by row (inner j runs from i to 4): i=1 → 2, i=2 → 2, i=3 → 1, i=4 → 1. Total = 6.\n\nMemory trick: When the inner loop starts at i, the pairs form a triangle: count each row separately.",
  "code": true
 },
 {
  "source": "Guess Paper Set-3 Q48",
  "topic": "pseudocode",
  "difficulty": "intermediate",
  "question": "What is the output of the following pseudocode?\n\nfunction f(n)\n    if (n <= 2)\n        return n\n    end if\n    return f(n - 1) + f(n - 3)\nend function\nprint f(5)",
  "options": [
   "3",
   "5",
   "4",
   "7"
  ],
  "correct": 1,
  "explanation": "Build the table from the base cases (f(n) = n for n ≤ 2): f(0) = 0, f(1) = 1, f(2) = 2, f(3) = 2, f(4) = 3, f(5) = 5. So f(5) = 5.\n\nMemory trick: Fill the values bottom-up from the base cases; never expand the whole recursion tree.",
  "code": true
 },
 {
  "source": "Guess Paper Set-3 Q49",
  "topic": "pseudocode",
  "difficulty": "intermediate",
  "question": "What is the output of the following pseudocode?\n\narr = [1, 6, 3, 9, 8]\nfor i = 0 to 3\n    if (arr[i] > arr[i + 1])\n        swap(arr[i], arr[i + 1])\n    end if\nend for\nprint arr[0], arr[1], arr[2], arr[3], arr[4]",
  "options": [
   "9 8 6 3 1",
   "1 6 3 9 8",
   "1 3 6 8 9",
   "9 1 3 6 8"
  ],
  "correct": 2,
  "explanation": "This is ONE pass of bubble sort: i=0: no swap; i=1: swap → [1 3 6 9 8]; i=2: no swap; i=3: swap → [1 3 6 8 9]. Output: 1 3 6 8 9.\n\nMemory trick: One bubble pass only carries the largest element to the end: the array is NOT fully sorted.",
  "code": true
 },
 {
  "source": "Guess Paper Set-3 Q50",
  "topic": "pseudocode",
  "difficulty": "intermediate",
  "question": "What is the output of the following pseudocode? (Integer division is used for /.)\n\nx = 11\ny = 0\nwhile (x > 0)\n    y = y * 10 + (x mod 2)\n    x = x / 2\nend while\nprint y",
  "options": [
   "3",
   "1011",
   "1101",
   "11"
  ],
  "correct": 2,
  "explanation": "The loop collects remainders of repeated halving: y = 1 → 11 → 110 → 1101. Those remainders are the binary digits of 11 (1011) in REVERSE, so the output is 1101.\n\nMemory trick: Repeated ‘mod 2 and halve’ produces binary digits from the last to the first, i.e. reversed.",
  "code": true
 },
 {
  "source": "Guess Paper Set-3 Q51",
  "topic": "puzzle",
  "difficulty": "intermediate",
  "question": "Five colleagues – Asha, Bala, Chitra, Dev and Esha – each take leave on a different weekday from Monday to Friday. Bala takes leave on the day immediately after Esha. Bala does not take leave on Thursday. There is at least one day between the leave days of Dev and Esha. Chitra does not take leave on Thursday. There is at least one day between the leave days of Asha and Dev. Dev does not take leave on Thursday. Who takes leave on Wednesday?",
  "options": [
   "Chitra",
   "Bala",
   "Dev",
   "Asha"
  ],
  "correct": 3,
  "explanation": "Method: use the clue that fixes a day, then place the linked pairs (‘immediately after’, ‘earlier than’), and finally apply the ‘not’ and ‘at least one day between’ clues to settle what is left. The only schedule that satisfies every clue is Mon: Dev; Tue: Chitra; Wed: Asha; Thu: Esha; Fri: Bala.\n\nMemory trick: Start with the clue that fixes a day, then test the possible slots of the linked pair; the ‘not’ clues eliminate the rest.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q52",
  "topic": "puzzle",
  "difficulty": "intermediate",
  "question": "Exactly one of four suspects – P, Q, R and S – committed a theft, and exactly one of the following four statements is true.\nP: “R is the culprit.”\nQ: “P is not the culprit.”\nR: “I am not the culprit.”\nS: “R is lying.”\nWho is the culprit?",
  "options": [
   "S",
   "R",
   "Q",
   "P"
  ],
  "correct": 3,
  "explanation": "Test each suspect as the culprit and count the true statements. If P is guilty: P false, Q false, R true, S false → 1 true. If Q is guilty: P false, Q true, R true, S false → 2 true. If R is guilty: P true, Q true, R false, S true → 3 true. If S is guilty: P false, Q true, R true, S false → 2 true. Only P gives exactly one true statement, so P is the culprit.\n\nMemory trick: Assume each suspect in turn and count the true statements; only one assumption gives exactly one.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q53",
  "topic": "puzzle",
  "difficulty": "intermediate",
  "question": "You have 27 identical-looking balls, and one of them is slightly heavier than the rest. Using a simple two- pan balance (no weights), what is the minimum number of weighings that GUARANTEES finding the heavier ball?",
  "options": [
   "2",
   "3",
   "5",
   "4"
  ],
  "correct": 1,
  "explanation": "Each weighing has three outcomes (left heavy, right heavy, balanced), so it can split the candidates into three equal groups: 27 → 9 → 3 → 1. That needs 3 weighings (3 × 3 × 3 = 27).\n\nMemory trick: Think in threes: each weighing divides the candidates by 3, so 27 balls need 3 weighings.",
  "code": false
 },
 {
  "source": "Guess Paper Set-3 Q54",
  "topic": "puzzle",
  "difficulty": "intermediate",
  "question": "Fill the 4 × 4 grid so that every row, every column and each of the four 2 × 2 boxes contains the digits 1, 2, 3 and 4 exactly once. What number replaces the question mark (?)?\n\nGrid (_ = empty):\n_ 3 1 _\n1 _ 4 _\n3 4 ? _\n_ _ _ _",
  "options": [
   "4",
   "2",
   "3",
   "1"
  ],
  "correct": 1,
  "explanation": "Step 1: Row 1 has digits 1, 3, column 4 has no digits yet and its 2×2 box has digits 1, 4, so the only digit that fits in row 1, column 4 is 2. Step 2: Row 1 has digits 1, 2, 3, column 1 has digits 1, 3 and its 2×2 box has digits 1, 3, so the only digit that fits in row 1, column 1 is 4. Step 3: Row 2 has digits 1, 4, column 2 has digits 3, 4 and its 2×2 box has digits 1, 3, 4, so the only digit that fits in row 2, column 2 is 2. Step 4: Row 2 has digits 1, 2, 4, column 4 has digits 2 and its 2×2 box has digits 1, 2, 4, so the only digit that fits in row 2, column 4 is 3. Step 5: Row 3 has digits 3, 4, column 3 has digits 1, 4 and its 2×2 box has no digits yet, so the only digit that fits in row 3, column 3 is 2. The cell marked ? is 2. (Full solution: 4 3 1 2 / 1 2 4 3 / 3 4 2 1 / 2 1 3 4.)\n\nMemory trick: Start with the cell whose row, column and box together already contain three different digits: only one digit is left for it.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q1",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "Three bells toll at intervals of 24, 36 and 60 seconds. If they toll together at 12 noon, after how many minutes will they next toll together?",
  "options": [
   "10 minutes",
   "12 minutes",
   "8 minutes",
   "6 minutes"
  ],
  "correct": 3,
  "explanation": "They toll together again at the LCM of 24, 36 and 60 = 360 seconds = 6 minute(s).\n\nMemory trick: ‘Together again’ means LCM; ‘divide equally into the largest pieces’ means HCF.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q2",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "If x + 1/x = 4, what is the value of x² + 1/x²?",
  "options": [
   "16",
   "14",
   "8",
   "15"
  ],
  "correct": 1,
  "explanation": "Square both sides: (x + 1/x)² = x² + 2 + 1/x². So x² + 1/x² = 4² − 2 = 14.\n\nMemory trick: Square x + 1/x and subtract 2.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q3",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "The price of a commodity rises by 150%. By what percentage must a household reduce its consumption so that its expenditure stays the same?",
  "options": [
   "60%",
   "65%",
   "150%",
   "75%"
  ],
  "correct": 0,
  "explanation": "Reduction = p/(100 + p) × 100 = 150/250 × 100 = 60%. (Check: price 100 → 250; to keep spending 100 you can buy 100/250 of the old quantity, a fall of 60%.)\n\nMemory trick: Price up by p%: cut consumption by p/(100+p). The two percentages are never equal.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q4",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "A man travels from town A to town B at 30 km/h and returns by the same route at 45 km/h. What is his average speed for the whole journey?",
  "options": [
   "37.5 km/h",
   "33 km/h",
   "38 km/h",
   "36 km/h"
  ],
  "correct": 3,
  "explanation": "For equal distances, average speed = 2ab/(a + b) = 2 × 30 × 45/(30 + 45) = 2700/75 = 36 km/h. The simple mean 37.5 is wrong because more time is spent at the lower speed.\n\nMemory trick: Equal distances: harmonic mean 2ab/(a+b), never the plain average.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q5",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "A bag holds 4 white, 6 black and 5 yellow balls. Two balls are drawn at random without replacement. What is the probability that both are of the same colour?",
  "options": [
   "77/225",
   "74/105",
   "31/105",
   "38/105"
  ],
  "correct": 2,
  "explanation": "Total ways = C(15,2) = 105. Same colour: C(4,2) + C(6,2) + C(5,2) = 6 + 15 + 10 = 31. Probability = 31/105.\n\nMemory trick: ‘Without replacement’ means combinations: count favourable groups ÷ total groups.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q6",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "The next two questions are based on the table below, which shows annual sales of two products.\nYear Product A (₹ lakh) Product B (₹ lakh)\n2021 100 100\n2022 190 90\n2023 80 160\n2024 100 130\n\n(Refer to the table.) What is the approximate percentage increase in TOTAL sales (A + B) from 2021 to 2024?",
  "options": [
   "15.0%",
   "0.0%",
   "13.0%",
   "30.0%"
  ],
  "correct": 0,
  "explanation": "Total 2021 = 100 + 100 = 200; total 2024 = 100 + 130 = 230. Increase = 30/200 × 100 = 15.0%.\n\nMemory trick: Percentage change is always change ÷ OLD value (the earlier year).",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q7",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "The next two questions are based on the table below, which shows annual sales of two products.\nYear Product A (₹ lakh) Product B (₹ lakh)\n2021 100 100\n2022 190 90\n2023 80 160\n2024 100 130\n\n(Refer to the same table.) In which year did Product A show the highest percentage growth over the previous year?",
  "options": [
   "2024",
   "2022",
   "2023",
   "2021"
  ],
  "correct": 1,
  "explanation": "Growth of Product A: 2022 = +90/100 = 90.0%; 2023 = -110/190 = -57.9%; 2024 = +20/80 = 25.0%. The highest percentage growth is in 2022.\n\nMemory trick: Compare percentages (change ÷ previous year), not rupee changes. The first year has no previous year, so it can never be the answer.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q8",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "A trader sells two articles at ₹900 each. On one he gains 30% and on the other he loses 30%. What is his overall result?",
  "options": [
   "Gain of 9%",
   "Loss of 4.5%",
   "Loss of 9%",
   "No profit, no loss"
  ],
  "correct": 2,
  "explanation": "CP of the first = 900/1.3 = 692.31; CP of the second = 900/0.7 = 1285.71. Total CP = 1978.02, total SP = 1,800, so loss = 178.02, i.e. 9%. Shortcut: x²/100 = 30²/100 = 9%.\n\nMemory trick: Same selling price with equal gain% and loss% always gives a LOSS of x²/100 percent.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q9",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "How many zeros are there at the end of 60! (the factorial of 60)?",
  "options": [
   "15",
   "14",
   "12",
   "13"
  ],
  "correct": 1,
  "explanation": "Trailing zeros = number of factors of 5 = 60/5  + 60/25  + 60/125  + … = 12 + 2 = 14.⌊ ⌋ ⌊ ⌋ ⌊ ⌋\n\nMemory trick: Count the 5s: divide by 5, 25, 125 … and add the quotients.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q10",
  "topic": "math",
  "difficulty": "intermediate",
  "question": "A boat covers 9 km downstream in 1 hour and returns the same distance upstream in 3 hours. What is the speed of the stream?",
  "options": [
   "6 km/h",
   "2 km/h",
   "4 km/h",
   "3 km/h"
  ],
  "correct": 3,
  "explanation": "Downstream speed = 9/1 = 9 km/h. Upstream speed = 9/3 = 3 km/h. Stream speed = (downstream − upstream)/2 = (9 − 3)/2 = 3 km/h.\n\nMemory trick: Stream = (D − U)/2 and boat in still water = (D + U)/2.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q11",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "Statements: No writers are readers. All readers are poets.\nConclusions: I. Some writers are not readers.  II. Some poets are not writers.",
  "options": [
   "Only conclusion II follows",
   "Both conclusions follow",
   "Neither conclusion follows",
   "Only conclusion I follows"
  ],
  "correct": 1,
  "explanation": "Conclusion I follows: it is true in every possible Venn diagram that satisfies the statements. Conclusion II follows: it is true in every possible Venn diagram that satisfies the statements.\n\nMemory trick: ‘No’ statements are reversible, and a definite negative link survives chaining with an ‘All’ statement.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q12",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "Statements: All flowers are plants. No plants are roses.\nConclusions: I. Some plants are not flowers.  II. Some roses are flowers.",
  "options": [
   "Only conclusion I follows",
   "Both conclusions follow",
   "Neither conclusion follows",
   "Only conclusion II follows"
  ],
  "correct": 2,
  "explanation": "Conclusion I does not follow: in a diagram where the only kinds of members are (flowers that are also plants but not roses; roses but neither flowers nor plants), both statements hold but the conclusion is false. Conclusion II does not follow: in a diagram where the only kinds of members are (flowers that are also plants but not roses; roses but neither flowers nor plants), both statements hold but the conclusion is false.\n\nMemory trick: ‘No’ statements are reversible, and a definite negative link survives chaining with an ‘All’ statement.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q13",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "In a certain code, MAP is written as 30. Using the same rule, what is the code for LION?",
  "options": [
   "52",
   "48",
   "50",
   "51"
  ],
  "correct": 2,
  "explanation": "MAP = 13 + 1 + 16 = 30, so the rule is ‘add the alphabet positions’. LION = 12 + 9 + 15 + 14 = 50.\n\nMemory trick: Test the given word first: if the total of alphabet positions matches, apply the same rule.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q14",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "In a certain code language: ‘book lamp pen’ is written ‘li bo ru’, ‘book desk chair’ is written ‘li ti na’, and ‘pen desk bag’ is written ‘ru ti pa’. What is the code for ‘bag’?",
  "options": [
   "li",
   "pa",
   "ru",
   "bo"
  ],
  "correct": 1,
  "explanation": "‘book’ is common to sentences 1 and 2, and ‘li’ is common to their codes, so book = li. ‘pen’ is common to sentences 1 and 3, so pen = ru. ‘desk’ is common to sentences 2 and 3, so desk = ti. In the sentence containing ‘bag’, the only code left over after removing the known codes is ‘pa’.\n\nMemory trick: Find the word common to two sentences, then the code common to the same two codes. Repeat, and the leftover pair matches.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q15",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "A is the brother of B. C is the mother of A. D is the father of C. How is D related to B?",
  "options": [
   "Maternal grandfather",
   "Paternal grandfather",
   "Uncle",
   "Father"
  ],
  "correct": 0,
  "explanation": "C is the mother of both A and B. D is C’s father, so D is the maternal grandfather of B.\n\nMemory trick: Draw a vertical tree: D → C → (A, B). The side of the mother means ‘maternal’.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q16",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "P is the father of Q. Q is the sister of R. R is the mother of S. How is P related to S?",
  "options": [
   "Paternal grandfather",
   "Maternal grandfather",
   "Father",
   "Uncle"
  ],
  "correct": 1,
  "explanation": "Q and R are sisters, so P is also R’s father. R is the mother of S, so P is S’s maternal grandfather.\n\nMemory trick: Siblings share parents: whatever P is to Q, he is to Q’s sister too.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q17",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "A man walks 13 km towards the north, turns left and walks 11 km, turns left and walks 5 km, turns left and walks 5 km. How far is he now from his starting point, in a straight line?",
  "options": [
   "34 km",
   "9 km",
   "14 km",
   "10 km"
  ],
  "correct": 3,
  "explanation": "Take the start as (0, 0) with east as +x and north as +y. north 13 km → (0, 13); west 11 km → (-11, 13); south 5 km → (-11, 8); east 5 km → (-6, 8). Distance = √(-6² + 8²) = √100 = 10 km.\n\nMemory trick: Convert every leg to coordinates, then use Pythagoras on the net east-west and north-south displacement.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q18",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "A man is facing the rising sun. He turns 90° anticlockwise and then 45° anticlockwise. Which direction is he facing now?",
  "options": [
   "South-east",
   "North-west",
   "North",
   "South-west"
  ],
  "correct": 1,
  "explanation": "Use bearings (North 0°, East 90°, South 180°, West 270°); clockwise adds, anticlockwise subtracts: 90° (East) → 0° (North) → 315° (North-west). He is facing North-west.\n\nMemory trick: Bearings make turns arithmetic: clockwise = add degrees, anticlockwise = subtract, then read the compass.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q19",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "Questions in this set are based on the information below. Six friends P, Q, R, S, T and U sit in a row of six chairs, all facing north. The chairs are numbered 1 to 6 from the left end to the right end (as seen by the people sitting). (i) T sits between P and S. (ii) T sits immediately to the left of P. (iii) T sits somewhere to the left of Q. (iv) R sits immediately to the left of Q. (v) Q sits between R and U.\n\n(Seating arrangement) Who sits immediately to the right of P?",
  "options": [
   "R",
   "T",
   "S",
   "Q"
  ],
  "correct": 0,
  "explanation": "Method: place the clue that fixes a chair or a block first (end-chair, ‘second to the right’, ‘between’), then attach the remaining clues one by one. The only order that satisfies every clue is S T P R Q U (chairs 1 to 6). P is on chair 3, so the person on chair 4, R, sits immediately to P’s right.\n\nMemory trick: Facing north, ‘right’ means towards the higher chair numbers.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q20",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "Questions in this set are based on the information below. Six friends P, Q, R, S, T and U sit in a row of six chairs, all facing north. The chairs are numbered 1 to 6 from the left end to the right end (as seen by the people sitting). (i) T sits between P and S. (ii) T sits immediately to the left of P. (iii) T sits somewhere to the left of Q. (iv) R sits immediately to the left of Q. (v) Q sits between R and U.\n\n(Same arrangement) How many persons sit between T and Q?",
  "options": [
   "Four",
   "Two",
   "One",
   "None"
  ],
  "correct": 1,
  "explanation": "Method: place the clue that fixes a chair or a block first (end-chair, ‘second to the right’, ‘between’), then attach the remaining clues one by one. The only order that satisfies every clue is S T P R Q U (chairs 1 to 6). T is on chair 2 and Q is on chair 5, so 3−1 = 2 persons sit between them.\n\nMemory trick: Persons between two chairs = difference of chair numbers − 1.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q21",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "Questions in this set are based on the information below. Six friends P, Q, R, S, T and U sit in a row of six chairs, all facing north. The chairs are numbered 1 to 6 from the left end to the right end (as seen by the people sitting). (i) T sits between P and S. (ii) T sits immediately to the left of P. (iii) T sits somewhere to the left of Q. (iv) R sits immediately to the left of Q. (v) Q sits between R and U.\n\n(Same arrangement) Who sits on chair number 4?",
  "options": [
   "S",
   "Q",
   "R",
   "P"
  ],
  "correct": 2,
  "explanation": "Method: place the clue that fixes a chair or a block first (end-chair, ‘second to the right’, ‘between’), then attach the remaining clues one by one. The only order that satisfies every clue is S T P R Q U (chairs 1 to 6). Chair 4 is occupied by R.\n\nMemory trick: Fix the block clues first, then fill chairs using the ‘end’ and ‘not at the end’ clues.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q22",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "What is the cost price of a shirt?\nI. The profit percentage on it is 10%.\nII. It was sold for ₹440, which gave a profit of ₹40.",
  "options": [
   "Neither is sufficient even together",
   "Statement II alone is sufficient",
   "Both statements together are needed",
   "Statement I alone is sufficient"
  ],
  "correct": 1,
  "explanation": "From II: CP = SP − profit = 440 − 40 = ₹400. Statement I gives only a percentage and no rupee amount, so it cannot fix the cost price.\n\nMemory trick: A percentage alone never gives an absolute value; you need one real amount.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q23",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "Is the integer n even?\nI. n² is even.\nII. n + 3 is odd.",
  "options": [
   "Neither is sufficient even together",
   "Only statement I is sufficient",
   "Each statement alone is sufficient",
   "Only statement II is sufficient"
  ],
  "correct": 2,
  "explanation": "I: the square of an odd number is odd, so if n² is even then n is even. II: n + 3 is odd means n is even (even + odd = odd). Each alone settles the question.\n\nMemory trick: Use parity rules: even + odd = odd; odd × odd = odd.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q24",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "Statement: An online learning platform has decided to release all its new courses with subtitles in five regional languages.\nWhich of the following is an assumption implicit in this decision?\nI. All its existing learners understand only regional languages.\nII. Subtitles in regional languages will help the platform reach more learners.",
  "options": [
   "Only assumption I is implicit",
   "Both assumptions are implicit",
   "Only assumption II is implicit",
   "Neither assumption is implicit"
  ],
  "correct": 2,
  "explanation": "The platform adds subtitles because it expects them to widen its audience, so II is implicit. Assuming that ALL learners understand only regional languages is far too extreme, so I is not implicit.\n\nMemory trick: Reject extreme words like ‘all’, ‘only’, ‘never’ unless the statement itself forces them.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q25",
  "topic": "reasoning",
  "difficulty": "intermediate",
  "question": "In a row of children, Kiran is 20th from the left end and 22nd from the right end. How many children are in the row?",
  "options": [
   "43",
   "41",
   "42",
   "39"
  ],
  "correct": 1,
  "explanation": "Total = (position from left) + (position from right) − 1 = 20 + 22 − 1 = 41.\n\nMemory trick: Total = left position + right position − 1 (the person is counted twice).",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q26",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Passage 1\nIn the last decade, app-based platforms have created millions of short-term jobs, from food delivery to freelance design. Workers value the freedom to choose when they work, and many say they could not manage a fixed nine-to-five schedule because of study or family duties. Yet the same flexibility has a cost. Gig workers rarely receive paid leave, insurance or retirement benefits, and their income can swing sharply from one week to the next. Several governments are now considering rules that would require platforms to contribute to a basic safety net. Platform companies reply that such rules would raise prices and reduce the number of jobs they can offer, leaving workers worse off than before.\n\nWhich statement best summarises the passage?",
  "options": [
   "Governments have already forced platforms to provide insurance to workers.",
   "Platform companies should be closed because they create only short jobs.",
   "Fixed nine-to-five jobs are always better than any form of gig work.",
   "Gig work offers flexibility but raises questions about workers’ security."
  ],
  "correct": 3,
  "explanation": "The passage balances the flexibility workers value against the lack of benefits and income security.\n\nMemory trick: A good summary keeps both sides the passage presents.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q27",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Passage 1\nIn the last decade, app-based platforms have created millions of short-term jobs, from food delivery to freelance design. Workers value the freedom to choose when they work, and many say they could not manage a fixed nine-to-five schedule because of study or family duties. Yet the same flexibility has a cost. Gig workers rarely receive paid leave, insurance or retirement benefits, and their income can swing sharply from one week to the next. Several governments are now considering rules that would require platforms to contribute to a basic safety net. Platform companies reply that such rules would raise prices and reduce the number of jobs they can offer, leaving workers worse off than before.\n\nWhy do many gig workers say they prefer such work?",
  "options": [
   "It lets them fit work around study or family duties.",
   "It allows them to avoid working for any company at all.",
   "It provides paid leave and retirement benefits to all.",
   "It guarantees a steady income at the end of every week."
  ],
  "correct": 0,
  "explanation": "Workers value choosing their hours because a fixed schedule would clash with study or family duties.\n\nMemory trick: Underline the reason words: ‘because of study or family duties’.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q28",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Passage 1\nIn the last decade, app-based platforms have created millions of short-term jobs, from food delivery to freelance design. Workers value the freedom to choose when they work, and many say they could not manage a fixed nine-to-five schedule because of study or family duties. Yet the same flexibility has a cost. Gig workers rarely receive paid leave, insurance or retirement benefits, and their income can swing sharply from one week to the next. Several governments are now considering rules that would require platforms to contribute to a basic safety net. Platform companies reply that such rules would raise prices and reduce the number of jobs they can offer, leaving workers worse off than before.\n\nWhat do platform companies fear about the proposed rules?",
  "options": [
   "They would force the companies to stop using mobile apps altogether.",
   "They would lead governments to take over the platforms completely.",
   "They would make workers refuse every kind of flexible work offered.",
   "They would raise prices and cut the number of jobs offered."
  ],
  "correct": 3,
  "explanation": "The companies say such rules would ‘raise prices and reduce the number of jobs’.\n\nMemory trick: Match the objection to the speaker: platform companies speak in the last sentence.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q29",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Passage 1\nIn the last decade, app-based platforms have created millions of short-term jobs, from food delivery to freelance design. Workers value the freedom to choose when they work, and many say they could not manage a fixed nine-to-five schedule because of study or family duties. Yet the same flexibility has a cost. Gig workers rarely receive paid leave, insurance or retirement benefits, and their income can swing sharply from one week to the next. Several governments are now considering rules that would require platforms to contribute to a basic safety net. Platform companies reply that such rules would raise prices and reduce the number of jobs they can offer, leaving workers worse off than before.\n\nThe phrase ‘swing sharply’ as used in the passage means:",
  "options": [
   "stay steady for a long time",
   "disappear completely at once",
   "rise slowly over many months",
   "change suddenly and greatly"
  ],
  "correct": 3,
  "explanation": "Income that ‘swings sharply’ from week to week goes up and down by large amounts.\n\nMemory trick: In context, ‘swing’ = move up and down; ‘sharply’ = by a lot.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q30",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Passage 2\nScientists studying a mountain lake far from any city were surprised to find tiny fragments of plastic in its water. These microplastics, usually smaller than a grain of rice, are carried by wind and rain from distant roads, clothing fibres and discarded packaging. Researchers do not yet know how much harm they cause to living things, but fish and insects have been found with the fragments in their bodies. Because plastic breaks down very slowly, scientists warn that the quantity in the environment will keep growing even if production were reduced tomorrow. Some argue that waiting for complete proof of harm is risky, and that sensible steps, such as filtering washing-machine water, should begin now.\n\nWhat is the main message of the passage?",
  "options": [
   "Microplastics are everywhere, so early action is wise.",
   "Microplastics have been proved to be deadly for all fish and insects.",
   "Mountain lakes are the only places where microplastics are found.",
   "Plastic production has already been stopped in most countries today."
  ],
  "correct": 0,
  "explanation": "The passage shows widespread presence, admits harm is not fully known, and ends by recommending early steps.\n\nMemory trick: Main idea = discovery + uncertainty + recommendation.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q31",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Passage 2\nScientists studying a mountain lake far from any city were surprised to find tiny fragments of plastic in its water. These microplastics, usually smaller than a grain of rice, are carried by wind and rain from distant roads, clothing fibres and discarded packaging. Researchers do not yet know how much harm they cause to living things, but fish and insects have been found with the fragments in their bodies. Because plastic breaks down very slowly, scientists warn that the quantity in the environment will keep growing even if production were reduced tomorrow. Some argue that waiting for complete proof of harm is risky, and that sensible steps, such as filtering washing-machine water, should begin now.\n\nAccording to the passage, how do microplastics reach remote lakes?",
  "options": [
   "They travel through underground pipes from nearby cities.",
   "They are dumped directly by tourists visiting the lake.",
   "They are produced by fish living inside the lake itself.",
   "They are carried by wind and rain from distant sources."
  ],
  "correct": 3,
  "explanation": "The text says they are carried by wind and rain from roads, clothing fibres and packaging far away.\n\nMemory trick: Find the verb of transport: ‘carried by wind and rain’.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q32",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Passage 2\nScientists studying a mountain lake far from any city were surprised to find tiny fragments of plastic in its water. These microplastics, usually smaller than a grain of rice, are carried by wind and rain from distant roads, clothing fibres and discarded packaging. Researchers do not yet know how much harm they cause to living things, but fish and insects have been found with the fragments in their bodies. Because plastic breaks down very slowly, scientists warn that the quantity in the environment will keep growing even if production were reduced tomorrow. Some argue that waiting for complete proof of harm is risky, and that sensible steps, such as filtering washing-machine water, should begin now.\n\nWhich of the following is NOT given as a source of microplastics?",
  "options": [
   "Dust worn off distant roads",
   "Discarded plastic packaging",
   "Fibres shed from clothing",
   "Waste from nearby factories"
  ],
  "correct": 3,
  "explanation": "Roads, clothing fibres and discarded packaging are named; factories near the lake are not mentioned (the lake is far from any city).\n\nMemory trick: In NOT questions, tick the three mentioned items; the fourth is the answer.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q33",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Passage 2\nScientists studying a mountain lake far from any city were surprised to find tiny fragments of plastic in its water. These microplastics, usually smaller than a grain of rice, are carried by wind and rain from distant roads, clothing fibres and discarded packaging. Researchers do not yet know how much harm they cause to living things, but fish and insects have been found with the fragments in their bodies. Because plastic breaks down very slowly, scientists warn that the quantity in the environment will keep growing even if production were reduced tomorrow. Some argue that waiting for complete proof of harm is risky, and that sensible steps, such as filtering washing-machine water, should begin now.\n\nWhy do some argue that waiting for complete proof of harm is risky?",
  "options": [
   "Because the amount of plastic will keep growing in the meantime.",
   "Because fish and insects cannot survive without any plastic.",
   "Because scientists have already proved that all plastic is harmful.",
   "Because washing machines will stop working without filters."
  ],
  "correct": 0,
  "explanation": "Plastic breaks down so slowly that quantities keep rising, so delay lets the problem grow.\n\nMemory trick: Link the ‘risk’ to the fact stated just before it in the passage.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q34",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Rearrange the sentences to form a coherent paragraph.\nP. Cities often suffer from poor air quality in winter.\nQ. As a result, pollution levels rise even when the number of vehicles stays the same. R. This is why authorities sometimes restrict traffic during the coldest weeks.\nS. Cold air near the ground traps smoke and exhaust fumes close to the surface.",
  "options": [
   "PQRS",
   "PSQR",
   "QSPR",
   "PRSQ"
  ],
  "correct": 1,
  "explanation": "A general problem comes first, then the cause (cold air trapping fumes), then ‘As a result’ gives the effect, and ‘This is why’ gives the final consequence. Correct order: P–S–Q–R.\n\nMemory trick: Cause → effect → action: look for ‘as a result’ and ‘this is why’ to order the end of a paragraph.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q35",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Rearrange the sentences to form a coherent paragraph.\nP. Without both, the structure looks incomplete or collapses when it is tested in conversation. Q. Good learners therefore work on the two together rather than one after the other. R. Learning a language is often compared to building a house.\nS. Vocabulary provides the bricks, while grammar acts as the cement that holds them together.",
  "options": [
   "RSQP",
   "RQPS",
   "RSPQ",
   "RPQS"
  ],
  "correct": 2,
  "explanation": "The comparison is introduced first, then explained (bricks and cement), then the consequence of missing either, and finally ‘therefore’ gives the advice. Correct order: R–S–P–Q.\n\nMemory trick: An analogy is introduced, explained, and then used to draw a conclusion.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q36",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Rearrange the sentences to form a coherent paragraph.\nP. Within months, families who had never visited began to arrive after work.\nQ. The old market in the town had been losing customers for years.\nR. The market that once seemed doomed became the busiest place in the town.\nS. Then the council decided to open it in the evenings with food stalls and music.",
  "options": [
   "QSPR",
   "QRPS",
   "QPRS",
   "SQPR"
  ],
  "correct": 0,
  "explanation": "A story moves in time: the problem, the council’s action (‘Then’), the early result (‘Within months’) and the final outcome. Correct order: Q–S–P–R.\n\nMemory trick: Time words (then, within months, once) give the order of a story.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q37",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Choose the grammatically correct sentence.",
  "options": [
   "The news about the exam results are surprising.",
   "The newses about the exam results was surprising.",
   "The news about the exam results were surprising.",
   "The news about the exam results was surprising."
  ],
  "correct": 3,
  "explanation": "‘News’ looks plural but is an uncountable singular noun, so it takes ‘was’.\n\nMemory trick: News, furniture, advice, information: singular and uncountable.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q38",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Choose the grammatically correct sentence.",
  "options": [
   "She has lived in this city since ten years.",
   "She has lived in this city from ten years.",
   "She has lived in this city for last ten years.",
   "She has lived in this city for ten years."
  ],
  "correct": 3,
  "explanation": "‘For’ is used with a period of time (ten years); ‘since’ is used with a starting point (2016, Monday).\n\nMemory trick: FOR + duration, SINCE + starting point.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q39",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Choose the grammatically correct sentence.",
  "options": [
   "She is an honest person who always tells the truth.",
   "She is an honest person who always tells a truth.",
   "She is a honest person who always tells the whole truth.",
   "She is honest person who always tells the truth."
  ],
  "correct": 0,
  "explanation": "‘Honest’ starts with a vowel sound (the ‘h’ is silent), so ‘an’ is used; ‘the truth’ is the fixed expression.\n\nMemory trick: Use ‘an’ before a vowel SOUND: an hour, an honest man, a university.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q40",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "The company’s profits ______ sharply after the new product was launched.",
  "options": [
   "rose",
   "arose",
   "raised",
   "rouse"
  ],
  "correct": 0,
  "explanation": "‘Rose’ is the past tense of the intransitive verb ‘rise’ (no object). ‘Raised’ needs an object.\n\nMemory trick: Rise has no object; raise needs one.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q41",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "He apologised ______ being late for the meeting.",
  "options": [
   "with",
   "over",
   "upon",
   "for"
  ],
  "correct": 3,
  "explanation": "The verb ‘apologise’ takes ‘for’ before the thing you are sorry about.\n\nMemory trick: Apologise FOR something, apologise TO someone.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q42",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "The lawyer presented ______ evidence that left no room for doubt.",
  "options": [
   "conclusive",
   "concluded",
   "conclusively",
   "conclusion"
  ],
  "correct": 0,
  "explanation": "An adjective is needed before ‘evidence’; ‘conclusive’ means leaving no room for doubt.\n\nMemory trick: Before a noun, choose the adjective form.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q43",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Choose the word closest in meaning to ABUNDANT.",
  "options": [
   "insufficient",
   "occasional",
   "plentiful",
   "limited"
  ],
  "correct": 2,
  "explanation": "‘Abundant’ means existing in large quantities, i.e. plentiful.\n\nMemory trick: Abundant = more than enough.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q44",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "Choose the word most nearly opposite in meaning to EXPAND.",
  "options": [
   "extend",
   "shrink",
   "stretch",
   "enlarge"
  ],
  "correct": 1,
  "explanation": "‘Expand’ means to grow larger; ‘shrink’ means to become smaller. The other options are synonyms of expand.\n\nMemory trick: Eliminate the synonyms first; the opposite is left.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q45",
  "topic": "verbal",
  "difficulty": "intermediate",
  "question": "What does the idiom ‘once in a blue moon’ mean?",
  "options": [
   "very frequently",
   "at midnight",
   "very rarely",
   "every month"
  ],
  "correct": 2,
  "explanation": "A blue moon is a rare event, so the idiom means something that happens very rarely.\n\nMemory trick: Blue moons are rare, so the idiom means ‘almost never’.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q46",
  "topic": "pseudocode",
  "difficulty": "intermediate",
  "question": "What is the output of the following pseudocode? (Integer division is used for /.)\n\nx = 10\nc = 0\nwhile (x > 1)\n    if (x mod 2 == 0)\n        x = x / 2\n    else\n        x = 3 * x + 1\n    end if\n    c = c + 1\nend while\nprint c",
  "options": [
   "16",
   "7",
   "5",
   "6"
  ],
  "correct": 3,
  "explanation": "x takes the values 10 → 5 → 16 → 8 → 4 → 2 → 1. Each arrow is one pass, so c counts 6 passes. Output = 6.\n\nMemory trick: Write the sequence of x values and count the ARROWS (passes), not the numbers.",
  "code": true
 },
 {
  "source": "Guess Paper Set-4 Q47",
  "topic": "pseudocode",
  "difficulty": "intermediate",
  "question": "What is the output of the following pseudocode?\n\ns = 0\nfor i = 1 to 4\n    for j = 1 to i\n        s = s + j\n    end for\nend for\nprint s",
  "options": [
   "40",
   "10",
   "20",
   "24"
  ],
  "correct": 2,
  "explanation": "For each i the inner loop adds 1 + 2 + … + i = i(i+1)/2: i=1: 1; i=2: 3; i=3: 6; i=4: 10. Running total = 20.\n\nMemory trick: Inner loop sum = triangular number i(i+1)/2; add them over all i.",
  "code": true
 },
 {
  "source": "Guess Paper Set-4 Q48",
  "topic": "pseudocode",
  "difficulty": "intermediate",
  "question": "What is the output of the following pseudocode? (Integer division is used for /.)\n\nfunction g(n)\n    if (n == 0)\n        return 0\n    end if\n    return (n mod 10) + g(n / 10)\nend function\nprint g(4729)",
  "options": [
   "74",
   "29",
   "22",
   "23"
  ],
  "correct": 2,
  "explanation": "Each call adds the last digit and passes the rest on: g(4729) = 9 + 2 + 7 + 4 = 22.\n\nMemory trick: This function is a digit-sum: peel off the last digit with mod 10, shorten with / 10.",
  "code": true
 },
 {
  "source": "Guess Paper Set-4 Q49",
  "topic": "pseudocode",
  "difficulty": "intermediate",
  "question": "What is the output of the following pseudocode?\n\narr = [2, 5, 12, 13, 19]\nfor i = 4 down to 1\n    arr[i] = arr[i - 1]\nend for\nprint arr[0], arr[1], arr[2], arr[3], arr[4]",
  "options": [
   "2 2 5 12 13",
   "19 2 5 12 13",
   "19 13 12 5 2",
   "5 12 13 19 2"
  ],
  "correct": 0,
  "explanation": "Going from right to left, each element is overwritten with its left neighbour: arr[4] = 13, arr[3] = 12, arr[2] = 5, arr[1] = 2. Nothing is lost on the way, but arr[0] stays 2 and the old last value 19 is gone. Output: 2 2 5 12 13.\n\nMemory trick: Shifting right leaves the first element copied twice and the last element overwritten; it is not a rotation unless you save the last value.",
  "code": true
 },
 {
  "source": "Guess Paper Set-4 Q50",
  "topic": "pseudocode",
  "difficulty": "intermediate",
  "question": "What is the output of the following pseudocode? (Integer division is used for /.)\n\nx = 94\nc = 0\nwhile (x > 0)\n    c = c + (x mod 2)\n    x = x / 2\nend while\nprint c",
  "options": [
   "4",
   "7",
   "6",
   "5"
  ],
  "correct": 3,
  "explanation": "94 in binary is 1011110. The loop adds each binary digit, so c is the number of 1-bits = 5.\n\nMemory trick: This loop counts the 1s in the binary form of x.",
  "code": true
 },
 {
  "source": "Guess Paper Set-4 Q51",
  "topic": "puzzle",
  "difficulty": "intermediate",
  "question": "Five colleagues – Farah, Gopal, Hema, Imran and Jaya – each take leave on a different weekday from Monday to Friday. Jaya takes leave earlier in the week than Gopal. There is at least one day between the leave days of Gopal and Imran. There is at least one day between the leave days of Imran and Jaya. There is at least one day between the leave days of Farah and Imran. Farah takes leave on the day immediately after Jaya. Hema does not take leave on Tuesday. On which day does Jaya take leave?",
  "options": [
   "Tuesday",
   "Monday",
   "Wednesday",
   "Friday"
  ],
  "correct": 1,
  "explanation": "Method: use the clue that fixes a day, then place the linked pairs (‘immediately after’, ‘earlier than’), and finally apply the ‘not’ and ‘at least one day between’ clues to settle what is left. The only schedule that satisfies every clue is Mon: Jaya; Tue: Farah; Wed: Gopal; Thu: Hema; Fri: Imran.\n\nMemory trick: Start with the clue that fixes a day, then test the possible slots of the linked pair; the ‘not’ clues eliminate the rest.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q52",
  "topic": "puzzle",
  "difficulty": "intermediate",
  "question": "Exactly one of four suspects – A, B, C and D – broke a window, and exactly one of the following four statements is true.\nA: “B is not the culprit.”\nB: “D is the culprit.”\nC: “B is lying.”\nD: “B is not the culprit.”\nWho is the culprit?",
  "options": [
   "B",
   "A",
   "D",
   "C"
  ],
  "correct": 0,
  "explanation": "Test each suspect as the culprit and count the true statements. If A is guilty: A true, B false, C true, D true → 3 true. If B is guilty: A false, B false, C true, D false → 1 true. If C is guilty: A true, B false, C true, D true → 3 true. If D is guilty: A true, B true, C false, D true → 3 true. Only B gives exactly one true statement, so B is the culprit.\n\nMemory trick: Assume each suspect in turn and count the true statements; only one assumption gives exactly one.",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q53",
  "topic": "puzzle",
  "difficulty": "intermediate",
  "question": "At a meeting, 8 people each shake hands exactly once with every other person. How many handshakes take place in all?",
  "options": [
   "56",
   "36",
   "28",
   "16"
  ],
  "correct": 2,
  "explanation": "Each pair shakes hands once, so the number of handshakes = C(8,2) = 8 × 7 / 2 = 28.\n\nMemory trick: Handshakes among n people = n(n − 1)/2 (each pair counted once).",
  "code": false
 },
 {
  "source": "Guess Paper Set-4 Q54",
  "topic": "puzzle",
  "difficulty": "intermediate",
  "question": "Fill the 4 × 4 grid so that every row, every column and each of the four 2 × 2 boxes contains the digits 1, 2, 3 and 4 exactly once. What number replaces the question mark (?)?\n\nGrid (_ = empty):\n_ 1 3 _\n_ 3 _ 2\n_ _ ? _\n_ _ 2 1",
  "options": [
   "4",
   "1",
   "3",
   "2"
  ],
  "correct": 0,
  "explanation": "Step 1: Row 1 has digits 1, 3, column 4 has digits 1, 2 and its 2×2 box has digits 2, 3, so the only digit that fits in row 1, column 4 is 4. Step 2: Row 1 has digits 1, 3, 4, column 1 has no digits yet and its 2×2 box has digits 1, 3, so the only digit that fits in row 1, column 1 is 2. Step 3: Row 2 has digits 2, 3, column 1 has digits 2 and its 2×2 box has digits 1, 2, 3, so the only digit that fits in row 2, column 1 is 4. Step 4: Row 2 has digits 2, 3, 4, column 3 has digits 2, 3 and its 2×2 box has digits 2, 3, 4, so the only digit that fits in row 2, column 3 is 1. Step 5: Row 3 has no digits yet, column 3 has digits 1, 2, 3 and its 2×2 box has digits 1, 2, so the only digit that fits in row 3, column 3 is 4. The cell marked ? is 4. (Full solution: 2 1 3 4 / 4 3 1 2 / 1 2 4 3 / 3 4 2 1.)\n\nMemory trick: Start with the cell whose row, column and box together already contain three different digits: only one digit is left for it.",
  "code": false
 },
 {
  "source": "Pseudocode Set-2 Q46",
  "topic": "pseudocode",
  "difficulty": "beginner",
  "question": "What is the output of the following pseudocode?\n\na = 1\ns = 0\nwhile (a <= 20)\n    s = s + a\n    a = a * 2\nend while\nprint s",
  "options": [
   "15",
   "31",
   "32",
   "63"
  ],
  "correct": 1,
  "explanation": "Make a table of a and s. Trap: forgetting that the test is a <= 20, so a = 16 is still included.  A loop that multiplies its counter runs about log n times.\n\nCommon trap: Stopping a pass early: check <= versus < first.\nCore rule:  Trace first, answer second: update variables in code order and test the condition before every pass.",
  "code": true
 },
 {
  "source": "Pseudocode Set-2 Q48",
  "topic": "pseudocode",
  "difficulty": "advanced",
  "question": "What is the output of the following pseudocode?\n\nfunction f(n)\n    if (n <= 2)\n        return n\n    end if\n    return f(n - 1) + f(n - 3)\nend function\nprint f(6)",
  "options": [
   "9",
   "11",
   "7",
   "5"
  ],
  "correct": 2,
  "explanation": "Build the table bottom-up from the base cases instead of expanding the recursion tree.  Fill the base cases first and build upward.\n\nCommon trap: Expanding the whole call tree.\nCore rule:  Every call needs a base case; results flow back from the base upward.",
  "code": true
 },
 {
  "source": "Pseudocode Set-2 Q49",
  "topic": "pseudocode",
  "difficulty": "intermediate",
  "question": "What is the output of the following pseudocode?\n\narr = [3, 8, 2, 7, 5]\nfor i = 0 to 3\n    if (arr[i] > arr[i + 1])\n        swap(arr[i], arr[i + 1])\n    end if\nend for\nprint arr[0], arr[1], arr[2], arr[3], arr[4]",
  "options": [
   "3 2 5 7 8",
   "2 3 5 7 8",
   "3 2 7 5 8",
   "3 8 2 7 5"
  ],
  "correct": 2,
  "explanation": "Trap: assuming the array is fully sorted. One pass only moves the largest element to the end.  One pass carries the maximum to the end.\n\nCommon trap: Assuming the array is fully sorted.\nCore rule:  Index and value differ: rewrite the array after every step.",
  "code": true
 },
 {
  "source": "Pseudocode Set-2 Q50",
  "topic": "pseudocode",
  "difficulty": "intermediate",
  "question": "What is the output of the following pseudocode?\n\nx = 13\ny = 0\nwhile (x > 0)\n    y = y * 10 + (x mod 2)\n    x = x / 2\nend while\nprint y",
  "options": [
   "13",
   "1011",
   "11",
   "1101"
  ],
  "correct": 1,
  "explanation": "Trap: choosing 1101 (the binary of 13). Digits collected from the remainders come out reversed.  mod 2 and halve produce the bits last-to-first.\n\nCommon trap: Choosing the true binary form instead of its reverse.\nCore rule:  Trace first, answer second: update variables in code order and test the condition before every pass.",
  "code": true
 },
 {
  "source": "Pseudocode Set-5 Q46",
  "topic": "pseudocode",
  "difficulty": "beginner",
  "question": "What is the output of the following pseudocode?\n\ni = 1\ns = 0\nwhile (s < 30)\n    s = s + i\n    i = i + 2\nend while\nprint i",
  "options": [
   "11",
   "36",
   "6",
   "13"
  ],
  "correct": 3,
  "explanation": "Sum of the first n odd numbers = n²; i always runs one step ahead of the last number added.  The sum of the first n odd numbers is n².\n\nCommon trap: Printing s when the question asks for i.\nCore rule:  Trace first, answer second: update variables in code order and test the condition before every pass.",
  "code": true
 },
 {
  "source": "Pseudocode Set-5 Q47",
  "topic": "pseudocode",
  "difficulty": "beginner",
  "question": "What is the output of the following pseudocode?\n\ncount = 0\nfor i = 1 to 5\n    for j = 1 to 5\n        if ((i * j) mod 3 == 0)\n            count = count + 1\n        end if\n    end for\nend for\nprint count",
  "options": [
   "11",
   "9",
   "7",
   "5"
  ],
  "correct": 1,
  "explanation": "Build a small multiplication grid mentally and tick the cells that satisfy the condition.  Count per outer value, then add.\n\nCommon trap: Counting the whole grid when the inner loop starts at i.\nCore rule:  Total work = sum over the outer loop of the inner loop's count.",
  "code": true
 },
 {
  "source": "Pseudocode Set-5 Q48",
  "topic": "pseudocode",
  "difficulty": "advanced",
  "question": "What is the output of the following pseudocode?\n\nfunction fib(n)\n    if (n <= 1)\n        return n\n    end if\n    return fib(n - 1) + fib(n - 2)\nend function\nprint fib(6)",
  "options": [
   "13",
   "5",
   "8",
   "9"
  ],
  "correct": 2,
  "explanation": "fib(n) = fib(n−1) + fib(n−2) with fib(0)=0, fib(1)=1: write the sequence 0, 1, 1, 2, 3, 5, 8, 13…  Fill the base cases first and build upward.\n\nCommon trap: Expanding the whole call tree.\nCore rule:  Every call needs a base case; results flow back from the base upward.",
  "code": true
 },
 {
  "source": "Pseudocode Set-5 Q49",
  "topic": "pseudocode",
  "difficulty": "beginner",
  "question": "What is the output of the following pseudocode?\n\narr = [4, 6, 1, 5, 3]\nfor i = 1 to 4\n    arr[i] = arr[i] + arr[i - 1]\nend for\nprint arr[2], arr[4]",
  "options": [
   "1 19",
   "11 19",
   "10 19",
   "11 16"
  ],
  "correct": 1,
  "explanation": "arr[i] = arr[i] + arr[i−1] builds prefix sums: use the ALREADY UPDATED previous element.  Each element becomes the running total.\n\nCommon trap: Using original values instead of the updated previous element.\nCore rule:  Index and value differ: rewrite the array after every step.",
  "code": true
 },
 {
  "source": "Pseudocode Set-5 Q50",
  "topic": "pseudocode",
  "difficulty": "intermediate",
  "question": "What is the output of the following pseudocode?\n\ns = 0\nfor i = 1 to 12\n    if (i mod 3 == 0)\n        continue\n    end if\n    if (i mod 10 == 0)\n        break\n    end if\n    s = s + i\nend for\nprint s",
  "options": [
   "27",
   "37",
   "48",
   "45"
  ],
  "correct": 0,
  "explanation": "'continue' skips only the current round; 'break' ends the whole loop.  continue skips one round; break ends the loop.\n\nCommon trap: Treating continue like break.\nCore rule:  Trace first, answer second: update variables in code order and test the condition before every pass.",
  "code": true
 },
 {
  "source": "Pseudocode Set-6 Q46",
  "topic": "pseudocode",
  "difficulty": "beginner",
  "question": "What is the output of the following pseudocode?\n\nn = 6513\nr = 0\nwhile (n > 0)\n    r = r * 10 + (n mod 10)\n    n = n / 10\nend while\nprint r",
  "options": [
   "6513",
   "3156",
   "156",
   "15"
  ],
  "correct": 1,
  "explanation": "This loop reverses the digits: last digit first.  r*10 + n mod 10 appends the last digit each pass.\n\nCommon trap: Picking the original number or the digit sum.\nCore rule:  Trace first, answer second: update variables in code order and test the condition before every pass.",
  "code": true
 },
 {
  "source": "Pseudocode Set-6 Q47",
  "topic": "pseudocode",
  "difficulty": "intermediate",
  "question": "What is the output of the following pseudocode?\n\ncount = 0\nfor i = 1 to 6\n    for j = 1 to 6\n        if (i == j or i + j == 7)\n            count = count + 1\n        end if\n    end for\nend for\nprint count",
  "options": [
   "13",
   "24",
   "6",
   "12"
  ],
  "correct": 3,
  "explanation": "i == j is one diagonal; i + j = n + 1 is the other. For odd n they share the centre cell.  The two diagonals overlap only when n is odd.\n\nCommon trap: Counting the centre cell twice.\nCore rule:  Total work = sum over the outer loop of the inner loop's count.",
  "code": true
 },
 {
  "source": "Pseudocode Set-6 Q48",
  "topic": "pseudocode",
  "difficulty": "intermediate",
  "question": "What is the output of the following pseudocode?\n\nfunction f(n)\n    if (n <= 0)\n        return 0\n    end if\n    return n + f(n - 2)\nend function\nprint f(10)",
  "options": [
   "40",
   "30",
   "55",
   "25"
  ],
  "correct": 1,
  "explanation": "n + f(n − 2) adds every second number down to 1 or 2 (all numbers of the same parity as n).  Fill the base cases first and build upward.\n\nCommon trap: Expanding the whole call tree.\nCore rule:  Every call needs a base case; results flow back from the base upward.",
  "code": true
 },
 {
  "source": "Pseudocode Set-6 Q49",
  "topic": "pseudocode",
  "difficulty": "beginner",
  "question": "What is the output of the following pseudocode?\n\narr = [13, 12, 14, 10, 9, 6]\nmx = arr[0]\nc = 0\nfor i = 1 to 5\n    if (arr[i] > mx)\n        mx = arr[i]\n        c = c + 1\n    end if\nend for\nprint mx, c",
  "options": [
   "13 1",
   "14 3",
   "14 1",
   "14 2"
  ],
  "correct": 2,
  "explanation": "Track the running maximum and count only the times it actually changes.  Count only the times the maximum changes.\n\nCommon trap: Counting every comparison instead of the updates.\nCore rule:  Index and value differ: rewrite the array after every step.",
  "code": true
 },
 {
  "source": "Pseudocode Set-6 Q50",
  "topic": "pseudocode",
  "difficulty": "intermediate",
  "question": "What is the output of the following pseudocode?\n\nx = 29\ny = 3\nz = (x mod y) * (x / y) + x - y * 2\nprint z",
  "options": [
   "32",
   "44",
   "25",
   "41"
  ],
  "correct": 3,
  "explanation": "Same-precedence operators (mod, *, /) go left to right; + and − come after.  mod, * and / share precedence, left to right.\n\nCommon trap: Applying mod after the multiplication.\nCore rule:  Trace first, answer second: update variables in code order and test the condition before every pass.",
  "code": true
 },
 {
  "source": "Pseudocode Set-7 Q46",
  "topic": "pseudocode",
  "difficulty": "beginner",
  "question": "What is the output of the following pseudocode?\n\na = 72\nb = 30\nwhile (b != 0)\n    t = b\n    b = a mod b\n    a = t\nend while\nprint a",
  "options": [
   "12",
   "360",
   "6",
   "30"
  ],
  "correct": 2,
  "explanation": "The loop 'a, b = b, a mod b' is Euclid's HCF algorithm: the answer is the last non-zero remainder.  When b reaches 0, a holds the HCF.\n\nCommon trap: Returning b or the remainder instead of a.\nCore rule:  Trace first, answer second: update variables in code order and test the condition before every pass.",
  "code": true
 },
 {
  "source": "Pseudocode Set-7 Q47",
  "topic": "pseudocode",
  "difficulty": "advanced",
  "question": "What is the output of the following pseudocode?\n\narr = [6, 7, 5, 4, 9]\ncount = 0\nfor i = 0 to 3\n    for j = i + 1 to 4\n        if (arr[i] > arr[j])\n            count = count + 1\n        end if\n    end for\nend for\nprint count",
  "options": [
   "7",
   "5",
   "6",
   "4"
  ],
  "correct": 1,
  "explanation": "This counts inversions: for each element, count the smaller elements to its right.  Count the smaller elements to the right of each one.\n\nCommon trap: Comparing in the wrong direction or counting pairs twice.\nCore rule:  Total work = sum over the outer loop of the inner loop's count.",
  "code": true
 },
 {
  "source": "Pseudocode Set-7 Q48",
  "topic": "pseudocode",
  "difficulty": "advanced",
  "question": "What is the output of the following pseudocode?\n\nfunction steps(n)\n    if (n == 1)\n        return 0\n    end if\n    if (n mod 2 == 0)\n        return 1 + steps(n / 2)\n    end if\n    return 1 + steps(n - 1)\nend function\nprint steps(13)",
  "options": [
   "5",
   "4",
   "7",
   "6"
  ],
  "correct": 0,
  "explanation": "Follow the chain of arguments and count the arrows; each arrow adds 1 to the result.  Fill the base cases first and build upward.\n\nCommon trap: Expanding the whole call tree.\nCore rule:  Every call needs a base case; results flow back from the base upward.",
  "code": true
 },
 {
  "source": "Pseudocode Set-7 Q49",
  "topic": "pseudocode",
  "difficulty": "beginner",
  "question": "What is the output of the following pseudocode?\n\narr = [6, 8, 13, 5, 2, 14]\ni = 0\nj = 5\nwhile (i < j)\n    swap(arr[i], arr[j])\n    i = i + 1\n    j = j - 1\nend while\nprint arr[0], arr[1], arr[2], arr[3], arr[4],\narr[5]",
  "options": [
   "2 5 6 8 13 14",
   "6 8 13 5 2 14",
   "14 2 5 13 8 6",
   "5 2 14 6 8 13"
  ],
  "correct": 2,
  "explanation": "Two pointers from both ends swap until they meet: that reverses the array exactly once.  Swap pairs until the pointers meet.\n\nCommon trap: Swapping past the middle undoes the work.\nCore rule:  Index and value differ: rewrite the array after every step.",
  "code": true
 },
 {
  "source": "Pseudocode Set-7 Q50",
  "topic": "pseudocode",
  "difficulty": "intermediate",
  "question": "What is the output of the following pseudocode?\n\nn = 6137\ns = 0\nwhile (n > 0)\n    d = n mod 10\n    if (d mod 2 == 0)\n        s = s + d\n    else\n        s = s - d\n    end if\n    n = n / 10\nend while\nprint s",
  "options": [
   "6",
   "17",
   "11",
   "-5"
  ],
  "correct": 3,
  "explanation": "Handle even digits (add) and odd digits (subtract) separately, then combine.  Handle even and odd digits separately.\n\nCommon trap: Adding every digit with the same sign.\nCore rule:  Trace first, answer second: update variables in code order and test the condition before every pass.",
  "code": true
 }
];
