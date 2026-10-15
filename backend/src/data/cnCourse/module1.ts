// Module 1 — Foundations: Layers, Models & Encapsulation
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — Foundations: Layers, Models & Encapsulation',
  summary:
    'Why networks are layered, the OSI vs TCP/IP models, encapsulation/decapsulation, and the addressing types every exam asks about.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'cn-1-1',
      1,
      'Layered Models: OSI vs TCP/IP',
      'The seven OSI layers, the four/five-layer TCP/IP model, and what each layer actually does for a packet in flight.',
      12,
      nineBlocks({
        objectives: [
          'Name the OSI and TCP/IP layers in order and state the job of each',
          'Map OSI layers to their TCP/IP counterparts',
          'Explain why layering exists (independence, replaceability, clear contracts)',
        ],
        hook:
          'Interviewer: "You type a URL and press Enter — which layers are involved, and in what order?" If you can narrate that story top-to-bottom, every layer-definition question in the syllabus is already answered.',
        concept: `**Why layers?** Each layer offers a service to the one above and hides how it is implemented. You can swap Wi-Fi for Ethernet without touching TCP or the browser. Protocols on the same layer on two machines "talk past each other" — horizontal protocols, vertical services.

**OSI (7 layers, top → bottom):**
7. **Application** — user services (HTTP, DNS, SMTP)
6. **Presentation** — encoding, encryption, compression
5. **Session** — dialogs, checkpointing, session setup
4. **Transport** — end-to-end delivery, segmentation, reliability (TCP/UDP)
3. **Network** — logical addressing and routing (IP, ICMP)
2. **Data Link** — framing, MAC addressing, error detection (Ethernet, Wi-Fi)
1. **Physical** — bits on the medium (voltage, light, radio)

**TCP/IP model (what the internet actually uses):**
- Application (merges OSI 5–7)
- Transport (OSI 4)
- Internet (OSI 3)
- Network Access / Link (OSI 1–2)

**Units each layer moves:**
| Layer | PDU |
|---|---|
| Transport | Segment (TCP) / Datagram (UDP) |
| Network | Packet |
| Data Link | Frame |
| Physical | Bits |

**Encapsulation:** each layer adds its own header (and the data link layer adds a trailer) as the data travels down; the receiver strips them on the way up (decapsulation).`,
        extras: [
          table('OSI', ['Layer', 'Key protocols / tech'], [
            ['7', 'Application', 'HTTP, DNS, SMTP, FTP'],
            ['6', 'Presentation', 'TLS, JPEG, ASCII'],
            ['5', 'Session', 'NetBIOS, RPC sessions'],
            ['4', 'Transport', 'TCP, UDP'],
            ['3', 'Network', 'IPv4, IPv6, ICMP, OSPF'],
            ['2', 'Data Link', 'Ethernet, Wi-Fi (802.11), ARP'],
            ['1', 'Physical', '1000BASE-T, radio, fiber'],
          ]),
          tip(
            'Mnemonic for OSI bottom-up',
            'Please Do Not Throw Sausage Pizza Away (1→7).',
          ),
          warn(
            'PDU names in answers',
            'Segment at layer 4, packet at layer 3, frame at layer 2 — examiners mark the exact word.',
          ),
        ],
        worked: {
          title: 'Follow an HTTP request down the stack',
          problem: 'Browser sends GET /index.html over Wi-Fi. Trace it through the layers.',
          steps: [
            { title: 'Application', desc: 'Browser builds HTTP GET; DNS has already resolved the host to an IP.' },
            { title: 'Transport', desc: 'TCP: source port (ephemeral, e.g. 51234) + dest port 80; payload becomes a segment; MSS caps size.' },
            { title: 'Internet', desc: 'IP header: src IP = your device, dst IP = server; TTL set (e.g. 128).' },
            { title: 'Data Link', desc: 'Frame: MAC src = your Wi-Fi NIC, MAC dst = default gateway AP; FCS trailer for error detection.' },
            { title: 'Physical', desc: 'Bits modulated onto 2.4/5 GHz radio; AP forwards toward the internet.' },
            { title: 'Server side', desc: 'Reverse: strip headers layer by layer; HTTP handler reads GET.' },
          ],
          solution: 'Full down-and-up trace; each layer adds its header, the peer removes it.',
        },
        practice: {
          title: 'Layer the PDU',
          prompt: 'At which layer do each of these live: IP packet, TCP segment, Ethernet frame, HTTP message?',
          hint: 'HTTP is application; then 4, 3, 2.',
        },
        mistakes: [
          {
            mistake: 'Saying TCP/IP and OSI are the same model',
            fix: 'OSI is the 7-layer teaching model; TCP/IP is the 4/5-layer implementation the internet uses.',
          },
          {
            mistake: 'Placing IP at layer 2 or TCP at layer 3',
            fix: 'IP = network (3), TCP = transport (4).',
          },
        ],
        exam: {
          question: 'Which OSI layer is responsible for end-to-end error recovery and flow control?',
          answer: 'Layer 4, Transport (TCP).',
          source: 'Classic university short question.',
        },
        summary: [
          'Layering = service up, protocol across, independence between.',
          'OSI 7 layers; TCP/IP merges 5–7 into Application.',
          'PDUs: segment (L4), packet (L3), frame (L2), bits (L1).',
        ],
      }),
      [
        [
          'The TCP/IP "Internet" layer corresponds to which OSI layer?',
          ['Data Link', 'Network', 'Transport', 'Session'],
          1,
          'Both handle logical addressing and routing.',
        ],
        [
          'Encapsulation means:',
          ['Encrypting the whole payload', 'Each lower layer adding a header (and trailer) to the data above', 'Compressing at layer 6 only', 'Splitting TCP streams at the router'],
          1,
          'Headers grow on the way down; stripped on the way up.',
        ],
        [
          'ARP belongs to which layer (most common classification)?',
          ['Network', 'Data Link (with network-layer role)', 'Transport', 'Physical'],
          1,
          'Maps IP to MAC; usually classed just above pure L2.',
        ],
      ]
    ),
    lesson(
      M1,
      'cn-1-2',
      2,
      'Addressing & Encapsulation in Detail',
      'MAC vs IP vs port addresses, ARP resolution, NAT at a glance, and how a URL becomes bits on the wire.',
      12,
      nineBlocks({
        objectives: [
          'Distinguish MAC, IP and port addresses and the layer/scope of each',
          'Describe ARP resolution between two hosts on a LAN',
          'Trace a URL lookup: DNS then TCP handshake then HTTP',
        ],
        hook:
          'Two laptops on the same café Wi-Fi both talk to youtube.com — same destination IP at the router, but different MACs at every hop. Exams love to catch you conflating the three addressing types.',
        concept: `**Three addressing types:**
- **MAC (layer 2):** burned-in hardware address (48-bit, e.g. 3C:22:FB:...), local to the LAN segment, changed at every router hop (per link).
- **IP (layer 3):** logical address of the host, globally routable, stable across links (until DHCP/NAT changes it).
- **Port (layer 4):** identifies the application/process on the host (0–65535; well-known 0–1023: 80 HTTP, 443 HTTPS, 22 SSH, 53 DNS).

Together a connection is identified by the 5-tuple: (src IP, src port, dst IP, dst port, protocol).

**ARP (Address Resolution Protocol):** host knows the destination IP on its LAN, not the MAC → broadcasts "who has 192.168.1.7?" → owner replies unicast with its MAC → sender caches it. Routers do not forward ARP broadcasts (that is why broadcast domains stop at the router).

**DNS before HTTP:** browser asks resolver for example.com → A/AAAA record → cached IP. Only then can IP packets start.

**NAT (Network Address Translation):** home router rewrites private LAN IPs (192.168.x.x) to one public IP, tracking mappings by (IP, port) so replies come back to the right device. Why it exists: IPv4 address scarcity.

**One packet, many hops:** at each router: L2 frame received → CRC checked → decapsulated to L3 → TTL decremented (if 0, ICMP Time Exceeded) → new L2 header for the next link → retransmitted.`,
        extras: [
          table('Address', ['Layer', 'Scope', 'Changes per hop?'], [
            ['MAC', '2', 'Local LAN link', 'Yes — rewritten each link'],
            ['IP', '3', 'End-to-end (globally routable)', 'No (except NAT at the edge)'],
            ['Port', '4', 'Host (process)', 'No'],
          ]),
          tip(
            'ARP cache is why the first packet is slow',
            'Miss → broadcast round-trip before data flows; hits come from cache.',
          ),
          warn(
            'Private IPs are not routable on the internet',
            '10.x, 172.16–31.x, 192.168.x — routers drop them without NAT.',
          ),
        ],
        worked: {
          title: 'First packet from A to B on a LAN',
          problem: 'Host A (192.168.1.10) pings host B (192.168.1.20) for the first time. What messages go out?',
          steps: [
            { title: 'ARP cache miss', desc: 'A broadcasts: "Who has 192.168.1.20? Tell 192.168.1.10".' },
            { title: 'ARP reply', desc: 'B unicasts its MAC to A; A caches IP→MAC.' },
            { title: 'ICMP echo', desc: 'A builds ICMP Echo Request; ICMP payload wrapped in IP (src .10, dst .20).' },
            { title: 'Frame', desc: 'L2 header: src MAC = A, dst MAC = B; FCS appended.' },
            { title: 'Reply', desc: 'B sends Echo Reply reversed; both cache entries reused later.' },
          ],
          solution: 'ARP first (broadcast + unicast reply), then ICMP in IP in Ethernet frame.',
        },
        practice: {
          title: 'Five-tuple',
          prompt: 'Write the five-tuple for your SSH session to 203.0.113.5 from port 51000.',
          hint: 'Two IPs, two ports, protocol name.',
        },
        mistakes: [
          {
            mistake: 'Saying the MAC address stays the same end-to-end',
            fix: 'MACs change at every router hop; only IP is end-to-end.',
          },
          {
            mistake: 'Thinking DNS is part of HTTP',
            fix: 'DNS is a separate application-layer service that usually runs first.',
          },
        ],
        exam: {
          question: 'What is the purpose of ARP?',
          answer: 'Resolve a known IPv4 address on the local network to the destination MAC address.',
          source: 'Networking viva staple.',
        },
        summary: [
          'MAC = per-link hardware, IP = end-to-end logical, port = per-process.',
          'ARP broadcasts on the LAN to find the MAC for an IP.',
          'NAT maps many private IPs to one public IP using port mappings.',
        ],
      }),
      [
        [
          'A router changes which header(s) when forwarding between two links?',
          ['IP header only', 'L2 header (and FCS) only; IP stays', 'TCP header', 'DNS header'],
          1,
          'Link-local headers rewritten; end-to-end IP preserved (NAT at the edge is the exception).',
        ],
        [
          'Well-known port 443 is used by:',
          ['DNS', 'HTTPS', 'SSH', 'SMTP'],
          1,
          'HTTP=80, HTTPS=443.',
        ],
        [
          'Which address does NOT change as a packet crosses routers?',
          ['Source MAC', 'Destination MAC', 'Source IP (without NAT)', 'Frame FCS'],
          2,
          'IP is the end-to-end identifier.',
        ],
      ]
    ),
  ],
};
