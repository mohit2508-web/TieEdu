// AI.FIRST — Module 1 · UNDERSTAND · What AI actually is
import type { CourseModule } from '../db';
import { nineBlocks, diagram, table, tip, warn } from '../nineBlocks';
import { lesson, proofOfWork, M, COURSE_ID } from './helpers';

const ID = M(1);

export const module1: CourseModule = {
  id: ID,
  course_id: COURSE_ID,
  title: 'Module 1 — What AI Actually Is',
  summary:
    'Pillar UNDERSTAND. The map of AI, ML, deep learning and generative AI; how a machine learns from data; neural networks without the maths fog; and why the 2017–2026 wave happened.',
  sort_order: 1,
  lessons: [
    lesson(
      ID,
      'aif-m1-1',
      1,
      'The AI Map: AI, ML, Deep Learning, Generative AI',
      'Four nested circles, one diagnostic question, and why "it uses AI" is a claim you should be able to test.',
      40,
      nineBlocks({
        objectives: [
          'Place any product on the AI → ML → deep learning → generative AI map and justify the placement',
          'Distinguish rule-based software from learned software using one diagnostic question',
          'Explain what "narrow" versus "general" AI means without hype',
        ],
        hook:
          'A food-delivery app says its "AI" predicts your arrival time. A college portal says its "AI" auto-calculates attendance. One of them is machine learning; the other is a spreadsheet formula with a marketing budget. By the end of this lesson you will be able to tell which — in under a minute — and that single skill protects you from half the AI hype you will meet at work.',
        concept: `**Artificial intelligence (AI)** is the broad goal: getting machines to do tasks we would call intelligent if a person did them — recognising speech, translating, planning a route, answering a question. AI says nothing about *how*.

**Machine learning (ML)** is the dominant *how*. Instead of a programmer writing every rule, the system **learns patterns from examples**. Show it 50,000 emails labelled spam / not-spam and it works out the patterns itself. The diagnostic question is simple: **were the smarts hand-written, or learned from data?** If a human wrote "IF attendance < 75% THEN flag", that is rule-based software — useful, but not ML.

**Deep learning (DL)** is ML using **neural networks with many layers**. It dominates where the input is messy and high-dimensional — images, audio, language — because the layers learn their own features instead of a human designing them.

**Generative AI (GenAI)** is deep learning that **produces new content** — text, images, code, audio, video — rather than only classifying or predicting. Large language models (LLMs) like the ones behind today's chat assistants are generative models trained on text (and increasingly on images, audio and video too).

**Narrow vs general.** Every system you can use today is *narrow* in an important sense: it is very good across a range of tasks it was trained for and unreliable outside them. Modern LLMs are far broader than older systems — one model can write, summarise, code and tutor — but breadth is not the same as dependable general intelligence. They still make confident errors, lack persistent goals of their own, and need checking. "AGI" (artificial general intelligence) is a debated target, not a product category you can buy.

**Three learning styles you will hear about:**
- **Supervised** — learn from labelled examples (photo → "cat"). Most business ML.
- **Unsupervised** — find structure without labels (group customers into segments).
- **Reinforcement learning** — learn by trial, error and reward (game-playing agents; also used to fine-tune chat models from human preferences).`,
        extras: [
          diagram(
            'The AI map — nested, not separate',
            `flowchart TB
  subgraph AI["Artificial Intelligence — the goal"]
    R["Rule-based systems<br/>hand-written logic"]
    subgraph ML["Machine Learning — learn from data"]
      C["Classic ML<br/>trees, regression"]
      subgraph DL["Deep Learning — many-layer neural nets"]
        V["Vision & speech models"]
        subgraph GA["Generative AI — creates content"]
          L["LLMs: text, code"]
          I["Image, audio, video models"]
        end
      end
    end
  end`
          ),
          table('Is it AI? Placing everyday products', ['Product feature', 'Where it sits', 'Why'], [
            ['Attendance "below 75%" alert', 'Rule-based (not ML)', 'A human wrote the threshold'],
            ['Spam filter in your inbox', 'Machine learning', 'Learned from millions of labelled emails'],
            ['Face unlock on a phone', 'Deep learning', 'Neural net learned facial features from images'],
            ['Chat assistant writing an email', 'Generative AI (LLM)', 'Generates new text token by token'],
            ['Delivery ETA prediction', 'Machine learning', 'Learned from past trips, traffic, time of day'],
          ]),
          tip(
            'The 60-second test',
            'Ask the vendor or the documentation: "What data was it trained on, and what does it do when it meets a case unlike that data?" A rule-based system has no training data. A real ML system has an answer — and a failure mode.',
          ),
        ],
        worked: {
          title: 'Audit three "AI-powered" claims',
          problem:
            'A brochure lists: (a) "AI-powered timetable that avoids clashes", (b) "AI that grades handwritten answers", (c) "AI chatbot for admissions queries". Place each on the map and name one question to verify it.',
          steps: [
            { title: '(a) Timetable', desc: 'Clash-avoidance is a constraint-solving problem. It is usually classic optimisation or rules — AI in the broad sense, rarely ML. Verify: "Does it learn from past timetables, or solve constraints you enter?"' },
            { title: '(b) Grading handwriting', desc: 'Reading handwriting is deep learning (vision); judging answer quality may use an LLM. Verify: "What accuracy against human graders, on whose handwriting, and who reviews disputes?"' },
            { title: '(c) Admissions chatbot', desc: 'Likely an LLM, possibly grounded on the college documents. Verify: "What does it answer when the documents do not contain the answer — and does it cite the source?"' },
            { title: 'Rank the risk', desc: '(b) affects grades — highest stakes, needs human review. (c) can mislead applicants — needs grounding and citations. (a) is low risk.' },
          ],
          solution:
            'Placement: (a) rules/optimisation, (b) deep learning ± LLM, (c) generative AI. The verification questions matter more than the labels: training data, measured accuracy, behaviour outside the data, and who is accountable.',
        },
        practice: {
          title: 'Map your own day',
          prompt:
            'List ten software features you used in the last 24 hours (maps, keyboard suggestions, feed ranking, UPI fraud alerts, photo search…). For each, write the map layer (rules / ML / DL / GenAI) and the diagnostic evidence. Mark the two you are least sure about and say what you would need to know.',
          hint: 'Keyboard next-word suggestion is learned (ML/DL). A fixed "₹10,000 daily limit" is a rule. Photo search for "dog" is deep learning.',
        },
        mistakes: [
          {
            mistake: 'Treating AI, ML and GenAI as competing alternatives',
            fix: 'They are nested. Every GenAI model is deep learning, every deep-learning model is ML, every ML system is AI. Choose the narrowest accurate label.',
          },
          {
            mistake: 'Believing a fluent chatbot "understands" the way a person does',
            fix: 'Fluency is evidence of good pattern learning, not of grounded understanding or truth. Judge outputs by verification, not by how confident they sound (Module 5).',
          },
          {
            mistake: 'Calling every automation "AI"',
            fix: 'If a human wrote the rule, say so. Precise language is a professional signal — and it tells you what can go wrong.',
          },
        ],
        exam: {
          question: 'An interviewer asks: "What is the difference between AI, machine learning and deep learning?" Answer in under 40 seconds.',
          answer:
            'AI is the goal — machines doing tasks we consider intelligent. Machine learning is the main method: learning patterns from data rather than hand-writing rules. Deep learning is machine learning with many-layer neural networks, which dominates images, audio and language. Generative AI is deep learning that creates new content — LLMs are the text example. They are nested circles, not alternatives.',
          source: 'The most common opening question in AI-adjacent interviews, technical and non-technical.',
        },
        summary: [
          'AI ⊃ ML ⊃ deep learning ⊃ generative AI — nested circles.',
          'Diagnostic: were the smarts hand-written (rules) or learned from data (ML)?',
          'Supervised, unsupervised and reinforcement learning are the three learning styles.',
          'Breadth is not reliability: today\'s models still need verification and human accountability.',
        ],
      }),
      [
        ['A college portal flags students below 75% attendance using a fixed threshold. This is best described as:', ['Deep learning', 'Rule-based software', 'Generative AI', 'Reinforcement learning'], 1, 'A human wrote the threshold — nothing was learned from data.'],
        ['Which statement about the AI map is correct?', ['ML and deep learning are separate fields that do not overlap', 'Every generative AI model is a deep-learning model', 'Deep learning is broader than machine learning', 'Rule-based systems are a kind of machine learning'], 1, 'The circles are nested: GenAI ⊂ DL ⊂ ML ⊂ AI.'],
        ['Grouping customers into segments without any labels is:', ['Supervised learning', 'Unsupervised learning', 'Reinforcement learning', 'Rule-based logic'], 1, 'No labels — the algorithm finds structure on its own.'],
        ['The single best diagnostic for "is this really machine learning?" is:', ['Does it have a chat interface?', 'Were the rules hand-written or learned from data?', 'Does it run in the cloud?', 'Is it expensive?'], 1, 'ML means the behaviour was learned from examples.'],
      ]
    ),
    lesson(
      ID,
      'aif-m1-2',
      2,
      'How Machines Learn: Data, Loss and Generalisation',
      'Training, the loss function, train/test splits, overfitting — the four ideas behind every model you will ever use.',
      42,
      nineBlocks({
        objectives: [
          'Describe training as "adjust the model to reduce a measured error" in plain language',
          'Explain why models are judged on data they never saw (train / validation / test)',
          'Recognise overfitting, underfitting and data leakage from a description',
        ],
        hook:
          'A student memorises last year\'s question paper word for word and scores 98% on it — then 41% on this year\'s paper. That student did not learn the subject; they overfit the training data. Every machine-learning failure you will read about in the news is some version of this story, and once you can see it you will never trust a single impressive accuracy number again.',
        concept: `**A model is a function with adjustable knobs** (parameters). A house-price model might be: price = a × area + b × bedrooms + c. Training means finding the values of a, b, c that make predictions match reality. Large neural networks are the same idea with billions of knobs.

**The loop that learns:**
1. **Predict** on an example from the training data.
2. **Measure the error** with a *loss function* — a single number for "how wrong". Mean squared error for prices; cross-entropy for categories and for next-word prediction.
3. **Nudge every knob** slightly in the direction that reduces the loss. The direction is computed by *gradients*; the procedure is *gradient descent*.
4. **Repeat** millions of times over the data.

**Generalisation is the only goal.** A model that is perfect on its training data but wrong on new data is useless. So the data is split:
- **Training set** — the model learns from it.
- **Validation set** — you use it to choose settings and to decide when to stop.
- **Test set** — touched once, at the end, to estimate real-world performance.

**Overfitting**: the model memorises noise in the training data (training accuracy high, test accuracy much lower). **Underfitting**: the model is too simple to capture the pattern (both low). Fixes for overfitting: more and more varied data, a simpler model, regularisation, stopping earlier.

**Data leakage** is the silent killer: information from the answer sneaks into the inputs. A hospital model that "predicts" disease from a feature recorded *after* diagnosis will look brilliant in testing and fail in real use.

**Garbage in, garbage out — and bias in, bias out.** A model learns whatever patterns its data contains, including historical unfairness and gaps. If the training data has few examples of some group, the model will usually be worse for that group. You will return to this in Module 10.`,
        extras: [
          diagram(
            'The training loop',
            `flowchart LR
  D["Training example"] --> P["Model predicts"]
  P --> L["Loss: how wrong?"]
  L --> G["Gradients: which way to nudge each knob"]
  G --> U["Update parameters"]
  U --> P
  U -.-> V{"Validation loss still falling?"}
  V -->|yes| D
  V -->|no| S["Stop & evaluate once on the test set"]`
          ),
          table('Reading training results', ['Training score', 'Test score', 'Diagnosis', 'Typical fix'], [
            ['High', 'High, close', 'Healthy generalisation', 'Ship, then monitor'],
            ['High', 'Much lower', 'Overfitting', 'More/varied data, simpler model, regularise'],
            ['Low', 'Low', 'Underfitting', 'Richer model or better features'],
            ['Suspiciously perfect', 'Suspiciously perfect', 'Possible leakage', 'Audit features for future information'],
          ]),
          warn(
            'A single accuracy number is not evidence',
            'Always ask: accuracy on what data, collected when, from whom, compared with what baseline? 95% accuracy is worthless if 95% of cases are "not fraud" and the model always says "not fraud".',
          ),
        ],
        worked: {
          title: 'The 99% fraud detector that catches nothing',
          problem:
            'A team reports 99.2% accuracy for a UPI fraud detector. 0.8% of transactions are actually fraud. Is the model good?',
          steps: [
            { title: 'Build the baseline', desc: 'A "model" that always predicts "not fraud" is right 99.2% of the time — the same accuracy.' },
            { title: 'Ask for the right metric', desc: 'For rare events, ask recall (what share of real frauds were caught) and precision (what share of alerts were real frauds).' },
            { title: 'Check the split', desc: 'Were test transactions from a later time period than training? Fraud patterns change; a random split can flatter the model.' },
            { title: 'Check for leakage', desc: 'Was any feature recorded after the fraud was reported (e.g. "account frozen")? That would leak the answer.' },
          ],
          solution:
            'Not proven good. 99.2% equals the do-nothing baseline. Demand recall and precision on a time-ordered test set with leakage ruled out before believing it.',
        },
        practice: {
          title: 'Spot the failure mode',
          prompt:
            'For each scenario write overfitting, underfitting, leakage or healthy, and one fix: (1) a resume screener scores 97% on past hires, 60% on this year\'s; (2) a crop-yield model includes "harvest weight" as an input; (3) a model is equally mediocre on training and test data; (4) a model scores 88% train, 86% test on a time-ordered split.',
          hint: '(2) uses information only known after the outcome.',
        },
        mistakes: [
          {
            mistake: 'Evaluating a model on the data it was trained on',
            fix: 'Training-set performance measures memory, not skill. Always report performance on held-out data — ideally from a later time period.',
          },
          {
            mistake: 'Tuning settings repeatedly against the test set',
            fix: 'Every peek leaks a little. Tune on validation; keep the test set for one final, honest estimate.',
          },
          {
            mistake: 'Assuming more data always fixes everything',
            fix: 'More of the same biased or mislabelled data scales the problem. Better and more varied data beats merely more data.',
          },
        ],
        exam: {
          question: 'Explain overfitting to a non-technical manager and say how you would detect it.',
          answer:
            'Overfitting is when a model memorises its training examples — including their noise — instead of learning the general pattern, like a student who memorised last year\'s paper. You detect it by comparing performance on the training data with performance on data the model never saw: a large gap means overfitting. Fixes include more varied data, a simpler model and stopping training earlier.',
          source: 'Asked in data/AI interviews at every level; the analogy matters as much as the definition.',
        },
        summary: [
          'Training = predict, measure loss, nudge parameters via gradients, repeat.',
          'Judge models only on unseen data: train / validation / test.',
          'Overfit = memorised; underfit = too simple; leakage = the answer snuck into the inputs.',
          'Accuracy without a baseline and the right metric is not evidence.',
        ],
      }),
      [
        ['In training, the loss function is:', ['The number of parameters', 'A single number measuring how wrong the predictions are', 'The test-set accuracy', 'The learning rate'], 1, 'Training reduces the loss, so the loss defines what "better" means.'],
        ['Training accuracy 98%, test accuracy 61%. The most likely diagnosis is:', ['Underfitting', 'Overfitting', 'Healthy model', 'The test set is too large'], 1, 'A big train–test gap is the signature of memorisation.'],
        ['A disease model uses a feature recorded after the diagnosis was made. This is:', ['Regularisation', 'Data leakage', 'Unsupervised learning', 'Gradient descent'], 1, 'Future information leaks the answer into the inputs.'],
        ['Why keep a separate test set that you never tune against?', ['To train faster', 'To get one honest estimate of performance on unseen data', 'To increase accuracy', 'Because validation sets are optional'], 1, 'Repeated tuning on the test set makes it part of training.'],
      ]
    ),
    lesson(
      ID,
      'aif-m1-3',
      3,
      'Neural Networks Without the Maths Fog',
      'Neurons, weights, layers and backpropagation explained with one picture — and why depth lets networks learn their own features.',
      42,
      nineBlocks({
        objectives: [
          'Describe what a single artificial neuron computes',
          'Explain how stacked layers build features from simple to complex',
          'Explain backpropagation as "share the blame for the error back through the layers"',
        ],
        hook:
          'In 2012 a neural network called AlexNet cut the error rate in a major image-recognition competition so sharply that the field changed direction almost overnight. Nobody had told it what an eye, a wheel or fur looked like. It learned those features itself — from pixels and labels. That idea, features learned rather than designed, is the engine underneath every chat assistant and image generator you use today.',
        concept: `**One neuron** takes several numbers in, multiplies each by a **weight** (how much it matters), adds them up with a **bias**, and passes the total through an **activation function** that decides how strongly to "fire". That is all. A weight is just one of the knobs from the previous lesson.

**A layer** is many neurons reading the same inputs, each with its own weights. **A network** stacks layers: the outputs of one layer are the inputs of the next.

**Why depth matters — features build on features.** In an image network, early layers learn edges and colour blobs; middle layers combine those into textures and parts (an eye, a wheel); later layers combine parts into whole objects. Nobody programs these features; they emerge because they help reduce the loss. Language models do the same with text: early layers capture word pieces and grammar, deeper layers capture meaning, relationships and style.

**Activation functions** (such as ReLU, which simply outputs zero for negative inputs) add the non-linearity that lets stacked layers represent curved, complicated patterns. Without them, a hundred layers would collapse into the power of one.

**Backpropagation** is how the network learns. After a prediction, the loss says how wrong it was. Backpropagation works backwards from the output, computing for every weight how much it contributed to the error — sharing out the blame — and gradient descent nudges each weight accordingly. Repeated over millions of examples, the network's weights settle into useful features.

**What networks need:** lots of data, lots of compute (GPUs/TPUs that do many multiplications in parallel), and careful training recipes. **What they are bad at:** explaining themselves, knowing when they are out of their depth, and anything their training data did not cover well.`,
        extras: [
          diagram(
            'A small network: inputs → hidden layers → output',
            `flowchart LR
  subgraph IN["Input layer"]
    x1(("x1")); x2(("x2")); x3(("x3"))
  end
  subgraph H1["Hidden layer 1 — simple features"]
    a1(("h")); a2(("h")); a3(("h")); a4(("h"))
  end
  subgraph H2["Hidden layer 2 — combined features"]
    b1(("h")); b2(("h")); b3(("h"))
  end
  subgraph OUT["Output"]
    y(("y"))
  end
  x1 --> a1 & a2 & a3 & a4
  x2 --> a1 & a2 & a3 & a4
  x3 --> a1 & a2 & a3 & a4
  a1 & a2 & a3 & a4 --> b1 & b2 & b3
  b1 & b2 & b3 --> y
  y -.->|"error flows back: backpropagation"| b2`
          ),
          table('Network families you will meet', ['Family', 'Good at', 'Example'], [
            ['Feed-forward (MLP)', 'Tabular patterns', 'Credit scoring'],
            ['Convolutional (CNN)', 'Images, local patterns', 'Defect detection on a production line'],
            ['Recurrent (RNN/LSTM)', 'Sequences (older approach)', 'Earlier speech and translation systems'],
            ['Transformer', 'Language, code, images, audio — almost everything now', 'LLMs, modern vision and speech models'],
            ['Diffusion', 'Generating images, audio, video', 'Text-to-image generators'],
          ]),
          tip(
            'The one-line mental model',
            'A neural network is a very large, adjustable pattern-matcher whose features are learned by repeatedly reducing its error on examples. Everything else is engineering.',
          ),
        ],
        worked: {
          title: 'Compute one neuron by hand',
          problem:
            'A neuron scoring "is this email spam?" has inputs: links = 4, exclamation marks = 6, sender-known = 1. Weights: 0.5, 0.3, −2.0. Bias: −1.0. Activation: ReLU (negative → 0). What does it output, and what does each weight "mean"?',
          steps: [
            { title: 'Weighted sum', desc: '4×0.5 + 6×0.3 + 1×(−2.0) = 2.0 + 1.8 − 2.0 = 1.8' },
            { title: 'Add bias', desc: '1.8 + (−1.0) = 0.8' },
            { title: 'Activation', desc: 'ReLU(0.8) = 0.8 — the neuron fires moderately.' },
            { title: 'Interpret the weights', desc: 'Links and exclamation marks push towards spam; a known sender pushes strongly against it (−2.0). Training found these values; nobody typed them in.' },
          ],
          solution:
            'Output 0.8. Real networks have millions of such neurons whose individual weights are not human-readable — which is exactly why explaining their decisions is hard.',
        },
        practice: {
          title: 'Change one input',
          prompt:
            'Recompute the worked-example neuron when the sender is unknown (sender-known = 0), then when there are 0 links. Write one sentence on which input this neuron "cares" about most and why that might be risky (hint: a spammer who learns the rule).',
          hint: 'Sender unknown: 2.0 + 1.8 + 0 − 1.0 = 2.8.',
        },
        mistakes: [
          {
            mistake: 'Thinking neural networks work like biological brains',
            fix: 'The neuron is a loose inspiration. Artificial networks are mathematical functions trained by gradient descent; claims that they "think like us" are metaphors, not findings.',
          },
          {
            mistake: 'Assuming a deeper network is always better',
            fix: 'Depth helps on rich data like images and language. On a small table of numbers, a simple model is often more accurate, cheaper and easier to explain.',
          },
        ],
        exam: {
          question: 'What is backpropagation, in one minute, without equations?',
          answer:
            'After the network makes a prediction, the loss measures the error. Backpropagation works backwards from the output layer to the input layer, computing how much each weight contributed to that error. Gradient descent then nudges every weight a little in the direction that reduces the error. Repeating this over many examples is how the network learns its features.',
          source: 'Standard conceptual question in AI/ML interviews and university viva rounds.',
        },
        summary: [
          'Neuron = weighted sum + bias → activation.',
          'Layers stack; depth lets networks learn features from simple to complex.',
          'Backpropagation shares the error back to every weight; gradient descent updates them.',
          'Transformers now dominate language, vision and audio.',
        ],
      }),
      [
        ['What does a single artificial neuron compute?', ['A database lookup', 'A weighted sum of inputs plus a bias, passed through an activation', 'A random number', 'A rule written by a programmer'], 1, 'Weights × inputs, summed, plus bias, then activation.'],
        ['Why do networks need non-linear activation functions?', ['To use less memory', 'So stacked layers can represent complex, curved patterns', 'To make training slower', 'They are optional decoration'], 1, 'Without non-linearity, many layers collapse into the power of one.'],
        ['In an image network, early layers typically learn:', ['Whole objects', 'Edges and colour blobs', 'Captions', 'Nothing until the last layer'], 1, 'Features build from simple (edges) to complex (objects).'],
        ['Backpropagation is best described as:', ['Copying weights from another model', 'Computing each weight\'s share of the error, working backwards', 'Deleting bad training data', 'Adding more layers'], 1, 'It assigns blame for the error to every weight so they can be updated.'],
      ]
    ),
    lesson(
      ID,
      'aif-m1-4',
      4,
      'From Rules to Foundation Models: Why This Wave Happened',
      'Data, compute and the transformer: the three forces behind the 2017–2026 wave, what "foundation model" means, and your first proof of work.',
      44,
      nineBlocks({
        objectives: [
          'Explain the three forces — data, compute, architecture — behind the current AI wave',
          'Define a foundation model and explain why one model now serves many tasks',
          'Separate durable trends from hype when reading AI news',
        ],
        hook:
          'In 2016 you needed a separate, custom-trained model for translation, another for summarising, another for answering questions — each built by a specialist team. By 2023 a single general model could do all three from a plain-English instruction. That shift did not come from one genius idea. It came from three forces arriving at once, and understanding them is how you will judge every "breakthrough" headline for the rest of your career.',
        concept: `**A short, honest timeline**
- **1950s–1980s — symbolic AI and expert systems.** Hand-written rules and logic. Impressive in narrow domains, brittle outside them.
- **1990s–2000s — statistical machine learning.** Models learn from data: spam filters, recommendation, search ranking.
- **2012 — the deep-learning breakthrough.** Neural networks trained on GPUs beat hand-designed vision systems by a wide margin.
- **2017 — the transformer.** The paper "Attention Is All You Need" introduced an architecture that processes whole sequences in parallel and learns which parts of the input relate to which (attention — Module 2). It scaled far better than earlier approaches.
- **2018–2022 — scale.** Models pretrained on huge text collections (BERT, the GPT series) showed that bigger models trained on more data kept getting more capable.
- **November 2022 — ChatGPT** made a chat-tuned LLM available to everyone; adoption was faster than almost any consumer technology before it.
- **2023–2026 — multimodal, reasoning and agents.** Models that see, hear and speak; models that spend more computation "thinking" before answering; and models that use tools and take multi-step actions (Modules 3 and 9).

**The three forces**
1. **Data** — the web, books, code and digitised media gave models trillions of words to learn from.
2. **Compute** — GPUs and specialised chips made it feasible to train models with billions of parameters.
3. **Architecture** — the transformer used that compute efficiently and kept improving as it grew. Researchers observed fairly predictable **scaling laws**: more data, parameters and compute gave steadily lower loss.

**Foundation models.** A foundation model is trained once, at great cost, on broad data — and then adapted to many tasks by prompting, fine-tuning or connecting it to tools and documents. This is why one model can translate, summarise and code. It also concentrates power and risk: a flaw in the foundation shows up in every product built on it.

**Reading the news like a professional.** Durable: models keep getting cheaper per unit of capability; multimodality and tool use keep spreading. Hype markers: "it thinks like a human", a single benchmark score presented without context, demos with no failure cases, and dates promised for AGI.`,
        extras: [
          diagram(
            'Three forces, one wave',
            `flowchart LR
  D["Data<br/>web, books, code, media"] --> T["Transformer models<br/>scale predictably"]
  C["Compute<br/>GPUs & AI chips"] --> T
  A["Architecture<br/>attention, 2017"] --> T
  T --> F["Foundation model<br/>trained once, broad data"]
  F --> P1["Chat assistants"]
  F --> P2["Coding tools"]
  F --> P3["Search & research"]
  F --> P4["Agents that use tools"]`
          ),
          table('Hype vs signal — a reading checklist', ['You read…', 'Ask…'], [
            ['"New model beats humans on benchmark X"', 'Which humans? Was the benchmark in the training data? How does it do on real tasks?'],
            ['"AI will replace job Y by next year"', 'Which tasks inside the job? Who measured it? What is the cost of errors?'],
            ['"It understands / thinks / feels"', 'What observable behaviour is being described? Metaphor or measurement?'],
            ['"10× cheaper than last year"', 'Cheaper per token for which quality level? Usually a real and durable trend.'],
          ]),
          proofOfWork(
            1,
            'The AI-or-not audit',
            'Audit 10 products or features you use. For each: map layer (rules/ML/DL/GenAI), the evidence, one failure mode you have seen or can predict, and who is accountable when it fails.',
            'Same audit, plus pick two features and write a short note on how you would test the claim — the dataset you would need, the metric and the baseline.',
            'Audit 10 AI claims from vendors or your organisation\'s tools. Classify each, rate the evidence (none / demo / measured), and recommend adopt, pilot or reject with one reason each.',
            'A one-page table with honest uncertainty marked ("not sure — would need X"). Vague labels like "uses AI" score zero.'
          ),
        ],
        worked: {
          title: 'Decode a breakthrough headline',
          problem:
            'Headline: "New AI model scores 92% on a medical licensing exam — doctors soon obsolete." Write a professional three-line response.',
          steps: [
            { title: 'Locate the claim', desc: 'Measured: multiple-choice exam accuracy. Not measured: diagnosing real patients, taking history, accountability.' },
            { title: 'Check contamination', desc: 'Exam questions are often published online; they may be in the training data, inflating the score.' },
            { title: 'Translate to tasks', desc: 'Strong exam performance suggests usefulness for tasks like drafting explanations or triage support under supervision — not replacement.' },
          ],
          solution:
            '"Impressive on a multiple-choice benchmark, which may overlap with training data. It signals value as a supervised assistant for some clinical tasks. It does not show safe autonomous diagnosis — that needs real-world trials and accountability."',
        },
        practice: {
          title: 'Your hype filter',
          prompt:
            'Find one AI news story from this month. Write: the actual measured claim, what was not measured, one hype marker, and a one-sentence professional summary.',
          hint: 'Look for the benchmark name or the study design in the article; if neither exists, that is your hype marker.',
        },
        mistakes: [
          {
            mistake: 'Crediting the wave to one invention',
            fix: 'The transformer mattered because data and compute arrived at the same time. Name all three forces.',
          },
          {
            mistake: 'Equating a benchmark score with real-world ability',
            fix: 'Benchmarks are narrow and can leak into training data. Ask for task-level evidence in realistic conditions.',
          },
        ],
        exam: {
          question: 'What is a foundation model, and why does it matter for a company adopting AI?',
          answer:
            'A foundation model is a large model trained once on broad data and then adapted to many tasks through prompting, fine-tuning or tools. For a company it means you rarely train from scratch — you choose and adapt an existing model — but you also inherit its strengths, blind spots, costs and terms of use, so model selection and evaluation become core decisions.',
          source: 'Common in product, consulting and AI-engineering interviews.',
        },
        summary: [
          'Rules → statistical ML → deep learning (2012) → transformers (2017) → ChatGPT (2022) → multimodal, reasoning, agents.',
          'Three forces: data, compute, architecture — with predictable scaling.',
          'Foundation models: trained once, adapted to many tasks; flaws propagate too.',
          'Read news by asking what was actually measured.',
        ],
      }),
      [
        ['The 2017 paper that introduced the transformer is titled:', ['Deep Blue', 'Attention Is All You Need', 'ImageNet Classification', 'Generative Adversarial Nets'], 1, 'The transformer architecture was introduced in "Attention Is All You Need" (2017).'],
        ['Which three forces best explain the current AI wave?', ['Data, compute and architecture', 'Robots, sensors and 5G', 'Regulation, funding and hype', 'Cloud, mobile and social media'], 0, 'Massive data, affordable compute and the scalable transformer arrived together.'],
        ['A foundation model is:', ['A model trained for exactly one task', 'A large model trained on broad data and adapted to many tasks', 'A rule-based expert system', 'The first layer of a neural network'], 1, 'Trained once, broadly; adapted many ways.'],
        ['"A model scored 92% on an exam" is weak evidence of real-world skill mainly because:', ['Exams are always easy', 'The questions may be in the training data and the exam is narrower than the real task', 'AI cannot do exams', '92% is a low score'], 1, 'Contamination and narrowness limit what a benchmark proves.'],
      ]
    ),
  ],
};
