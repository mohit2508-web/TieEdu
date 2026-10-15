// Computer Networks — course assembly.
// Phase 4 Bucket B branch core (CSE interview + university exam).
import type { Course, ExamQuestion } from '../db';
import { module1 } from './module1';
import { module2 } from './module2';
import { module3 } from './module3';
import { module4 } from './module4';
import { COURSE_ID } from './helpers';

const examBank: ExamQuestion[] = [
  {
    id: 'cn-ex-1',
    prompt: 'Which OSI layer is responsible for routing and logical addressing?',
    options: ['Data Link', 'Network', 'Transport', 'Physical'],
    correct_index: 1,
    explanation: 'Layer 3 — IP and routers.',
    difficulty: 'easy',
    topic: 'Layered models',
  },
  {
    id: 'cn-ex-2',
    prompt: 'A TCP segment belongs to which OSI layer?',
    options: ['Network', 'Data Link', 'Transport', 'Session'],
    correct_index: 2,
    explanation: 'PDU naming: segment at layer 4.',
    difficulty: 'easy',
    topic: 'Layered models',
  },
  {
    id: 'cn-ex-3',
    prompt: 'Encapsulation describes:',
    options: [
      'Compressing at the application layer only',
      'Each lower layer adding a header (and possibly trailer) to the payload from above',
      'Encrypting with RSA at every hop',
      'Splitting a file into PDF pages',
    ],
    correct_index: 1,
    explanation: 'Headers grow downward, stripped upward.',
    difficulty: 'easy',
    topic: 'Layered models',
  },
  {
    id: 'cn-ex-4',
    prompt: 'The TCP/IP model merges which OSI layers into "Application"?',
    options: ['1 and 2', '3 and 4', '5, 6 and 7', '4, 5 and 6'],
    correct_index: 2,
    explanation: 'Session, presentation, application collapse.',
    difficulty: 'medium',
    topic: 'Layered models',
  },
  {
    id: 'cn-ex-5',
    prompt: 'Which address stays constant as a packet crosses many routers (without NAT)?',
    options: ['Source MAC', 'Destination MAC', 'Source IP', 'Frame FCS'],
    correct_index: 2,
    explanation: 'MACs are rewritten per link; IP is end-to-end.',
    difficulty: 'easy',
    topic: 'Addressing',
  },
  {
    id: 'cn-ex-6',
    prompt: 'ARP is used to:',
    options: [
      'Resolve a domain name to an IP',
      'Resolve an IPv4 address on the LAN to a MAC address',
      'Assign an IP via DHCP',
      'Encrypt the frame payload',
    ],
    correct_index: 1,
    explanation: 'DNS does names; ARP does IP→MAC.',
    difficulty: 'easy',
    topic: 'Addressing',
  },
  {
    id: 'cn-ex-7',
    prompt: 'Which is NOT a private IPv4 range?',
    options: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '8.8.8.0/24'],
    correct_index: 3,
    explanation: '8.8.8.8 is a public Google resolver.',
    difficulty: 'medium',
    topic: 'Addressing',
  },
  {
    id: 'cn-ex-8',
    prompt: 'NAT primarily exists because:',
    options: [
      'MAC addresses run out', 'IPv4 address scarcity requires multiplexing many hosts onto fewer public IPs',
      'TCP cannot multiplex ports', 'Wireless needs collision avoidance',
    ],
    correct_index: 1,
    explanation: 'Many private IPs share one public IP via port mappings.',
    difficulty: 'easy',
    topic: 'Addressing',
  },
  {
    id: 'cn-ex-9',
    prompt: 'A switch builds its MAC table by:',
    options: [
      'Reading destination MAC addresses of incoming frames',
      'Reading source MAC addresses and arrival ports',
      'ARP broadcasts to every host each minute',
      'IGMP membership queries',
    ],
    correct_index: 1,
    explanation: 'Learn source, look up destination.',
    difficulty: 'easy',
    topic: 'Data link',
  },
  {
    id: 'cn-ex-10',
    prompt: 'How many collision domains does a 24-port switch create?',
    options: ['1', '24', '25', '0'],
    correct_index: 1,
    explanation: 'One per port.',
    difficulty: 'easy',
    topic: 'Data link',
  },
  {
    id: 'cn-ex-11',
    prompt: 'CRC in Ethernet is used for:',
    options: ['Error correction with retransmission', 'Error detection (frame is discarded on mismatch)', 'Encryption', 'Flow control'],
    correct_index: 1,
    explanation: 'Detect, discard, let a higher layer recover.',
    difficulty: 'easy',
    topic: 'Data link',
  },
  {
    id: 'cn-ex-12',
    prompt: 'Which device cuts a broadcast domain?',
    options: ['Hub', 'Switch', 'Router', 'Repeater'],
    correct_index: 2,
    explanation: 'Layer 3 boundary (VLANs also cut it at L2).',
    difficulty: 'easy',
    topic: 'Data link',
  },
  {
    id: 'cn-ex-13',
    prompt: 'Usable hosts in a /27 subnet:',
    options: ['30', '32', '28', '62'],
    correct_index: 0,
    explanation: '2^5 − 2 = 30.',
    difficulty: 'medium',
    topic: 'Subnetting',
  },
  {
    id: 'cn-ex-14',
    prompt: '192.168.10.64/26 — the broadcast address is:',
    options: ['192.168.10.127', '192.168.10.63', '192.168.10.128', '192.168.10.255'],
    correct_index: 0,
    explanation: 'Block 64–127; .127 is broadcast.',
    difficulty: 'medium',
    topic: 'Subnetting',
  },
  {
    id: 'cn-ex-15',
    prompt: 'To create 8 equal subnets from a /24 you borrow:',
    options: ['2 bits', '3 bits', '4 bits', '8 bits'],
    correct_index: 1,
    explanation: '2^3 = 8 → prefix /27.',
    difficulty: 'medium',
    topic: 'Subnetting',
  },
  {
    id: 'cn-ex-16',
    prompt: 'RIP uses which algorithm and metric?',
    options: ['Dijkstra with cost', 'Bellman-Ford with hop count', 'OSPF flooding with bandwidth', 'Spanning tree with path cost'],
    correct_index: 1,
    explanation: 'Distance vector, max 15 hops.',
    difficulty: 'medium',
    topic: 'Routing',
  },
  {
    id: 'cn-ex-17',
    prompt: 'Which routing protocol is link-state?',
    options: ['RIP', 'OSPF', 'BGP (path-vector, not link-state)', 'IGRP (distance vector)'],
    correct_index: 1,
    explanation: 'OSPF floods LSAs and runs SPF.',
    difficulty: 'easy',
    topic: 'Routing',
  },
  {
    id: 'cn-ex-18',
    prompt: 'Count-to-infinity is a classic problem of:',
    options: ['Link-state routing', 'Distance-vector routing', 'DNS', 'TCP slow start'],
    correct_index: 1,
    explanation: 'Slow convergence after link failures.',
    difficulty: 'hard',
    topic: 'Routing',
  },
  {
    id: 'cn-ex-19',
    prompt: 'In longest-prefix matching, the router selects:',
    options: [
      'The shortest hop route only',
      'The route with the most specific (longest) matching prefix',
      'The first entry in the table',
      'The route with the smallest metric regardless of prefix',
    ],
    correct_index: 1,
    explanation: 'Longest mask wins.',
    difficulty: 'medium',
    topic: 'Routing',
  },
  {
    id: 'cn-ex-20',
    prompt: 'TCP establishes a connection with:',
    options: ['Two-way handshake', 'Three-way handshake (SYN, SYN-ACK, ACK)', 'One SYN only', 'DNS lookup'],
    correct_index: 1,
    explanation: 'Sequence numbers synchronised both ways.',
    difficulty: 'easy',
    topic: 'Transport',
  },
  {
    id: 'cn-ex-21',
    prompt: 'Receiver-side flow control in TCP uses:',
    options: ['cwnd', 'The advertised window rwnd', 'TTL', 'MTU'],
    correct_index: 1,
    explanation: 'rwnd protects the receiver buffer.',
    difficulty: 'easy',
    topic: 'Transport',
  },
  {
    id: 'cn-ex-22',
    prompt: 'Slow start increases the congestion window:',
    options: ['Linearly every RTT', 'Exponentially until the threshold', 'By a fixed 1 MSS per ACK only', 'Never — it is constant'],
    correct_index: 1,
    explanation: 'Then congestion avoidance takes over linearly.',
    difficulty: 'medium',
    topic: 'Transport',
  },
  {
    id: 'cn-ex-23',
    prompt: 'Which protocol is connectionless with no retransmission?',
    options: ['TCP', 'UDP', 'TLS', 'HTTP/2 over TCP'],
    correct_index: 1,
    explanation: 'Minimal overhead, best-effort.',
    difficulty: 'easy',
    topic: 'Transport',
  },
  {
    id: 'cn-ex-24',
    prompt: 'VoIP typically prefers UDP over TCP because:',
    options: [
      'UDP guarantees ordering',
      'Retransmitted late audio is useless; low latency matters more than perfect loss',
      'TCP cannot carry audio payloads',
      'UDP supports larger MSS than TCP',
    ],
    correct_index: 1,
    explanation: 'Timeliness beats completeness for live audio.',
    difficulty: 'medium',
    topic: 'Transport',
  },
  {
    id: 'cn-ex-25',
    prompt: 'A DNS record mapping a name to an IPv6 address is:',
    options: ['A', 'AAAA', 'CNAME', 'MX'],
    correct_index: 1,
    explanation: 'Four As for 128-bit addresses.',
    difficulty: 'easy',
    topic: 'Application',
  },
  {
    id: 'cn-ex-26',
    prompt: 'In DORA, DHCP Offer is sent by:',
    options: ['The client', 'The DHCP server', 'The default gateway', 'The DNS resolver'],
    correct_index: 1,
    explanation: 'Server offers; client then Requests.',
    difficulty: 'easy',
    topic: 'Application',
  },
  {
    id: 'cn-ex-27',
    prompt: 'HTTP 304 Not Modified means:',
    options: [
      'The server crashed',
      'The client cache is still valid — no body needed',
      'The URL is permanently moved',
      'Authentication failed',
    ],
    correct_index: 1,
    explanation: 'Conditional revalidation success.',
    difficulty: 'medium',
    topic: 'Application',
  },
  {
    id: 'cn-ex-28',
    prompt: 'Which crypto type is used for certificate signatures and key exchange?',
    options: ['Symmetric (AES)', 'Asymmetric (RSA/ECC)', 'Hashing only', 'Compression'],
    correct_index: 1,
    explanation: 'Public/private keys.',
    difficulty: 'easy',
    topic: 'Security',
  },
  {
    id: 'cn-ex-29',
    prompt: 'WPA3 replaced WPA2 mainly to:',
    options: [
      'Increase maximum Wi-Fi speed only',
      'Resist offline dictionary attacks via the SAE handshake',
      'Return to WEP compatibility',
      'Remove the need for passwords entirely',
    ],
    correct_index: 1,
    explanation: 'SAE hardens the handshake.',
    difficulty: 'medium',
    topic: 'Security',
  },
  {
    id: 'cn-ex-30',
    prompt: 'SDN centralises the:',
    options: ['Data plane only', 'Control plane in software controllers', 'Physical layer', 'Certificate authorities'],
    correct_index: 1,
    explanation: 'Programmable decisions; devices forward.',
    difficulty: 'medium',
    topic: 'Modern networks',
  },
];

