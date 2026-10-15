// Module 4 — File Systems & I/O
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — File Systems & I/O',
  summary:
    'Inodes, directory structure, allocation methods, disk scheduling (FCFS/SSTF/SCAN/C-SCAN) and RAID basics.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'os-4-1',
      1,
      'Files, Inodes & Disk Allocation',
      'File attributes, inodes vs directory entries, contiguous/indexed allocation and free-space management.',
      12,
      nineBlocks({
        objectives: [
          'Describe file attributes and the role of the inode/directory split',
          'Compare contiguous, linked and indexed allocation (fragmentation + speed)',
          'Explain free-space bitmaps and linked free lists at a high level',
        ],
        hook: 'Unix asked "why can I delete a file that is still open by another process?" The answer is the inode vs name split. Exams love this; production debugging loves it more.',
        concept: `**File attributes:** name, identifier, type, location, size, protection, time/creator. The name is user-facing; the identity is internal.

**Directory:** mapping names → file control blocks / inodes. Operations: create, delete, search, list, rename, traverse. Directory itself is a file of entries.

**Inode model (Unix):** inode holds metadata + block pointers; directory entries map names → inode numbers. Unlink removes the name; data lives until last hard-link and open fds drop (nlink / refcount). Explains open-file-deleted semantics.

**Allocation methods:**
1. **Contiguous:** start block + length. Fast random access; external fragmentation; file growth hard.
2. **Linked:** each block points to next. No external frag; poor random access; pointer overhead; reliability of links.
3. **FAT:** links collected in a table on disk — compromise.
4. **Indexed:** inode holds array of block pointers (plus indirect for large files). Good random access; index block is a single point of failure/size limit.

**Free-space tracking:**
- Bit map / bitmap: one bit per block; find n contiguous bits = allocation search cost
- Linked list of free blocks; group/count methods
- Coalescing free extents reduces external fragmentation for contiguous allocators

**Cluster / extent:** allocate groups of blocks to cut metadata and improve sequential throughput.`,
        extras: [
          table('Allocation', ['Random access', 'External frag'], [
            ['Contiguous', 'Excellent', 'Yes'],
            ['Linked', 'Poor (sequential walk)', 'No'],
            ['Indexed', 'Good (via index)', 'No'],
          ]),
          tip(
            'Inode ≠ directory entry',
            'Hard links = multiple names, one inode; soft link = another name file pointing at a path.',
          ),
          warn(
            'Growth cost of contiguous files',
            'Appending may need a new region and a copy if the next blocks are taken.',
          ),
        ],
        worked: {
          title: 'Hard link vs unlink while open',
          problem: 'Process A opens /data/report.txt; process B runs rm; A keeps reading.',
          steps: [
            { title: 'open()', desc: 'Increments file refcount; path resolves via directory → inode.' },
            { title: 'rm', desc: 'Removes directory entry (name); nlink drops; refcount still > 0 because of A.' },
            { title: 'Inode stays', desc: 'Inode + data blocks remain until last close.' },
            { title: 'Read continues', desc: 'A continues to read correctly; new opens by name fail (ENOENT).' },
            { title: 'Last close', desc: 'OS frees data and inode.' },
          ],
          solution: 'Unix open-file deletion semantics via name vs object split.',
        },
        practice: {
          title: 'Inode pointer math',
          prompt: 'An inode has 12 direct pointers, one single-indirect and one double-indirect (block size 4KB, 4-byte pointers). Max file size?',
          hint: 'Direct + (blocks per indirect) + (blocks per double).',
        },
        mistakes: [
          {
            mistake: 'Saying linked allocation supports fast seek to block k',
            fix: 'You must walk k pointers — O(k).',
          },
          {
            mistake: 'Confusing hard and soft links',
            fix: 'Hard link shares the inode; soft link is a path shortcut and breaks if target path changes.',
          },
        ],
        exam: {
          question: 'Why does deleting an open file not crash the reader on Unix?',
          answer: 'Directory entry is removed but the inode stays until nlink and open refcounts hit zero.',
          source: 'File-system concept question.',
        },
        summary: [
          'Name and object are separate (inode model).',
          'Contiguous = fast + fragile; linked/indexed trade speed for flexibility.',
          'Bitmaps and free lists manage free space.',
        ],
      }),
      [
        [
          'An inode stores primarily:',
          ['The file name only', 'Metadata and block pointers', 'User passwords', 'Only the size'],
          1,
          'FCB / index block.',
        ],
        [
          'Contiguous allocation suffers most from:',
          ['Internal only', 'External fragmentation', 'Pointer overhead', 'Too much metadata per block'],
          1,
          'Holes between files.',
        ],
        [
          'Hard link deletion of the last name:',
          ['Frees data immediately even if open', 'Frees when last ref closes', 'Never frees', 'Corrupts the inode table'],
          1,
          'nlink/refcount driven.',
        ],
      ]
    ),
    lesson(
      M4,
      'os-4-2',
      2,
      'Disk Scheduling & RAID',
      'FCFS, SSTF, SCAN/C-SCAN/LOOK, elevator cost, and RAID 0/1/5 trade-offs for exams and interviews.',
      12,
      nineBlocks({
        objectives: [
          'Compute total head movement for FCFS, SSTF, SCAN and C-SCAN given a queue',
          'Explain why SSTF can starve edge requests',
          'Map RAID levels 0, 1, 5 to redundancy, capacity and write cost',
        ],
        hook: 'Disk exams are arithmetic with a story: the head is an elevator. Cloud interviews then jump to RAID: "how many disks can fail in RAID 5?" If you can do both, you cover the storage unit completely.',
        concept: `**Disk geometry (logical view for exams):** cylinder/track/block numbers; queue of requests; head starts at some cylinder; goal = minimize total seek distance (and sometimes total time).

**Schedulers:**
- **FCFS:** fair; long detours possible.
- **SSTF:** nearest request next; good average; can starve far requests.
- **SCAN (elevator):** head sweeps to end, reverse; services along the way.
- **C-SCAN:** one direction only; jump to other end and continue (fairer variance).
- **LOOK / C-LOOK:** reverse/jump at last request instead of physical end (practical variants).

**Cost metric in exams:** total head movement in cylinders (sum of |next − current|). Draw the path; sum segments.

**RAID (cheap disks, big logical volume):**
- **RAID 0 — striping:** no parity; capacity all disks; speed up; zero redundancy.
- **RAID 1 — mirroring:** full copy; best read (either side) and simple rebuild; 50% capacity cost.
- **RAID 5 — distributed parity:** stripe + rotating parity; survives one disk failure; write penalty on parity updates; usable = (n−1)/n.
- **RAID 6:** dual parity; survives two failures.

**Failure math:** RAID 5 tolerates 1 failed disk; RAID 6 tolerates 2; RAID 1 tolerates 1 (per mirror pair).

**Related terms:** hot spare, rebuild time, URE risk (why large RAID 5 rebuilds scare operators — mention in viva for depth).`,
        extras: [
          table('Level', ['Redundancy', 'Capacity', 'Notable cost'], [
            ['0', 'None', 'n disks', 'Any disk death = data loss'],
            ['1', 'Full mirror', 'n/2', 'Write twice; simple'],
            ['5', 'Single distributed parity', '(n−1)/n × n', 'Parity write penalty'],
            ['6', 'Double parity', '(n−2)/n × n', 'Extra compute + space'],
          ]),
          tip(
            'SCAN vs C-SCAN vs LOOK in one line each',
            'SCAN both ends; C-SCAN one-way reset; LOOK stops at last request.',
          ),
          warn(
            'SSTF starvation',
            'Edge cylinders can wait forever under heavy center load — aging variants exist.',
          ),
        ],
        worked: {
          title: 'SSTF head movement',
          problem:
            'Queue: 98, 183, 37, 122, 14, 124, 65, 67. Head starts at 53. Total movement for SSTF?',
          steps: [
            { title: 'From 53', desc: 'Nearest is 65 (|12|), then 67 (|2|), then 37 (|30|), then 14 (|23|).' },
            { title: 'Then up', desc: '98 (|84|), 122 (|24|), 124 (|2|), 183 (|59|).' },
            { title: 'Sum', desc: '12+2+30+23+84+24+2+59 = 236.' },
            { title: 'Re-check', desc: 'Always pick the unvisited nearest to current head.' },
            { title: 'Contrast', desc: 'With FCFS path if asked (often worse).' },
          ],
          solution: 'SSTF total head movement = 236 cylinders (from this start).',
        },
        practice: {
          title: 'SCAN path',
          prompt: 'Same queue, head 53, SCAN toward higher end then reverse. Total movement?',
          hint: 'Go to the high end first (e.g. 199 if disk ends there), then sweep down.',
        },
        mistakes: [
          {
            mistake: 'Saying RAID 5 survives two disk failures',
            fix: 'One only; use RAID 6 for two.',
          },
          {
            mistake: 'Forgetting the starting head position in sums',
            fix: 'First segment is from the initial head, not from the first request.',
          },
        ],
        exam: {
          question: 'How many disk failures can RAID 5 tolerate?',
          answer: 'One distributed-parity failure.',
          source: 'Storage interview staple.',
        },
        summary: [
          'Disk schedulers trade fairness vs total seek.',
          'SSTF can starve; SCAN/C-SCAN are elevator families.',
          'RAID 0 speed, 1 mirror, 5 single parity, 6 dual parity.',
        ],
      }),
      [
        [
          'RAID 5 usable capacity for 4×1TB disks is approximately:',
          ['4TB', '3TB', '2TB', '1TB'],
          1,
          '(n−1)/n with distributed parity.',
        ],
        [
          'C-SCAN differs from SCAN by:',
          ['Being non-preemptive', 'Returning to the other end without servicing on the reverse trip', 'Using SSTF inside', 'Ignoring the queue'],
          1,
          'One-way service sweep.',
        ],
        [
          'SSTF’s main weakness is:',
          ['Always worse than FCFS', 'Possible starvation of far requests', 'No preemption', 'Needs two heads'],
          1,
          'Edge requests can wait indefinitely.',
        ],
      ]
    ),
  ],
};
