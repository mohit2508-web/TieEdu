// Module 3 — Convolutional Networks: Kernels, Depth, and Transfer
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Convolutional Networks: Kernels, Depth, and Transfer',
  summary:
    'Convolution arithmetic with real kernel/stride/padding numbers, feature maps and receptive-field growth, pooling and the LeNet-to-VGG lineage, the ResNet skip-connection insight that made 100+ layers trainable, and transfer learning strategy — when ImageNet features transfer, freeze versus fine-tune, and how to fine-tune safely.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'dl-3-1',
      1,
      'Convolution: Kernels, Stride, Padding, and Receptive Fields',
      'What convolution actually computes, output-size arithmetic you can do in your head, why weight sharing makes vision tractable, and how receptive fields grow with depth.',
      22,
      nineBlocks({
        objectives: [
          'Compute a 2-D convolution output and its size from kernel, stride, and padding values',
          'Explain parameter sharing as translation equivariance and contrast a conv layer\'s parameter count with a dense layer on the same input',
          'Compute the receptive field of a small CNN stack layer by layer',
          'Distinguish valid padding, same padding, and dilation, and when each is used',
        ],
        hook:
          'A 224x224 colour image has 150,528 raw numbers. Feed them to a dense layer of 4,096 neurons and you need 616 million weights — for ONE layer, before the model has seen a single shape. Convolutional networks solve this with a gloriously old idea from image processing: slide a tiny grid of weights across the image and reuse it everywhere. The same 3x3 filter, 9 numbers, gets applied at every position. That one act of weight sharing — motivated by the insight that a horizontal edge is a horizontal edge wherever it appears — is why vision runs on GPUs in milliseconds instead of dying in parameter-count arithmetic.',
        concept: `**The 2-D convolution operation.** A kernel (filter) is a small weight grid, say 3x3. To compute one output element: place the kernel over the corresponding input patch, compute the elementwise product, sum it all (+ the bias), write one number. Slide the kernel across the input according to STRIDE s (how many positions the kernel moves each step) and collect the output grid — the FEATURE MAP. One kernel = one feature map = one pattern detector (edge, blob, texture). A conv layer applies MANY kernels (e.g. 64), producing a 64-channel output volume: each channel answers "where does MY pattern occur?" across the image.

**Output-size arithmetic.** For input size n, kernel k, stride s, padding p (zeros around the border): out = floor((n + 2p - k) / s) + 1. Concrete: n=32, k=3, s=1, p=1 -> (32+2-3)/1+1 = 32 ("same" padding preserves size for odd kernels at stride 1). n=32, k=3, s=2, p=0 -> (32-3)/2+1 = 16 ("valid" padding shrinks it). n=7, k=3, s=1, p=0 -> 5, then 3, then 1 — the classic shrinking stack. This formula is the most hand-tested arithmetic in CNN design; also know DILATION d (kernel taps spaced d apart): effective kernel becomes d(k-1)+1 — dilated convolutions expand the field WITHOUT more parameters (used in segmentation and WaveNet-style audio models).

**Why convolution beats dense here — two structural gifts.** (1) PARAMETER SHARING: a 3x3x3 kernel over an RGB input has 27 weights + 1 bias, reused at every position; a dense layer over 224x224x3 needs one weight per input-neuron pair — millions of times more. Sharing encodes a legitimate prior: the same local pattern is meaningful everywhere (translation equivariance: shift the input, the feature map shifts identically — f(shift(x)) = shift(f(x)); for classification after pooling, this approximates translation INVARIANCE). (2) LOCAL CONNECTIVITY: each output looks only at a local patch, respecting image locality — early layers model local statistics, later layers compose them. The result: the vision version of an MLP with 600M weights becomes a conv stack with a few million.

**Depth, channels, and the volume bookkeeping.** Input: (C_in, H, W) e.g. (3, 224, 224). Conv layer with C_out kernels: output (C_out, H_out, W_out), parameter count = C_out * (C_in * k * k) + C_out. The channel dimension EXPRESSES while spatial dims shrink: (3, 224, 224) -> (64, 112, 112) -> (256, 56, 56) -> ... -> (512, 7, 7). This hourglass — information compressed spatially, enriched semantically — is the CNN\'s structural signature. Doubling channels when halving resolution is the standard trade (AlexNet, VGG, ResNet all do it): total activation volume roughly preserved, feature richness grows as the map shrinks.

**Receptive field: what one output pixel can see.** The receptive field of an output unit is the span of INPUT pixels influencing it. One 3x3 conv at stride 1: RF = 3. Stack another 3x3: RF = 5 (each new layer adds (k-1) x the stride-product of previous layers: RF_l = RF_{l-1} + (k_l - 1) * prod(strides before l). Stack five 3x3 layers: RF = 11. A 7x7 conv at stride 2 followed by two 3x3: RF = 7 + 2*2 + 2*4... compute precisely in the worked example. The design principle: top-level decisions ("is this a dog?") need large context, but you should build that context from STACKS of small kernels — three 3x3 layers have the same effective field as one 7x7 yet use 3*(9C^2) vs 49C^2 parameters, with more non-linearity in between. This VGG argument (Simonyan & Ziserman, 2014) is the reason 3x3 became the default kernel size.

**Convolution vs cross-correlation (an honest footnote).** What deep-learning frameworks call "convolution" is technically cross-correlation: kernels are slid without flipping. True mathematical convolution flips the kernel (the signal-processing definition, needed for associating blur with multiplication). The distinction matters only if you care about interpreting learned kernels against classical filters — for training, cross-correlation is what everyone means.`,
        extras: [
          table(
            'Convolution hyperparameter effects',
            ['Hyperparameter', 'Effect on output size', 'Effect on computation', 'Typical values'],
            [
              ['Kernel k', 'Bigger -> fewer positions', 'Cost grows with k^2', '3x3 dominant; 7x7/1x1 occasionally'],
              ['Stride s', 'Size ~ /s (per axis)', 'Cost drops ~ /s^2', '1 mid-network, 2 for downsampling'],
              ['Padding p', 'Preserves size (p = (k-1)/2)', 'Cost up slightly with p', '"same" everywhere in modern CNNs'],
              ['Dilation d', 'Dilates sampling; fewer positions', 'Same k^2 cost, larger field', 'Segmentation, audio, efficient backbones'],
              ['Channels out', 'Adds a whole map', 'Cost linear in C_out', '64 -> 512 typical hourglass'],
            ],
          ),
          code(
            `import torch, torch.nn as nn

x = torch.randn(1, 3, 64, 64)                    # NCHW: batch, channels, H, W

# Output size by hand: out = floor((n + 2p - k)/s) + 1
def conv_out(n, k, s=1, p=0, d=1):
    return (n + 2*p - d*(k-1) - 1)//s + 1

print(conv_out(64, 3, 1, 1))   # 64  ("same")
print(conv_out(64, 3, 2, 1))   # 32  (stride 2 downsample)
print(conv_out(64, 5, 1, 0, 2)) # 60 (dilation 2, k=5 -> effective 9)

conv = nn.Conv2d(in_channels=3, out_channels=64, kernel_size=3, stride=2, padding=1)
y = conv(x)
print(y.shape)                                      # [1, 64, 32, 32]
print(sum(p.numel() for p in conv.parameters()))    # 64*(3*3*3) + 64 = 1792 (vs ~3.1M for dense 64x12288)

# Receptive field, accumulated
rf, jump = 1, 1
for k, s in [(7, 2), (3, 2), (3, 2), (3, 2)]:       # a mini-VGG/ResNet stem
    rf += (k - 1) * jump
    jump *= s
    print("rf =", rf, " jump =", jump)              # rf = 7, 11, 19, 35`,
            'conv_arithmetic.py',
            'python',
          ),
          tip(
            'Sanity-check shapes before training',
            'Print tensor shapes after EVERY layer once for any new architecture. A transposed H/W, a forgotten batch dim, or stride applied on the wrong axis costs minutes here versus hours when it dies mid-epoch with an obscure matmul error.',
          ),
          warn(
            'Do not confuse convolution\'s cross-correlation with the signal-processing definition',
            'PyTorch nn.Conv2d implements correlation (no kernel flip). For exam formulas on output size and parameter counts this is irrelevant, but if you compare a learned kernel to a classical Sobel/Prewitt filter, remember the flip convention difference.',
          ),
        ],
        worked: {
          title: 'Convolve a 4x4 image with a 3x3 edge kernel by hand',
          problem:
            'Input (single channel): rows [[1,1,1,0],[0,1,1,0],[0,0,1,1],[1,0,0,1]]. Kernel (vertical edge detector): [[-1,0,1],[-1,0,1],[-1,0,1]], bias 0, stride 1, padding 0. Compute the top-left 2x2 of the output, then the output size of a 64x64 input under: (a) this config; (b) stride 2, padding 1; (c) with a 5x5 kernel, stride 1, padding 2.',
          steps: [
            {
              title: 'Output position (0,0)',
              desc: 'Patch = rows 0-2, cols 0-2: [[1,1,1],[0,1,1],[0,0,1]]. Product with kernel: [-1,-0,1] + [-0,0,1] + [-0,0,1] = (-1+0+1) + (0+0+1) + (0+0+1) = 0 + 1 + 1 = 2.',
              code_snippet: '[[1,1,1],[0,1,1],[0,0,1]] * [[-1,0,1],[-1,0,1],[-1,0,1]] -> sum = 2',
            },
            {
              title: 'Output position (0,1)',
              desc: 'Patch = rows 0-2, cols 1-3: [[1,1,0],[1,1,0],[0,1,1]]. Sum: (-1+0+0) + (-1+0+0) + (0+0+1) = -1 -1 + 1 = -1. The right-shifted patch now straddles the edge differently — the response flips sign. THIS is what an edge detector does: strong positive on one side of an intensity change, negative on the other.',
              code_snippet: 'sum = -1 + -1 + 1 = -1',
            },
            {
              title: 'Output positions (1,0) and (1,1)',
              desc: '(1,0): patch rows 1-3, cols 0-2 = [[0,1,1],[0,0,1],[1,0,0]] -> (-0-0-1) + (0+0+0) + (1+0+0) = -1 + 0 + 1 = 0. (1,1): rows 1-3, cols 1-3 = [[1,1,0],[0,1,1],[0,0,1]] -> (-1+0+0) + (-0+0+1) + (0+0+1) = -1 + 1 + 1 = 1.',
              code_snippet: 'f(1,0) = 0;  f(1,1) = 1',
            },
            {
              title: 'Sizes for a 64x64 input',
              desc: '(a) k=3,s=1,p=0: (64-3)/1 + 1 = 62 -> 62x62. (b) k=3,s=2,p=1: (64+2-3)/2 + 1 = 32 (floor 31.5 -> 31? exactly: 63/2 = 31.5 floor 31, +1 = 32) -> 32x32. (c) k=5,s=1,p=2: (64+4-5)/1+1 = 64 -> 64x64 (padding chosen precisely to preserve size).',
              code_snippet: '(a) 62x62;  (b) 32x32;  (c) 64x64',
            },
          ],
          solution:
            'Output 2x2 top-left = [[2, -1], [0, 1]] — the kernel\'s sign pattern marking vertical intensity changes. Output sizes: (a) 62x62 valid; (b) 32x32 with stride-2 same padding; (c) 64x64 size-preserving with k=5, p=2. These three configurations — valid shrinking, strided downsampling, size-preserving stacks — are the entire sizing vocabulary of CNN design.',
        },
        practice: {
          title: 'Design a conv stem on paper',
          prompt:
            'Design the first three conv layers of a CNN for 128x128 RGB input, ending with a feature map of at least 16x16 and channels 64. Specify in/out channels, kernel, stride, padding for each layer; compute every output size with the formula; then compute the parameter count of each layer and the receptive field of the final layer\'s output. Compare your total parameter count against a dense layer mapping the raw input to 4096 neurons.',
          hint: 'Use "same" padding with stride 1 for layers 1-2, stride 2 to downsample. Dense baseline: 128*128*3 * 4096 + 4096 — the number will be eye-watering; that is the lesson.',
        },
        mistakes: [
          {
            mistake: 'Forgetting padding when aiming for size-preserving stacks',
            fix: 'For odd k at stride 1, use p = (k-1)/2: k=3 -> p=1, k=5 -> p=2. Without padding, every layer shrinks the map and your "32x32" stack quietly becomes 24x24 — caught only when the flatten layer explodes.',
          },
          {
            mistake: 'Equating receptive field with the current kernel size',
            fix: 'RF is CUMULATIVE: every stacked layer expands what an output unit sees, multiplied by the strides below it. A top-layer 3x3 unit may see 100+ input pixels; design depth around the field your task needs, not around the last kernel.',
          },
          {
            mistake: 'Adding a huge early dense layer after convs "just in case"',
            fix: 'Global average pooling (mean each final feature map to one number) replaces million-parameter FC flattens with ~zero parameters and reduces overfitting — the post-ResNet standard (GoogLeNet popularized it). Flatten-then-dense is a pre-2014 habit.',
          },
          {
            mistake: 'Confusing channels with spatial dimensions when reading tensor shapes',
            fix: 'NCHW order in PyTorch: [batch, channels, height, width]. A "64-channel 32x32" map is [1, 64, 32, 32] — 64 of the 32x32 grids. Axis mixups produce silently wrong convolutions or shape errors; print and annotate every shape.',
          },
        ],
        exam: {
          question:
            'Compute: an input of size 64x64x3 passes through Conv(64 filters, 3x3, stride 2, padding 1), then Conv(128 filters, 3x3, stride 2, padding 1). Give output shapes and parameter counts for both layers, and the receptive field of the second layer\'s output.',
          answer:
            'Layer 1: out size = (64 + 2*1 - 3)/2 + 1 = 63/2 -> floor 31 + 1 = 32, so 32x32x64. Params = 64 * (3*3*3) + 64 = 1,728 + 64 = 1,792. Layer 2: (32 + 2 - 3)/2 + 1 = 31/2 floor 15 + 1 = 16, so 16x16x128. Params = 128 * (3*3*64) + 128 = 73,728 + 128 = 73,856. Receptive field: start rf=1, jump=1; after layer 1: rf = 1 + (3-1)*1 = 3, jump = 2; after layer 2: rf = 3 + (3-1)*2 = 7, jump = 4. So each final-map pixel sees a 7x7 patch of the original image — two strided 3x3 layers build a 7x7 field at only 75k parameters, versus one 7x7 stride-2 layer which would see the same field but without the intermediate non-linearity.',
          source: 'Standard GATE-style CNN arithmetic problem; the same computation pattern appears in every vision interview.',
        },
        summary: [
          'Conv output size = floor((n + 2p - k)/s) + 1; "same" padding preserves size for odd k at stride 1.',
          'Kernels are slid as cross-correlation: one output pixel = weighted sum of one local patch, plus bias.',
          'Weight sharing gives translation equivariance and slashes parameters: 3x3x3 kernels have 28 weights, reused everywhere.',
          'Receptive fields compound with depth and strides: build large context from stacks of small kernels (VGG\'s 3x3 argument).',
          'CNN volumes trade space for channels: spatial resolution falls as feature richness rises — the hourglass.',
        ],
      }),
      [
        [
          'An input 32x32 passes through Conv2d(16 filters, 3x3, stride 2, padding 1). Output size is:',
          ['32x32', '16x16', '15x15', '31x31'],
          1,
          'floor((32 + 2 - 3)/2) + 1 = floor(31/2) + 1 = 15 + 1 = 16 -> 16x16.',
        ],
        [
          'The main parameter-count advantage of convolution over a dense layer comes from:',
          [
            'Using larger kernels',
            'Weight sharing across spatial positions (each kernel\'s weights are reused at every location)',
            'Avoiding activation functions',
            'Smaller batch sizes',
          ],
          1,
          'A 3x3 kernel has 9 weights (+bias) reused over the whole map; a dense layer needs a distinct weight for every input-output pair — millions of times more for image-sized inputs.',
        ],
        [
          'The receptive field of a CNN output unit is:',
          [
            'The size of the kernel in the final layer',
            'The extent of the original input that can influence that unit, accumulating all stacked layers and their strides',
            'The number of channels in the feature map',
            'The stride of the first layer only',
          ],
          1,
          'Each layer widens the field: rf += (k-1) * jump, with jump accumulating strides. Final kernels can be 3x3 while the unit sees, e.g., 35x35 of the input.',
        ],
        [
          'Three stacked 3x3 conv layers are preferred over one 7x7 conv because they:',
          [
            'Run strictly faster in all cases',
            'Match the 7x7 receptive field with fewer parameters and add two extra non-linearities between them',
            'Have no padding requirements',
            'Cannot overfit',
          ],
          1,
          'RF of three 3x3 = 7; params 3*(9C^2) = 27C^2 vs 49C^2 for one 7x7 — plus two additional activation functions, a strictly better trade (VGG\'s design argument).',
        ],
      ]
    ),
    lesson(
      M3,
      'dl-3-2',
      2,
      'Pooling and the Architecture Race: LeNet to VGG',
      'What pooling buys (spatial invariance, downsampling without parameters), then the historical arms race from LeNet-5\'s 60k digits to VGG\'s uniform 3x3 stacks — how each era solved the previous era\'s bottleneck.',
      20,
      nineBlocks({
        objectives: [
          'Compute max-pool and average-pool outputs and contrast their use cases',
          'Explain pooling\'s role in translation tolerance and receptive-field growth versus strided convolution',
          'Trace the LeNet -> AlexNet -> VGG lineage: each architecture\'s key innovation and the bottleneck it removed',
          'Identify which era\'s ideas survive in modern designs and which were stepping stones',
        ],
        hook:
          'Between 1998 and 2014, image classification error fell from "embarrassing" to "superhuman" — and you can read the entire story in four architectures. LeNet-5 read handwritten cheques. AlexNet detonated at ImageNet 2012 by throwing 60 million parameters and two GPUs at the problem. VGG answered "what if everything is 3x3?" with obsessive elegance. Each one stood on the previous one\'s failure mode. This lesson is the lineage — because understanding WHY each next architecture was necessary teaches architecture design better than any current best practice.',
        concept: `**What pooling does.** Max-pooling takes, for each spatial region (say 2x2), the maximum value — a 32x32 map becomes 16x16, no learnable parameters at all. It is downsampling by local voting: "is this pattern present ANYWHERE in this cell?" Average-pooling takes the mean instead: "how strong is this pattern ON AVERAGE here?" Max-pool dominates in mid-network CNNs (it preserves the strongest evidence, denoises by discarding weak activations); average-pool shows up at the end (global average pooling collapses each final feature map to one confidence number — GoogLeNet/ResNet classifier heads) and in early classical processing.

**The three things pooling buys.** (1) Translation tolerance: a feature shifted by a pixel within a 2x2 window maps to the SAME pooled output — small shifts in the input stop mattering, giving approximate invariance that pure conv stacks don\'t fully provide (conv is equivariant; pooling plus depth approaches invariance). (2) Shrinking computation: half the spatial size means a quarter of the positions for the next layer\'s work — the hourglass\'s engine. (3) Growing receptive field: the next layer\'s 3x3 now covers twice the input span, because pooling moved the field forward by a stride of 2 without parameters. **The counterpoint:** stride-2 CONVOLUTION can replace pooling — it LEARNS what to downsample by, has become the modern preference in many backbones (ResNet\'s strided conv stem; convnext\'s stance), and avoids pooling\'s information loss. The pooling-vs-strided-conv debate is live; know both, use pooling where parameters must stay near zero and learned downsampling where capacity allows.

**LeNet-5 (LeCun, 1998): the template.** Conv -> pool -> conv -> pool -> dense -> dense -> output, trained on MNIST/CHEQUE digits with TDNN-style discipline. ~60,000 parameters, 32x32 grayscale input, learned digit classification at near-human accuracy for the era. What it ESTABLISHED: the canonical stack shape (conv blocks feeding fully connected head), local receptive fields, subsampling between stages, and gradient-trained feature hierarchies. What it lacked: scale (data and compute), ReLUs, normalization, and modern regularization — architecture alone didn\'t ignite; the field was compute-starved.

**AlexNet (Krizhevsky, Socrates... Alex Krizhevsky, Ilya Sutskever, Geoffrey Hinton, 2012): the detonation.** Top-5 error 15.3% vs 26.2% for the runner-up at ILSVRC 2012 — the gap that started the deep-learning boom. Innovations, each a patch on a real wound: ReLU instead of saturating tanh (faster, deeper training); local response normalization (largely abandoned later — batch norm superseded it); overlapping 3x3/5x5 pools with stride 2 (we\'ll cover more); dropout 0.5 in the FC head; GPU training on TWO GTX 580s with cross-GPU layer parallelism (memory forced the split); heavy augmentation (flips, crops, colour jitter — PCA colour augmentation). Architecture: 5 conv layers then 3 dense layers, 60 million parameters — huge FC tail by modern standards. What it PROVED: at sufficient data and compute, deep CNNs crush hand-crafted pipelines, and GPUs are not optional.

**VGG (2014): the discipline.** Key insight: stack SMALL 3x3 kernels everywhere (two/three 3x3s = 5x5/7x7 field with fewer params and more non-linearity — the argument from the last lesson). VGG-16/19: uniform 3x3 convs, max-pool 2x2 stride 2 after each stage, channel doubling 64->128->256->512, then three 4096-wide FC layers. ~138 million parameters — of which over 100M sit in the FC tail (a lesson in itself: VGG\'s classifier head is famously bloated; ResNet killed it with global average pooling). What it PROVED: depth matters when building blocks are homogenized; and it became the standard FEATURE EXTRACTOR backbone for transfer learning for years (VGG features were remarkably general). What it cost: parameter count and FLOPs — 138M params at 30 GFLOPs per forward made it slow; the race next went to efficiency (Inception\'s 1x1 bottlenecks and grouped convs) and to depth itself, which hit a wall at ~20 layers — accuracy DEGRADED with more depth, not because of overfitting (training error rose too), but because of optimisation difficulty: vanishing/exploding gradients through many layers. That wall set the stage for ResNet (next lesson).

**The lineage in one causal chain.** LeNet: "stacked convs work" (but too small-scale). AlexNet: "scale + ReLUs + GPUs win" (but hand-designed heterogeneous blocks, bloated heads). VGG: "homogeneous small kernels + depth" (but deeper than 20 breaks optimization). Each architecture is the previous one\'s bottleneck removed — and identifying a model\'s CURRENT bottleneck is the actual skill of architecture design.`,
        extras: [
          table(
            'Four architectures, four eras',
            ['Model', 'Year', 'Params', 'Signature move', 'What it proved / left behind'],
            [
              ['LeNet-5', '1998', '~60k', 'Conv-pool template on digits', 'CNNs work; compute-starved, no scale'],
              ['AlexNet', '2012', '60M', 'ReLU + dropout + dual-GPU training', 'Deep nets crush features at ImageNet scale'],
              ['VGG-16', '2014', '138M', 'Uniform 3x3 stacks, depth', 'Depth with homogenized blocks; bloated FC head'],
              ['(next: ResNet)', '2015', '25.6M', 'Skip connections', '100+ layers train — solved optimisation wall'],
            ],
          ),
          code(
            `import torch.nn as nn

# The architectural DNA, expressed as modern PyTorch
def vgg_block(cin, cout, n_convs):                # VGG: repeat 3x3 + "same" padding
    layers = []
    for _ in range(n_convs):
        layers += [nn.Conv2d(cin, cout, 3, padding=1), nn.ReLU(inplace=True)]
        cin = cout
    layers.append(nn.MaxPool2d(2, 2))              # 2x2 stride-2 pooling halves the map
    return nn.Sequential(*layers)

alexnet_ish = nn.Sequential(                       # AlexNet fingerprint: big kernels first,
    nn.Conv2d(3, 96, 11, stride=4, padding=2), nn.ReLU(), nn.MaxPool2d(3, 2),  # then pool
    nn.Conv2d(96, 256, 5, padding=2), nn.ReLU(), nn.MaxPool2d(3, 2),
    nn.Conv2d(256, 384, 3, padding=1), nn.ReLU(),
    nn.Conv2d(384, 384, 3, padding=1), nn.ReLU(),
    nn.Conv2d(384, 256, 3, padding=1), nn.ReLU(), nn.MaxPool2d(3, 2),
    nn.Flatten(), nn.Dropout(0.5), nn.Linear(256*6*6, 4096), nn.ReLU(),
    nn.Dropout(0.5), nn.Linear(4096, 4096), nn.ReLU(), nn.Linear(4096, 1000),
)

# Pooling arithmetic: max vs average on a 4x4 patch
import torch
p = torch.tensor([[1., 5., 3., 8.], [2., 1., 0., 4.],
                  [9., 0., 2., 1.], [3., 7., 1., 0.]])
print(nn.functional.max_pool2d(p, 2))   # [[5,8],[9,7]]  -> strongest local evidence
print(nn.functional.avg_pool2d(p, 2))   # [[2.25, 3.75],[4.75, 2.5]] -> mean activity`,
            'pooling_and_lineage.py',
            'python',
          ),
          tip(
            'Read a backbone by its stage transitions',
            'Where channels double and resolution halves = a stage boundary (VGG/ResNet rhythm). Where 1x1 convs appear = dimensionality control (Inception/ResNet bottleneck). Where the FC tail appears = pre-2014 design (bloated); where global average pooling appears = modern head. Five seconds of this reads an architecture\'s era and intent.',
          ),
          warn(
            'Do not carry VGG\'s FC head into new designs',
            'Over 100M of VGG-16\'s 138M parameters live in three 4096-wide dense layers — high capacity, low generalization payoff, memory hog. Modern practice: global average pooling + a single small classifier (or none for feature extraction). Copy VGG\'s conv philosophy, not its head.',
          ),
        ],
        worked: {
          title: 'Trace a mini-CNN forward: shapes through conv and pool',
          problem:
            'Input 1x1x32x32 (grayscale). Chain: Conv(8, k3, s1, p1) -> ReLU -> MaxPool2 -> Conv(16, k3, s1, p1) -> ReLU -> MaxPool2 -> Flatten -> Linear. Compute every shape, the receptive field at the last conv output, and the parameter count of the whole network (ignore biases for a moment, include them in the final line).',
          steps: [
            {
              title: 'Conv 1',
              desc: 'k=3, s=1, p=1: size preserved. Output 1x8x32x32. Params: 8 * (1*3*3) = 72 (+8 biases). RF after layer 1 = 3.',
              code_snippet: 'conv1: [1, 8, 32, 32];  params 72+8;  rf = 3, jump = 1',
            },
            {
              title: 'MaxPool 1',
              desc: '2x2 window: 32 -> 16. Output 1x8x16x16. No parameters. Pooling doubles the jump: RF contribution next layer now lands at stride 2; RF grows by (2-1)*jump: RF = 3 + 1*1 = 4... precisely: pool k=2 s=1? Standard MaxPool2d(2): rf = 3 + (2-1)*1 = 4, jump = 2.',
              code_snippet: 'pool1: [1, 8, 16, 16];  rf = 4, jump = 2',
            },
            {
              title: 'Conv 2 + Pool 2',
              desc: 'Conv 3x3 p1 s1 on 16x16: stays 16x16, channels 8->16: 1x16x16x16. Params: 16 * (8*3*3) = 1,152 (+16). RF: 4 + (3-1)*2 = 8. MaxPool2: 16 -> 8: 1x16x8x8; RF = 8 + (2-1)*4 = 12, jump = 4.',
              code_snippet: 'conv2: [1,16,16,16], rf 8;  pool2: [1,16,8,8], rf 12',
            },
            {
              title: 'Head',
              desc: 'Flatten: 16*8*8 = 1024 features -> Linear(1024, 10): 10,240 + 10. Total parameters: (72+8) + (1,152+16) + 10,250 = 11,498. Every final output neuron sees a 12x12 region of the original 32x32 image — the whole picture is 2.7 patches wide; for full-image context the classifier still leans on the FC layer, which is why deeper stacks (or GAP over deeper maps) matter.',
              code_snippet: 'total params = 80 + 1168 + 10250 = 11,498',
            },
          ],
          solution:
            'Shapes: [1,8,32,32] -> pool [1,8,16,16] -> [1,16,16,16] -> pool [1,16,8,8] -> 1024 -> 10. Parameters: ~11.5k total, of which 90% sit in the final dense layer — the classic small-CNN distribution that modern GAP heads deliberately eliminate. Final receptive field 12x12: depth and pooling built that from 3x3 primitives, exactly the compounding-field mechanism from the last lesson.',
        },
        practice: {
          title: 'Reconstruct AlexNet\'s decisions',
          prompt:
            'Without looking anything up: given AlexNet\'s constraints (2012 hardware: 2x GTX 580 with 3GB each; ImageNet 1.2M images, 1000 classes; tanh-era optimizers known to be slow), explain WHY each of these choices makes sense: 11x11 stride-4 first conv; dropout 0.5 only in FC layers; two-GPU layer splitting; heavy flip/crop/colour augmentation. Then check your reasoning against a reference — where did you diverge?',
          hint: 'Think: first-layer field per output (compute it), FC overparameterization risk, memory ceiling per GPU, and 1.2M images being small for 60M params.',
        },
        mistakes: [
          {
            mistake: 'Assuming pooling contributes parameters or gradients',
            fix: 'Max/average pooling selects or averages existing values — no weights, gradient routes only to the argmax (max-pool) positions. It shapes information flow but learns nothing itself (learnable pooling variants exist but are uncommon).',
          },
          {
            mistake: 'Thinking conv layers themselves become translation invariant',
            fix: 'Convolution is EQUIVARIANT (output shifts with input); pooling/striding and global aggregation build invariance. Saying "convolutions are translation invariant" in an exam loses marks — the pair together does the job.',
          },
          {
            mistake: 'Attributing AlexNet\'s win purely to architecture',
            fix: 'ReLU, dropout, and augmentation mattered, but scale was decisive: ImageNet-size data plus GPU training. Architecture-only reproductions without the data story underperform — a lesson repeated with every foundation model since.',
          },
          {
            mistake: 'Treating these architectures as outdated trivia',
            fix: 'VGG\'s uniform-block reasoning, AlexNet\'s augmentation and regularization instincts, and LeNet\'s stage template are all still visible in current backbones. Lineage questions also recur in interviews precisely because they test design reasoning, not recall.',
          },
        ],
        exam: {
          question:
            'Compare max-pooling and average-pooling: computation, gradient behaviour, and typical placement in a network. Why did pooling fall somewhat out of favour in favour of strided convolution in modern backbones?',
          answer:
            'Max-pooling outputs the maximum of each local window; no parameters; gradients flow ONLY to the argmax position of each window (winner-take-all routing). It preserves the strongest local evidence, so it is standard in intermediate stages of CNNs. Average-pooling outputs the window mean; gradients distribute uniformly to all window positions; it smooths and attenuates, so it is used where summarising overall activity matters — most notably GLOBAL average pooling at the classifier head (collapsing each final map to one logit-relevant scalar, replacing VGG-style FC tails). Strided convolution has gained ground as an alternative downsampling mechanism because (a) it LEARNS what to keep when reducing resolution, unlike max-pool\'s fixed argmax rule; (b) it can reduce information loss and improve accuracy in some backbones (e.g., convnext/ResNet-style designs); (c) it unifies the operator vocabulary — everything is conv. Pooling remains attractive for its zero parameters and trivial cost; the choice is an empirical one with no universal winner.',
          source: 'Standard advanced CNN exam comparison; the pooling-vs-strided-conv variant appears in modern architecture interviews.',
        },
        summary: [
          'Pooling downsamples without parameters: max-pool keeps strongest evidence, average-pool summarises activity.',
          'Pooling buys translation tolerance, cheaper next layers, and faster receptive-field growth; strided conv is the learned alternative.',
          'LeNet gave the conv-pool template; AlexNet proved scale + ReLU + GPUs + augmentation at ImageNet; VGG homogenized everything into 3x3 depth.',
          'VGG\'s FC head holds ~100M of its 138M parameters — the cautionary tale that global average pooling corrected.',
          'Read architecture history causally: each model exists because the previous model\'s bottleneck demanded it.',
        ],
      }),
      [
        [
          'Max-pooling\'s gradient during backpropagation flows to:',
          [
            'All positions in the window equally',
            'Only the argmax position of each window',
            'The pooling layer\'s own weights (it has none)',
            'Every previous layer simultaneously',
          ],
          1,
          'Max-pool is winner-take-all: the selected maximum receives the incoming gradient, all other window positions get zero — the standard sparse-routing description.',
        ],
        [
          'AlexNet\'s 2012 ImageNet breakthrough is most attributed to:',
          [
            'A new optimization algorithm invented for the competition',
            'The combination of deep CNNs with ReLU/dropout/augmentation at GPU scale on large data',
            'Removing all fully connected layers',
            'Using only 3x3 kernels from the first layer',
          ],
          1,
          'Architecture (ReLU, dropout, augmentation), compute (dual-GPU training), and ImageNet-scale data jointly produced the 15.3% vs 26.2% win — no single trick; scale was essential.',
        ],
        [
          'VGG\'s central architectural argument is that stacks of 3x3 kernels:',
          [
            'Cannot overfit by construction',
            'Match larger kernels\' receptive fields with fewer parameters and extra non-linearities between them',
            'Require no pooling layers',
            'Must always use stride 2',
          ],
          1,
          'Two 3x3 = 5x5 field at 18C^2 vs 25C^2 params; three 3x3 = 7x7 at 27C^2 vs 49C^2 — plus two extra activations — the uniform-block rationale behind VGG-16/19.',
        ],
        [
          'Why did AlexNet use dropout mainly in its fully connected layers?',
          [
            'Convolution layers cannot be regularized at all',
            'The FC layers held most of the 60M parameters and were the dominant overfitting risk',
            'Dropout is unsupported in convolutions',
            'GPU memory prevented it in conv layers',
          ],
          1,
          'The three dense layers (esp. 4096x4096) carried the bulk of parameters on 1.2M images — prime overfit territory. Dropout in conv layers also disrupts spatial feature maps, so it was concentrated where capacity was bloated.',
        ],
      ]
    ),
    lesson(
      M3,
      'dl-3-3',
      3,
      'ResNet and the Skip-Connection Insight',
      'Why 20-layer nets trained worse than 16-layer ones, the degradation problem, identity shortcuts that make deep nets trivially optimizable, and the bottleneck block\'s FLOP arithmetic.',
      22,
      nineBlocks({
        objectives: [
          'State the degradation problem and distinguish it from overfitting',
          'Explain identity skip connections\' effect on forward function expressiveness and gradient flow',
          'Compute the parameter/FLOP profile of a bottleneck block versus a basic block',
          'Read a ResNet architecture specification (ResNet-18/50) and identify stages, blocks, and the classifier head',
        ],
        hook:
          'Here is an embarrassing 2014 result: take a plain 20-layer CNN, train it carefully, and it performs WORSE than a plain 16-layer CNN — on both training AND test data. Worse on training! That rules out overfitting; the deeper network literally could not fit the training data as well as the shallower one. The intuition "more layers = more capacity = at least as good" was flatly wrong, and the reason why produced the single most influential architecture idea of the decade: what if a layer were only REQUIRED to learn a small change — and could pass the input through untouched if it had nothing to add?',
        concept: `**The degradation problem.** He et al. (2015) observed: as plain (VGG-style) depth increases beyond ~20 layers, BOTH training error and test error get worse. Not overfitting (overfitting shows training error going DOWN while test goes up) — optimisation failure: deeper plain networks are harder to TRAIN, gradient-based optimization cannot find good solutions even in principle of practice. Diagnosis: gradients through dozens of layers of weight matrices either shrink toward zero or blow up (the chain-multiplication pathologies from Module 1.3), and the initial forward signal degrades layer by layer. The painful part: adding identity-ish layers (layers that learn to do nothing) SHOULD at worst give a plain net the same function as the shallow one — but plain nets couldn\'t learn those identity functions, because a layer\'s job in a plain stack is always "transform", never "pass through".

**The residual reformulation.** Instead of learning H(x) directly, learn the RESIDUAL F(x) = H(x) - x, and output x + F(x). If the ideal transformation is identity, the layer\'s job is set F = 0 — merely driving its weights to zero, a far easier target than learning an exact identity through weight matrices (which requires contrived inverse-cancellations). The forward pass becomes: y = x + F(x, W). Two payoffs, one architectural line of code: (1) OPTIMIZATION — the "identity is trivially reachable" argument means a deeper net\'s hypothesis space CONTAINS (approximately) the shallower net\'s, so added depth can only help training error in principle; (2) GRADIENT FLOW — differentiating y = x + F(x): dL/dx = dL/dy * (1 + dF/dx). The "+1" gives gradients a HIGHWAY back through the shortcut that cannot vanish regardless of what F\'s layers do; the gradient sum is a mixture of a clean path and a learned path — the identity-path component keeps early layers trained even at great depth.

**What residual connections actually are.** Not magic: elementwise addition of the input to the output, requiring MATCHING shapes (hence the projection shortcut 1x1 conv when dimensions change — downsampling stages use a strided conv in the skip path). Two flavors: post-activation original (ReLU after add) and pre-activation ResNet (He et al. 2016: x + F(LN(x)) ordering — trains even better at extreme depth, and the ordering modern transformers inherited as "pre-norm residual blocks"). Also note the ensemble reading: ResNets can be viewed as paths of many sub-networks (each shortcut traversal is a shorter path), explaining their tolerance to depth and their behaviour under layer dropping.

**The bottleneck block and its arithmetic.** Basic block (ResNet-18/34): two 3x3 convs of C channels each: params ~ 2*(9C^2) = 18C^2. Bottleneck block (ResNet-50/101/152): 1x1 conv reduce C -> C/4 (dimensionality reduction), 3x3 conv at C/4 (the expensive spatial work), 1x1 conv expand C/4 -> C (restore capacity): params = C*(C/4) + 9*(C/4)^2 + (C/4)*C = C^2/4 + 9C^2/16 + C^2/4 = 1.0625*C^2... let me be careful: 0.25 + 0.5625 + 0.25 = 1.0625 C^2. vs a hypothetical three 3x3 stack at C: 27C^2. The 1x1 "sandwich" cuts FLOPs/params by ~2.5-3x at equal depth-wise field, which is how ResNet-50 (50 layers) costs about the same compute as ResNet-34 would at full width. This reduce-operate-restore pattern (bottleneck) is reused everywhere afterward: transformer FFN expansions (d -> 4d -> d) are the same idea in sequence form.

**The architectural spec, readable.** ResNet-18: 7x7 conv stride 2 stem -> maxpool stride 2 -> 4 stages of [2,2,2,2] basic blocks with channels 64,128,256,512 (stride-2 at each stage entry) -> global average pool -> 1000-way FC: 11.7M params, ~1.8 GFLOPs. ResNet-50: same stages with [3,4,6,3] BOTTLENECK blocks, channels 64->2048: 25.6M params. The pattern — stem, stages with halving resolution/doubling channels, blocks-per-stage, GAP head — is the standard CNN specification format; reading any torchvision model description requires this vocabulary. Deeper variants: ResNet-101 [3,4,23,3], ResNet-152 [3,8,36,3]. Beyond vision: the residual idea became structural in transformers (each attention/FFN sublayer wraps a residual + LayerNorm) — ResNet\'s insight did not stay in vision; it became the default way to build ANY deep trainable stack.`,
        extras: [
          table(
            'Plain vs residual stacks',
            ['Property', 'Plain (VGG-style) net', 'ResNet'],
            [
              ['Layer job', 'Must learn the full transformation H(x)', 'Must learn only the residual F(x) = H(x) - x'],
              ['Identity possible?', 'Hard: needs weight-matrix contrivances', 'Easy: drive F\'s weights toward 0'],
              ['Gradient to early layers', 'Product of many Jacobians — can vanish/explode', 'Sum with a +1 identity term — a gradient highway'],
              ['Practical depth ceiling', '~20 layers (degradation)', '50-152 standard; 1000+ demonstrated'],
              ['Downsampling stage', 'Heavier convs', 'Stride in conv/projection shortcut (shapes must match to add)'],
            ],
          ),
          code(
            `import torch, torch.nn as nn

class BasicBlock(nn.Module):                     # ResNet-18/34 unit
    def __init__(self, c, stride=1):
        super().__init__()
        self.conv1 = nn.Conv2d(c, c, 3, stride=stride, padding=1, bias=False)
        self.bn1   = nn.BatchNorm2d(c)
        self.conv2 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.bn2   = nn.BatchNorm2d(c)
        self.skip  = nn.Identity() if stride == 1 else nn.Sequential(
            nn.Conv2d(c, c, 1, stride=stride, bias=False), nn.BatchNorm2d(c))

    def forward(self, x):
        out = torch.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        return torch.relu(out + self.skip(x))     # <-- THE line: identity highway

class Bottleneck(nn.Module):                     # ResNet-50 unit: 1x1 -> 3x3 -> 1x1
    def __init__(self, cin, cout, stride=1, expansion=4):
        super().__init__()
        c = cout // expansion                     # reduce to C/4
        self.conv1 = nn.Conv2d(cin, c, 1, bias=False);   self.bn1 = nn.BatchNorm2d(c)
        self.conv2 = nn.Conv2d(c, c, 3, stride=stride, padding=1, bias=False)
        self.bn2   = nn.BatchNorm2d(c)
        self.conv3 = nn.Conv2d(c, cout, 1, bias=False);  self.bn3 = nn.BatchNorm2d(c)
        self.skip  = nn.Sequential(
            nn.Conv2d(cin, cout, 1, stride=stride, bias=False), nn.BatchNorm2d(cout)) \
            if stride != 1 or cin != cout else nn.Identity()

    def forward(self, x):
        out = torch.relu(self.bn1(self.conv1(x)))
        out = torch.relu(self.bn2(self.conv2(out)))
        out = self.bn3(self.conv3(out))
        return torch.relu(out + self.skip(x))

# Bottleneck param math for C = 256 (cout = 256 -> inner 64):
# 256*64 + 9*64*64 + 64*256 = 16384 + 36864 + 16384 = 69,632
# vs three full-width 3x3s: 3 * 9 * 256^2 = 1,769,472  (25x more)`,
            'resnet_blocks.py',
            'python',
          ),
          tip(
            'Gradient-highway check when debugging deep nets',
            'Log gradient norms per layer early in training. In a healthy residual net, early-layer grads stay comparable in scale to late-layer ones; if early grads are orders of magnitude smaller, your shortcut path is broken (missing/zeroed skip, wrong shapes silently reshaped) — not your learning rate.',
          ),
          warn(
            'Skip connections require matching shapes — never "fix" a mismatch by squeezing blindly',
            'When stride/channels differ between the main path and the shortcut, use a PROJECTION shortcut (strided 1x1 conv + norm), as the architecture specifies. Arbitrary reshaping or broadcasting silently corrupts the residual structure and can mask shape bugs.',
          ),
        ],
        worked: {
          title: 'Prove the residual gradient highway by hand, then size a bottleneck',
          problem:
            'A residual unit: y = relu(x + F(x)), where F has two conv layers. Let the incoming gradient at y be g_y = 1.0, the relu at the output pass through (post-activation derivative = 1 at y > 0), and let dF/dx = -0.9 (the learned branch locally opposes the input — a pathological case that would kill a plain net). (a) Compute dL/dx through the shortcut unit. (b) Contrast with a plain unit where the whole path\'s Jacobian product equals -0.9. (c) Compute parameter counts for a C=256 bottleneck vs a plain 3x3x256 pair, and the ResNet-50 first-stage block count from [3,4,6,3].',
          steps: [
            {
              title: 'Gradient through the residual sum',
              desc: 'dL/dx = dL/dy * (1 + dF/dx) = 1.0 * (1 + (-0.9)) = 0.1. Even with an actively harmful learned branch (-0.9, nearly cancelling), the identity term keeps a nonzero path: the gradient does not vanish to -0.9 or below.',
              code_snippet: 'dL/dx = (1 + dF/dx) * g = (1 - 0.9) * 1.0 = 0.1',
            },
            {
              title: 'Contrast: plain unit, same learned Jacobian',
              desc: 'A plain stack passing the same local Jacobian: gradient = 1.0 * (-0.9) = -0.9 — and multiply such factors across 20+ layers (|0.9|^20 = 0.12; worse magnitudes vanish far faster; sign flips add chaos). The residual form degrades GRACEFULLY: worst case the +1 dominates and the unit passes gradient through; the plain form degrades multiplicatively.',
              code_snippet: 'plain: 1.0 * (-0.9) = -0.9   vs   residual: 0.1 (with +1 floor)',
            },
            {
              title: 'Bottleneck params at C = 256',
              desc: '1x1 256->64: 16,384. 3x3 64->64: 36,864. 1x1 64->256: 16,384. Total = 69,632 weights (biases off). Plain pair of 3x3 at 256: 2 * 9 * 256^2 = 1,179,648. The bottleneck is ~17x cheaper for the same channel footprint at this configuration (three 3x3s would be 27x).',
              code_snippet: '16384 + 36864 + 16384 = 69,632  vs  1,179,648 (two full 3x3s)',
            },
            {
              title: 'ResNet-50 stage structure',
              desc: 'Blocks per stage [3, 4, 6, 3] = 16 bottleneck blocks total; plus stem conv + maxpool + GAP + 1000-way FC. Channels per stage: 64, 128, 256, 512 with expansion 4 (output channels 256, 512, 1024, 2048). This compact notation — blocks-per-stage + channel list — fully specifies the architecture.',
              code_snippet: 'stages: 3,4,6,3 blocks;  channels: 256, 512, 1024, 2048 (expanded)',
            },
          ],
          solution:
            '(a) dL/dx = 0.1 — the identity term guarantees a floor under the gradient regardless of how unhelpful F becomes, the highway. (b) Plain: -0.9 and compounding multiplicatively — the degradation mechanism. (c) Bottleneck at C=256: 69,632 params vs 1.18M for the full-width pair; ResNet-50 = [3,4,6,3] bottleneck blocks with expansion-4 channels ending at 2048. Depth, safety, and efficiency — the three reasons ResNets became the template for deep stacks everywhere, transformers included.',
        },
        practice: {
          title: 'Read a torchvision model like an architect',
          prompt:
            'Load torchvision.models.resnet18 and resnet50 (or read their source). For each: list the stem, the four stages (blocks per stage, channel at entry/exit, where stride 2 appears), the head, and total parameter count. Then answer: roughly what fraction of parameters sit in the stem + first stage? What does that tell you about where capacity lives in a modern CNN?',
          hint: 'Print named_modules with shapes on a dummy forward pass. Expect the last stage + FC to hold most params in ResNet-18; GAP removes most of the head cost that VGG paid.',
        },
        mistakes: [
          {
            mistake: 'Calling degradation "overfitting"',
            fix: 'Overfitting: train error down, test error up. Degradation: train error itself rises with depth — an optimization problem, not a statistical one. The distinction is exactly what motivated residual learning and earns marks in exams.',
          },
          {
            mistake: 'Believing skip connections magically add information',
            fix: 'They add nothing to representational content — elementwise addition changes the FUNCTION CLASS only in how easily identity/near-identity maps are expressed and how gradients route. The insight is optimization geometry, not new data or new capacity.',
          },
          {
            mistake: 'Applying residual addition across mismatched tensor shapes',
            fix: 'Elementwise add requires identical shapes; dimension changes go through the projection shortcut (strided 1x1 conv + BN). Broadcasting or reshaping to force an add silently breaks the residual algebra.',
          },
          {
            mistake: 'Assuming ResNet\'s contribution was confined to vision',
            fix: 'The transformer block (x + Sublayer(norm(x))) IS the residual idea transplanted: pre-norm residual stacks are why 100-layer language models train. Architecture lineage cuts across domains — this one is genuinely universal.',
          },
        ],
        exam: {
          question:
            'Explain the degradation problem in plain deep CNNs and show algebraically why identity shortcuts fix gradient flow. Why are projections (1x1 convs) used in shortcuts at downsampling stages?',
          answer:
            'Degradation: increasing plain-CNN depth beyond ~20 layers raised BOTH training and test error — optimisation failure (not overfitting), caused by difficulty learning identity-like transforms and by vanishing/exploding products of layer Jacobians. Fix, algebraically: a residual unit computes y = x + F(x). Backpropagating, dL/dx = dL/dy * (I + dF/dx): the identity term contributes an UNATTENUATED +I component to the gradient, so signal reaches early layers through a path that no settings of F can eliminate (F can at most modify it) — versus a plain unit where the gradient is purely the product dF_L/dx * ... * dF_1/dx, which shrinks or explodes multiplicatively with depth. Additionally, forward: y = x + F(x) makes identity trivially reachable by driving F to zero, so a deeper residual net can in principle represent the shallower net\'s function, easing optimisation. At stages where spatial size or channel count changes, the shortcut cannot add x directly (shapes mismatch); a projection shortcut — strided 1x1 convolution with matching channels, usually followed by normalization — maps x into the output space so the residual addition remains structurally valid while the highway property persists through the projected path.',
          source: 'Core GATE/advanced-DL question on ResNets; the algebraic gradient argument is the expected centre of a full-marks answer.',
        },
        summary: [
          'Degradation: plain nets past ~20 layers train WORSE — optimization failure, not overfitting.',
          'Residual learning: learn F(x) where H(x) = x + F(x); identity becomes an easy target (drive F to zero).',
          'Gradient highway: dL/dx = dL/dy * (1 + dF/dx) — the +1 term cannot vanish, unlike multiplicative plain chains.',
          'Bottleneck (1x1 reduce -> 3x3 -> 1x1 restore) buys depth cheaply; [3,4,6,3] notation specifies ResNet-50.',
          'The residual+pre-norm pattern migrated into transformer blocks — ResNet\'s deepest influence is outside vision.',
        ],
      }),
      [
        [
          'The degradation problem refers to the observation that very deep plain CNNs:',
          [
            'Overfit badly while training error keeps falling',
            'Show HIGHER training error than shallower counterparts — an optimisation failure',
            'Run out of GPU memory before training',
            'Have too many parameters for the dataset',
          ],
          1,
          'Both training AND test error rise with depth in plain nets — if it were overfitting, training error would be falling. The problem is difficulty training, addressed by residual connections.',
        ],
        [
          'In a residual unit y = x + F(x), the backpropagated gradient satisfies:',
          [
            'dL/dx = dL/dy * dF/dx (the shortcut contributes nothing)',
            'dL/dx = dL/dy * (I + dF/dx) — an identity term that cannot vanish',
            'dL/dx = dL/dy * (I - dF/dx)',
            'Gradients do not pass through skip connections',
          ],
          1,
          'Differentiating the sum gives the identity plus the learned branch: the +I highway guarantees gradient flow regardless of F\'s weights — the core fix for vanishing gradients at depth.',
        ],
        [
          'The purpose of the 1x1 conv layers in a bottleneck block is to:',
          [
            'Increase spatial resolution',
            'Reduce channel dimensionality before the expensive 3x3 (and restore it after), cutting FLOPs/params substantially',
            'Add non-linearity only',
            'Replace the skip connection',
          ],
          1,
          'Reduce-operate-restore: 1x1 cuts C -> C/4, the 3x3 runs at reduced width, 1x1 expands back — ~17x cheaper at C=256 than full-width stacks, enabling 50-152 layer variants at practical cost.',
        ],
        [
          'Why must a projection shortcut (1x1 conv with stride) be used when a block downsamples?',
          [
            'To add extra non-linearity',
            'Elementwise addition requires matching shapes; the projection maps the shortcut input to the output\'s stride and channel count',
            'To reduce the learning rate internally',
            'Skip connections must always include a convolution',
          ],
          1,
          'x and F(x) are added elementwise — different spatial size or channel count makes this impossible. The strided 1x1 conv transforms x into the output space so the residual sum stays valid.',
        ],
      ]
    ),
    lesson(
      M3,
      'dl-3-4',
      4,
      'Transfer Learning: Freeze, Fine-Tune, and When Features Transfer',
      'The feature-hierarchy argument for why ImageNet features generalize, the freeze-vs-fine-tune decision ladder, layer-wise learning-rate decay, and a working fine-tune recipe for small-data regimes.',
      22,
      nineBlocks({
        objectives: [
          'Explain which layers of a pretrained CNN learn generic vs task-specific features and why unfreezing order matters',
          'Choose between linear probing, partial fine-tuning, and full fine-tuning for a described dataset/task',
          'Execute layer-wise unfreezing with per-layer learning rates and state what signs tell you to stop',
          'Identify domain-gap conditions under which ImageNet features transfer poorly and ImageNet pretraining fails',
        ],
        hook:
          'You have 400 labelled medical images and a 12-million-parameter vision problem. Training from scratch: hopeless — the network will memorize your 400 images and memorize them badly. Fine-tuning a ResNet pretrained on ImageNet: state-of-the-art within an afternoon. Same architecture, same 400 images — the difference is inheriting a feature extractor that already knows edges, textures, shapes, and object parts from 1.2 million images someone else paid to learn. Transfer learning is not a trick; it is the economic foundation of applied deep learning, and knowing its boundaries — when it FAILS — separates practitioners from cargo-culters.',
        concept: `**Why transfer works: the hierarchy argument.** CNN features organize by specificity: earliest layers (edges, gradients, colors), middle layers (textures, parts, motifs), late layers (object-category-adjacent patterns strongly tuned to the pretraining label space). Crucially, the EARLY AND MIDDLE layers are largely DOMAIN-AGNOSTIC — a Gabor-like edge detector is as useful for X-rays as for cats — while the last layers are the most pretraining-task-specific. Transfer exploits exactly this asymmetry: reuse the general feature extractor, retrain only the task-specific head. The ImageNet prior carries further than intuition suggests: natural-image statistics (scale invariances, texture/shape regularities) provide useful inductive bias for medical imaging, satellite imagery, art, and even some non-visual domains — but the transfer DEGRADES smoothly as the domain gap widens (more on failure conditions below).

**The freeze/fine-tune ladder (three rungs).** (1) LINEAR PROBING / HEAD-ONLY TRAINING: freeze ALL backbone parameters, train only a new classifier head on frozen features. Cheap (only head params train), stable, the correct FIRST step: it measures how linearly separable your classes are in the pretrained feature space. If linear probing already gives good accuracy, your task is close to the pretraining domain. (2) PARTIAL FINE-TUNING: unfreeze the LAST stage(s) of the backbone (the most task-specific) while keeping early stages frozen; train with a small lr. Standard when classes are visually novel (medical textures, satellite, industrial defects). (3) FULL FINE-TUNUNING: all layers train with SMALL learning rates (1e-5 to 1e-4 range for CNN backbones; ~10-100x smaller than the head lr). Needed for large domain gaps or when you have enough data to justify moving every weight without destroying generic features.

**Discriminative learning rates and unfreezing discipline.** One global lr treats edge detectors (should barely move) and the classifier head (should learn a lot) identically — wrong. Discriminative fine-tuning: head lr = 1e-3, final stage = 1e-4, earlier stages = 1e-5 or lower — each layer moves proportionally to how task-specific it is. Unfreezing one stage per K epochs (bottom-up discipline reversed: unfreeze from the TOP) lets you watch val loss after each addition; if it degrades when you unfreeze stage N, revert — stage N\'s features were fine as-is or the lr there is too high. Companion warning: NORM LAYERS. When fine-tuning with small batches, keep BN layers frozen in eval mode (their running statistics would otherwise be corrupted by tiny batches — the Module 2.3 trap recurs here in the most common applied setting). Linear probing + BN frozen is the industry-standard safe baseline.

**When ImageNet features transfer (and when they don\'t).** TRANSFER WELL: same modality (natural photos), similar granularity (objects/scenes), target data scarce (dozens to thousands per class). The 2019 "does ImageNet transfer?" (Kornblith et al.) result: across 12 vision datasets, ImageNet pretraining beats training from scratch on almost all — and better ImageNet accuracy correlates with better transfer, with dataset RESOLUTION and DIVERSITY mattering more than the specific label taxonomy. TRANSFER POORLY OR NOT AT ALL: (a) modality shift — medical grayscale, spectrograms, remote sensing with very different statistics (RGB natural-image priors can even mislead early); (b) new fine-grained distinctions that confuse generic features (species/severity grades where the head lacks separable signal); (c) very high resolution than pretraining (models input-size transfers via interpolation of conv weights — works but imperfect); (d) tasks where the shortcut features learned on ImageNet are actively adversarial (texture-biased decisions failing on shape-defined data). Remedies: domain-appropriate self-supervised pretraining (the 2020s increasingly prefers MAE/contrastive pretraining on YOUR domain\'s unlabelled data over ImageNet supervision), medical foundation models, longer full fine-tuning with augmentation.

**The 2026 practical default.** 1) Pick a modern pretrained backbone (torchvision/timm: ConvNeXt, EfficientNet, ViT — all ship pretrained weights). 2) Replace the head, linear probe, measure. 3) Unfreeze last stage with discriminative lrs; keep BN frozen for small batches; early-stop on val. 4) Only then full fine-tune at 1e-5-ish if val still says capacity-bound. 5) If the domain gap is large, consider self-supervised in-domain pretraining first. Data augmentation (and label-preserving crops) remains the highest-leverage addition at every rung. This ladder — probe, partial, full — is the entire applied playbook, and its discipline (never unfreeze more than the val evidence supports) saves models that a single-step "unfreeze everything, lr 1e-3" run destroys.`,
        extras: [
          table(
            'Fine-tune decision ladder',
            ['Rung', 'What trains', 'Head / backbone lr', 'Use when'],
            [
              ['Linear probe', 'New head only', '1e-3 / frozen', 'Measuring feature quality; classes close to pretraining domain'],
              ['Partial fine-tune', 'Head + last stage(s)', '1e-3 / 1e-4', 'Moderate gap; limited data; safest accuracy gains'],
              ['Full fine-tune', 'All layers', '1e-3 / 1e-5', 'Large domain gap AND enough data to move everything safely'],
              ['Self-supervised pretrain, then fine-tune', 'Pretrain on in-domain unlabelled, then above', 'domain-specific', 'Big modality gap (medical/satellite) with plentiful unlabelled data'],
            ],
          ),
          code(
            `import torch, torch.nn as nn
from torchvision import models

model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)

# Rung 1: linear probe — freeze everything
for p in model.parameters():
    p.requires_grad = False
model.fc = nn.Linear(2048, 10)              # new head; only these train
probe_params = [p for p in model.parameters() if p.requires_grad]
print("training params:", sum(p.numel() for p in probe_params))   # 20,490

# Rung 2: partial — unfreeze layer4 with a discriminative lr
for p in model.layer4.parameters():
    p.requires_grad = True
head_params  = list(model.fc.parameters())
late_params  = list(model.layer4.parameters())
optimizer = torch.optim.AdamW([
    {"params": head_params, "lr": 1e-3},
    {"params": late_params, "lr": 1e-4},      # 10x smaller deeper in
], weight_decay=0.01)

# Keep BN statistics frozen while doing this (small batches!)
for m in model.modules():
    if isinstance(m, nn.BatchNorm2d):
        m.eval()                              # running stats protected

# Rung 3: full — add early layers at ~1e-5, keep BN eval or use larger batches
for p in model.parameters():
    p.requires_grad = True
# ... then re-group parameter groups with per-stage lrs (1e-5 early -> 1e-3 head)`,
            'fine_tune_ladder.py',
            'python',
          ),
          tip(
            'Linear probing is your cheap diagnostic before any fine-tuning',
            'Frozen features + logistic head = a fast answer to "how separable are my classes in pretrained space?" If probe accuracy is already 85% of your target, partial fine-tuning will close it cheaply. If probe is near chance, the domain gap is real — budget for heavy fine-tuning or in-domain pretraining.',
          ),
          warn(
            'One learning rate across a whole pretrained network is the most common fine-tune disaster',
            'Head at 1e-3 while edge detectors share that rate destroys generic features in the first epochs (catastrophic forgetting of the prior you paid for). Discriminative lrs (10-100x smaller deeper in) are not optional tuning — they are the safe default.',
          ),
        ],
        worked: {
          title: 'Plan a fine-tune for a 600-image medical dataset',
          problem:
            'Task: classify 5 skin-lesion types; 600 labelled 512x512 colour images total (120/class); pretrained ResNet-50 (224x224 input) available; you have one GPU for a day. Design the full plan: preprocessing, rung choice with justification, per-group learning rates, BN handling, augmentation, and the metric + decision rule for advancing to the next rung.',
          steps: [
            {
              title: 'Preprocessing and split',
              desc: 'Resize/crop to 224x224 with ImageNet normalization (match pretraining statistics — wrong normalization silently ruins features). Stratified split: ~480 train / 120 val (per class preserved). With only 120/class, val noise is real: report mean over 3 seeds or use 5-fold for final numbers.',
              code_snippet: 'Normalize(mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225]);  resize 224',
            },
            {
              title: 'Rung 1: linear probe',
              desc: 'Freeze all; train head at lr 1e-3, AdamW, ~20 epochs, class-balanced loss (5 balanced classes but small N — weight anyway if counts differ). Metric: macro-F1 (lesion classes matter equally). Rule: advance if probe macro-F1 < 0.75 (head must relearn — domain gap exists) but note the level for comparison.',
              code_snippet: 'frozen backbone;  head lr=1e-3;  20 epochs;  track val macro-F1',
            },
            {
              title: 'Rung 2: unfreeze layer4, discriminative lrs',
              desc: 'layer4 lr 1e-4, head lr 1e-3, BN frozen (eval mode — batches of 16 corrupt running stats). Strong augmentation: flips, rotations, mild colour jitter, random resized crops. ~30 epochs with patience 8. Advance rule: val macro-F1 improves by >1 point over probe — keep; if it DROPS below probe after 10 epochs, revert and lower layer4 lr to 3e-5.',
              code_snippet: 'lr groups: head 1e-3, layer4 1e-4;  BN.eval();  patience 8',
            },
            {
              title: 'Rung 3: full fine-tune (only if still capacity-bound)',
              desc: 'Unfreeze all: stage lrs [1e-5, 3e-5, 1e-4, 1e-3] (earliest lowest), BN still frozen OR train with batch 32+, 15-20 epochs. Sign to STOP and keep rung 2: val F1 flat or down while train F1 soars — you are overfitting 480 images; regularization cannot fix insufficient data, and the probe+partial result stands. Report final on the held-out test once.',
              code_snippet: 'stage lrs: 1e-5, 3e-5, 1e-4, head 1e-3;  stop if train/val diverge',
            },
          ],
          solution:
            'Plan: ImageNet-normalized 224 crops, stratified 480/120, then probe (head 1e-3, frozen, macro-F1 baseline) -> partial (layer4 at 1e-4, head 1e-3, BN frozen, heavy augmentation) -> full (stage-wise 1e-5..1e-3) ONLY if validation proves capacity is the binding constraint. Each rung gated by a stated metric rule, each with an explicit revert condition. With 600 images, expect rung 2 to be the sweet spot — and expect the whole pipeline to beat from-scratch training by a wide margin, which is the entire point of the transfer stack.',
        },
        practice: {
          title: 'Run the three-rung ladder on a real dataset',
          prompt:
            'On any small dataset (CIFAR-10 subset of 100/class works, or a Kaggle set): fine-tune a pretrained ResNet-18 through all three rungs — linear probe, last-stage partial, full fine-tune — holding augmentation, epochs, and metric constant (only lrs/groups differ). Record macro-F1 per rung. Write the curve of rung vs accuracy and explain the observed shape: monotonic? Diminishing? Divergent? What would make you stop at rung 2?',
          hint: 'If full fine-tuning beats partial only marginally (or loses), rung 2 is your production choice — extra risk and compute must buy real accuracy to justify themselves.',
        },
        mistakes: [
          {
            mistake: 'Fine-tuning at the same lr you would use to train from scratch',
            fix: 'Pretrained weights are valuable prior knowledge; lr 1e-3 across a full backbone destroys it within epochs (catastrophic forgetting). Use 10-100x smaller lrs for backbone groups, and always apply discriminative scaling.',
          },
          {
            mistake: 'Letting BatchNorm running stats update on small fine-tune batches',
            fix: 'Put the backbone in eval() mode (or keep requires_grad False on BN params AND eval mode) during head/partial training; tiny-batch statistics corrupt a well-trained feature extractor. Standard practice — the Module 2.3 warning at its most consequential.',
          },
          {
            mistake: 'Assuming ImageNet pretraining always helps',
            fix: 'For grayscale medical, spectrogram, or heavily out-of-distribution inputs, natural-image features can underperform random init or in-domain self-supervised pretraining. Always keep from-scratch and in-domain-pretrained baselines in the comparison table.',
          },
          {
            mistake: 'Starting with full unfreezing because "more training = better"',
            fix: 'Full unfreezing on 600 images overfits and forgets generic features fast. The ladder exists to find the minimum unfreezing that meets your target: probe first, then add freedom only where validation demands it.',
          },
        ],
        exam: {
          question:
            'Explain why early CNN layers transfer across domains while late layers are task-specific, and describe a safe fine-tuning procedure for a small dataset, including norm-layer handling.',
          answer:
            'Early convolutional filters learn generic local primitives (edges, gradients, colour contrasts, simple textures) that recur across virtually all image domains — their statistics are dictated by natural-image regularities rather than by the pretraining label set. Deeper layers compose these primitives into class-adjacent patterns increasingly entangled with the pretraining task\'s categories, so their features are less reusable without adaptation. Hence the asymmetry: keep early layers frozen, retrain late layers/head. Safe procedure for a small dataset: (1) replace the head and LINEAR PROBE with the whole backbone frozen — establishes the feature-quality baseline cheaply; (2) unfreeze only the last stage, using discriminative learning rates (e.g., head 1e-3, last stage 1e-4) with early stopping on validation; (3) expand unfreezing stage-by-stage only while validation improves, never full-unfreeze blindly; (4) keep BatchNorm layers in evaluation mode (frozen running statistics) throughout unless batches are large — small fine-tune batches otherwise overwrite good statistics with noisy ones; (5) apply strong label-preserving augmentation and class-balanced sampling/loss. Stop at the rung where validation stops benefiting — extra unfreezing beyond that point buys overfitting and forgetting, not accuracy.',
          source: 'The canonical transfer-learning question in advanced DL courses and a staple of CV engineering interviews.',
        },
        summary: [
          'Transfer exploits feature hierarchy: early layers are generic, late layers task-specific — reuse the general, retrain the specific.',
          'The ladder: linear probe -> partial (top stage) fine-tune -> full fine-tune, each rung gated by validation evidence.',
          'Discriminative learning rates (10-100x smaller deeper in) protect pretrained features; head trains fastest, edges barely move.',
          'Freeze BatchNorm stats when fine-tuning with small batches — a silent-corruption trap with a one-line fix.',
          'ImageNet transfer is strong but bounded: modality/texture gaps and label-structure mismatch are where it degrades — test, never assume.',
        ],
      }),
      [
        [
          'In a pretrained CNN, which layers are generally MOST reusable across unrelated domains?',
          [
            'The final fully connected/classifier layers',
            'The earliest convolutional layers (edges, textures, colour gradients)',
            'Only the last convolutional stage',
            'None — transfer requires identical datasets',
          ],
          1,
          'Early filters capture generic local primitives dictated by image statistics, not the pretraining label set; later layers entangle with task-specific categories and need more adaptation.',
        ],
        [
          'Linear probing (training a head on a fully frozen backbone) is valuable first because it:',
          [
            'Trains the model faster than any alternative',
            'Cheaply measures how linearly separable the new classes are in the pretrained feature space before risking the backbone',
            'Removes the need for a loss function',
            'Regularizes the entire network automatically',
          ],
          1,
          'It isolates feature quality: strong probe = features already fit the task; weak probe = real domain gap. It is a diagnostic AND a safe baseline before any risky unfreezing.',
        ],
        [
          'When fine-tuning on 600 images with batch size 16, BatchNorm layers should be:',
          [
            'Deleted from the architecture',
            'Kept in eval mode with frozen running statistics (or replaced) to avoid corruption by noisy small-batch statistics',
            'Trained with a 100x higher learning rate',
            'Converted to ReLU',
          ],
          1,
          'Small batches produce unreliable BN statistics that overwrite good pretrained running stats — the standard fix is eval-mode freezing for the backbone during fine-tuning.',
        ],
        [
          'Discriminative fine-tuning refers to:',
          [
            'Different data augmentation per class',
            'Using progressively smaller learning rates for earlier (more generic) layers and larger rates for the head/late layers',
            'Applying different dropout rates per stage',
            'Training on a curated hard-negative set',
          ],
          1,
          'Generic early features should barely move (small lr), while the task-specific head learns quickly (large lr) — per-group learning rates that respect layer specificity.',
        ],
      ]
    ),
  ],
};
