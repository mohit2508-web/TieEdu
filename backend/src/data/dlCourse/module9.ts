// Module 9 — PyTorch in Practice
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M9, COURSE_ID } from './helpers';

export const module9: CourseModule = {
  id: M9,
  course_id: COURSE_ID,
  title: 'Module 9 — PyTorch in Practice',
  summary:
    'The framework as an engineering system: tensors as strided views with dtype/device/memory arithmetic; autograd as the chain rule over a recorded graph, including accumulation traps and higher-order gradients; Dataset/DataLoader contracts and an annotated end-to-end training loop; then the production levers — AMP loss scaling, gradient accumulation, clipping, checkpoint/resume, and the debugging playbook for NaN and stalled losses.',
  sort_order: 9,
  lessons: [
    lesson(
      M9,
      'dl-9-1',
      1,
      'Tensors as Strided Views: Dtypes, Devices, and Memory Arithmetic',
      'A tensor is (storage, shape, stride, offset), not a box of numbers: why transpose is free, how broadcasting resolves shapes, what each dtype costs in bytes, and the device/pinned-memory path data actually travels.',
      22,
      nineBlocks({
        objectives: [
          'Decompose any tensor into storage, shape, stride, and offset, and predict when an op copies versus views',
          'Apply PyTorch broadcasting rules to predict which shape pairs are legal before running them',
          'Compute parameter and optimizer-state memory for a model in fp32, fp16/bf16, and int8',
          'Choose dtypes and device-transfer patterns (pin_memory, non_blocking) for training and inference',
        ],
        hook:
          'A team shipped an inference service that OOMed at 4 GB despite the model weighing only 2 GB — they had copied tensors with .t() in a hot loop (each copy silently materialized a contiguous layout) and kept every intermediate on GPU "to save time". Two ideas fix both bugs: tensors are VIEWS over shared storage until proven otherwise, and every dtype has an exact byte price. This lesson makes you able to do the arithmetic before the OOM, not after.',
        concept: `**The tensor object.** Every PyTorch tensor is a VIEW: a small header pointing at a flat, typed 1-D STORAGE with metadata (shape, stride, offset). \`x = torch.arange(20).reshape(4, 5)\` stores 20 values linearly; shape (4,5), strides (5,1) — "jump 5 storage slots to move down a row, 1 to move right". \`x.t()\` changes the header to shape (5,4), strides (1,5) and copies NOTHING. Indexing math: element [i,j] lives at offset + i*stride0 + j*stride1. Ops split into three families: VIEW ops (reshape/transpose/slice/view — metadata only, zero-copy), IN-PLACE ops (x.add_ — allowed only on leaf tensors that no graph needs, and never on views that would alias), and COPYING ops (contiguous(), many math kernels require contiguity, so a non-contiguous transpose gets materialized implicitly). Consequence: memory of a transpose = memory of the original; \`y.is_contiguous()\` tells you when the next kernel will pay a copy.

**Dtypes have exact prices.** Bytes/element: float32 = 4, float16/bfloat16 = 2, int8/uint8 = 1, int64 (default index dtype!) = 8, TF32 = 4 bytes stored but 10-bit mantissa compute on Ampere+. Ranges: fp16 spans roughly 6.1e-5 to 65,504 (normals) with subnormals to ~6e-8 — gradients of order 1e-7 VANISH without loss scaling (module 9.4); bf16 keeps fp32's 8-bit exponent (~3.4e38 range) but only 8 mantissa bits (fp32 has 23) — safe range, coarser precision, NO scaler needed. int8 quantization: symmetric mapping q = round(w/s), s = max|w|/127 (module 10.2). Rule: WEIGHTS may live in reduced precision; INDICES stay int64; LOSS and reduction math should stay fp32 under autocast (frameworks default this).

**Broadcasting = right-aligned shape unification.** Align shapes from the trailing dimension; each pair must be equal, or one of them must be 1 (the 1 stretches). (8,3,32,32) + (1,3,1,1) → per-channel bias, legal. (8,3,32,32) + (3,32,32) → pads to (1,3,32,32), legal. (8,3,32,32) + (8,1,32) → aligns to (1,8,1,32): the 3-vs-8 pair has no 1 → RuntimeError. Broadcasting never allocates the stretched result until an op needs it — a (1,3,1,1) addend materializes only the (8,3,32,32) output, not an intermediate expansion.

**Devices and the data path.** Every tensor lives on exactly one device; mixing cpu and cuda in one op raises. The transfer chain: pinned (page-locked) host memory → async DMA copy (non_blocking=True) → GPU, which OVERLAPS with compute of the previous batch — this is why DataLoader uses pin_memory=True for GPU training. Device work pays twice on shared cards: $\`torch.cuda.synchronize()\` boundaries matter when timing (kernels are async — an unsynchronized timer measures launch overhead, not work). Counting rule of thumb: model params + grads + optimizer states + activations (activations dominate for CNNs/Transformers with large batches — module 9.4's activation checkpointing attacks exactly that term).`,
        extras: [
          table(
            'Dtype cheat sheet',
            ['Dtype', 'Bytes/element', 'Range (approx)', 'Use for'],
            [
              ['float32', '4', '~1.3e-38 to 3.4e38', 'Master weights, loss/reductions, optimizer states'],
              ['float16', '2', '6.1e-5 to 65,504 (subnormals to ~6e-8)', 'AMP compute with a GradScaler; fast inference'],
              ['bfloat16', '2', 'Same exponent span as fp32', 'AMP without scaler (TPU/Ampere norm)'],
              ['TF32', '4 (10-bit mantissa)', 'fp32-like', 'Ampere matmuls by default — check it is what you want'],
              ['int8', '1', '-128 to 127', 'Quantized weights/activations (module 10.2)'],
              ['int64', '8', '~9.2e18', 'Indices, token ids (PyTorch default — never fp32)'],
            ],
          ),
          code(
            `import torch

# ---- memory: exact bytes per parameter ----
def gib(n_params, dtype):
    return n_params * torch.tensor([], dtype=dtype).element_size() / 2**30

p = 1_700_000_000
print(gib(p, torch.float32))    # 6.33 GiB
print(gib(p, torch.float16))    # 3.17 GiB
print(gib(p, torch.int8))       # 1.58 GiB

# ---- strides: transpose is a zero-copy view ----
x = torch.arange(20).reshape(4, 5)
print(x.shape, x.stride())      # torch.Size([4, 5]) (5, 1)
y = x.t()
print(y.shape, y.stride())      # torch.Size([5, 4]) (1, 5)
print(y[0, 1].item(), x[1, 0].item())   # 5 5 — same storage slot
print(y.is_contiguous())        # False — next kernel may copy implicitly

# ---- broadcasting: predict before you run ----
bias = torch.randn(1, 3, 1, 1)
out = torch.randn(8, 3, 32, 32) + bias          # OK: per-channel
# torch.randn(8, 3, 32, 32) + torch.randn(8, 1, 32)   -> RuntimeError

# ---- the pinned-memory path ----
x = torch.randn(4096, 4096)
x = x.pin_memory().to("cuda", non_blocking=True)   # DMA overlaps next batch
print(x.device, x.dtype)`,
            'tensor_internals.py',
            'python',
          ),
          tip(
            'Time kernels, do not time launches',
            'CUDA ops are asynchronous: wrap measurements in torch.cuda.synchronize() (or use torch.utils.benchmark, which does). Otherwise a "10 us" benchmark is just the launch cost of an op that has not run yet — and the number you report in the writeup is wrong.',
          ),
          warn(
            'A stray transpose in a hot loop hides a full copy',
            'Views are free only until a kernel demands contiguous memory — then PyTorch materializes a copy you did not budget for. In attention/conv paths, call .contiguous() ONCE after layout changes, or keep channels-last/row-major deliberately, and watch memory with torch.cuda.max_memory_allocated() rather than assuming zero-copy holds everywhere.',
          ),
          info(
            'Default dtypes trip people up',
            'torch.randn gives fp32, torch.randint gives int64, and .double() silently doubles memory. When a model "should be fp16" but loss is fp16 too, gradients underflow and the loss goes to NaN — keep loss computation fp32 (autocast does this) and store the dtype choice in the model config, not in tribal memory.',
          ),
        ],
        worked: {
          title: 'Cost a 1.7B-parameter model in memory, views, and broadcasts',
          problem:
            'A 1.7B-parameter model trains with Adam. (a) Parameter memory in fp32, fp16, int8 (GiB). (b) Full Adam training footprint in fp32: params + grads + first moment + second moment (ignore activations). (c) Strides: x = arange(20).reshape(4,5); give shape/stride of x and of x.t(), and the storage slot of t[0,1]. (d) Broadcast legality: which of (1,3,1,1), (3,32,32), (8,1,32) can add to (8,3,32,32), and why the illegal one fails. (e) Inference-only serving: fp16 weights on a 4 GiB GPU — fits or not? fp32?',
          steps: [
            {
              title: '(a) Bytes per parameter',
              desc: 'fp32: 1.7e9 x 4 B = 6.8e9 B / 2^30 = 6.33 GiB. fp16: half → 3.17 GiB. int8: quarter → 1.58 GiB (plus tiny per-group scale tensors, ~1e-5 of the total). Every compression scheme in module 10 is a variation on this line of arithmetic.',
              code_snippet: 'fp32 6.33 GiB | fp16 3.17 GiB | int8 1.58 GiB',
            },
            {
              title: '(b) Adam training footprint',
              desc: 'Four fp32 tensors per parameter: weights 6.33 + grads 6.33 + moment m 6.33 + moment v 6.33 = 25.3 GiB — before a single activation, CUDA context (~0.5 GiB), or workspace. This is why "my model is only 6 GB" still OOMs at batch size 512, and why mixed precision exists (fp16 weights + fp32 master keeps the optimizer math in fp32 while activations run in fp16).',
              code_snippet: '4 x 6.33 GiB = 25.3 GiB  (+ activations!)',
            },
            {
              title: '(c) Stride bookkeeping',
              desc: 'x: shape (4,5), strides (5,1), offset 0. x.t(): shape (5,4), strides (1,5) — same 20-element storage, header rewritten. Element [0,1] of the transpose sits at offset 0 + 0*1 + 1*5 = 5, i.e., storage slot 5 — which is x[1,0] (value 5 in arange(20)). Same memory, different road map; y.is_contiguous() is False.',
              code_snippet: 'x: (4,5)/(5,1)  t: (5,4)/(1,5)  slot 0+0*1+1*5 = 5',
            },
            {
              title: '(d) Broadcast legality',
              desc: '(1,3,1,1): right-aligns to (1,3,1,1) vs (8,3,32,32) — every pair equal-or-1 → per-channel bias, legal. (3,32,32): pads to (1,3,32,32) → legal, adds the same bias to all 8 batch items. (8,1,32): pads to (1,8,1,32); comparing against (8,3,32,32) gives a 3-vs-8 pair with no dimension equal to 1 → RuntimeError. Rule: align trailing, then each dim must match or contain a 1.',
              code_snippet: '(1,3,1,1) OK  (3,32,32) OK  (8,1,32) FAIL: 3 vs 8',
            },
            {
              title: '(e) Serving fit check',
              desc: 'fp16 weights: 3.17 GiB < 4 GiB → fits with ~0.8 GiB for KV cache and activations (tight but possible at short context; the KV-cache arithmetic lands in module 10.3). fp32: 6.33 GiB > 4 GiB → OOM before any data loads. The dtype decision IS the deployment decision.',
              code_snippet: '3.17 GiB fits ; 6.33 GiB OOMs a 4 GiB card',
            },
          ],
          solution:
            '(a) 6.33 / 3.17 / 1.58 GiB. (b) 25.3 GiB of fp32 state before activations — the motivation for AMP. (c) Transpose rewrites strides only: (5,4)/(1,5); storage slot 5, same as x[1,0]. (d) (1,3,1,1) and (3,32,32) legal; (8,1,32) fails on the 3-vs-8 pair. (e) fp16 fits (3.17 GiB), fp32 does not (6.33 GiB) — dtype arithmetic decides what hardware you may rent.',
        },
        practice: {
          title: 'Audit a model’s memory like a profiler',
          prompt:
            'Pick any torchvision model at ~25M params: (1) report bytes for weights alone in fp32/fp16/int8; (2) print the storage/stride story for one weight after .t() and after .contiguous() — prove with data_ptr() which ops share storage; (3) run a forward with batch 1 and batch 64 and record torch.cuda.max_memory_allocated() (or CPU RSS) — the delta is the activation term; (4) deliberately trigger one broadcast error and explain the right-aligned comparison in the traceback; (5) write a 5-line dtype policy for your project (weights, compute, loss, indices).',
          hint: 'data_ptr() equality proves shared storage. The batch-64 delta divided by batch-1 delta gives activations per sample — the number activation checkpointing (9.4) will attack.',
        },
        mistakes: [
          {
            mistake: 'Assuming reshape/transpose always allocates',
            fix: 'View ops rewrite (shape, stride, offset) over shared storage; only kernels that need contiguity (or .contiguous()/.clone()) copy. Check y.is_contiguous() and data_ptr() before blaming memory on a "copy that never happened" — or before assuming one did not.',
          },
          {
            mistake: 'Keeping loss and reductions in fp16',
            fix: 'fp16 bottoms out around 6e-5 (normals) / 6e-8 (subnormals); summed losses and gradient reductions underflow. Run loss computation and accumulation in fp32 (autocast excludes them) and keep a fp32 master copy of weights for updates.',
          },
          {
            mistake: 'Using default int64 indices/one-hot arithmetic to "save memory"',
            fix: 'int64 costs 8 bytes/element — token id tensors and targets often dwarf the fp16 activations they index. Keep ids int64 (needed for embedding lookup) but never widen floats to int64 or materialize giant int64 one-hots when gather/cross_entropy can do the work.',
          },
          {
            mistake: 'Timing CUDA without synchronizing',
            fix: 'Kernels queue asynchronously; an unsynchronized timer measures launch, not execution — benchmarks come out impossibly fast. Use torch.utils.benchmark or torch.cuda.synchronize() around timers, and warm up before measuring.',
          },
        ],
        exam: {
          question:
            'Explain the PyTorch tensor data model (storage, shape, stride, offset). Show why transpose is a view, state how broadcasting resolves shapes, and give the memory cost of training a 1.7B-parameter model with Adam in fp32 versus serving it in fp16.',
          answer:
            'Data model: a tensor is a header over a flat typed storage; element [i,j] is at offset + sum(index[k] * stride[k]). Strides encode layout: contiguous (4,5) has strides (5,1). Transpose only rewrites the header — (5,4) with strides (1,5) over the SAME storage — so it is O(1) and zero-copy; ops requiring contiguity silently materialize a copy (check is_contiguous()). Broadcasting: right-align shapes; each aligned pair must be equal or contain a 1, and the 1 stretches — this is why (8,3,32,32)+(1,3,1,1) is a legal per-channel bias while (8,1,32) fails (3 vs 8). Memory: Adam holds four fp32 tensors per parameter (weights, grads, first moment m, second moment v): 1.7e9 x 4 B = 6.8 GB (6.33 GiB) each, 4 x = 25.3 GiB before activations — the reason mixed precision exists (fp16 compute with fp32 master/optimizer states). Serving in fp16: 1.7e9 x 2 B = 3.17 GiB — half the weights, which is what lets a 4 GiB card host a model that cannot train (or even load) in fp32.',
          source: 'Classic "walk me through the tensor model + size this model" interview question.',
        },
        summary: [
          'Tensor = storage + (shape, stride, offset); transpose/views are zero-copy, contiguity-sensitive kernels may copy.',
          'Broadcast: right-align, equal-or-1 per pair; the stretch is lazy until an op materializes it.',
          'fp32 4B, fp16/bf16 2B, int8 1B, int64 8B — Adam training = 4x fp32 per param before activations.',
          'Devices: pin_memory + non_blocking overlaps H2D DMA with compute; async kernels need sync to benchmark.',
          'Keep loss/reductions fp32, indices int64, weights reduced-precision — dtype policy is deployment policy.',
        ],
      }),
      [
        [
          'A tensor x has shape (4, 5) and strides (5, 1). The strides of y = x.t() are:',
          ['(5, 1) — strides never change', '(1, 5) — a header rewrite over shared storage, no copy', '(4, 5)', '(20, 1)'],
          1,
          'Transpose rewrites (shape, stride) metadata only: shape (5,4), strides (1,5), same storage — y[0,1] and x[1,0] address the same slot.',
        ],
        [
          'Under PyTorch broadcasting, (8, 3, 32, 32) + (8, 1, 32):',
          ['Succeeds with a per-channel bias', 'Fails: after right-alignment the pair (3, 8) has no dimension equal to 1', 'Succeeds by padding the tensor to 8 channels', 'Fails only because of dtype mismatch'],
          1,
          'Right-align: (8,1,32) pads to (1,8,1,32); comparing with (8,3,32,32) yields a 3-vs-8 pair — neither equals nor 1, so it is illegal.',
        ],
        [
          'Training a 1.7B-parameter model with Adam in fp32 needs (weights + grads + m + v), before activations, about:',
          ['6.3 GiB', '12.7 GiB', '25.3 GiB', '50.7 GiB'],
          2,
          'Four fp32 tensors per parameter: 4 x 6.33 GiB = 25.3 GiB — the arithmetic behind "my 6 GB model OOMs at batch 512".',
        ],
        [
          'The main reason DataLoader uses pin_memory=True with non_blocking transfers is that:',
          ['Pinned host memory lets DMA overlap the copy with GPU compute', 'It compresses batches by 2x', 'It forces fp16 conversion on the CPU', 'It prevents broadcasting errors'],
          0,
          'Page-locked memory enables asynchronous DMA: the H2D copy of batch k+1 runs while the GPU computes batch k — pure pipeline overlap, no correctness change.',
        ],
      ]
    ),
    lesson(
      M9,
      'dl-9-2',
      2,
      'Autograd: The Chain Rule as a Recorded Graph',
      'Forward pass builds the graph, backward pass walks it: grad_fn, leaves vs non-learaves, gradient accumulation as the default, no_grad for inference, and higher-order gradients when the graph itself must be differentiable.',
      21,
      nineBlocks({
        objectives: [
          'Trace a scalar loss back through its graph and compute every partial derivative by hand',
          'Use torch.autograd.grad to reproduce hand computations and build second-order derivatives',
          'Diagnose and fix gradient accumulation, double-backward, and non-leaf grad pitfalls',
          'Choose among backward(), autograd.grad(), no_grad(), and detach() for each situation',
        ],
        hook:
          'Two identical models, identical data, identical hyperparameters — one trains, one loss refuses to budge past 2.3. The difference: in a debug session the second team had wrapped training in torch.no_grad() while experimenting (no graph, no gradients, optimizer steps on None), and earlier someone had called backward() twice without zeroing. Autograd has exactly one mechanism — recorded chain rule — and every "gradients are broken" bug is a variation on how that graph was built, walked, or skipped.',
        concept: `**The graph is built on the fly.** Any tensor with requires_grad=True participates: each differentiable op records a node linking outputs to inputs (out.grad_fn) — a DAG built FORWARD during the pass. L.backward() then runs a REVERSE topological sweep from L, pushing each upstream gradient into input .grad buffers (leaves only — non-leaf .grad is None by design to save memory; intermediate grads live inside grad_fn and are freed with the graph). This is reverse-mode automatic differentiation: one backward per loss, all parameter gradients, cost ≈ a small constant multiple of the forward.

**Reverse mode = chain rule bookkeeping.** For L = (xw + b)^2 with x=2, w=3, b=1: forward z = 2x3+1 = 7, L = 49. Backward: dL/dz = 2z = 14; then dL/dw = (dL/dz)(dz/dw) = 14 x 2 = 28; dL/db = 14; dL/dx = 14 x 3 = 42 (check directly: L = (3x+1)^2, dL/dx = 6(3x+1) = 42 at x = 2). Each node needs only its LOCAL derivative; the sweep multiplies them along paths — that is the whole algorithm, and it generalizes to any DAG depth for the price of one backward call. Reusing memory across steps: gradients ACCUMULATE into .grad (w.grad += ...) — the framework default is add, not overwrite, because data-parallel training WANTS summing across micro-batches (and DDP all-reduces those sums). Reset with zero_grad(set_to_none=True) (frees the buffers) or w.grad = None between optimization cycles.

**Graph lifetime.** The graph is freed after backward() unless retain_graph=True (needed for multiple backward passes through the same forward — pays the memory again). In-place ops on tensors the graph saved raise a version-counter error (the saved value changed under it). Detach boundaries: .detach() cuts the tensor from the graph (inference metrics, targets); torch.no_grad() / inference_mode disables recording entirely — the right wrapper for evaluation and serving (no activations stored → less memory, faster). When the gradient itself must stay differentiable (meta-gradients, physics losses, second-order/Hessian-vector products, GAN setups), backward with create_graph=True keeps the backward ops on a new graph: then grad(L, w, create_graph=True) is itself a tensor you can differentiate again — d/dx[2x(xw+b)] = 2(xw+b) + 2xw = 26 at (2,3,1).

**Vector-Jacobian products.** backward() requires a scalar (implicit grad_outputs = 1). For non-scalar outputs y, use torch.autograd.grad(y, inputs, grad_outputs=v) — this computes v^T J (Jacobian-vector product without forming J), which is exactly what backward(y.sum()) or backward((y * v).sum()) computes internally; the full Jacobian needs one VJP per unit vector (or funchord/vmap machinery) — never materialize it naively: J is size |y| x |x|, and everything practical is built on products with it.`,
        extras: [
          table(
            'Autograd API: which call for which job',
            ['Need', 'Call', 'Notes'],
            [
              ['Train: one loss -> parameter grads', 'loss.backward()', 'Accumulates into .grad; zero first'],
              ['Gradient of specific tensors, no side effects', 'torch.autograd.grad(loss, params)', 'Returns grads instead of .grad +='],
              ['Same graph, second backward', 'retain_graph=True', 'Pays activation memory again'],
              ['Differentiable gradient / Hessian-vector', 'grad(..., create_graph=True)', 'Backward ops stay on a graph'],
              ['Eval / inference / no memory for graph', 'torch.no_grad() or inference_mode()', 'No graph, no activations saved'],
              ['Cut one tensor from the graph', 'x.detach()', 'Shares storage, stops gradients'],
            ],
          ),
          code(
            `import torch

x = torch.tensor(2.0)
w = torch.tensor(3.0, requires_grad=True)
b = torch.tensor(1.0, requires_grad=True)

z = x * w + b
L = z ** 2                 # forward records the DAG; L.grad_fn = PowBackward
L.backward()               # reverse sweep: chain rule from L to leaves
print(w.grad, b.grad)      # 28.0 14.0   (x is a leaf without requires_grad)

# gradients ACCUMULATE — the classic silent bug
for _ in range(5):         # (w.grad/b.grad not reset: 28 + 5*28 = 168)
    ((x * w + b) ** 2).backward()
print(w.grad)              # 168.0
w.grad = b.grad = None     # zero_grad(set_to_none=True) does exactly this
for _ in range(5):
    ((x * w + b) ** 2).backward()
print(w.grad)              # 140.0 = 5 x 28

# second-order: d2L/dwdx = 26.0
g = torch.autograd.grad((x * w + b) ** 2, w, create_graph=True)[0]
print(g, torch.autograd.grad(g, x)[0])   # 28.0 26.0

# non-scalar output -> explicit vector-Jacobian product
y = torch.stack([x ** 2, 3 * x])
print(torch.autograd.grad(y, x, grad_outputs=torch.ones(2))[0])   # 7.0 = 2*2 + 3

# inference builds no graph
with torch.no_grad():
    y2 = (x * w + b) ** 2
print(y2.grad_fn)          # None`,
            'autograd_internals.py',
            'python',
          ),
          tip(
            'grad() over backward() when you want values, not side effects',
            'torch.autograd.grad(loss, params) returns the gradients without touching .grad buffers — cleaner for per-step logic (manual optimizers, gradient penalties, PCGrad-style methods) and impossible to forget to zero.',
          ),
          warn(
            'backward() twice without retain_graph raises — but accumulation does not',
            'Re-running backward on a freed graph errors loudly ("Trying to backward through the graph a second time"); gradients silently summing across steps does NOT error. If the loss is stuck at a value that looks like several epochs of average, check for a missing zero_grad before touching the hyperparameters.',
          ),
          info(
            'Leaves vs non-leaves',
            'Only leaf tensors (parameters, inputs with requires_grad) populate .grad; intermediates keep their gradients inside grad_fn to save memory. .grad on a non-leaf is None — this is not a bug, and calling .backward() on a non-leaf target usually means you wanted .detach() or a metric wrapper instead.',
          ),
        ],
        worked: {
          title: 'Hand-check backprop, accumulation, and a second derivative',
          problem:
            'Graph: z = xw + b, L = z^2 with x = 2, w = 3, b = 1 (all scalars). (a) Forward and the three parameter/input partials by hand. (b) Reproduce all three with autograd. (c) Ten backward passes without zeroing give what w.grad? Then with reset, five passes give what? (d) Compute d2L/dwdx both by hand and with create_graph=True. (e) For y = [x^2, 3x] at x = 2, the vector-Jacobian product with v = [1,1] equals what, and why does backward(y) alone refuse to run?',
          steps: [
            {
              title: '(a) Forward and partials',
              desc: 'z = 2x3 + 1 = 7; L = 49. Local derivatives: dL/dz = 2z = 14, dz/dx = w = 3, dz/dw = x = 2, dz/db = 1. Products along paths: dL/dw = 14x2 = 28, dL/db = 14, dL/dx = 14x3 = 42. Direct check: L = (3x+1)^2 so dL/dx = 6(3x+1) = 42 at x = 2. Three numbers to memorize: 28, 14, 42.',
              code_snippet: 'z=7, L=49 ; dL/dw=28, dL/db=14, dL/dx=42',
            },
            {
              title: '(b) Autograd reproduces them',
              desc: 'w and b have requires_grad=True; x does not (it is a constant input here). One L.backward() fills w.grad = 28, b.grad = 14 — same values, any graph depth. x.grad stays None because x never required grad; attach requires_grad to it if you need input gradients (adversarial inputs, saliency maps).',
              code_snippet: 'L.backward() -> w.grad 28.0  b.grad 14.0',
            },
            {
              title: '(c) Accumulation arithmetic',
              desc: '.grad += by default. Ten unzeroed passes after an initial state of 28: 28 + 10x28 = 308. After resetting to None: five passes = 5x28 = 140. This additive behavior is intentional — DDP and gradient accumulation RELY on summing across micro-batches; the optimizer step is the only place sums must be controlled (divide by the accumulation count or LR schedule accordingly).',
              code_snippet: '10 unzeroed: 308  |  reset then 5: 140 = 5 x 28',
            },
            {
              title: '(d) Second derivative',
              desc: 'g = dL/dw = 2(xw+b)x = 2(7)(2) = 28. Differentiate g w.r.t. x: dg/dx = 2(xw+b) + 2xw = 14 + 12 = 26. Autograd: grad(L, w, create_graph=True)[0] gives g as a graph-connected tensor; grad(g, x) = 26. Without create_graph, g would be a constant and the second call would error — create_graph is what makes gradients themselves differentiable.',
              code_snippet: 'g = 28 ; dg/dx = 14 + 12 = 26 (create_graph=True)',
            },
            {
              title: '(e) Vector-Jacobian product',
              desc: 'J = dy/dx = [2x, 3] = [4, 3] at x = 2. v^T J = 1x4 + 1x3 = 7. torch.autograd.grad(y, x, grad_outputs=torch.ones(2)) returns 7 — computed as one VJP, never forming J. Plain y.backward() fails because backward() targets a scalar (it would need grad_outputs or y.sum()); backward(y.sum()) is the same VJP with v = [1,1].',
              code_snippet: 'v^T J = [1,1] . [4,3] = 7 (J never materialized)',
            },
          ],
          solution:
            '(a) z = 7, L = 49; dL/dw = 28, dL/db = 14, dL/dx = 42 (direct check 6(3x+1) = 42). (b) One backward reproduces 28 and 14 in .grad. (c) 308 unzeroed; 140 after reset — accumulation is default and intentional. (d) 26, via d/dx[2x(xw+b)] = 14 + 12; requires create_graph=True. (e) J = [4,3], v^T J = 7 as a single VJP; backward() itself demands a scalar so it needs grad_outputs (or a scalar reduction).',
        },
        practice: {
          title: 'Reimplement a tiny MLP backward by hand',
          prompt:
            'On a 2-layer MLP (ReLU, sigmoid + BCE): (1) write the forward in plain PyTorch tensors with parameters marked requires_grad; (2) derive the full backward pass by hand on paper, then compute the same gradients with autograd and assert equality with torch.allclose for every parameter; (3) demonstrate the accumulation bug: run 5 steps without zero_grad and show weight deltas; (4) compute the gradient penalty term grad_x ||model(x)||^2 at a fixed x (input gradients) using autograd.grad with create_graph as needed; (5) measure memory/time of a forward+backward with and without inference_mode for evaluation.',
          hint: 'For (2) the ordering is: dL/dp = (dL/dy)(dy/dz2)(dz2/dh)(dh/dz1)(dz1/dp). For (4) remember create_graph=True only if you will differentiate the penalty itself (penalty in the loss needs first-order grad of ||model(x)||^2 wrt the LOSS — gradient penalty w.r.t. input is computed under no parameter graph except what the penalty updates).',
        },
        mistakes: [
          {
            mistake: 'Forgetting zero_grad between steps and calling it a learning-rate problem',
            fix: 'Gradients accumulate (+=) by default: after k steps without reset, the optimizer sees the SUM of k gradients — effectively kx LR, wrong direction mixing. Call opt.zero_grad(set_to_none=True) every step (or once per accumulation window in 9.4).',
          },
          {
            mistake: 'Calling backward twice on one graph without retain_graph=True',
            fix: 'The first backward frees intermediate activations. Either retain_graph=True (memory again), recompute the forward, or — better — make the second loss a separate forward that includes the first result only where you truly need shared subgraphs.',
          },
          {
            mistake: 'Leaving training code inside no_grad(), or eval code outside it',
            fix: 'no_grad kills gradients: parameters never update and the loss sits at its initial value. Conversely, running validation with grad enabled wastes memory/time. Pattern: training loop without no_grad; validation with torch.no_grad() (and model.eval()).',
          },
          {
            mistake: 'In-place modifying a tensor the graph saved',
            fix: 'Ops like relu(inplace=True) on graph inputs raise a version-counter error ("one of the variables needed for gradient computation has been modified by an inplace operation") — or worse, silently alias in detach paths. Do in-place work only on leaf buffers (grad, optimizer states) or before the value is saved.',
          },
        ],
        exam: {
          question:
            'Describe how PyTorch autograd computes gradients: what is recorded during the forward pass, how backward() uses it, and what the cost of reverse-mode AD is relative to forward. Then explain gradient accumulation semantics, the role of no_grad()/detach(), and when create_graph=True is required.',
          answer:
            'Forward: every differentiable op on tensors with requires_grad builds nodes of a dynamic DAG — outputs point to inputs through grad_fn closures that know the local derivative (e.g., MulBackward knows the two operands). The graph exists only for this forward, is built lazily, and is discarded after use. Backward: from L, autograd runs a reverse topological sweep, pushing upstream gradients into each node and multiplying by local derivatives (chain rule) until leaf .grad buffers are filled; intermediates are freed as their last consumer passes (unless retain_graph=True). Cost: one backward ≈ small constant multiple of forward — reverse mode returns all parameter gradients in one sweep, which is why training is feasible; the naive alternative (finite differences or full Jacobians) would need one pass per parameter. Accumulation: .grad += across backward calls — default summing, relied on by gradient accumulation and DDP all-reduce; reset with zero_grad(set_to_none=True) per step/window, and divide the loss (or LR) by the accumulation count to keep the update magnitude right. no_grad()/inference_mode() disables recording (eval/serving: no graph, no saved activations); .detach() cuts a single tensor out (targets, metrics). create_graph=True is required when the gradient itself must be differentiated — second-order/Hessian-vector products, gradient penalties computed inside the loss, meta-learning — because otherwise backward results are constants with no history.',
          source: 'Standard advanced-DL written question; also the "why does backward free memory" interview probe.',
        },
        summary: [
          'Forward builds a DAG (grad_fn); one backward runs the reverse sweep — chain rule with local derivatives.',
          'Gradients ACCUMULATE into .grad by design; zero per step (or per accumulation window).',
          'retain_graph for double backward, no_grad/inference_mode for eval, detach to cut a tensor.',
          'create_graph=True makes gradients differentiable: d2L/dwdx = 26 on our toy graph.',
          'Non-scalar outputs use v^T J via grad_outputs — Jacobians are never formed; products are.',
        ],
      }),
      [
        [
          'With z = xw + b and L = z^2 (x=2, w=3, b=1), the gradient dL/dw is:',
          ['14', '28', '42', '49'],
          1,
          'dL/dz = 2z = 14 and dz/dw = x = 2, so dL/dw = 28 — local derivative times upstream gradient.',
        ],
        [
          'After five backward passes with no zero_grad in between, w.grad equals:',
          ['The gradient of the last step', 'The sum of the five gradients', 'The mean of the five gradients', 'Zero'],
          1,
          'Autograd accumulates with +=. Summing across steps/micro-batches is intentional (DDP relies on it) — but the optimizer step must see a controlled window.',
        ],
        [
          'To compute a second derivative such as d2L/dwdx you must:',
          ['Call backward() twice in a row with no arguments', 'Use grad(L, w, create_graph=True) so the gradient stays on a graph, then differentiate it', 'Enable no_grad', 'Detach the output'],
          1,
          'Without create_graph the first gradient is a constant with no history; create_graph=True records the backward ops so grad(g, x) works (= 26 on the toy graph).',
        ],
        [
          'For a non-scalar output y, the correct way to get its gradient contribution is:',
          ['loss.backward() with no arguments', 'torch.autograd.grad(y, x, grad_outputs=v) — a vector-Jacobian product v^T J', 'y.sum().backward() only, always', 'torch.no_grad()'],
          1,
          'backward() targets scalars; grad_outputs computes v^T J in one sweep without materializing the full |y| x |x| Jacobian (y.sum().backward() is the special case v = ones).',
        ],
      ]
    ),
    lesson(
      M9,
      'dl-9-3',
      3,
      'Dataset, DataLoader, and an Annotated Training Loop',
      'The data contract (__len__/__getitem__/collate), batching and shuffle semantics, worker pipelines, and a complete annotated train/eval loop — with the batch arithmetic that turns epochs into optimizer steps.',
      22,
      nineBlocks({
        objectives: [
          'Implement the Dataset contract and explain where collate_fn and samplers intervene',
          'Compute batches, optimizer updates, and scheduler steps from dataset size and accumulation settings',
          'Write a correct train/eval loop with mode switching, metric accumulation, and no_grad validation',
          'Diagnose DataLoader issues: drop_last, workers on Windows, seeding, and variable-length collation',
        ],
        hook:
          'A student reported 96% validation accuracy — on test data the model scored 61%. The leak: validation indices had been included in the training DataLoader because the split happened AFTER batching the full dataset. Frameworks cannot save you from a wrong data path: Dataset decides WHAT an index means, DataLoader decides WHICH indices go in WHICH batch, and only the loop knows which split it is looking at. This lesson is the contract layer where most silent correctness bugs live.',
        concept: `**Dataset = indexable table, DataLoader = iterator policy.** A Dataset implements __len__ (size) and __getitem__(i) -> sample (lazy: decode/transform ONE item on demand — never preload everything). Standard variants: TensorDataset (tuple columns), IterableDataset (streaming — no random access, shuffling moves into the stream), and Subset (wraps indices — the correct way to split). Between them sits collate_fn: it turns a list of samples into batched tensors — default stacks equal shapes; custom collation pads variable-length sequences (pad_sequence + attention mask), tokenizes text on the fly, or converts to fixed-size patches. The DataLoader owns: BATCHING (batch_size), ORDER (shuffle=True draws a permutation via a torch.Generator — seed it for reproducibility), SAMPLING (sampler= / batch_sampler= replace shuffle entirely; DistributedSampler partitions ranks — required for correct DDP), WORKERS (num_workers with prefetching; on Windows the spawn start method means your script needs if __name__ == "__main__": or workers re-import-loop), pin_memory for the GPU DMA path (9.1), and drop_last (partial final batch).

**Batch arithmetic — epochs to updates.** batches_per_epoch = ceil(N / B) with drop_last=False, floor with drop_last=True. N = 60,000, B = 128: 468.75 → 469 batches (last one has 60,000 − 468x128 = 96 samples) or 468 full batches with drop_last=True. micro_steps = batches x epochs; optimizer updates = micro_steps / grad_accum (module 9.4): 469 x 10 = 4,690 micro-steps, accum 4 → 1,172 updates (with 2 micro-batches left in the final window — either flush the partial window or drop it consistently). LR schedulers must step on OPTIMIZER updates, not batches, or warmup/decay schedules silently run 4x fast. Why drop_last matters for training: BN computes batch statistics — a 96-sample tail batch gives noisier mean/variance than 128, so per-batch statistics (and effective noise) vary at every epoch end; for EVALUATION, conversely, keep all samples (drop_last=False) or your metric depends on batching.

**The loop, annotated.** The canonical structure — (1) model.train(): dropout active, BN in update mode; (2) iterate: to(device, non_blocking=True); (3) opt.zero_grad(set_to_none=True); (4) forward → loss; (5) backward; (6) opt.step() (and scheduler.step() per UPDATE); (7) model.eval(): dropout off, BN running stats frozen; (8) torch.no_grad(): accumulate loss x N and correct counts, then DIVIDE at the end — never average batch averages of unequal sizes (a 96-sample tail batch otherwise weighs the same as 128). Metrics: for classification accumulate counts (correct, total); for regression sum squared error and count, take sqrt at the end (RMSE must be computed from totals, not averaged per batch). Seed everything (torch, numpy, python, cuda) and set deterministic flags when reproducing; DataLoader shuffles only if the generator is seeded.

**Common data-path bugs.** Train/eval mix-ups (eval batches trained on, or train batches evaluated with grad on); non-deterministic splits (random_split WITHOUT generator=seed → metrics drift run to run); label leakage via transforms fit on the full dataset (fit scalers/normalizers on TRAIN only); variable-length batches without masks (padding tokens attended as content); shuffle=False on training data (model memorizes order/curriculum effects, BN sees sorted classes); and num_workers too high (each worker holds a dataset copy — RAM multiplies) or too low (GPU starves — watch util).`,
        extras: [
          table(
            'The loop’s mode flags',
            ['Phase', 'model mode', 'Grad context', 'What changes'],
            [
              ['Training', 'model.train()', 'enabled', 'Dropout on, BN updates running stats, grads built'],
              ['Validation', 'model.eval()', 'torch.no_grad()', 'Dropout off (or identity), BN uses running stats, no graph'],
              ['Test / final', 'model.eval()', 'torch.no_grad()', 'Same as validation; used exactly once at the end'],
              ['Inference service', 'model.eval()', 'inference_mode()', 'Maximum memory/speed win, no side effects'],
            ],
          ),
          code(
            `import torch
from torch.utils.data import DataLoader, Subset, random_split
from torchvision import datasets, transforms

# ---- Dataset contract: index -> sample (lazy) ----
class Rows(torch.utils.data.Dataset):
    def __init__(self, xs, ys): self.xs, self.ys = xs, ys
    def __len__(self): return len(self.xs)
    def __getitem__(self, i): return self.xs[i], self.ys[i]

full = datasets.MNIST("./data", train=True, download=True,
                      transform=transforms.ToTensor())
train_ds, val_ds = random_split(full, [55_000, 5_000],
                                generator=torch.Generator().manual_seed(42))

train_dl = DataLoader(train_ds, batch_size=128, shuffle=True, num_workers=4,
                      pin_memory=True, drop_last=True)
val_dl   = DataLoader(val_ds,   batch_size=256, shuffle=False, num_workers=4)

# ---- batch arithmetic: 55,000 / 128 = 429.7 -> 430 batches (or 429 full) ----
print(len(train_dl))                     # 429 with drop_last=True

model, opt = ..., torch.optim.AdamW(...)   # sketch
for epoch in range(10):
    model.train()                                    # dropout/BN in train mode
    for xb, yb in train_dl:
        xb = xb.to("cuda", non_blocking=True)
        yb = yb.to("cuda", non_blocking=True)
        opt.zero_grad(set_to_none=True)
        loss = torch.nn.functional.cross_entropy(model(xb), yb)
        loss.backward()
        opt.step()

    model.eval()                                     # freeze dropout/BN behavior
    correct = total = 0
    with torch.no_grad():                            # no graph for metrics
        for xb, yb in val_dl:
            xb = xb.to("cuda", non_blocking=True)
            pred = model(xb).argmax(dim=-1)
            correct += (pred == yb.to("cuda")).sum().item()
            total += yb.numel()
    print(f"epoch {epoch}: val acc {correct / total:.4f}")`,
            'training_loop.py',
            'python',
          ),
          tip(
            'Step the scheduler on optimizer updates',
            'scheduler.step() belongs right after opt.step(), once per accumulation window — not per batch. Stepping per micro-batch with grad_accum = 4 decays the LR four times faster than your schedule says, and the run quietly stops matching the paper you are reproducing.',
          ),
          warn(
            'Do not average batch averages',
            'val_loss = mean(batch losses) is wrong when the last batch is smaller: each batch gets equal vote regardless of sample count. Accumulate loss x batch_size and count, then divide — same for accuracy, RMSE, F1. Otherwise your metric depends on the chosen batch size.',
          ),
          info(
            'Windows + num_workers',
            'PyTorch on Windows uses the spawn start method: workers re-import your module. Without if __name__ == "__main__": around the driver code you get recursive worker spawning or hangs. Also cap num_workers (~4-8): each worker holds dataset state, and too many thrash the CPU while the GPU waits.',
          ),
        ],
        worked: {
          title: 'Turn a dataset into optimizer steps — and audit the split',
          problem:
            'MNIST train = 60,000 samples. (a) With batch_size 128: batches per epoch with drop_last False and True; the tail batch size. (b) 10 epochs with grad accumulation 4: total micro-steps, optimizer updates, leftover micro-batches. (c) The model trains with shuffle=False on sorted-by-class data — name two concrete harms. (d) random_split without a seeded generator: what breaks and why? (e) A validation loop averages per-batch accuracy where the tail batch has 16 samples vs 128 — construct a case where the reported number differs from true accuracy and give the fix.',
          steps: [
            {
              title: '(a) Batches and the tail',
              desc: 'ceil(60,000 / 128) = ceil(468.75) = 469 batches with drop_last=False; the tail batch holds 60,000 - 468 x 128 = 60,000 - 59,904 = 96 samples. With drop_last=True: floor = 468 full batches, 96 samples never trained on per epoch (a different random 96 each epoch thanks to shuffle — acceptable for train, NOT for eval coverage).',
              code_snippet: '469 batches (tail 96)  |  468 x 128 = 59,904 trained',
            },
            {
              title: '(b) Micro-steps to updates',
              desc: 'micro-steps = 469 x 10 = 4,690. Updates = floor(4,690 / 4) = 1,172, with 4,690 mod 4 = 2 micro-batches left in the final window — flush them as a partial window (scale loss by 2/4? NO — scale by the actual count in-window) or drop them consistently; decide once and document. LR schedule and warmup must span 1,172 steps, not 4,690.',
              code_snippet: '4,690 micro -> 1,172 updates (+2 leftover micro)',
            },
            {
              title: '(c) No shuffle on sorted data',
              desc: 'Two harms: (1) every batch is a single class or a narrow class run → batch gradients are extremely noisy in DIRECTION and correlated across steps (gradient noise looks like momentum-less zigzag, and early layers specialize to "the current class"); (2) evaluation-free but relevant: with BN, batch statistics come from one class → running statistics drift toward the class sequence order. Shuffle converts per-step gradients into honest mini-batch estimates — it is not decoration.',
              code_snippet: 'sorted batches -> class-correlated gradients + skewed BN stats',
            },
            {
              title: '(d) Unseeded split',
              desc: 'random_split uses a global RNG by default: two runs get DIFFERENT train/val partitions, so the metric you compare against last week is measured on different data — improvements and regressions become indistinguishable from split noise. Fix: pass generator=torch.Generator().manual_seed(42), and persist the resulting indices (Subset.indices) alongside the checkpoint.',
              code_snippet: 'random_split(..., generator=Generator().manual_seed(42))',
            },
            {
              title: '(e) Averaging unequal batches',
              desc: 'Suppose batches 1..4 (128 each) are 95% correct and the tail (16 samples) is 25% correct. True accuracy counts samples: (4x128x0.95 + 16x0.25) / (4x128 + 16) = (486.4 + 4) / 528 = 490.4/528 = 92.88%. Naive batch-mean gives each batch an equal vote: (4x0.95 + 0.25) / 5 = 4.05/5 = 81.0%. The tail batch holds only 3.0% of the samples but receives 20% of the vote; because its accuracy is low, the mean is dragged 11.9 points below the truth (had the tail been the HIGH-accuracy batch, the mean would instead overshoot). Fix: accumulate correct and total, divide once.',
              code_snippet: 'true 92.88%  vs  naive batch-mean 81.0%  (tail: 3% of data, 20% of vote)',
            },
          ],
          solution:
            '(a) 469 batches with tail 96; 468 full with drop_last=True. (b) 4,690 micro-steps → 1,172 updates, 2 leftover micro-batches — schedule LR on 1,172. (c) Class-correlated gradients and skewed BN running statistics. (d) Different partitions per run — comparisons become meaningless; seed the generator and persist indices. (e) Naive mean gives the 16-sample batch a 20% vote instead of 3% (81.0% vs true 92.88%) — accumulate counts, divide once.',
        },
        practice: {
          title: 'Build a dataloader you can defend in review',
          prompt:
            'On a dataset with variable-length sequences (text or audio): (1) implement Dataset + custom collate_fn that pads and returns an attention mask — show a batch and prove padding never enters the loss (mask it out); (2) compute exact batches/epoch and optimizer updates for your N, batch size, accumulation, epochs; (3) write train/eval loops with mode switching and count-based metrics; (4) seed and PERSIST the split; show two runs reproduce identical first-epoch losses; (5) profile loading: sweep num_workers 0/2/4/8, plot step time and GPU util — identify the starvation point; (6) inject a bug (train the val split) and show the inflated metric, then fix it.',
          hint: 'Cross-entropy with ignore_index=pad_id (or a masked reduction) is the cleanest loss-side fix. For (5), GPU util below ~95% with workers=0 usually means the pipeline, not the model, is your bottleneck.',
        },
        mistakes: [
          {
            mistake: 'Evaluating with model.train() (or training with model.eval())',
            fix: 'train() enables dropout and BN batch-statistics updates — eval scores become noisy and the running stats drift on validation data. Explicitly call model.train() before the training loop and model.eval() before validation, every epoch.',
          },
          {
            mistake: 'Keeping gradients on during validation',
            fix: 'torch.no_grad() around eval: without it you store activations for a backward that never comes — 2-4x memory and large slowdown, sometimes an OOM that "only happens in validation". Pair it with model.eval().',
          },
          {
            mistake: 'Averaging metrics across unequal batches',
            fix: 'The tail batch (or a variable batch_size) gets a wrong vote: accumulate numerator and denominator (correct/total, sum squared error/count) and reduce ONCE at the end — metrics then depend on data, not on batching.',
          },
          {
            mistake: 'Fitting preprocessing on the full dataset',
            fix: 'Normalizers, vocabularies, or PCA fit on train+val leak validation information into training — inflated scores that collapse on test. Fit transforms on TRAIN only (or inside the training loop for online stats), then apply frozen to val/test.',
          },
        ],
        exam: {
          question:
            'Describe the roles of Dataset, DataLoader, sampler, and collate_fn. Then write the canonical training loop step-by-step (including mode flags and gradient hygiene), explain the arithmetic from dataset size to optimizer updates, and state when drop_last should be True versus False.',
          answer:
            'Dataset = lazy indexable table: __len__ gives size, __getitem__(i) returns one raw sample (decode/transform per item — Subset wraps indices for splits; IterableDataset streams without random access). Sampler decides the index ORDER (shuffle permutation, DistributedSampler for DDP, WeightedSampler for imbalance); DataLoader batches indices, applies collate_fn to stack samples into tensors (custom collation pads sequences + builds masks), manages workers/prefetch, pin_memory, and drop_last. Loop: model.train(); for each batch: move to device (non_blocking with pinned memory), opt.zero_grad(set_to_none=True), forward, loss, loss.backward(), opt.step(), scheduler.step() once per optimizer update; then model.eval() + torch.no_grad() validation accumulating count-based metrics, reduced once at the end. Arithmetic: batches = ceil(N/B) (drop_last=False) or floor (True); micro-steps = batches x epochs; updates = micro-steps / accumulation — LR warmup/decay and schedules must count updates, and the leftover partial window is flushed or dropped by explicit choice. drop_last=True for training (full stable batches, BN sees consistent batch sizes, DDP ranks stay aligned — required so every rank runs the same number of steps); drop_last=False for evaluation (every sample scored exactly once).',
          source: 'The "explain your training loop" question asked at every ML engineering interview.',
        },
        summary: [
          'Dataset = __len__/__getitem__ (lazy); DataLoader = batching, shuffle/sampler, workers, pin_memory, drop_last.',
          'collate_fn stacks or pads samples — variable length needs masks or ignore_index in the loss.',
          'batches = ceil/floor(N/B); updates = batches x epochs / accumulation — schedule LR on updates.',
          'Loop hygiene: train()/eval() modes, zero_grad(set_to_none=True), no_grad for val, count-based metrics.',
          'Seed the split and persist indices; fit preprocessing on train only; never average batch averages.',
        ],
      }),
      [
        [
          'A custom collate_fn is primarily needed when:',
          ['The dataset is too large to fit in RAM', 'Samples have variable shapes (e.g., sequences of different lengths) that must be padded/masked into a batch', 'You want to shuffle faster', 'Training on multiple GPUs'],
          1,
          'The default collator stacks equal shapes; variable-length samples need padding plus an attention mask (or ignore_index) so padding never enters the loss.',
        ],
        [
          'With 60,000 samples, batch_size 128, drop_last=True, one epoch has:',
          ['469 batches', '468 batches', '470 batches', '60,000 batches'],
          1,
          'floor(60,000/128) = 468 full batches (59,904 samples); the 96-sample tail is skipped — correct for training, wrong for evaluation coverage.',
        ],
        [
          'During validation you should call:',
          ['model.train() with gradients enabled', 'model.eval() inside torch.no_grad()', 'model.train() inside no_grad()', 'Nothing special'],
          1,
          'eval() freezes dropout/BN behavior; no_grad() stops storing activations for a backward that never comes — same scores, fraction of the cost.',
        ],
        [
          'The correct way to report validation accuracy when the last batch is smaller is to:',
          ['Average the per-batch accuracies', 'Accumulate correct and total counts, then divide once', 'Drop the last batch', 'Use batch_size = 1'],
          1,
          'Batch means give the small tail batch an outsized vote; totals-based reduction makes the metric independent of batching.',
        ],
      ]
    ),
    lesson(
      M9,
      'dl-9-4',
      4,
      'Mixed Precision, Accumulation, Clipping, Checkpoints, and Debugging',
      'AMP loss scaling with its inf/nan skip logic, gradient accumulation that emulates big batches, norm clipping arithmetic, what a resumable checkpoint must contain, and the checklist for NaN losses and stalled training.',
      23,
      nineBlocks({
        objectives: [
          'Explain why fp16 needs a GradScaler while bf16 does not, and trace a scale/skip cycle',
          'Emulate a target effective batch with accumulation and compute all memory/step arithmetic',
          'Apply gradient clipping by norm with hand-computed scale factors',
          'Build a checkpoint that actually resumes, and run the loss-debugging checklist end to end',
        ],
        hook:
          'The run was beautiful for 43,000 steps, then the loss went NaN at step 43,001 — exactly where a cosine warm restart bumped the learning rate. Three hours of compute, one line of logs missing (the grad-norm trace they had "temporarily" disabled). Everything in this lesson exists because training at scale means state: fp16 needs scaling state, accumulation needs window state, restarts need checkpoint state, and debugging needs metrics you recorded BEFORE the crash.',
        concept: `**AMP: two precisions, one step.** autocast runs matmuls/convolutions in fp16/bf16 and keeps reductions, losses, and master weights in fp32 — throughput and memory win, numerics mostly preserved. Why fp16 still fails: its representable range bottoms out (normals from 6.1e-5; subnormals to ~6e-8) while gradients routinely live near 1e-7 — they flush to zero and the update silently dies, or overflow to inf. Fix: LOSS SCALING. Multiply the loss by S (say 2^13 = 8192) BEFORE backward — every gradient is multiplied by S too, pushing small values into fp16's safe zone; after backward, UNSCALE (divide by S) and check: if any grad is inf/nan, SKIP the optimizer step (weights unchanged — better a skipped step than corrupted weights) and HALVE S; if k (default 2000) consecutive steps are clean, DOUBLE S. The scaler therefore auto-tunes scale to the gradient distribution: high scale = fewer skips = faster progress, with an implicit trade against overflow risk. bf16 has fp32's exponent range → NO scaler, no skips; its cost is 8 mantissa bits (vs fp32's 23) — usually fine for training. Also on Ampere: TF32 by default for matmuls (10-bit mantissa) — be aware when "fp32" numbers do not reproduce bit-exactly.

**Accumulation: big batches without big memory.** Activations scale with PER-STEP batch; optimizer quality scales with EFFECTIVE batch. Accumulate K micro-steps, dividing loss by K (so the summed gradient equals the average over the whole window), then step once: effective batch = micro_batch x K x world_size. Target 128 on 4 GPUs with 8/GPU: K = 128 / (8 x 4) = 4. What is preserved: expected gradient (mean over the window). What is NOT preserved: gradient NOISE — K averaged micro-batches have lower variance than one true 128 batch (noise variance shrinks ~1/K), and BN sees only micro-batches, so small micro-batches distort batch statistics. For heavy noise dependence (BN-heavy CNNs), prefer true batches/syncBN; for Transformers/LayerNorm, accumulation is nearly free equivalence. Hygiene: zero_grad exactly at window boundaries, and remember update count = micro/K for schedulers.

**Clipping and checkpoints.** clip_grad_norm_ computes g = sqrt(sum of all squared gradient elements across all params) and rescales by max(1, max_norm/(g+eps)) — if g <= max_norm NOTHING changes (unlike value clipping which always shrinks). Hand example: two grads 0.6 and 0.8 → g = 1.0; at max_norm 1.0 unchanged; g = 5.0 → factor 0.2 → (0.12, 0.16), norm exactly 1.0. Typical max_norm 0.5-1.0 for transformers; it clips exploded directions while preserving the update SIZE cap. Checkpoint contents for TRUE resumability: model, optimizer, scheduler, scaler, epoch, global_step, best metric, RNG states (torch, cuda, numpy, python) — without RNG state the resumed run re-shuffles differently and trajectories diverge (fine for fine-tuning, fatal for reproduction); plus data-split indices if generated on the fly. Save atomically (write tmp, rename) — a crash mid-save must not eat your only checkpoint.

**The debugging playbook.** NaN/inf loss: (1) log grad-norm every step — the step BEFORE the NaN tells you overflow (fp16 scale too high → scaler should skip; if bf16/TF32, suspect LR too high, bad labels/log(0), or corrupted data); (2) cut LR 10x and retry from the last clean checkpoint; (3) check loss inputs (logits of -inf from masked positions, division by zero, mixed dtypes). Loss stuck (e.g., ~ln C for classification = predicting near-uniform): overfit a TINY batch first (10 batches → near-zero loss; if it will not overfit, the bug is in the MODEL/OPTIMIZER/loss wiring, not the data); then check LR range (linear-scale rule intuition: batch 256 wants larger LR), frozen layers (requires_grad=False forgotten), and accidental eval mode / wrong loss reduction. Slow loss: print per-batch loss — a healthy run jitters downward; monotone smooth lines usually mean leakage or a metric already averaged (or the print shows a smoothed value hiding divergence). ALWAYS keep: grad-norm trace, LR trace, scale trace, and val curves — debugging starts from the chart of the step where things went wrong, so capture it BEFORE you need it.`,
        extras: [
          code(
            `import torch
from torch.cuda.amp import GradScaler, autocast   # or torch.amp.autocast("cuda")

ACCUM, MAX_NORM = 4, 1.0
scaler = GradScaler()                       # fp16 only; bf16 trains without it
step = 0
for epoch in range(EPOCHS):
    for xb, yb in train_dl:
        xb, yb = xb.to("cuda", non_blocking=True), yb.to("cuda", non_blocking=True)
        with autocast(dtype=torch.float16):        # matmuls in fp16, loss in fp32
            loss = criterion(model(xb), yb) / ACCUM
        scaler.scale(loss).backward()              # x S before backward

        if step % ACCUM == ACCUM - 1:              # window boundary
            scaler.unscale_(opt)                   # grads back to fp32...
            gnorm = torch.nn.utils.clip_grad_norm_(model.parameters(), MAX_NORM)
            scaler.step(opt)                        # skips + halves S on inf/nan
            scaler.update()                         # doubles S after 2000 clean steps
            opt.zero_grad(set_to_none=True)
            log(step, gnorm, scaler.get_scale(), opt.param_groups[0]["lr"])
        step += 1

# ---- resumable checkpoint ----
state = dict(model=model.state_dict(), opt=opt.state_dict(),
             sched=sched.state_dict(), scaler=scaler.state_dict(),
             epoch=epoch, step=step, best=best_acc,
             torch_rng=torch.get_rng_state(),
             cuda_rng=torch.cuda.get_rng_state_all())
tmp = "ckpt.tmp"; torch.save(state, tmp); os.replace(tmp, "ckpt.pt")  # atomic`,
            'amp_checkpoint.py',
            'python',
          ),
          table(
            'Symptom -> diagnosis -> fix',
            ['Symptom', 'Likely cause', 'First fix'],
            [
              ['Loss = NaN suddenly', 'LR spike, fp16 overflow, bad label/log(0)', 'Grad-norm trace at NaN step; LR -10x; resume from last clean ckpt'],
              ['Loss flat at ln(C)', 'Underfitting / LR too low / frozen layers', 'Overfit 10 batches; check requires_grad and param-group LRs'],
              ['Val good, test bad', 'Split leakage or preprocessing fit on all data', 'Rebuild split seeded; refit transforms on train only'],
              ['Loss noisy, no trend', 'LR too high (near divergence)', 'LR range test; lower 3-10x; check grad norms shrinking'],
              ['Training slow, GPU < 60%', 'DataLoader starvation', 'pin_memory + more workers; prefetch profiling'],
            ],
          ),
          tip(
            'Keep the three traces on every run',
            'grad-norm, LR, and GradScaler scale — log them per step from step 0. A NaN at 43k steps is diagnosable in seconds with these and impossible without them. They cost one scalar write per step.',
          ),
          warn(
            'Forgetting loss / K in accumulation',
            'Summing K micro-gradients without dividing by K multiplies the effective LR by K — training that "worked at batch 8" blows up at accumulation 4. Divide the loss by K (under autocast, before backward), and zero_grad ONLY at window boundaries.',
          ),
        ],
        worked: {
          title: 'Trace a GradScaler cycle, an accumulation window, and a clip',
          problem:
            'fp16 run, GradScaler scale S = 8192, batch 8, accumulation 4, world size 4, loss 0.004. (a) Scaled loss fed to backward. (b) Backward produces inf in some gradient: what the scaler does this step (step taken? new S?). (c) 2,000 clean steps later: new S. Gradient magnitudes near 1e-7 — show why S = 8192 rescues them from fp16 subnormal territory. (d) Effective batch and optimizer updates after 4,690 micro-steps with this window. (e) Clipping: gradients [0.6, 0.8] (norm 1.0) and [3.0, 4.0] (norm 5.0) at max_norm 1.0 — resulting gradients for each.',
          steps: [
            {
              title: '(a) Scaled loss',
              desc: 'The scaler multiplies the loss by S before backward: 0.004 x 8192 = 32.768. Every gradient flowing back is scaled by the same 8192 — a true 1e-7 gradient becomes 8.19e-4, comfortably representable in fp16 (normals start at 6.1e-5), instead of flushing toward zero.',
              code_snippet: '0.004 x 8192 = 32.768 ; 1e-7 grad -> 8.19e-4',
            },
            {
              title: '(b) Overflow step',
              desc: 'scaler.unscale_ puts grads back to fp32 for inspection; inf/nan detected -> optimizer.step() is SKIPPED (weights identical) and S <- S/2 = 4096, re-attempting the same window next step. Skipping is deliberate: one lost step beats one corrupted weight matrix. If skips persist, S halves repeatedly until steps land.',
              code_snippet: 'skip step ; S: 8192 -> 4096',
            },
            {
              title: '(c) Growth and fp16 range',
              desc: 'After 2000 consecutive clean steps (growth_interval), S doubles: 4096 -> 8192 (and higher while clean). Range check: fp16 normals span 6.1e-5..65,504, subnormals to ~6e-8 — raw 1e-7 gradients sit in the fragile subnormal band where precision collapses (step granularity ~1e-9 at that scale, and flush-to-zero on some hardware kills them outright). Scaled by 8192 they are 8.19e-4 — normal numbers with healthy relative precision.',
              code_snippet: '2000 clean -> S x2 ; 1e-7 (subnormal) -> 8.19e-4 (normal)',
            },
            {
              title: '(d) Effective batch and updates',
              desc: 'effective = micro_batch x K x world = 8 x 4 x 4 = 128. Micro-steps 4,690 -> updates floor(4690/4) = 1,172 (+2 leftover micro-batches: flush as a 2-step window or drop — never let the scheduler count micro-steps). Equivalent batch size to a true 128 — with lower gradient noise variance (averaging K windows shrinks noise ~1/K), which is the main statistical difference from real 128.',
              code_snippet: '8 x 4 x 4 = 128 ; 4,690 micro -> 1,172 updates',
            },
            {
              title: '(e) Clip by norm',
              desc: 'g = sqrt(0.6^2 + 0.8^2) = sqrt(1.0) = 1.0 <= max_norm 1.0: clip_coef = 1.0/(1.0+eps) capped at 1.0 -> UNCHANGED (clip only shrinks, never grows). g = sqrt(9+16) = 5.0: clip_coef = 1/5 = 0.2 -> [3.0, 4.0] x 0.2 = [0.12, 0.16], new norm exactly 1.0. Direction preserved, magnitude capped — that is the whole operation, applied across ALL parameters jointly.',
              code_snippet: 'norm 1.0 -> no change ; norm 5.0 -> x0.2 = [0.12, 0.16]',
            },
          ],
          solution:
            '(a) 32.768. (b) Skip the optimizer step, S -> 4096. (c) After 2,000 clean steps S doubles; 1e-7 lives in fp16 subnormal territory (fragile/flushed), 8.19e-4 is an ordinary normal. (d) Effective batch 128 (8x4x4); 1,172 updates from 4,690 micro-steps. (e) [0.6, 0.8] unchanged (norm already 1.0); [3.0, 4.0] becomes [0.12, 0.16] (factor 0.2, norm 1.0).',
        },
        practice: {
          title: 'Run one instrumented, resumable training job',
          prompt:
            'Take a mid-size model (ResNet-18 class or a small Transformer) and: (1) train with AMP: log scale and skip counts — show a run with skips converging to stable scale vs bf16 (no scaler) on the same hardware if available; (2) emulate an effective batch of 256 three ways (single 256, 4x accumulation of 64, 8x accumulation of 32) — compare curves; justify any differences via BN micro-batch statistics; (3) sweep max_norm in {none, 0.5, 1.0, 5.0} and plot grad-norm traces — find where instability appears; (4) checkpoint every epoch atomically (tmp + os.replace), kill the run mid-epoch, resume, and PROVE the resumed loss matches an uninterrupted run (seed everything, restore RNG states); (5) run the debugging checklist on a run you sabotage (LR 100x, frozen encoder, label permutation) and document what each symptom looked like.',
          hint: 'For (4) the tell is the first 10 resumed losses matching the uninterrupted run to ~1e-6. For (5), label permutation gives val acc ~ chance with a confident model — leakage vs broken labels differ in train acc.',
        },
        mistakes: [
          {
            mistake: 'Using fp16 autocast without a GradScaler',
            fix: 'Small gradients (order 1e-7) fall into fp16 subnormal/flush-to-zero territory and updates silently die. Use GradScaler for fp16 (scale-before-backward, unscale-check-skip logic); switch to bf16 if your hardware supports it and you want to delete the scaler entirely.',
          },
          {
            mistake: 'Stepping the optimizer inside the accumulation window, or not dividing loss by K',
            fix: 'Stepping every micro-batch defeats accumulation (K updates instead of 1); not dividing by K multiplies effective LR by K. Both show up as "training diverged when I changed accumulation" — step and zero_grad only at window boundaries, loss /= K.',
          },
          {
            mistake: 'Checkpointing only model weights',
            fix: 'Without optimizer/scheduler/scaler/RNG state, "resumed" runs take different steps than the originals: Adam moments reset (early steps large again), LR schedule restarts, shuffling differs. Save the full training state (and split indices) or accept that the run is a fresh one, not a resume.',
          },
          {
            mistake: 'Chasing NaN with hyperparameters before reading grad-norm',
            fix: 'The first inf/nan in the trace — and the scale/skip counter around it — discriminates fp16 overflow (scaler territory), LR explosion (all dtypes), and bad data (starts exactly at a corrupt batch). Guessing LR first wastes hours; the trace names the cause in one chart.',
          },
        ],
        exam: {
          question:
            'Explain mixed-precision training end to end: what autocast changes, why fp16 requires loss scaling and how the scaler behaves on inf gradients and on clean streaks, why bf16 does not need it. Then define gradient accumulation (formula, effective batch, scheduler interaction), describe gradient clipping by norm with an example, and list what a resumable checkpoint must store.',
          answer:
            'autocast runs compute-heavy ops (matmul, conv) in fp16/bf16 while keeping losses, reductions, and master weights in fp32 — memory/throughput win with mostly preserved numerics. fp16 needs scaling because its representable range (normals 6.1e-5..65504, subnormals to ~6e-8) cannot stably hold gradients near 1e-7: multiply the loss by S before backward (gradients scale by S), unscale before stepping, and check for inf/nan — if found, SKIP the update and halve S; after 2000 consecutive clean steps double S. S auto-tunes to the gradient distribution; skipping trades one step for weight integrity. bf16 shares fp32’s exponent range (8 bits) so no scaler and no skips, at the cost of only 8 mantissa bits. Accumulation: divide loss by K, backward K micro-steps, step and zero_grad once — effective batch = micro_batch x K x world_size (e.g., 8x4x4 = 128); schedulers must count OPTIMIZER updates (micro/K), not micro-steps; gradient noise variance shrinks ~1/K and BN still sees micro-batches (the main non-equivalence, relevant for BN-heavy CNNs). Clipping by norm: g = sqrt(sum of squared grads across all params); rescale by max(1, max_norm/(g+eps)) — example: norm 5.0, max 1.0 → factor 0.2, direction unchanged, new norm 1.0; norm ≤ max_norm → untouched. Checkpoint: model, optimizer, scheduler, scaler, epoch, global_step, best metric, RNG states (torch/cuda/numpy/python) and persisted split indices — written atomically — so the resumed run continues the same trajectory instead of a different one.',
          source: 'The systems question of modern training — asked wherever large runs must be defended or reproduced.',
        },
        summary: [
          'autocast: fp16/bf16 compute, fp32 loss/master weights; fp16 needs GradScaler (scale, unscale, skip+halve, double after 2000 clean).',
          'bf16 = fp32 range without a scaler; TF32 on Ampere can silently change "fp32" matmul results.',
          'Accumulation: loss/K, step every K, effective batch = micro x K x world; schedule on updates.',
          'clip_grad_norm_: g = sqrt(sum squares); shrink only when g > max_norm — direction kept, magnitude capped.',
          'Checkpoint: weights + optimizer + scheduler + scaler + counters + RNG (atomic write); keep grad-norm/LR/scale traces from step 0.',
        ],
      }),
      [
        [
          'A GradScaler reacts to an inf gradient by:',
          ['Skipping the optimizer step and halving the scale', 'Doubling the scale', 'Crashing the run', 'Clipping the inf to 1.0'],
          0,
          'Unscale -> detect inf/nan -> skip the update (weights untouched) and S <- S/2; clean streaks of 2000 steps grow S again.',
        ],
        [
          'With micro-batch 8, accumulation 4, and 4 GPUs, the effective batch is:',
          ['8', '32', '64', '128'],
          3,
          '8 x 4 x 4 = 128 — memory scales with 8, optimizer statistics with 128 (noise variance still shrinks ~1/K vs a true 128 batch).',
        ],
        [
          'Gradients [3.0, 4.0] with clip_grad_norm_ at max_norm = 1.0 become:',
          ['[0.6, 0.8]', '[0.3, 0.4]', '[0.12, 0.16]', '[1.5, 2.0]'],
          2,
          'Norm = 5.0, factor = 1/5 = 0.2: [0.12, 0.16] with norm exactly 1.0 — direction preserved, magnitude capped.',
        ],
        [
          'To resume training so the run continues the same trajectory, you must restore:',
          ['Only model weights', 'Model, optimizer, scheduler, scaler, counters, and RNG states', 'Only the learning rate', 'Nothing — checkpoints resume automatically'],
          1,
          'Adam moments, schedule position, fp16 scale, and RNG (shuffling/dropout) all shape future steps; missing any of them makes the "resume" a different run.',
        ],
      ]
    ),
  ],
};
