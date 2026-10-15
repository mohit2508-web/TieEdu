// Module 2 — Data Link & Network Layers
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — Data Link & Network Layers',
  summary:
    'Framing, error detection (CRC), switching vs broadcasting, IPv4 addressing and subnetting, and the core routing algorithms.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'cn-2-1',
      1,
      'Framing, Error Detection & Switching',
      'How bits become frames, how CRC catches corruption, and how switches and routers move frames differently.',
      12,
      nineBlocks({
        objectives: [
          'Describe framing and its three problem areas (size, noise, synchronisation)',
          'Explain how CRC detects errors and what the sender/receiver do',
          'Differentiate hub vs switch vs router behaviour for broadcast and MAC learning',
        ],
        hook:
          'A single flipped bit in a 1500-byte frame is invisible to your eyes and fatal to a file. The data-link layer is the layer that notices — before IP ever sees it.',
        concept: `**Framing:** the physical layer delivers a raw bit stream with no boundaries. The data-link layer adds delimiters so the receiver can find where a frame starts and ends.

Framing problems the syllabus names:
1. **Framing** — where does the frame begin/end? (byte stuffing, bit stuffing, length field)
2. **Noise** — a burst of noise can destroy a frame; frames must be small enough that errors are detected (and retransmitted), not silently merged.
3. **Synchronisation** — sender and receiver clocks must agree on bit timing.

**Error detection:**
- **Parity:** 1 extra bit; detects odd bit errors only. Weak.
- **Checksum:** one's-complement sum over the data; used at IP/UDP/TCP levels.
- **CRC (Cyclic Redundancy Check):** treat frame as polynomial, divide by a generator polynomial, append the remainder as FCS. Receiver recomputes; mismatch → discard frame. Detects all burst errors up to the generator degree. The workhorse of Ethernet (CRC-32).

CRC flow: sender computes remainder over (data × x^n) mod G, appends it; receiver divides received bits by G — remainder 0 means likely intact.

**Switching:**
- **Hub (layer 1):** repeats every bit to all ports — one collision domain.
- **Switch (layer 2):** reads destination MAC, forwards only to that port, builds a **MAC address table** by learning source MACs per port. Isolates collision domains (one per port).
- **Router (layer 3):** forwards on IP between different networks; broadcasts do not cross it.

Broadcast domain: all devices that hear each other's broadcasts — cut by routers (and VLANs).

**Ethernet frame (simplified):** dst MAC | src MAC | type/length | payload (46–1500 bytes) | FCS. Minimum payload forces padding (runt frames are discarded).`,
        extras: [
          table('Device', ['Layer', 'Forwards on', 'Collision domain'], [
            ['Hub', '1', 'Flooding all ports', 'One shared'],
            ['Switch', '2', 'Destination MAC (learned table)', 'One per port'],
            ['Router', '3', 'Destination IP (routing table)', 'Routers cut both domains'],
          ]),
          tip(
            'Switch learning rule',
            'Learn source MAC → port; forward/lookup by destination MAC; flood if unknown.',
          ),
          warn(
            'CRC detects, it does not fix',
            'Detection at L2 = discard; recovery is a higher-layer (TCP) or link-level retransmission concern.',
          ),
        ],
        worked: {
          title: 'Switch learns then forwards',
          problem: 'Empty switch; host A (MAC A) on port 1 sends to unknown host B (MAC B) on port 3.',
          steps: [
            { title: 'Frame arrives', desc: 'Switch sees src = A on port 1 → learns A↔port 1 in MAC table.' },
            { title: 'Lookup', desc: 'Dst = B not in table → flood out every port except 1 (split horizon on the port it came in).' },
            { title: 'B replies', desc: 'Frame src = B on port 3 → learned; dst = A found → forwarded only to port 1.' },
            { title: 'Table now', desc: 'A→1, B→3. Future frames A→B go straight across, no flooding.' },
            { title: 'Broadcast', desc: 'ARP request dst FF:FF:FF:FF:FF:FF still floods everywhere — switches do not stop broadcasts.' },
          ],
          solution: 'Learn sources, look up destinations, flood unknowns; broadcasts always flood.',
        },
        practice: {
          title: 'Collision vs broadcast domain',
          prompt: '5 hosts on a hub vs 5 hosts on a switch: how many collision domains each? How many broadcast domains?',
          hint: 'Hub = shared; switch ports isolate collisions but share broadcasts.',
        },
        mistakes: [
          {
            mistake: 'Saying a switch stops broadcast traffic',
            fix: 'Switches flood broadcasts (broadcast domain unchanged); routers and VLANs cut them.',
          },
          {
            mistake: 'Confusing CRC with error correction',
            fix: 'CRC only detects; the frame is dropped and retransmitted by a higher layer.',
          },
        ],
        exam: {
          question: 'How does a switch build its forwarding table?',
          answer: 'It learns by inspecting the source MAC address of incoming frames and the port they arrive on.',
          source: 'Common exam question.',
        },
        summary: [
          'Framing solves boundaries, noise and synchronisation.',
          'CRC-32 detects corruption at L2; receiver discards bad frames.',
          'Switch = MAC learning, one collision domain per port; router = IP + cuts broadcasts.',
        ],
      }),
      [
        [
          'Which device forwards traffic based on MAC address?',
          ['Hub', 'Switch', 'Router', 'Repeater'],
          1,
          'Layer-2 device.',
        ],
        [
          'CRC is best described as:',
          ['Error correction using retransmission bits', 'Error detection using polynomial division remainder', 'Encryption for the frame', 'Flow control for TCP'],
          1,
          'Remainder appended as FCS; mismatch → discard.',
        ],
        [
          'A hub creates:',
          ['5 collision domains for 5 ports', '1 collision domain', '5 broadcast domains', 'No collision domain'],
          1,
          'Shared medium — all ports one domain.',
        ],
      ]
    ),
    lesson(
      M2,
      'cn-2-2',
      2,
      'IPv4 Addressing, Subnetting & Routing',
      'Classes (legacy), CIDR/subnet masks, VLSM thinking, and how routers choose the next hop (static vs RIP vs OSPF vs flooding).',
      12,
      nineBlocks({
        objectives: [
          'Compute network and broadcast addresses from an IP/mask',
          'Subnet a /24 into smaller networks and size each',
          'Compare distance-vector (RIP) and link-state (OSPF) routing at exam depth',
        ],
        hook:
          'Subnetting is the arithmetic exam of networking: 5 marks, 8 minutes, no calculator mercy. The rest of the course cannot save you here — only worked reps can.',
        concept: `**IPv4 structure:** 32 bits = network portion + host portion, split by the subnet mask (/prefix).

- /24 = 255.255.255.0 → 256 addresses, 254 usable hosts
- /25 = 255.255.255.128 → 128 addresses, 126 hosts
- /26 = .192 → 64 addresses, 62 hosts
- /27 = .224 → 32 addresses, 30 hosts
- /28 = .240 → 16 addresses, 14 hosts

**Reserved:** network address (all host bits 0) and broadcast (all host bits 1) are never assigned to hosts. Usable = 2^(32−prefix) − 2.

**Classes (legacy, still asked):** A 1–126 (mask /8), B 128–191 (/16), C 192–223 (/24), D 224–239 multicast, E 240–255 experimental. 127 = loopback. Private ranges: 10/8, 172.16/12, 192.168/16.

**CIDR:** "192.168.1.0/26" notation; route aggregation summarises many prefixes into one (reduces routing-table size).

**VLSM:** give subnets different sizes to fit needs (point-to-point /30 = 4 addresses, 2 usable — routers waste fewer IPs).

**Routing algorithms:**
- **Static:** manually configured; fine for small networks.
- **Distance vector (RIP):** each router shares its distance vector (hop counts) with neighbours; Bellman-Ford; max 15 hops; suffers count-to-infinity; simple but slow convergence.
- **Link state (OSPF):** each router floods its link-state advertisements, builds a full topology map, runs Dijkstra (SPF); fast convergence, no hop-count limit; scales better.
- **Flooding:** send every packet out all interfaces except incoming — used in early networks (and inside link-state flooding itself).

**Next-hop decision:** longest prefix match wins when multiple routes cover the destination.`,
        extras: [
          table('Prefix', ['Mask', 'Total addrs', 'Usable hosts'], [
            ['/24', '255.255.255.0', '256', '254'],
            ['/25', '255.255.255.128', '128', '126'],
            ['/26', '255.255.255.192', '64', '62'],
            ['/27', '255.255.255.224', '32', '30'],
            ['/30', '255.255.255.252', '4', '2'],
          ]),
          tip(
            'Subnet math shortcut',
            'Increment = 256 − interesting octet (e.g. mask .192 → increment 64 → networks at 0, 64, 128, 192).',
          ),
          warn(
            'RIP is a distance-vector protocol limited to 15 hops',
            'Hop 16 = unreachable; OSPF is the link-state answer.',
          ),
        ],
        worked: {
          title: 'Subnet 192.168.1.0/24 into four equal LANs',
          problem: 'Four departments need equal subnets. Find the new prefix and each subnet range.',
          steps: [
            { title: 'Need', desc: '4 subnets → need 2 extra network bits (2^2 = 4) → new prefix /26.' },
            { title: 'Increment', desc: '256 − 192 = 64 → subnets at .0, .64, .128, .192.' },
            { title: 'Subnet 1', desc: '192.168.1.0/26 — network .0, hosts .1–.62, broadcast .63.' },
            { title: 'Subnet 2', desc: '192.168.1.64/26 — hosts .65–.126, broadcast .127.' },
            { title: 'Subnets 3/4', desc: '.128/26 (hosts .129–.190, bcast .191) and .192/26 (hosts .193–.254, bcast .255).' },
          ],
          solution: 'Four /26 subnets; each has 64 addresses (62 usable).',
        },
        practice: {
          title: 'Network address',
          prompt: 'Host IP 172.20.5.77/27 — network address, broadcast, and usable range?',
          hint: 'Increment = 256 − 224 = 32; find the block containing .77.',
        },
        mistakes: [
          {
            mistake: 'Including network and broadcast addresses in the usable count',
            fix: 'Usable hosts = 2^h − 2.',
          },
          {
            mistake: 'Saying OSPF uses hop count',
            fix: 'OSPF uses cost (bandwidth-based); hop count is RIP.',
          },
        ],
        exam: {
          question: 'Which routing algorithm builds a complete map of the network and runs Dijkstra?',
          answer: 'Link-state routing (OSPF).',
          source: 'Standard 8-mark comparison question.',
        },
        summary: [
          'Prefix splits network vs host bits; usable = 2^h − 2.',
          'Equal subnetting: borrow bits until 2^borrowed ≥ required subnets.',
          'RIP = distance vector + hops; OSPF = link state + Dijkstra.',
        ],
      }),
      [
        [
          '/26 gives usable hosts:',
          ['62', '64', '30', '126'],
          0,
          '64 − 2.',
        ],
        [
          'Broadcast address of 10.0.0.0/30 is:',
          ['10.0.0.3', '10.0.0.2', '10.0.0.1', '10.0.0.4'],
          0,
          'Block of 4: .0 network, .1–.2 hosts, .3 broadcast.',
        ],
        [
          'The maximum hop count in RIP is:',
          ['15 (16 = unreachable)', '30', '255', 'Unlimited'],
          0,
          'Classic RIP limit.',
        ],
      ]
    ),
  ],
};
