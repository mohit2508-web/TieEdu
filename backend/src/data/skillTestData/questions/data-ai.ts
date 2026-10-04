import type { QuestionBank } from '../types';

// 14 data-science/AI skills × 10 questions each.
export const BANK: QuestionBank = {
  // ── pandas ─────────────────────────────────────────────────────────────────
  pandas: [
    ['Series & DataFrame', 'beginner', 'single_choice', 'A pandas Series is:', ['A 1-D labelled array', 'A 2-D table only', 'A chart', 'A SQL query'], [0], 'Series = single column with an index; DataFrame = 2-D table of Series.'],
    ['Series & DataFrame', 'beginner', 'single_choice', 'How do you create a DataFrame from a dict of lists?', ['pd.DataFrame({...})', 'pd.table({...})', 'DataFrame.new({...})', 'pd.read(dict)'], [0], 'Column names are dict keys; lists are the values.'],
    ['Series & DataFrame', 'intermediate', 'single_choice', 'df.shape returns:', ['Data types', '(rows, columns)', 'Column names', 'Memory size'], [1], 'A tuple like (1000, 5).'],
    ['Indexing & Filtering', 'intermediate', 'single_choice', "df.loc[3, 'age'] selects:", ['A column slice', 'A single value by label', 'Rows 0–3', 'A group'], [1], 'loc is label-based; iloc is positional.'],
    ['Indexing & Filtering', 'intermediate', 'single_choice', "df[df['salary'] > 50000] does what?", ['Sorts salary', 'Filters rows where salary > 50000', 'Drops column', 'Sets salary'], [1], 'Boolean masks filter rows.'],
    ['Indexing & Filtering', 'advanced', 'single_choice', 'Difference between loc and iloc:', ['loc label-based (inclusive end), iloc positional (exclusive end)', 'No difference', 'iloc works on strings only', 'loc is faster only'], [0], 'Careful: loc slices inclusively, iloc exclusively.'],
    ['GroupBy', 'intermediate', 'single_choice', "df.groupby('dept')['salary'].mean() computes:", ['Mean of each department’s salaries', 'Global mean only', 'Count of departments', 'Sorted salary'], [0], 'Split-apply-combine: group, aggregate, merge.'],
    ['GroupBy', 'advanced', 'single_choice', 'Which is NOT a valid aggregation?', ['mean', 'sum', 'count', 'visualize'], [3], 'visualize is a plot method, not an aggregation.'],
    ['Merging & Joining', 'intermediate', 'single_choice', 'pd.merge(a, b, on="id") is closest to SQL:', ['INNER JOIN on id', 'CROSS JOIN', 'UNION', 'GROUP BY'], [0], 'How defaults to inner; use how="left"/"outer" for others.'],
    ['Cleaning', 'intermediate', 'multiple_choice', 'Which handle missing values?', ['fillna', 'dropna', 'interpolate', 'rename'], [0, 1, 2], 'fillna imputes, dropna removes, interpolate fills gaps — rename does not deal with NA.'],
  ],

  // ── statistics ─────────────────────────────────────────────────────────────
  statistics: [
    ['Descriptive Statistics', 'beginner', 'single_choice', 'Which measure is most affected by outliers?', ['Mean', 'Median', 'Mode', 'Interquartile range'], [0], 'Extreme values pull the mean; median is robust.'],
    ['Descriptive Statistics', 'beginner', 'single_choice', 'What does standard deviation measure?', ['Central tendency', 'Spread/dispersion of data', 'Relationship strength', 'Count of data'], [1], 'It quantifies typical distance from the mean.'],
    ['Descriptive Statistics', 'intermediate', 'single_choice', 'The 50th percentile equals the:', ['Mean', 'Median', 'Mode', 'Range'], [1], 'Percentile 50 splits data in half.'],
    ['Probability', 'intermediate', 'single_choice', 'P(A and B) for independent events equals:', ['P(A) + P(B)', 'P(A) × P(B)', 'P(A) / P(B)', 'max(P(A), P(B))'], [1], 'Independence: joint probability factors.'],
    ['Probability', 'intermediate', 'single_choice', "P(A|B) with Bayes' rule relates to:", ['Prior, likelihood and evidence', 'Variance only', 'Sample mean', 'Standard error only'], [0], 'P(A|B) = P(B|A)P(A) / P(B).'],
    ['Distributions', 'intermediate', 'single_choice', 'The normal distribution is characterized by its:', ['Mean and standard deviation', 'Min and max', 'Mode only', 'Sample size'], [0], '68-95-99.7 rule follows from μ and σ.'],
    ['Distributions', 'advanced', 'single_choice', 'The central limit theorem says that sample means approach:', ['Uniform distribution', 'Normal distribution as n grows', 'Exponential', 'Binomial always'], [1], 'Regardless of population shape, means become ~normal for large n.'],
    ['Hypothesis Testing', 'intermediate', 'single_choice', 'A p-value is:', ['Probability null is true', 'Probability of data this extreme assuming H0', 'Effect size', 'Sample size'], [1], 'Small p → data unlikely under H0 → reject H0.'],
    ['Hypothesis Testing', 'advanced', 'single_choice', 'A Type I error is:', ['Falsely rejecting a true null hypothesis (false positive)', 'Falsely accepting a false null', 'Sampling too little', 'Wrong formula'], [0], 'α (significance level) is the rate of false positives.'],
    ['Regression', 'intermediate', 'single_choice', 'In simple linear regression, R² represents:', ['Slope value', 'Proportion of variance in y explained by x', 'Error count', 'Intercept'], [1], 'R² ranges 0–1 (higher = better fit).'],
  ],

  // ── machine-learning ───────────────────────────────────────────────────────
  'machine-learning': [
    ['Supervised Learning', 'beginner', 'single_choice', 'Which is a supervised learning task?', ['Clustering customers', 'Predicting house prices from labelled data', 'Topic discovery', 'Anomaly grouping'], [1], 'Supervised = labelled input→output pairs.'],
    ['Supervised Learning', 'beginner', 'single_choice', 'Linear regression predicts:', ['Categories', 'A continuous numeric value', 'Clusters only', 'Probabilities only'], [1], 'Fits a line/plane for continuous targets.'],
    ['Supervised Learning', 'intermediate', 'single_choice', 'Logistic regression is used for:', ['Regression only', 'Binary/multiclass classification', 'Dimensionality reduction', 'Clustering'], [1], 'It models class probabilities via sigmoid/softmax.'],
    ['Supervised Learning', 'intermediate', 'single_choice', 'Decision trees split nodes to:', ['Maximize randomness', 'Maximize information gain / minimize impurity', 'Increase depth always', 'Store data'], [1], 'Gini or entropy measures guide splits.'],
    ['Unsupervised Learning', 'beginner', 'single_choice', 'K-means clustering requires:', ['Labels', 'The number of clusters K', 'A test set', 'Regression target'], [1], 'K must be chosen (elbow/silhouette methods help).'],
    ['Unsupervised Learning', 'intermediate', 'single_choice', 'PCA primarily does:', ['Classification', 'Dimensionality reduction', 'Deep feature learning', 'Sampling'], [1], 'PCA projects onto directions of maximum variance.'],
    ['Model Evaluation', 'intermediate', 'single_choice', 'Accuracy is misleading when classes are:', ['Balanced', 'Imbalanced (e.g. 99% negative)', 'Small', 'Numeric'], [1], 'Always-predict-majority scores 99% — use precision/recall/F1.'],
    ['Model Evaluation', 'intermediate', 'single_choice', 'Precision = ?', ['TP / (TP + FP)', 'TP / (TP + FN)', 'TN / (TN + FP)', '(TP+TN)/all'], [0], 'Of predicted positives, how many are truly positive.'],
    ['Feature Engineering', 'intermediate', 'multiple_choice', 'Which are common preprocessing steps?', ['Scaling/normalization', 'Encoding categoricals', 'Handling missing values', 'Deleting the target randomly'], [0, 1, 2], 'Scaling, encoding and imputation are standard; corrupting the target is not.'],
    ['Overfitting', 'intermediate', 'single_choice', 'Which helps reduce overfitting?', ['More features always', 'Regularization, cross-validation, more data, dropout', 'Training forever', 'Removing validation'], [1], 'Overfitting = memorizing noise; constrain or regularize the model.'],
  ],

  // ── deep-learning ──────────────────────────────────────────────────────────
  'deep-learning': [
    ['Neural Networks', 'beginner', 'single_choice', 'What is an activation function for?', ['Sorting data', 'Introducing non-linearity', 'Reducing dataset size', 'Choosing learning rate'], [1], 'Without activations, layers collapse to a linear map.'],
    ['Neural Networks', 'beginner', 'single_choice', 'A neuron computes:', ['Only the max input', 'Weighted sum + bias, then activation', 'Random output', 'Median of inputs'], [1], 'z = w·x + b; a = f(z).'],
    ['Neural Networks', 'intermediate', 'single_choice', 'Which activation is common in hidden layers of modern nets?', ['ReLU', 'Step function only', 'Identity only', 'Sigmoid everywhere'], [0], 'ReLU mitigates vanishing gradients and is cheap to compute.'],
    ['Backpropagation', 'intermediate', 'single_choice', 'Backpropagation computes:', ['Input labels', 'Gradients of loss w.r.t. weights via chain rule', 'Final accuracy', 'Dataset splits'], [1], 'Gradients flow backward layer by layer.'],
    ['Backpropagation', 'advanced', 'single_choice', 'The vanishing gradient problem means:', ['Gradients explode to infinity', 'Gradients shrink through layers, stalling early-layer learning', 'Data vanishes', 'GPU memory full'], [1], 'Solved largely by ReLU, residual connections and careful init.'],
    ['CNNs', 'intermediate', 'single_choice', 'Convolutional layers are effective for images because of:', ['More parameters always', 'Local connectivity and shared weights (spatial patterns)', 'No training needed', 'Random filters'], [1], 'Kernels detect edges/textures reused across the image.'],
    ['CNNs', 'intermediate', 'single_choice', 'Pooling layers mainly:', ['Increase channels', 'Reduce spatial size / add translational robustness', 'Add noise', 'Normalize labels'], [1], 'Max/average pooling downsamples feature maps.'],
    ['RNNs & Transformers', 'intermediate', 'single_choice', 'What limits classic RNNs on long sequences?', ['Too many outputs', 'Difficulty retaining long-range information (vanishing gradients)', 'No weights', 'Image size'], [1], 'LSTMs/GRUs and transformers address this.'],
    ['RNNs & Transformers', 'advanced', 'single_choice', 'The key innovation of the transformer is:', ['Recurrence', 'Self-attention allowing direct access between any positions', 'Convolutions only', 'Dropout only'], [1], 'Self-attention models dependencies in parallel with O(n²) attention.'],
    ['Optimization', 'intermediate', 'single_choice', 'The learning rate controls:', ['Batch size', 'Step size of weight updates', 'Number of layers', 'Loss formula'], [1], 'Too high → diverges; too low → slow/stuck training.'],
  ],

  // ── nlp ────────────────────────────────────────────────────────────────────
  nlp: [
    ['Text Preprocessing', 'beginner', 'single_choice', 'Lowercasing text helps because:', ['It reduces vocabulary size / merges case variants', 'It adds meaning', 'It encrypts text', 'It is required by all models'], [0], 'Cat/cat become one token type, reducing sparsity.'],
    ['Text Preprocessing', 'beginner', 'single_choice', 'What does stop-word removal do?', ['Removes common low-information words', 'Removes rare words only', 'Stops training', 'Removes punctuation only'], [0], 'Words like "the"/"is" often add little signal.'],
    ['Tokenization', 'beginner', 'single_choice', 'Tokenization splits text into:', ['Sentences only', 'Units the model processes (words/subwords)', 'Vectors immediately', 'Keywords only'], [1], 'Subword tokenizers (BPE) balance vocabulary size and coverage.'],
    ['Tokenization', 'intermediate', 'single_choice', 'Why subword tokens instead of words?', ['Shorter sequences always', 'Handle rare words by composing known subunits', 'No embeddings needed', 'Faster I/O only'], [1], 'Unknown words are decomposed — no UNK explosion.'],
    ['Embeddings', 'intermediate', 'single_choice', 'Word embeddings represent words as:', ['One-hot only', 'Dense vectors capturing semantic similarity', 'Integers', 'Hashes'], [1], 'Similar words land near each other in vector space.'],
    ['Embeddings', 'advanced', 'single_choice', 'In Word2Vec, words in similar contexts get:', ['Unrelated vectors', 'Similar vectors', 'Identical IDs', 'Negative values always'], [1], 'Distributional hypothesis — context predicts meaning.'],
    ['Modeling', 'intermediate', 'single_choice', 'TF-IDF scores words by:', ['Frequency only', 'Term frequency weighted by rarity across documents', 'Position', 'Sentiment'], [1], 'Rare-but-frequent-in-doc words score high.'],
    ['Modeling', 'advanced', 'single_choice', 'For sentiment classification, an RNN/CNN over embeddings beats bag-of-words mainly because of:', ['Word order and context', 'Fewer parameters', 'No training', 'Fixed vocab'], [0], 'Order/context capture negation and phrase meaning.'],
    ['Transformers', 'advanced', 'single_choice', 'What does an attention head compute?', ['Fixed filters', 'Weighted combination of value vectors based on query-key similarity', 'Backprop', 'Token counts'], [1], 'softmax(QKᵀ/√d)·V.'],
    ['Transformers', 'advanced', 'single_choice', 'Positional encodings are needed because:', ['Attention alone is order-invariant', 'GPUs need them', 'They encrypt text', 'They reduce size'], [0], 'Self-attention treats tokens as a set — positions must be injected.'],
  ],

  // ── computer-vision ────────────────────────────────────────────────────────
  'computer-vision': [
    ['Image Basics', 'beginner', 'single_choice', 'A grayscale image is typically stored as:', ['One channel of pixel intensities', 'Three channels', 'A vector of labels', 'Text only'], [0], 'RGB images use three channels (R, G, B).'],
    ['Image Basics', 'beginner', 'single_choice', 'Resolution 1920×1080 means:', ['1920 pixels per inch', '1920 columns × 1080 rows of pixels', 'File size 1920 KB', '1080 colors'], [1], 'Width × height in pixels.'],
    ['Image Basics', 'intermediate', 'single_choice', 'What does resizing an image to 224×224 usually precede?', ['Label creation', 'Inputting a fixed-size CNN (e.g. ImageNet models)', 'Compression only', 'Data deletion'], [1], 'Many networks expect fixed input dimensions.'],
    ['Convolutions', 'intermediate', 'single_choice', 'A 3×3 kernel with stride 1 and no padding on a 32×32 image yields feature map size:', ['32×32', '30×30', '29×29', '3×3'], [1], 'Output = input − kernel + 1 = 30 with stride 1, no padding.'],
    ['Convolutions', 'intermediate', 'single_choice', 'Padding primarily prevents:', ['Overfitting', 'Shrinking of feature maps (loss at borders)', 'Slow training', 'Color shift'], [1], 'Same padding keeps spatial size; valid padding shrinks it.'],
    ['CNN Architectures', 'intermediate', 'single_choice', 'Which architecture introduced residual (skip) connections?', ['LeNet', 'ResNet', 'AlexNet only', 'VGG only'], [1], 'ResNets allow very deep training by adding identity shortcuts.'],
    ['CNN Architectures', 'advanced', 'single_choice', '1×1 convolutions are used to:', ['Downsample spatially', 'Mix channels / change depth cheaply', 'Add blur', 'Crop images'], [1], 'They act across channels at each pixel — a cheap projection.'],
    ['Detection & Segmentation', 'advanced', 'single_choice', 'Object detection outputs:', ['Class label only', 'Class + bounding box per object', 'Pixel-perfect mask only', 'Image caption'], [1], 'YOLO/SSD/Faster R-CNN regress boxes and classify them.'],
    ['Detection & Segmentation', 'advanced', 'single_choice', 'Semantic segmentation assigns:', ['One label per whole image', 'A class to every pixel', 'Boxes only', 'Frames in video'], [1], 'Per-pixel classification (e.g. U-Net, DeepLab).'],
    ['Vision Transformers', 'advanced', 'single_choice', 'A Vision Transformer splits an image into:', ['Convolution kernels', 'Patches flattened as tokens', 'Colors', 'Labels'], [1], 'Patches are embedded and fed like NLP tokens.'],
  ],

  // ── tensorflow ─────────────────────────────────────────────────────────────
  tensorflow: [
    ['Tensors & Operations', 'beginner', 'single_choice', 'What is a tensor in TensorFlow?', ['A table of rows', 'A multidimensional array of numbers', 'A graph only', 'A layer'], [1], 'Scalars, vectors, matrices and higher-rank arrays.'],
    ['Tensors & Operations', 'beginner', 'single_choice', 'tf.constant creates:', ['A mutable variable', 'An immutable tensor', 'A dataset', 'A layer'], [1], 'Use tf.Variable for values that change during training.'],
    ['Tensors & Operations', 'intermediate', 'single_choice', 'What does tf.reshape do?', ['Changes shape without changing data', 'Sorts data', 'Adds layers', 'Casts dtype'], [0], 'Elements keep row-major order in the new shape.'],
    ['Keras API', 'beginner', 'single_choice', 'Which function stacks layers in Keras?', ['Sequential / Model', 'compile only', 'fit only', 'predict'], [0], 'Sequential for linear stacks; Functional API for graphs.'],
    ['Keras API', 'intermediate', 'single_choice', 'What does model.compile specify?', ['The dataset file', 'Optimizer, loss and metrics', 'Only the batch size', 'GPU selection'], [1], 'Compile configures training before model.fit().'],
    ['Keras API', 'intermediate', 'single_choice', 'What does model.fit(x, y, epochs=5) do?', ['Evaluates only', 'Trains for 5 passes over the data', 'Exports SavedModel', 'Plots loss'], [1], 'fit runs forward/backward passes and optimizer updates.'],
    ['Training Loops', 'intermediate', 'single_choice', 'GradientTape is used to:', ['Record operations for automatic differentiation', 'Draw plots', 'Tape datasets', 'Freeze layers'], [0], 'GradientTape watches trainable variables to compute gradients.'],
    ['Training Loops', 'advanced', 'single_choice', 'What does optimizer.apply_gradients(grads, vars) do?', ['Prints stats', 'Updates weights using computed gradients', 'Resets model', 'Loads checkpoint'], [1], 'This is the actual weight update step (SGD/Adam etc.).'],
    ['CNNs & RNNs', 'intermediate', 'single_choice', 'Which layer type is used for sequences in TensorFlow?', ['Dense only', 'LSTM / GRU / Conv1D', 'Pooling only', 'Flatten only'], [1], 'Recurrent layers process time-ordered inputs.'],
    ['Deployment', 'advanced', 'single_choice', 'TensorFlow Lite is for:', ['Desktop only', 'Mobile and edge inference', 'Data labeling', 'Cluster training'], [1], 'TFLite provides small-footprint on-device inference.'],
  ],

  // ── pytorch ────────────────────────────────────────────────────────────────
  pytorch: [
    ['Tensors & Autograd', 'beginner', 'single_choice', 'torch.tensor([1,2,3]) creates:', ['A list', 'A tensor', 'A numpy array only', 'A dataset'], [1], 'Tensors support GPU placement and autograd.'],
    ['Tensors & Autograd', 'intermediate', 'single_choice', 'What does requires_grad=True do?', ['Disables gradients', 'Tracks operations for autograd on that tensor', 'Copies to GPU', 'Freezes weights'], [1], 'Enables automatic differentiation through operations on it.'],
    ['Tensors & Autograd', 'intermediate', 'single_choice', 'After loss.backward(), where do gradients live?', ['In the loss only', 'In .grad of leaf tensors with requires_grad', 'On disk', 'In the optimizer'], [1], 'Each parameter accumulates its gradient during backward.'],
    ['nn.Module', 'beginner', 'single_choice', 'In PyTorch, a model typically:', ['Is a plain function only', 'Is a subclass of nn.Module with forward()', 'Must be written in C++', 'Uses HTML'], [1], 'Define layers in __init__, compute in forward.'],
    ['nn.Module', 'intermediate', 'single_choice', 'What does nn.Linear(in, out) represent?', ['A convolution', 'A fully connected layer y = xWᵀ + b', 'A normalization', 'A dropout'], [1], 'Applies an affine transformation.'],
    ['Training Loop', 'intermediate', 'single_choice', 'Standard PyTorch step order per iteration?', ['zero_grad → forward → loss.backward() → optimizer.step()', 'backward → zero → step → forward', 'fit() built-in only', 'predict → train'], [0], 'Zero old grads, compute loss, backprop, update.'],
    ['Training Loop', 'advanced', 'single_choice', 'Why call optimizer.zero_grad() (or zero_grad(set_to_none=True))?', ['To reset accumulated gradients from previous steps', 'To delete the model', 'To reduce batch size', 'To free the dataset'], [0], 'PyTorch accumulates grads by default — they must be cleared.'],
    ['Data Loading', 'intermediate', 'single_choice', 'What does DataLoader provide?', ['GPU kernels', 'Batching, shuffling and parallel loading of a Dataset', 'Plotting', 'Model saving'], [1], 'Dataset defines samples; DataLoader batches/shuffles them.'],
    ['Data Loading', 'beginner', 'single_choice', 'What does model.train() vs model.eval() change?', ['Weights themselves', 'Mode-dependent behaviours like dropout/batchnorm', 'Nothing', 'Data only'], [1], 'Dropout off in eval; batchnorm uses running stats.'],
    ['Deployment', 'advanced', 'single_choice', 'torch.save(model.state_dict(), ...) stores:', ['The entire Python program', 'Only the learned parameters', 'The dataset', 'Gradients history'], [1], 'state_dict maps parameter names to tensors (portable for reloading).'],
  ],

  // ── generative-ai ──────────────────────────────────────────────────────────
  'generative-ai': [
    ['LLM Basics', 'beginner', 'single_choice', 'LLM stands for:', ['Long Language Model', 'Large Language Model', 'Linear Learning Machine', 'Local Language Mode'], [1], 'Large models trained to predict text tokens.'],
    ['LLM Basics', 'beginner', 'single_choice', 'LLMs next-token prediction makes them good at:', ['Arithmetic on huge numbers by design', 'Generating plausible text continuations', 'Guaranteed fact retrieval', 'Executing SQL'], [1], 'They produce statistically likely continuations — verify facts.'],
    ['Transformers', 'intermediate', 'single_choice', 'LLMs are built mainly on:', ['RNN stacks', 'Transformer decoder blocks with self-attention', 'Bayesian networks', 'Decision trees'], [1], 'GPT-style models are decoder-only transformers.'],
    ['Transformers', 'intermediate', 'single_choice', 'What is a token in an LLM?', ['A whole document', 'A subword/word unit the model reads and predicts', 'A GPU thread', 'A password'], [1], 'Text is tokenized; the model predicts the next token distribution.'],
    ['Prompt Engineering', 'intermediate', 'single_choice', 'A system prompt primarily:', ['Stores weights', 'Sets the model’s role, rules and behaviour', 'Encrypts output', 'Selects the dataset'], [1], 'It frames behaviour above the user conversation.'],
    ['Prompt Engineering', 'intermediate', 'single_choice', 'Providing examples in a prompt is called:', ['Fine-tuning', 'Few-shot prompting', 'Distillation', 'Quantization'], [1], 'One or more examples demonstrate the desired format.'],
    ['RAG & Fine-Tuning', 'advanced', 'single_choice', 'RAG improves LLM answers by:', ['Retrieving relevant documents and adding them to the prompt', 'Changing model weights', 'Reducing token size only', 'Disabling memory'], [0], 'Grounds responses in fresh/proprietary knowledge without retraining.'],
    ['RAG & Fine-Tuning', 'advanced', 'single_choice', 'Fine-tuning is best when you need:', ['Real-time web data', 'Enduring style/format/behaviour learned from examples', 'Only a calculator', 'Shorter prompts only'], [1], 'Weights are updated for a durable behavioural change.'],
    ['Evaluation & Safety', 'intermediate', 'single_choice', 'Hallucination refers to:', ['GPU overheating', 'Model stating confident but false/ungrounded content', 'Input too long', 'Tokenizer failure'], [1], 'Mitigate with grounding, citations and verification.'],
    ['Evaluation & Safety', 'advanced', 'multiple_choice', 'Which are LLM safety concerns?', ['Prompt injection', 'Data leakage', 'Harmful content generation', 'Automatic code review'], [0, 1, 2], 'Injection, leakage and harmful outputs are risks; code review is a use case.'],
  ],

  // ── data-visualization ─────────────────────────────────────────────────────
  'data-visualization': [
    ['Chart Types', 'beginner', 'single_choice', 'Which chart best shows part-to-whole for a few categories?', ['Pie/donut chart', 'Scatter plot', 'Histogram', 'Box plot'], [0], 'Keep slices few; use bar charts when comparing many categories.'],
    ['Chart Types', 'beginner', 'single_choice', 'Which chart shows the relationship between two numeric variables?', ['Bar chart', 'Scatter plot', 'Pie chart', 'Area map'], [1], 'Each point is an (x, y) pair.'],
    ['Chart Types', 'beginner', 'single_choice', 'Which chart displays a distribution’s spread and outliers?', ['Line chart', 'Box plot', 'Pie chart', 'Gauge'], [1], 'Box plots show quartiles and outlier points.'],
    ['Exploratory Analysis', 'intermediate', 'single_choice', 'Histograms differ from bar charts by:', ['Color only', 'Showing frequency distribution of a numeric variable', 'Always horizontal', 'Using lines'], [1], 'Histogram bins are contiguous ranges of values.'],
    ['Exploratory Analysis', 'intermediate', 'single_choice', 'A line chart is best for:', ['Categories', 'Trends over time', 'Correlation only', 'Percentages only'], [1], 'Time series trends read naturally as lines.'],
    ['Dashboards', 'intermediate', 'single_choice', 'A good dashboard should:', ['Show every possible metric', 'Highlight KPIs with clear hierarchy and interactivity', 'Be static only', 'Use animations constantly'], [1], 'Purpose-driven design beats chart overload.'],
    ['Dashboards', 'advanced', 'single_choice', 'Cross-filtering in a dashboard means:', ['Copying data', 'Selecting in one visual filters other visuals', 'Sorting all charts', 'Exporting to Excel'], [1], 'Linked interactions let users drill into subsets.'],
    ['Color & Design', 'intermediate', 'single_choice', 'For a sequential quantity ramp you should use:', ['Random rainbow colors', 'A single-hue light-to-dark ramp', 'Red-green only', 'Grayscale only'], [1], 'Sequential data reads best along one perceptual dimension.'],
    ['Color & Design', 'advanced', 'single_choice', 'Red-green palettes are problematic because:', ['Too bright', 'Common red-green color blindness makes them unreadable', 'Print costs', 'They are trendy'], [1], 'Use viridis or blue-orange palettes for accessibility.'],
    ['Storytelling', 'beginner', 'single_choice', 'Data storytelling combines:', ['Charts only', 'Data + narrative + visual design', 'Forecasts only', 'Animations only'], [1], 'A clear message guides the audience to insight.'],
  ],

  // ── power-bi ───────────────────────────────────────────────────────────────
  'power-bi': [
    ['Data Import', 'beginner', 'single_choice', 'Which connector ingests Excel workbooks into Power BI?', ['Get Data → Excel workbook', 'Import CSS', 'ODBC-only for Excel', 'None — manual typing'], [0], 'Get Data supports Excel, CSV, databases, web and more.'],
    ['Data Import', 'beginner', 'single_choice', 'Power Query is used to:', ['Design visuals only', 'Shape, clean and transform data before loading', 'Publish reports', 'Write DAX measures only'], [1], 'ETL happens in Power Query (M language).'],
    ['Data Import', 'intermediate', 'single_choice', 'What does "Close & Apply" do?', ['Closes the app', 'Loads transformed data into the model', 'Deletes the query', 'Publishes to cloud'], [1], 'It commits Power Query steps and loads data.'],
    ['Data Model & DAX', 'intermediate', 'single_choice', 'What is a relationship between two tables based on?', ['Matching column names only', 'A key column linking them (one-to-many typically)', 'Visual placement', 'File size'], [1], 'Relationships drive filter propagation across the model.'],
    ['Data Model & DAX', 'intermediate', 'single_choice', 'CALCULATE’s main role is:', ['Creating charts', 'Evaluating an expression in a modified filter context', 'Importing data', 'Formatting numbers'], [1], 'It is the most important DAX function for context modification.'],
    ['Data Model & DAX', 'advanced', 'single_choice', 'A measure differs from a calculated column by:', ['Nothing', 'It is computed at query time in filter context, not stored per row', 'It cannot use DAX', 'It only works in Excel'], [1], 'Measures are virtual and evaluated on demand.'],
    ['Visuals', 'beginner', 'single_choice', 'Which visual is best for showing change over time?', ['Gauge', 'Line chart', 'Card', 'Treemap'], [1], 'Line charts emphasize trend across time.'],
    ['Reports & Dashboards', 'beginner', 'single_choice', 'Slicers are used to:', ['Filter report content interactively', 'Add new columns', 'Encrypt data', 'Sort colors'], [0], 'Slicers apply filters to connected visuals.'],
    ['Reports & Dashboards', 'intermediate', 'single_choice', 'Bookmarks in Power BI:', ['Save a view state of visuals/filters/pages', 'Bookmark web URLs only', 'Track history', 'Add comments'], [0], 'Bookmarks capture show/hide, filters and page position.'],
    ['Publishing', 'intermediate', 'single_choice', 'After Publish, a report is available in:', ['Only the desktop file', 'The Power BI service workspace for sharing', 'Local disk only', 'Email drafts'], [1], 'The service hosts dashboards, sharing and scheduled refresh.'],
  ],

  // ── tableau ────────────────────────────────────────────────────────────────
  tableau: [
    ['Connect & Prepare', 'beginner', 'single_choice', 'In Tableau, a data source is connected via:', ['Connect pane (files/databases/servers)', 'CSS import', 'Only CSV', 'Command line only'], [0], 'Tableau connects to Excel, CSV, SQL, cloud sources, etc.'],
    ['Connect & Prepare', 'beginner', 'single_choice', 'Dimensions vs measures:', ['Dimensions = categorical (axis/filters), Measures = numeric (aggregated)', 'Same thing', 'Dimensions are numbers', 'Measures are colors'], [0], 'Tableau separates discrete categoricals from aggregatable numbers.'],
    ['Connect & Prepare', 'intermediate', 'single_choice', 'Show Me helps by:', ['Writing DAX', 'Suggesting chart types valid for selected fields', 'Publishing', 'Cleaning only'], [1], 'Pick fields → Show Me proposes appropriate visuals.'],
    ['Calculated Fields', 'intermediate', 'single_choice', 'A calculated field is:', ['A new column computed from existing data via a formula', 'A database view', 'A filter', 'A parameter only'], [0], 'e.g. [Profit] / [Sales] for a margin measure.'],
    ['Calculated Fields', 'advanced', 'single_choice', 'What does FIXED LOD do?', ['Fixes colors', 'Computes at a specified dimension ignoring view filters', 'Locks the workbook', 'Freezes panes'], [1], '{FIXED [Category] : SUM([Sales])} aggregates at Category only.'],
    ['Visuals', 'beginner', 'single_choice', 'Rows and Shelves control:', ['Font size', 'Where fields go (axes, columns, marks, filters)', 'File location', 'Permissions'], [1], 'Drag fields onto Rows/Columns/Filters/Color to shape the view.'],
    ['Visuals', 'intermediate', 'single_choice', 'Dual axis allows:', ['Two measures on shared axis space', 'Two files', 'Two users', 'Two databases'], [0], 'Right-click a pill → Dual Axis to compare measures.'],
    ['Parameters & Actions', 'intermediate', 'single_choice', 'A parameter in Tableau is:', ['A secret key', 'A dynamic value the user can change to drive calculations/filters', 'A data source', 'A dashboard only'], [1], 'Parameters power dynamic reference lines, controls and prompts.'],
    ['Parameters & Actions', 'advanced', 'single_choice', 'Dashboard actions can:', ['Only highlight', 'Filter, highlight, navigate or change parameters on selection', 'Export PDF only', 'Change data'], [1], 'Actions create interactivity between sheets.'],
    ['Dashboards', 'beginner', 'single_choice', 'Layout containers are used to:', ['Store data', 'Arrange and size worksheets on a dashboard', 'Calculate', 'Publish'], [1], 'Horizontal/vertical containers control flow and sizing.'],
  ],

  // ── excel ──────────────────────────────────────────────────────────────────
  excel: [
    ['Formulas & Functions', 'beginner', 'single_choice', 'Which symbol starts a formula in Excel?', ['#', '=', '@', '&'], [1], 'Every formula begins with = (or + or -).'],
    ['Formulas & Functions', 'beginner', 'single_choice', 'SUM(A1:A5) does what?', ['Counts cells', 'Adds values in A1 through A5', 'Averages', 'Finds maximum'], [1], 'SUM adds numeric values in the range.'],
    ['Formulas & Functions', 'intermediate', 'single_choice', 'What does AVERAGEIF do?', ['Adds conditionally', 'Averages cells meeting a criterion', 'Counts if', 'Rounds averages'], [1], 'AVERAGEIF(range, criteria, [average_range).'],
    ['Formulas & Functions', 'intermediate', 'single_choice', "VLOOKUP's 4th argument FALSE means:", ['Search ascending', 'Exact match only', 'Ignore errors', 'Reverse lookup'], [1], 'FALSE enforces exact match (more reliable than approximate).'],
    ['Formulas & Functions', 'advanced', 'single_choice', 'Which is the modern replacement for VLOOKUP/XLOOKUP?', ['HLOOKUP always', 'XLOOKUP (lookup and return arrays, either direction)', 'INDEX only', 'MATCH only'], [1], 'XLOOKUP searches left or right and returns arrays.'],
    ['Pivot Tables', 'intermediate', 'single_choice', 'A PivotTable is used to:', ['Draw charts only', 'Summarize/group data interactively without formulas', 'Type faster', 'Protect sheets'], [1], 'Drag fields to Rows/Columns/Values/Filters to aggregate.'],
    ['Pivot Tables', 'intermediate', 'single_choice', 'Values field default aggregation for numbers is:', ['Count', 'Sum', 'Average', 'Max'], [1], 'Numeric fields default to SUM; text to COUNT.'],
    ['Charts', 'beginner', 'single_choice', 'Which chart compares values across categories best in most cases?', ['Pie with many slices', 'Column/bar chart', 'Scatter', 'Sparkline'], [1], 'Lengths are easier to compare than angles.'],
    ['Lookup Functions', 'beginner', 'single_choice', 'COUNTIF(range, criteria) returns:', ['Sum of range', 'Count of cells matching the criterion', 'Average', 'Row number'], [1], 'Conditional count, e.g. COUNTIF(A:A,">100").'],
    ['Data Tools', 'intermediate', 'multiple_choice', 'Which are Excel data tools?', ['Filter', 'Data validation', 'Conditional formatting', 'Compiler'], [0, 1, 2], 'Filter, validation and formatting shape/protect data — Excel has no compiler.'],
  ],

  // ── spark ──────────────────────────────────────────────────────────────────
  spark: [
    ['RDDs & DataFrames', 'beginner', 'single_choice', 'RDD stands for:', ['Resilient Distributed Dataset', 'Random Data Directory', 'Rapid Database Driver', 'Relational Data Depot'], [0], 'Immutable, partitioned collections that can be recomputed.'],
    ['RDDs & DataFrames', 'beginner', 'single_choice', 'Spark DataFrame is:', ['A 2-D table with a schema', 'A Python list', 'An image', 'A graph'], [0], 'Structured, columnar, with Catalyst optimization.'],
    ['RDDs & DataFrames', 'intermediate', 'single_choice', 'Which is faster for most workloads — RDD or DataFrame API?', ['RDD always', 'DataFrame (Catalyst + Tungsten optimizations)', 'Equal always', 'Neither works'], [1], 'High-level optimized plans beat low-level RDD operations.'],
    ['Transformations & Actions', 'intermediate', 'single_choice', 'map() on an RDD is:', ['An action that returns results immediately', 'A lazy transformation creating a new RDD', 'A cache', 'A shuffle'], [1], 'Transformations build a DAG; actions trigger execution.'],
    ['Transformations & Actions', 'intermediate', 'single_choice', 'Which of these is an action?', ['filter', 'map', 'collect', 'flatMap'], [2], 'collect returns data to the driver — it triggers computation.'],
    ['Transformations & Actions', 'advanced', 'single_choice', 'A shuffle involves:', ['Only CPU cache', 'Redistributing data across partitions (expensive I/O)', 'Nothing', 'Type casting'], [1], 'groupByKey/reduceByKey repartition data — avoid unnecessary shuffles.'],
    ['Spark SQL', 'intermediate', 'single_choice', 'spark.sql("SELECT ...") runs:', ['On a local SQLite file only', 'Queries on registered tables/DataFrames via Catalyst', 'Only DDL', 'Nothing until saved'], [1], 'Spark SQL optimizes and executes distributed SQL.'],
    ['Optimization', 'advanced', 'single_choice', 'Broadcast join is useful when:', ['Both sides are huge', 'One side is small enough to replicate to all nodes', 'Data is sorted', 'Only for CSV'], [1], 'Avoids shuffling the big table.'],
    ['Optimization', 'advanced', 'single_choice', 'Partitioning data by a column helps when:', ['Queries filter on that column (partition pruning)', 'Always slows down', 'Only for joins on any key', 'It changes dtypes'], [0], 'Pruning skips irrelevant partitions entirely.'],
    ['Streaming', 'advanced', 'single_choice', 'Structured Streaming treats streams as:', ['Files only', 'An unbounded DataFrame queried incrementally', 'UDP packets', 'Manual loops'], [1], 'Micro-batch/continuous processing with the same DataFrame API.'],
  ],
};
