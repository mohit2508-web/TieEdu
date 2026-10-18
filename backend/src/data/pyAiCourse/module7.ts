// Module 7 — Visualization: matplotlib, seaborn & honest charts
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M7, COURSE_ID } from './helpers';

export const module7: CourseModule = {
  id: M7,
  course_id: COURSE_ID,
  title: 'Module 7 — Visualization: Seeing Data Without Lying',
  summary:
    'The matplotlib figure/axes anatomy, choosing between histogram, scatter, line and bar by the question being asked, multi-panel subplots, seaborn for DataFrame-native EDA, and the rules of honest visualization.',
  sort_order: 7,
  lessons: [
    lesson(
      M7,
      'pyai-7-1',
      1,
      'matplotlib Anatomy: Figure, Axes & the Object Interface',
      'How a matplotlib figure is built from a Figure, Axes and artists — and why every chart should start with fig, ax = plt.subplots().',
      17,
      nineBlocks({
        objectives: [
          'Create a figure and axes with plt.subplots and size them deliberately',
          'Draw a scatter plot and label axes, title and legend on the Axes',
          'Explain the Figure / Axes / artist hierarchy in plain language',
          'Save a chart to PNG with savefig and the settings that matter',
        ],
        hook:
          'Nearly every chart you have ever seen in a paper, dashboard or AI blog post began as a few lines of matplotlib. Ten minutes on its anatomy buys you a lifetime of charts: the same figure, axes and labels machinery scales from a two-line scatter to a forty-panel research figure.',
        concept: `**matplotlib's object tree.** Three layers, always the same:
- The **Figure** — the whole image (canvas, background, all panels).
- One or more **Axes** — a single plot area with its own x/y axes, ticks and scales. "Ax" is singular; the plural is still "axes", which confuses everyone once.
- **Artists** — everything drawn inside: lines, markers, bars, text, legends. An Axes owns its artists; the Figure owns its Axes.

**The object interface, once.** Modern matplotlib practice is the object interface — never the older stateful \`plt.plot(...)\` calls that draw onto some hidden "current" axes:
\`\`\`
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(7, 5))
ax.scatter([1, 2, 3], [2, 4, 3])
ax.set_xlabel("x")
\`\`\`
\`plt.subplots()\` returns the Figure and one Axes (nrows=1, ncols=1 by default). Everything else is a method ON that axes: \`ax.plot\`, \`ax.scatter\`, \`ax.hist\`, \`ax.bar\`, \`ax.set_title\`, \`ax.set_xlabel\`, \`ax.set_ylabel\`, \`ax.legend\`. The payoff is control: with several Axes (Lesson 7.3) the stateful interface loses track of "where am I drawing", while ax-based code names its target every time.

**Labelling is not decoration — it is the chart.** An unlabelled plot is a rumour. Every chart gets: axis labels WITH units ("Study hours (per week)"), a title that says what the chart shows, a legend whenever more than one series shares the panel, and honest scales (Lesson 7.4). \`ax.grid(True, alpha=0.3)\` adds light reference lines; \`fig.tight_layout()\` stops labels from colliding with the frame.

**Saving before showing.** In scripts, \`fig.savefig("chart.png", dpi=150, bbox_inches="tight")\` writes the file — \`dpi\` sets resolution (100–150 for screen, 300 for print), \`bbox_inches="tight"\` crops the white margins that otherwise eat labelling space. In notebooks the final expression \`plt.show()\` displays the figure; in scripts savefig is what makes the chart exist at all.`,
        extras: [
          table(
            'The hierarchy, named',
            ['Object', 'What it is', 'Typical methods'],
            [
              ['Figure', 'The whole image', 'fig.savefig, fig.suptitle, fig.tight_layout'],
              ['Axes', 'One plot panel', 'ax.scatter/plot/hist/bar, ax.set_*, ax.legend'],
              ['Artist', 'A drawn element (Line2D, Patch, Text...)', 'Usually created by Axes methods'],
            ],
          ),
          code(
            'import matplotlib.pyplot as plt\n\nhours = [2, 4, 6, 8, 10]\nmarks = [55, 62, 71, 83, 88]\n\nfig, ax = plt.subplots(figsize=(6, 4))\nax.scatter(hours, marks, color="steelblue")\nax.set_xlabel("Study hours per week")\nax.set_ylabel("Marks")\nax.set_title("More study hours, higher marks")\nax.grid(True, alpha=0.3)\nfig.tight_layout()\nfig.savefig("study_vs_marks.png", dpi=150, bbox_inches="tight")\nplt.show()',
            'first_figure.py',
            'python',
          ),
          tip(
            'One figure, one Axes — until you need more',
            'plt.subplots() with no arguments is the correct default. Reach for multiple panels only when the question needs them; a second Axes that repeats the first is clutter.',
          ),
        ],
        worked: {
          title: 'Build and save a labelled scatter figure from scratch',
          problem:
            'Plot study hours against marks for five students as a scatter, label everything, add a light grid, save as a 150-dpi PNG and display. Then answer: what object owns the scatter points?',
          steps: [
            {
              title: '1. Create figure and axes with an explicit size',
              desc: 'figsize is inches — (6, 4) suits a notebook column and a report side panel. Creating the axes object first means every later call has a named target.',
              code_snippet: 'import matplotlib.pyplot as plt\n\nhours = [2, 4, 6, 8, 10]\nmarks = [55, 62, 71, 83, 88]\n\nfig, ax = plt.subplots(figsize=(6, 4))',
            },
            {
              title: '2. Draw the data on the axes',
              desc: 'ax.scatter takes two equal-length sequences and places one marker per pair. Everything drawn after this belongs to this Axes.',
              code_snippet: 'ax.scatter(hours, marks, color="steelblue", label="Students")',
            },
            {
              title: '3. Label, title, legend, grid',
              desc: 'Labels carry meaning; the legend appears only because we passed label= and called ax.legend(). Grid lines are reference, not decoration.',
              code_snippet: 'ax.set_xlabel("Study hours per week")\nax.set_ylabel("Marks (out of 100)")\nax.set_title("More study hours, higher marks")\nax.legend()\nax.grid(True, alpha=0.3)',
            },
            {
              title: '4. Layout, save, show',
              desc: 'tight_layout reserves room for the labels; savefig writes the PNG before the window opens; show displays it. In scripts, dropping show and keeping savefig is enough.',
              code_snippet: 'fig.tight_layout()\nfig.savefig("study_vs_marks.png", dpi=150, bbox_inches="tight")\nplt.show()',
            },
          ],
          solution:
            'One Figure, one Axes; the markers are artists owned by that Axes. Labels and units on both axes, a finding-style title, a legend, a soft grid — then tight_layout, a 150-dpi PNG on disk, and the on-screen display. The same eight lines, retargeted to plot/hist/bar, produce every other chart in this course.',
        },
        practice: {
          title: 'Your first three figures',
          prompt:
            'Using the object interface only: (1) a line chart of daily downloads [120, 145, 132, 168, 190] over days 1–5, labelled and titled; (2) a bar chart of revenue per city (Delhi 120, Pune 90, Kochi 75) with city names on the x-axis — use ax.bar(["Delhi","Pune","Kochi"], [120, 90, 75]); (3) a histogram of marks = [45, 55, 62, 71, 74, 78, 83, 88, 91, 95] with bins=5 and an edge colour so the bins are visible. Save each with a distinct filename.',
          hint: 'Every chart follows the same skeleton: subdraw via subplots, draw on ax, label, tight_layout, savefig.',
        },
        mistakes: [
          {
            mistake: 'Mixing stateful plt.plot(...) with object-interface calls',
            fix: 'Pick the object interface and stay there. plt.plot draws on an implicit "current axes" that may not be the one you think once figures multiply.',
          },
          {
            mistake: 'Saving after show() in a script and getting a blank PNG',
            fix: 'Some backends clear or detach the figure at show. Save first, show second — or skip show entirely in non-interactive scripts.',
          },
          {
            mistake: 'Untitled, unlabelled charts "just for me"',
            fix: 'Tomorrow\'s "just for me" becomes next week\'s screenshot in someone\'s slide. Label from the first draft; tight_layout fixes the collisions.',
          },
          {
            mistake: 'Tiny default figsize with big data',
            fix: 'Overplotting and clipped labels come from the default 6.4 x 4.8 inches. Set figsize for the target medium and re-render until every label is readable.',
          },
        ],
        exam: {
          question:
            'Describe the matplotlib Figure / Axes / artist hierarchy, and justify the "always use fig, ax = plt.subplots()" convention.',
          answer:
            'A Figure is the top-level image container owning one or more Axes; each Axes is a single plotting panel with its own x/y coordinate system, ticks and limits; every drawn element — lines, markers, patches, text — is an Artist owned by an Axes (or the Figure). The object interface is preferred because it makes the target explicit: ax.scatter() cannot accidentally draw on the wrong panel, whereas the stateful plt.scatter() draws on whatever axes matplotlib currently considers "current", which silently breaks once a program creates several figures or panels. Explicit Axes also enable programmatic control — loops over axes, shared scales, per-panel titles — that the stateful interface cannot express cleanly.',
          source: 'The standard matplotlib theory question in data-science practicals and interviews.',
        },
        summary: [
          'Hierarchy: Figure (image) → Axes (panel) → artists (drawn elements).',
          'Always build with fig, ax = plt.subplots(figsize=...) and draw ON ax.',
          'Label axes with units, title the finding, legend multi-series panels, grid lightly.',
          'fig.tight_layout() prevents label collisions; savefig(dpi, bbox_inches="tight") before show.',
          'The object interface scales to multi-panel figures; the stateful interface does not.',
        ],
      }),
      [
        [
          'In fig, ax = plt.subplots(), ax represents:',
          ['The whole image', 'One plotting panel with its own x/y axes', 'A single data point', 'The figure background'],
          1,
          'subplots returns (Figure, Axes); the Axes is the panel you draw data and labels on.',
        ],
        [
          'Which call adds the entry shown in ax.legend()?',
          ['A label= argument on the draw call plus ax.legend()', 'ax.legend() alone invents labels', 'The title automatically', 'plt.grid(True)'],
          0,
          'Legend entries come from label= (or explicit handles); ax.legend() only places them on the chart.',
        ],
        [
          'The recommended way to prevent x/y labels being clipped at the figure edge is:',
          ['Smaller fonts only', 'fig.tight_layout()', 'Turning the grid off', 'Using plt.plot instead'],
          1,
          'tight_layout adjusts subplot padding so titles, labels and ticks fit inside the saved figure.',
        ],
        [
          'fig.savefig("c.png", dpi=150, bbox_inches="tight") — bbox_inches="tight" does:',
          [
            'Compresses the file',
            'Crops the figure to the bounding box of the artists, removing dead margin',
            'Scales data to fit',
            'Converts to grayscale',
          ],
          1,
          'Without it, saved charts carry large white margins; tight cropping keeps the labels and drops the emptiness.',
        ],
      ]
    ),
    lesson(
      M7,
      'pyai-7-2',
      2,
      'Choosing the Chart: Histogram, Scatter, Line or Bar',
      'Match the chart to the question — distribution, relationship, trend or category comparison — and stop decorating start communicating.',
      18,
      nineBlocks({
        objectives: [
          'Map a data question to histogram, scatter, line or bar and justify the choice',
          'Draw a histogram with sensible bins and read the shape it reveals',
          'Draw line and bar charts without letting either lie about the data',
          'Write a one-line takeaway under every chart you produce',
        ],
        hook:
          'Two analysts get the same marks data. One draws a pie of "grades"; the other draws a histogram and finds the distribution is bimodal — two study cohorts hiding in one average. The chart is not a picture of the data; it is an argument about the data. Choosing the chart is choosing the argument.',
        concept: `**The question chooses the chart — never the reverse.** Four workhorse questions, four honest answers:

**1. How is ONE numeric variable distributed? → histogram.** \`ax.hist(values, bins=10)\` cuts the range into bins and bars the counts. Read: centre (typical value), spread (range/width), shape (symmetric? skewed left/right? two humps?). Bins are a lens, not a fact — try 5, 10 and 30 bins on the same data; if the "story" changes wildly, say so rather than picking the flattering one.

**2. Do TWO numerics move together? → scatter.** \`ax.scatter(x, y)\` plots one marker per pair. Read: direction (up/down), strength (tight cloud vs scattered), form (linear? curved? clusters?), and outliers (points far off the cloud). This is also where correlation lives — and where causation does NOT automatically live (Module 9.3).

**3. What happens over an ORDERED sequence — usually time? → line.** \`ax.plot(x, y)\` connects values in order. Lines imply continuity between points: legitimate for daily temperatures, dishonest for unrelated categories. A line chart of "revenue per customer-id" is noise with a pen.

**4. How do CATEGORIES compare on one number? → bar.** \`ax.bar(names, heights)\` compares aggregates (mean revenue per city, count per department). Bar lengths are read from the baseline — so bars must start at zero (Lesson 7.4 shows the damage when they do not). Aggregation first: groupby, then bar.

**The chart-lying families to avoid.** Pie charts: only honest for a few positive parts of one whole (slices summing to something meaningful); six slices of alphabet soup is a bar chart's job. 3D anything: perspective distorts lengths — bar values become unreadable. Dual axes: two scales invites fake correlation; prefer two panels (Lesson 7.3). The discipline: after every chart, write ONE sentence stating the finding — "Marks concentrate around 70–85 with a left tail" — and check the chart actually supports that sentence.`,
        extras: [
          table(
            'Question → chart, the decision table',
            ['Your question', 'Chart', 'What you read off it'],
            [
              ['How is one numeric distributed?', 'Histogram', 'Centre, spread, skew, multiple humps'],
              ['Do two numerics move together?', 'Scatter', 'Direction, strength, form, outliers'],
              ['How does a measure change over time/order?', 'Line', 'Trend, seasonality, breaks'],
              ['How do categories compare?', 'Bar (from an aggregation)', 'Ranking and relative magnitude'],
            ],
          ),
          code(
            'import matplotlib.pyplot as plt\n\nmarks = [45, 55, 62, 71, 74, 78, 83, 88, 91, 95]\nhours = [2, 4, 6, 8, 10]\n\nfig, axes = plt.subplots(1, 3, figsize=(12, 3.5))\naxes[0].hist(marks, bins=5, edgecolor="black")\naxes[0].set_title("Distribution of marks")\naxes[1].scatter(hours, marks)\naxes[1].set_title("Hours vs marks")\naxes[2].bar(["Delhi", "Pune", "Kochi"], [120, 90, 75])\naxes[2].set_title("Revenue by city")\nfig.tight_layout()\nplt.show()',
            'three_charts.py',
            'python',
          ),
          warn(
            'Bins, ranges and sorts are editorial choices',
            'The same histogram with 5 versus 40 bins can look flat or spiky; the same bar chart sorted or unsorted looks decisive or chaotic. Choose defaults that serve the question, and disclose when a choice was load-bearing.',
          ),
        ],
        worked: {
          title: 'Answer four questions about one small dataset, four charts',
          problem:
            'Data: marks of 10 students [45, 55, 62, 71, 74, 78, 83, 88, 91, 95] with study hours [2, 4, 5, 6, 7, 8, 9, 10, 12, 14]; city revenue Delhi 120, Pune 90, Kochi 75; daily downloads [120, 145, 132, 168, 190] over days 1–5. Answer: (a) how are marks distributed? (b) do hours and marks move together? (c) which city earns most? (d) what is the downloads trend?',
          steps: [
            {
              title: '1. Distribution → histogram',
              desc: 'One variable, one axis of bins. Left-skewed shape: most marks cluster high, a tail pulls down-left. That is the answer to "how are marks distributed".',
              code_snippet: 'import matplotlib.pyplot as plt\n\nmarks = [45, 55, 62, 71, 74, 78, 83, 88, 91, 95]\nfig, ax = plt.subplots(figsize=(6, 4))\nax.hist(marks, bins=5, edgecolor="black")\nax.set_xlabel("Marks")\nax.set_ylabel("Students")\nax.set_title("Most marks cluster high; a few drag the tail down")',
            },
            {
              title: '2. Relationship → scatter',
              desc: 'Two numerics per student, one marker each. Tight upward cloud = strong positive association; the takeaway sentence names it without claiming cause.',
              code_snippet: 'hours = [2, 4, 5, 6, 7, 8, 9, 10, 12, 14]\nfig, ax = plt.subplots(figsize=(6, 4))\nax.scatter(hours, marks)\nax.set_xlabel("Study hours per week")\nax.set_ylabel("Marks")\nax.set_title("Study hours and marks rise together")',
            },
            {
              title: '3. Categories → bar (aggregated first)',
              desc: 'Three cities, one revenue each — no aggregation needed beyond the groupby habit. Zero baseline preserves honest length comparison.',
              code_snippet: 'fig, ax = plt.subplots(figsize=(6, 4))\nax.bar(["Delhi", "Pune", "Kochi"], [120, 90, 75])\nax.set_ylabel("Revenue (lakh)")\nax.set_title("Delhi leads revenue; Kochi trails by 45 lakh")',
            },
            {
              title: '4. Time order → line',
              desc: 'Days 1 to 5 are ordered; connecting them shows the shape of the trend. The one non-monotonic dip (day 3) stays visible — lines keep the warts.',
              code_snippet: 'fig, ax = plt.subplots(figsize=(6, 4))\nax.plot([1, 2, 3, 4, 5], [120, 145, 132, 168, 190], marker="o")\nax.set_xlabel("Day")\nax.set_ylabel("Downloads")\nax.set_title("Downloads trend up with a day-3 dip")',
            },
          ],
          solution:
            'Four questions, four charts, four one-line takeaways: histogram → left-skewed high cluster; scatter → strong positive hours–marks association (not causation!); bar → Delhi top, zero-based lengths; line → rising trend with a visible day-3 dip. Each chart was selected by its question, each carries units and a finding-style title, and no chart was asked to answer a question it distorts.',
        },
        practice: {
          title: 'Choose, draw, take away',
          prompt:
            'For each, name the chart type BEFORE coding, then draw it with the object interface and write the one-line takeaway: (1) monthly rainfall for 12 months; (2) age versus blood-pressure for 200 patients; (3) pass percentage across four sections of one class; (4) the distribution of sleep hours of 50 students. Then deliberately draw (1) as a pie and list two reasons the pie is worse.',
          hint: 'Ordered sequence → line; two numerics → scatter; one numeric → histogram; few categories → bar.',
        },
        mistakes: [
          {
            mistake: 'Using a line chart across unordered categories',
            fix: 'Lines imply continuity and order. If the x-axis has no natural sequence (customer ids, unordered names), use bars — sorted bars if ranking matters.',
          },
          {
            mistake: 'Pie charts with many slices, negatives or non-whole totals',
            fix: 'Pie is for a handful of positive parts summing to one whole. Beyond that use bars — angles are far harder to compare than lengths.',
          },
          {
            mistake: 'One histogram, one bin count, one confident story',
            fix: 'Bin choice is a free parameter. Try at least two bin settings; if the apparent shape moves, report the sensitivity instead of the flattering version.',
          },
          {
            mistake: 'Charts without the takeaway sentence',
            fix: 'A chart you cannot summarise in one honest sentence has not answered a question yet. Write the sentence — if it will not write, redraw.',
          },
        ],
        exam: {
          question:
            'State which chart type answers each: (a) spread and skew of one numeric variable; (b) association between two numeric variables; (c) revenue comparison across four cities; (d) weekly trend over a quarter. Justify each choice by what the eye compares.',
          answer:
            '(a) Histogram — bars over value bins let the eye compare frequencies across the range, revealing centre, spread, skew and multimodality. (b) Scatter — one marker per (x, y) pair shows direction, strength, form and outliers of the association directly. (c) Bar chart of the aggregated revenue — length from a common baseline is the most accurate visual comparison of magnitude across categories; start at zero. (d) Line chart — connecting ordered time points makes trend and breaks visible as shape, which bars would obscure by treating each week as unrelated. The organising principle: distribution → histogram, relationship → scatter, categories → bar, ordered sequence → line.',
          source: 'The "which chart and why" question — universal in analyst interviews and DS exam practicals.',
        },
        summary: [
          'The question picks the chart: distribution → hist, relationship → scatter, order → line, categories → bar.',
          'Histograms depend on bins — test more than one setting before claiming a shape.',
          'Lines require a natural order; bars compare categories and must start at zero.',
          'Pie charts only for few positive parts of one whole; avoid 3D and dual axes.',
          'Every chart earns its place with a one-sentence takeaway that the chart supports.',
        ],
      }),
      [
        [
          'The honest chart for "how are exam marks distributed across 300 students" is:',
          ['Pie', 'Histogram', 'Line', 'Stacked bar'],
          1,
          'One numeric variable, many observations — the histogram of value bins answers it directly.',
        ],
        [
          'A line chart across x-axis categories with no natural order:',
          [
            'Is fine if the line is straight',
            'Implies continuity the data does not have — use bars instead',
            'Needs a log x-axis',
            'Is required when n exceeds 10',
          ],
          1,
          'Lines read as sequence and continuity; unordered categories break that contract.',
        ],
        [
          'When histogram shapes keep changing as you vary bins=, the honest response is:',
          [
            'Freeze the most attractive bin count and publish',
            'Report that the shape is sensitive to binning, and show the sensitivity',
            'Switch to a pie chart',
            'Average the histograms',
          ],
          1,
          'Binning is a free parameter; a story that depends on it is a story about the bins, not the data.',
        ],
        [
          'A bar chart comparing city revenues must start its value axis at zero because:',
          [
            'matplotlib requires it',
            'Bar length encodes value from the baseline — truncating it exaggerates differences',
            'It makes colours render correctly',
            'Zero is always the minimum of revenue data',
          ],
          1,
          'Length from a shared baseline IS the encoding; move the baseline and the ratio between bars becomes a lie (Lesson 7.4 quantifies it).',
        ],
      ]
    ),
    lesson(
      M7,
      'pyai-7-3',
      3,
      'Subplots & seaborn: Multi-panel EDA Dashboards',
      'Building 2x2 grids with plt.subplots, iterating axes arrays, and using seaborn for statistical charts that read column names straight from DataFrames.',
      18,
      nineBlocks({
        objectives: [
          'Create a grid of axes with plt.subplots(nrows, ncols) and address each panel',
          'Compose a multi-panel EDA figure with shared context and per-panel titles',
          'Use seaborn histplot, scatterplot and boxplot with data= and x=/y= arguments',
          'Explain what seaborn adds over raw matplotlib for DataFrame work',
        ],
        hook:
          'Exploratory data analysis is never one chart — it is the same dataset seen six ways in one glance. A 2x2 dashboard of distribution, relationship, category and correlation panels is what "getting to know a dataset" actually looks like, and both matplotlib subplots and seaborn make it a ten-line job.',
        concept: `**Subplots: many Axes, one Figure.** \`plt.subplots(nrows, ncols)\` returns a NumPy array of Axes:
\`\`\`
fig, axes = plt.subplots(2, 2, figsize=(10, 8))
axes[0, 0].hist(marks, bins=10)
axes[0, 1].scatter(hours, marks)
axes[1, 0].bar(cities, revenue)
axes[1, 1].plot(days, downloads)
fig.suptitle("EDA dashboard")
fig.tight_layout()
\`\`\`
Index it like a matrix: \`axes[0, 1]\` is row 0, column 1. Useful arguments: \`sharex=True\` / \`sharey=True\` to align scales across panels that compare the same variable, and \`constrained_layout=True\` as a modern alternative to tight_layout for complex grids. Per-panel \`ax.set_title("...")\` keeps each question labelled; \`fig.suptitle\` titles the whole figure.

**seaborn: statistical charts that speak DataFrame.** seaborn (\`import seaborn as sns\`) sits on top of matplotlib — same Figure and Axes objects, richer statistical defaults, and its functions accept \`data=\`, \`x=\`, \`y=\` as column NAMES so charts stay reproducible from the table itself:
\`\`\`
sns.set_theme()   # once per session — styles everything
sns.histplot(data=df, x="marks", hue="passed", kde=True)
sns.scatterplot(data=df, x="hours", y="marks", hue="city")
sns.boxplot(data=df, x="city", y="revenue")
sns.heatmap(df.corr(numeric_only=True), annot=True, cmap="coolwarm", vmin=-1, vmax=1)
\`\`\`
What each buys you: \`hue=\` adds honest colour-grouping with a legend built in; \`kde=True\` overlays a smoothed density on a histogram (a model of the shape — treat it as commentary, not data); boxplot shows median, quartiles and outlier points per category (Module 9 defines them properly); heatmap paints a correlation matrix with annotations. Because seaborn draws on matplotlib Axes, you can pass \`ax=\` to place any seaborn chart INSIDE a subplot panel — \`sns.boxplot(..., ax=axes[1, 0])\` — which is how dashboards mix both libraries panel by panel.`,
        extras: [
          code(
            'import matplotlib.pyplot as plt\nimport seaborn as sns\nimport pandas as pd\n\nsns.set_theme()\ndf = pd.DataFrame({\n    "hours": [2, 4, 5, 6, 7, 8, 9, 10, 12, 14],\n    "marks": [45, 55, 62, 71, 74, 78, 83, 88, 91, 95],\n    "city": ["Delhi"] * 5 + ["Pune"] * 5,\n})\n\nfig, axes = plt.subplots(2, 2, figsize=(10, 8))\nsns.histplot(data=df, x="marks", bins=5, ax=axes[0, 0])\nsns.scatterplot(data=df, x="hours", y="marks", hue="city", ax=axes[0, 1])\nsns.boxplot(data=df, x="city", y="marks", ax=axes[1, 0])\nsns.heatmap(df[["hours", "marks"]].corr(), annot=True,\n            cmap="coolwarm", vmin=-1, vmax=1, ax=axes[1, 1])\nfig.suptitle("EDA dashboard — marks dataset")\nfig.tight_layout()\nplt.show()',
            'dashboard.py',
            'python',
          ),
          tip(
            'seaborn and matplotlib share the same Axes',
            'Every seaborn function accepts ax=. Draw matplotlib panels and seaborn panels in the same grid without switching libraries mid-thought.',
          ),
          warn(
            'hue with too many levels is a rainbow trap',
            'A hue variable with fifteen levels produces fifteen colours nobody can match to a legend. Collapse rare levels or facet into subplots instead.',
          ),
        ],
        worked: {
          title: 'Assemble a 2x2 EDA dashboard for the marks dataset',
          problem:
            'Build one figure with four panels for the 10-student marks/hours/city data: (0,0) marks histogram, (0,1) hours-vs-marks scatter coloured by city, (1,0) marks boxplot per city, (1,1) annotated hours-marks correlation heatmap. Title the figure and keep the panels aligned.',
          steps: [
            {
              title: '1. Frame the data and theme once',
              desc: 'A tidy DataFrame is the input both libraries want. sns.set_theme() applies readable defaults for the whole session.',
              code_snippet: 'import matplotlib.pyplot as plt\nimport seaborn as sns\nimport pandas as pd\n\nsns.set_theme()\ndf = pd.DataFrame({\n    "hours": [2, 4, 5, 6, 7, 8, 9, 10, 12, 14],\n    "marks": [45, 55, 62, 71, 74, 78, 83, 88, 91, 95],\n    "city": ["Delhi"] * 5 + ["Pune"] * 5,\n})',
            },
            {
              title: '2. Create the grid',
              desc: '2x2 panels at (10, 8) inches — room enough for four readable charts. axes is a 2-D array; address panels by [row, col].',
              code_snippet: 'fig, axes = plt.subplots(2, 2, figsize=(10, 8))',
            },
            {
              title: '3. Fill each panel with the chart its question demands',
              desc: 'Distribution, relationship, category comparison, correlation — one question per panel, each passed the same ax= target so nothing lands on a ghost axes.',
              code_snippet: 'sns.histplot(data=df, x="marks", bins=5, ax=axes[0, 0])\nsns.scatterplot(data=df, x="hours", y="marks", hue="city", ax=axes[0, 1])\nsns.boxplot(data=df, x="city", y="marks", ax=axes[1, 0])\nsns.heatmap(df[["hours", "marks"]].corr(), annot=True,\n            cmap="coolwarm", vmin=-1, vmax=1, ax=axes[1, 1])',
            },
            {
              title: '4. Suptitle, layout, show',
              desc: 'One figure-level title, tight_layout for spacing, plt.show() to render. The whole EDA first pass lives on one screen.',
              code_snippet: 'fig.suptitle("EDA dashboard - marks dataset")\nfig.tight_layout()\nplt.show()',
            },
          ],
          solution:
            'One Figure, four Axes, four questions answered: marks distribution (histogram), hours–marks relationship with city colours (scatter + hue), per-city spread (boxplot), and the numeric correlation (annotated heatmap with fixed vmin/vmax so the colour scale cannot flatter the number). Every seaborn call named its ax= target; suptitle and tight_layout closed the layout. That is a complete first-pass EDA in a dozen lines.',
        },
        practice: {
          title: 'Grid thinking',
          prompt:
            'With the sales DataFrame from Module 6 (city, revenue, orders): (1) build a 1x3 figure — revenue histogram, orders scatter vs revenue, revenue bar per city (aggregate with groupby first!); (2) add a second row sharing the y-axis (sharey=True) with revenue boxplot per city and any two panels of your choice; (3) place a seaborn heatmap of the numeric correlation on the last panel; (4) list in words which panel answered which question.',
          hint: 'groupby("city")["revenue"].sum() gives bar heights; axes is addressable [row, col] like any array.',
        },
        mistakes: [
          {
            mistake: 'Addressing axes[0] when the grid is 2-D',
            fix: 'With 2x2, axes[0] is the first ROW (an array of two Axes), not a panel. Use axes[0, 0]. For 1-D grids, plt.subplots(2, squeeze=False) avoids the one-panel-squeeze surprise.',
          },
          {
            mistake: 'Forgetting ax= and drawing a seaborn chart outside the grid',
            fix: 'seaborn defaults to creating its own current figure. In a dashboard every call must carry ax= so the panel lands where you think it does.',
          },
          {
            mistake: 'Heatmap over a DataFrame with text columns',
            fix: 'df.corr() errors or silently misbehaves on non-numerics — pass numeric_only=True or select numeric columns explicitly before corr().',
          },
          {
            mistake: 'Rainbow hue with a dozen levels',
            fix: 'Cap categorical hue levels at a handful; bin continuous variables into meaningful groups or facet into small multiples instead of colouring everything.',
          },
        ],
        exam: {
          question:
            'How do you construct a 2x2 panel figure in matplotlib, and how do you place a seaborn boxplot into the bottom-left panel?',
          answer:
            'fig, axes = plt.subplots(2, 2, figsize=(10, 8)) returns a Figure and a 2x2 NumPy array of Axes; each panel is addressed as axes[row, col], e.g. axes[0, 0] top-left and axes[1, 0] bottom-left. seaborn functions draw on matplotlib Axes and accept ax=, so the boxplot is placed with sns.boxplot(data=df, x="city", y="revenue", ax=axes[1, 0]). Per-panel titles go on each Axes (axes[1, 0].set_title(...)); the figure-level title goes through fig.suptitle; fig.tight_layout() (or constrained_layout) resolves label collisions before fig.savefig or plt.show().',
          source: 'The standard multi-panel practical question in DS lab exams — usually "produce a 2x2 EDA figure" as a written or coded task.',
        },
        summary: [
          'plt.subplots(2, 2) returns a 2-D array of Axes — address panels as axes[row, col].',
          'One question per panel; per-panel titles plus a figure suptitle; tight_layout before render.',
          'seaborn reads DataFrames: sns.<chart>(data=df, x="col", y="col", hue="group").',
          'hue adds grouped colour with a legend; heatmap paints annotated correlation matrices.',
          'Every seaborn call inside a grid needs ax= — otherwise it draws somewhere else.',
        ],
      }),
      [
        [
          'After fig, axes = plt.subplots(2, 2, figsize=(10, 8)), the bottom-right panel is:',
          ['axes[1]', 'axes[1, 1]', 'axes[2, 2]', 'axes["bottom", "right"]'],
          1,
          'Panels are addressed by [row, col] zero-based — row 1, col 1 is bottom-right.',
        ],
        [
          'sns.scatterplot(data=df, x="hours", y="marks", hue="city") draws the points because:',
          [
            'matplotlib guesses the columns',
            'seaborn reads the named columns from the DataFrame passed as data=',
            'The columns must be in alphabetical order',
            'hue= sorts the data first',
          ],
          1,
          'data= plus x=/y= as column names is seaborn\'s DataFrame-native interface — the same table powers every panel.',
        ],
        [
          'To place a seaborn boxplot inside an existing subplot panel you must:',
          [
            'Rebuild the figure in seaborn',
            'Pass ax= that_panel to the seaborn function',
            'Call plt.subplot first',
            'Use sns.set_theme(ax=...)',
          ],
          1,
          'seaborn draws on matplotlib Axes; ax= targets the specific panel of your grid.',
        ],
        [
          'sns.heatmap(..., vmin=-1, vmax=1) on a correlation matrix is best practice because:',
          [
            'It speeds up rendering',
            'It pins the colour scale to the full correlation range so colours mean the same thing across figures',
            'It removes negative correlations',
            'It is required for annotated heatmaps',
          ],
          1,
          'Auto-scaled colourbars make identical numbers look different across charts; fixed limits keep colour comparable and honest.',
        ],
      ]
    ),
    lesson(
      M7,
      'pyai-7-4',
      4,
      'Honest Visualization: Axes, Scales & the Lies We Tell',
      'Truncated bar axes, hidden log scales, cherry-picked ranges and causation claims — how charts mislead without a single false number, and the rules that prevent it.',
      19,
      nineBlocks({
        objectives: [
          'Detect and fix a truncated-axis bar chart by quantifying the distortion',
          'Decide when a non-zero or log baseline is legitimate and how to label it',
          'Separate correlation claims from causal claims in a chart narrative',
          'Apply a checklist that makes any chart honest before it leaves your notebook',
        ],
        hook:
          'Same two numbers — 48 and 52 lakh — drawn twice. One axis runs 0 to 60: two bars, barely different. The other runs 48 to 52: a cliff, a crisis, a headline. No number was false; the axis lied. Truncated bar charts, hidden log scales and cherry-picked windows are how dashboards mislead — and they are why employers ask about chart honesty in data interviews.',
        concept: `**The bar-length lie.** Bars encode value as LENGTH from a baseline. Cut the baseline away and the length ratio stops matching the value ratio: bars of 48 and 52 are a 1.08x difference, but on a 48–52 axis they render as a 1:7 sliver versus a full bar — an 8% difference drawn as a 700% one. Rule: **bar and column charts start at zero. Always.** If the difference is too small to see at zero, the honest finding is "the difference is small" — say that in words; do not zoom the axis until it looks big.

**When a non-zero baseline is legitimate.** Line charts and scatter plots encode value by POSITION, not length, so their axes may zoom to show shape — provided the zoom is visible: the y-axis labels on screen, and a note when it matters ("y-axis starts at 45"). Line charts of temperatures of 24–31 degrees legitimately zoom; the same zoom on bars does not.

**Log scales: power with a disclosure.** When data spans orders of magnitude (city populations, model losses, file sizes), a log y-axis turns multiplicative spreads into readable positions. It is honest ONLY when the axis says so — label it "Revenue (log scale)" — and when tick labels keep real values (10, 100, 1000) so readers do the multiplication in their heads, not in their confusion.

**The other familiar lies.** Cherry-picked time windows (starting the axis at the good month); unsorted bars that hide the ranking; dual y-axes tuned until two unrelated lines "co-move"; truncated maps/histograms of the target that drop inconvenient points; 3D perspective that fattens one bar. And the narrative lie: "ice-cream sales drive drowning" — a scatter showing correlation narrated as causation. Correlation is a picture; causation is a claim requiring mechanism, controlled experiments or strong quasi-experimental design (Module 9.3 drills this). Charts show association. Words must not upgrade it.

**The pre-publish checklist.** (1) Bars zero-based? (2) Axes labelled with units? (3) Log or zoomed scales disclosed? (4) Time window full and stated? (5) n = visible ("200 patients, March–May")? (6) Title states the finding, not the topic? (7) The takeaway sentence supported without exaggeration? (8) No causal verb ("drives", "causes") unless the design earned it.`,
        extras: [
          table(
            'Honest vs misleading — the classic set',
            ['Technique', 'What it does to the reader', 'The honest fix'],
            [
              ['Truncated bar axis', 'Exaggerates small differences via length', 'Zero baseline; state "difference is small" instead'],
              ['Zoomed line axis', 'Fine for shape — lies if unlabeled', 'Disclose the zoom in title or axis note'],
              ['Hidden log scale', 'Multiplies perception silently', 'Label "log scale"; keep real-valued ticks'],
              ['Cherry-picked window', 'Manufactures trend or decline', 'Show the full period; mark the zoomed sub-window'],
              ['Dual y-axes', 'Fake correlation via two scales', 'Two panels, or one normalised panel'],
            ],
          ),
          code(
            'import matplotlib.pyplot as plt\n\ncities = ["Delhi", "Pune", "Kochi"]\nrevenue = [48.0, 50.5, 52.0]\n\nfig, axes = plt.subplots(1, 2, figsize=(10, 4))\naxes[0].bar(cities, revenue)\naxes[0].set_ylim(0, 60)\naxes[0].set_title("Honest: zero-based, differences look small")\naxes[1].bar(cities, revenue)\naxes[1].set_ylim(48, 52)          # the classic lie\naxes[1].set_title("Misleading: truncated axis")\nfig.tight_layout()\nplt.show()',
            'axis-lie.py',
            'python',
          ),
          warn(
            'The chart lies even when every number is true',
            'Misleading visualization needs no false data — only a moved baseline, a cropped window or an undisclosed scale. That is why honesty is a checklist, not a fact-check.',
          ),
        ],
        worked: {
          title: 'Draw the same data honestly and dishonestly, then quantify the distortion',
          problem:
            'Quarterly revenue: Q1 48.0, Q2 50.5, Q3 52.0 (lakh). Draw a two-panel figure: left panel honest (zero-based), right panel with the y-axis truncated to 48–52. Compute the true value ratios and describe what the truncated panel makes them look like.',
          steps: [
            {
              title: '1. Honest panel — zero baseline',
              desc: 'Bars from zero: the Q1-to-Q3 rise is 52/48 = 1.083x — an 8% gain, drawn as an 8% gain.',
              code_snippet: 'import matplotlib.pyplot as plt\n\nquarters = ["Q1", "Q2", "Q3"]\nrevenue = [48.0, 50.5, 52.0]\n\nfig, axes = plt.subplots(1, 2, figsize=(10, 4))\naxes[0].bar(quarters, revenue)\naxes[0].set_ylim(0, 60)\naxes[0].set_ylabel("Revenue (lakh)")\naxes[0].set_title("Honest: 8% growth, drawn at 8%")',
            },
            {
              title: '2. Dishonest panel — truncated baseline',
              desc: 'Same three numbers, y-axis from 48: Q1 renders as a sliver, Q3 as a tower. The visual ratio is roughly (52-48)/(50.5-48) = 1.6x per step — not the data\'s ratio.',
              code_snippet: 'axes[1].bar(quarters, revenue)\naxes[1].set_ylim(48, 52)\naxes[1].set_title("Misleading: same data, moved baseline")\nfig.tight_layout()\nplt.show()',
            },
            {
              title: '3. Quantify the truth',
              desc: 'Print the real ratios so the numbers — not the bars — do the talking: Q2 is 5.2% above Q1; Q3 is 8.3% above Q1.',
              code_snippet: 'print(revenue[1] / revenue[0] - 1)   # 0.052 -> 5.2%\nprint(revenue[2] / revenue[0] - 1)   # 0.083 -> 8.3%',
            },
            {
              title: '4. Write the honest takeaway',
              desc: 'The finding is the modest growth itself. If the audience needs emphasis, emphasise with words and numbers — never with a moved baseline.',
              code_snippet: '# Takeaway: "Revenue grew 8.3% over three quarters (48.0 to 52.0 lakh)."',
            },
          ],
          solution:
            'Side by side, the panels teach the whole lesson: identical data, two axis choices, opposite impressions. The true ratios (5.2% and 8.3% growth) live in the numbers, not the bar lengths; the truncated panel inflates them into a cliff by cutting 48 lakh off the baseline. The honest chart keeps zero, and the takeaway sentence carries the emphasis the axis refuses to fake.',
        },
        practice: {
          title: 'Audit and repair',
          prompt:
            'Take the "misleading" list and produce a repair for each: (1) a bar chart of monthly app ratings 4.6 vs 4.8 with y from 4.5 — redraw honestly AND suggest the right chart if precision on a 0–5 scale matters (dot plot with a labelled axis); (2) a line chart of revenue over 24 months but only months 13–24 shown — add the full series as a context panel; (3) a scatter narrated as "marketing spend causes sales" — rewrite the title to correlation language and name one plausible confounder; (4) any chart of yours: run the eight-point checklist and list any item you would have failed yesterday.',
          hint: 'Position-encoded charts (dots, lines) may zoom with disclosure; length-encoded charts (bars) may not.',
        },
        mistakes: [
          {
            mistake: '"Zooming in" a bar chart to show the difference',
            fix: 'Bars encode length from baseline — keep zero. If the difference is invisible at zero, switch to a dot plot (position-encoded) or state the number in the title.',
          },
          {
            mistake: 'Log axis without a label',
            fix: 'Readers assume linear by default. Mark "log scale" in the axis label and keep real-value tick labels so the multiplication stays visible.',
          },
          {
            mistake: 'Causal language on an observational scatter',
            fix: '"Associated with", "moves with" — reserve "causes" and "drives" for experimental or otherwise defensible causal designs. Name confounders in the caption.',
          },
          {
            mistake: 'No n, no window, no source',
            fix: 'A chart without "n = 200 patients, Jan–Jun, source: survey" cannot be evaluated. Sample size and period belong on the figure or directly under it.',
          },
        ],
        exam: {
          question:
            "A colleague's dashboard shows quarterly revenue as a bar chart whose y-axis runs 48 to 52 lakh, captioned \"revenue collapsed then recovered\". Diagnose the chart, quantify the distortion for a 48.0 → 52.0 rise, and state the honest presentation.",
          answer:
            'The axis is truncated: bars encode value as length from the baseline, so cutting the axis below 48 inflates every difference. The true change from 48.0 to 52.0 lakh is 52/48 = 1.083 — an 8.3% rise — but on a 48–52 axis the early bar becomes a near-zero sliver while the later bar fills the panel, rendering an 8% change as if it were a multi-fold swing. Honest fix: restore the zero baseline so lengths compare truthfully; if the 8% change then looks minor, the title should say "Revenue up 8.3% over three quarters" — emphasis through numbers and words, never through a moved baseline. If fine resolution matters, a dot/line chart with a clearly labelled zoomed y-axis is acceptable because position (not length) is the encoding — with the zoom disclosed. Also report n and the time window on the chart.',
          source: 'The "what is wrong with this chart" question — a fixture of analyst interviews and the exact scenario tested in the platform\'s Excel-course chart lesson.',
        },
        summary: [
          'Bars encode length from a baseline — bar charts always start at zero.',
          'Line and scatter encode position — their axes may zoom, but the zoom must be disclosed.',
          'Log scales are legitimate for wide-range data only when labelled, with real-valued ticks.',
          'Cherry-picked windows, unsorted bars and dual axes are lies of selection, not of arithmetic.',
          'Correlation charts show association; causal words need causal designs.',
          'Pre-publish checklist: zero bars, units, disclosed scales, full window, visible n, finding-style title, supported takeaway.',
        ],
      }),
      [
        [
          'A bar chart of values 48.0 and 52.0 with y-axis 48–52 makes the difference look:',
          ['About 8% — correct', 'Far larger than the true 8.3% — bars encode length from the baseline', 'Exactly half', 'Smaller than reality'],
          1,
          'Truncating the baseline inflates length ratios far beyond value ratios — the classic axis lie.',
        ],
        [
          'Which chart type may legitimately use a non-zero y-axis (with disclosure)?',
          ['Column/bar', 'Line or scatter — they encode position, not length', 'Area chart', 'Any chart, always'],
          1,
          'Position-encoded charts can zoom to show shape; length-encoded charts cannot.',
        ],
        [
          'A log y-axis is honest when:',
          [
            'It makes the chart look dramatic',
            'It is labelled as log scale and ticks keep real values, for wide-range multiplicative data',
            'The data has negative values',
            'It is paired with a dual linear axis',
          ],
          1,
          'Disclosure plus real-valued ticks let readers translate positions into magnitudes — the only way a log chart stays readable.',
        ],
        [
          'A scatter of ice-cream sales vs drowning deaths with the title "ice cream causes drowning" is wrong because:',
          [
            'The correlation is probably zero',
            'Correlation shows association; a confounder (e.g. summer temperature) can drive both without either causing the other',
            'Scatter charts cannot show causation graphs',
            'Pie charts would be better',
          ],
          1,
          'Observational association plus a plausible common cause is the textbook correlation-is-not-causation case.',
        ],
      ]
    ),
  ],
};