export function getComputerNetworksCourse(): Course {
  return {
    id: COURSE_ID,
    slug: 'computer-networks',
    title: 'Computer Networks',
    subtitle:
      'OSI to TCP/IP, subnetting, TCP internals, DNS/HTTP/DHCP, TLS security and modern delivery — exam + interview core',
    description: `Computer Networks is the CSE subject that shows up in university exams, GATE and every infrastructure or backend interview. This course covers the full core in eight compact lessons: layered models and encapsulation, MAC/IP/port addressing with ARP, framing and CRC, switches and routers, IPv4 subnetting arithmetic, distance-vector vs link-state routing, the TCP handshake with flow and congestion control, DNS/HTTP/DHCP, TLS with firewalls, and wireless/SDN/CDN for modern context.

Every lesson uses the nine-block structure (objectives, hook, concept, worked example, practice, common mistakes, exam angle, graded quiz, summary). A 30-question bank feeds a 15-question timed final. Passing earns a verifiable TieEdu certificate.

**Who this is for:** second- and third-year CSE/IT students preparing for university exams, GATE fundamentals, and placement interviews that ask networking questions.

**What you need:** pen and paper for subnetting and handshake diagrams; a browser for the quizzes.`,
    category: 'Computer Science',
    level: 'intermediate',
    is_free: true,
    price_inr: 0,
    thumbnail_url: '',
    thumbnail_alt: 'Computer Networks course cover',
    tags: ['networking', 'computer-networks', 'cse', 'tcp-ip', 'subnetting', 'free', 'interview'],
    outcomes: [
      'Map every OSI layer to its job, PDU and representative protocols',
      'Trace a packet through addressing: MAC, IP, port and ARP resolution',
      'Solve subnetting problems: prefix, ranges, broadcast and usable counts',
      'Compare RIP vs OSPF and explain longest-prefix matching',
      'Explain TCP handshake, teardown, flow control and congestion control',
      'Outline DNS resolution, HTTP status classes and DHCP DORA',
      'Describe TLS goals, firewall tiers and CDN/SDN value in modern delivery',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-10-14T12:00:00.000Z',
    updated_at: '2026-10-14T12:00:00.000Z',
    instructor_id: null,
    about_course: `Networking courses often fail in one of two ways: pure theory with no packets, or protocol trivia without the why. This course keeps the causal chain visible — every layer exists because the layer below could not do that job — and spends its arithmetic where examiners do: subnetting tables and TCP window math.

The security module is deliberately practical: you will be able to say exactly what the padlock in the address bar proves, why a packet filter cannot see HTTPS paths, and what WPA3 fixes over WPA2. The modern module (Wi-Fi, SDN, CDNs) gives you interview-ready language for how content actually reaches a phone in another city.

The final exam draws from a 30-question bank; the certificate project is a short subnet design note you can revise from before finals.`,
    prerequisites: [
      'Basic digital logic and binary arithmetic',
      'Comfort with any programming language (pseudocode is explained)',
    ],
    audience: [
      'CSE/IT students in semester 3–5 facing university networking exams',
      'Placement candidates preparing for networking and backend rounds',
      'GATE aspirants building core CS fundamentals',
      'Anyone who wants to understand what happens between a URL and a response',
    ],
    audio_language: 'English',
    caption_language: 'English',
    branch: 'cse',
    branch_label: 'CSE / IT core (also useful for AI-DS)',
    bucket: 'B',
    certificate_tier: 'professional',
    estimated_hours: 8,
    perks: [
      { key: 'certificate', label: 'Verifiable certificate' },
      { key: 'xp', label: 'XP on the leaderboard' },
    ],
    exam_prep: {
      target: 'University mid-terms and finals; GATE CS core; placement networking rounds',
      units: [
        {
          title: 'Layers & Addressing',
          summary:
            'OSI 7 layers; TCP/IP merges 5–7. PDUs: segment/packet/frame/bits. Encapsulation adds headers down, strips up. MAC (per-link), IP (end-to-end), port (per-process). ARP maps IP→MAC on the LAN. NAT multiplexes private IPs onto one public IP.',
          questions: [
            'Name the OSI layers and one protocol each.',
            'What does a router rewrite when forwarding?',
            'Explain ARP with its two message types.',
            'Why does the browser run DNS before HTTP?',
          ],
          pyqs: [],
        },
        {
          title: 'Data Link, Subnetting & Routing',
          summary:
            'Switch learns source MAC, forwards on destination, floods unknowns and broadcasts. CRC detects corruption. Subnet: usable = 2^h − 2; increment = 256 − interesting octet. RIP = distance vector + hops (max 15); OSPF = link state + Dijkstra. Longest prefix match wins.',
          questions: [
            'Collision vs broadcast domain for hub/switch/router.',
            'Subnet 192.168.1.0/24 into four equal LANs.',
            'Compare RIP and OSPF in a table.',
            'What problem does CIDR aggregation solve?',
          ],
          pyqs: [],
        },
        {
          title: 'Transport & Applications',
          summary:
            'TCP: handshake SYN/SYN-ACK/ACK, seq/ACK arithmetic, cumulative ACKs, retransmission. Flow control = rwnd; congestion control = cwnd (slow start → avoidance, halve on loss). UDP = connectionless, used by DNS/DHCP/VoIP. DNS A/AAAA records; HTTP 2xx/3xx/4xx/5xx; DHCP DORA.',
          questions: [
            'Draw the three-way handshake.',
            'Flow control vs congestion control.',
            'Trace a recursive DNS lookup.',
            'Steps of DHCP with ports 67/68.',
          ],
          pyqs: [],
        },
        {
          title: 'Security & Modern Networks',
          summary:
            'Symmetric (AES) for bulk; asymmetric (RSA/ECC) for identity and key exchange; hashes for integrity. TLS: certificate chain auth + key exchange + AEAD records. Firewalls: packet filter → stateful → L7. WEP broken, WPA3 preferred. SDN centralises control plane. CDN = edge cache + DNS steering.',
          questions: [
            'Why does HTTPS need certificates if it also encrypts?',
            'Can a packet filter block a specific HTTPS URL? Why/why not?',
            'What did WPA3 fix over WPA2?',
            'State the main idea of SDN and one benefit of a CDN.',
          ],
          pyqs: [],
        },
      ],
      important_questions: [
        'OSI vs TCP/IP with a mapping table.',
        'How a switch learns and forwards, with an example trace.',
        'Full subnetting worked example: ranges, broadcast, usable counts.',
        'Distance-vector vs link-state comparison (RIP vs OSPF).',
        'TCP three-way handshake and why three messages are needed.',
        'Flow control vs congestion control with rwnd and cwnd.',
        'Recursive DNS lookup step by step.',
        'Symmetric vs asymmetric encryption with usage in TLS.',
      ],
      previous_year_questions: [
        {
          year: '2024',
          question:
            'Subnet 200.10.0.0/24 into 4 equal subnets. Give each subnet ID, broadcast and usable range.',
          solution:
            'Borrow 2 bits → /26, increment 64. Subnets .0, .64, .128, .192 (host octet of third byte as applicable); each 64 addresses, 62 usable; broadcasts at block end (.63, .127, .191, .255 in the split octet).',
        },
        {
          year: '2023',
          question:
            'Explain the TCP three-way handshake. Why not a two-way handshake?',
          solution:
            'SYN → SYN-ACK → ACK synchronises both sequence numbers and confirms both directions. Two ways cannot confirm the server received the client ISN and that the server can reach the client.',
        },
        {
          year: '2025',
          question:
            'Compare distance-vector and link-state routing with one protocol each and note a weakness of distance vector.',
          solution:
            'Distance vector (RIP): Bellman-Ford, hop metric, simple but count-to-infinity and slow convergence. Link state (OSPF): full topology + Dijkstra, fast convergence, more CPU/memory and flooding overhead.',
        },
      ],
    },
    project: {
      title: 'Small-office subnet & service design note',
      brief:
        'Design a small office network on paper (4–6 pages or equivalent markdown): (1) a public /29 or /28 split into VLAN subnets for staff, guests and servers with usable ranges and gateways; (2) which device cuts each broadcast domain and why; (3) the TCP/UDP ports each service needs (web, mail, DNS, SSH) and where TLS terminates; (4) one firewall policy sketch (allow/deny rules) and one CDN recommendation for a public site. Submit as PDF or a public markdown URL.',
      submission_hint:
        'PDF or public markdown link showing the subnet table with real arithmetic, the port list, and a rule table — not screenshots of a network simulator.',
      required_for_certificate: true,
    },
    exam: {
      question_count: 15,
      duration_minutes: 30,
      passing_percent: 60,
      retake_cooldown_hours: 24,
      distinction_percent: 85,
      bank: examBank,
    },
    modules: [module1, module2, module3, module4],
  };
}
