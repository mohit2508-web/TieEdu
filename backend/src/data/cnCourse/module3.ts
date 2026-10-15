// Module 3 — Transport & Application Layers
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Transport & Application Layers',
  summary:
    'TCP vs UDP, the three-way handshake, reliability and flow/congestion control, then DNS, HTTP and DHCP at exam depth.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'cn-3-1',
      1,
      'TCP: Connection, Reliability & Control',
      'Segment structure, the three-way handshake and teardown, ACK/retransmission, sliding-window flow control and congestion control.',
      13,
      nineBlocks({
        objectives: [
          'State what TCP guarantees and what it explicitly does not',
          'Draw the three-way handshake and four-step teardown with flags',
          'Separate flow control (receiver window) from congestion control (cwnd)',
        ],
        hook:
          'The internet carries both your bank transfer and your cat video — one demands zero loss, the other demands speed. TCP and UDP are two different answers to that question, and interviewers check whether you know why.',
        concept: `**TCP (Transmission Control Protocol):** connection-oriented, reliable, ordered, byte-stream service.
- **Connection:** 3-way handshake SYN → SYN-ACK → ACK (both sides agree initial sequence numbers).
- **Reliability:** each byte has a sequence number; cumulative ACKs; missing data retransmitted after RTO (retransmission timeout); duplicate/out-of-order segments handled.
- **Ordering:** receiver reassembles by sequence number.
- **Flow control:** receiver advertises a **window (rwnd)** in every ACK — sender never overruns the receiver buffer.
- **Congestion control:** sender maintains **cwnd** (congestion window); effective send size = min(rwnd, cwnd). Phases: slow start (exponential growth until threshold), congestion avoidance (linear), on loss: multiplicative decrease (halve/threshold), fast recovery.
- **Full-duplex:** data flows both ways simultaneously; teardown uses FIN/ACK pairs (4-way) since each direction closes independently.

**Common TCP flags:** SYN (open), ACK, FIN (close), RST (reset), PSH, URG.

**TCP header essentials:** src/dst port, sequence + ack numbers, window size, checksum, flags. (UDP is 8 bytes: ports, length, checksum.)

**UDP:** connectionless, no ordering, no retransmission — best-effort but minimal delay. Used by DNS, DHCP, VoIP, streaming, video calls, games. Multicast/broadcast come only with UDP.

**Choosing:** reliability + ordering (web, file, email, SSH) → TCP; latency sensitivity where a lost frame is acceptable (voice, live video, DNS queries) → UDP.

**Handshake vs HTTP request:** the TCP connection is reusable (keep-alive); one connection can carry many HTTP request/response pairs.`,
        extras: [
          table('Property', ['TCP', 'UDP'], [
            ['Connection', 'Handshake first', 'None'],
            ['Reliability', 'ACK + retransmit', 'Best-effort'],
            ['Ordering', 'Yes (seq numbers)', 'No'],
            ['Speed / overhead', 'Higher overhead', 'Low overhead, low latency'],
            ['Typical uses', 'Web, email, file transfer', 'DNS, DHCP, VoIP, streaming'],
          ]),
          tip(
            'Flow vs congestion control in one line each',
            'Flow control protects the receiver (rwnd); congestion control protects the network (cwnd).',
          ),
          warn(
            'Handshake count questions',
            'Opening = 3 messages; closing = 4 messages (FIN each way) unless combined.',
          ),
        ],
        worked: {
          title: 'Sequence and ACK arithmetic',
          problem: 'Client sends 1000 bytes from seq 5000; server ACKs. What does the ACK carry, and what if the second segment is lost?',
          steps: [
            { title: 'Segment 1', desc: 'seq = 5000, carries bytes 5000–5999 (1000 bytes).' },
            { title: 'ACK', desc: 'Server ACK = 5000 + 1000 = 6000 (next expected byte).' },
            { title: 'Segment 2', desc: 'Client sends seq = 6000, 500 bytes; it is lost in the network.' },
            { title: 'Timeout', desc: 'RTO expires at the sender; segment 2 retransmitted with seq 6000 unchanged.' },
            { title: 'Recovery', desc: 'Server ACK 6500 arrives; dup ACKs / fast retransmit may trigger even earlier.' },
          ],
          solution: 'ACK 6000 after first segment; lost segment retransmitted with same seq; final ACK 6500.',
        },
        practice: {
          title: 'Window math',
          prompt: 'Receiver window = 8000 bytes, cwnd = 6000 bytes, MSS = 1000. How many bytes may the sender put on the wire right now?',
          hint: 'Effective window = min(rwnd, cwnd).',
        },
        mistakes: [
          {
            mistake: 'Saying TCP guarantees delivery of messages (not a byte stream)',
            fix: 'TCP guarantees ordered, reliable delivery of a byte stream — message boundaries are not preserved.',
          },
          {
            mistake: 'Mixing rwnd and cwnd',
            fix: 'rwnd = receiver buffer room (flow control); cwnd = sender guess of network capacity (congestion control).',
          },
        ],
        exam: {
          question: 'Why does TCP use a three-way handshake?',
          answer: 'To synchronise both sides initial sequence numbers and confirm both can send and receive before data flows.',
          source: 'Evergreen university question.',
        },
        summary: [
          'TCP: reliable, ordered, connection-oriented; UDP: minimal and connectionless.',
          'Handshake SYN/SYN-ACK/ACK synchronises sequence numbers.',
          'Flow control = rwnd; congestion control = cwnd (slow start → avoidance).',
        ],
      }),
      [
        [
          'Which flag starts a TCP connection?',
          ['ACK', 'SYN', 'FIN', 'RST'],
          1,
          'SYN opens; SYN-ACK acknowledges.',
        ],
        [
          'A receiver advertises its buffer room via:',
          ['cwnd', 'TTL', 'rwnd (window field)', 'MSS only'],
          2,
          'rwnd is the flow-control window.',
        ],
        [
          'Which protocol is connectionless and unacknowledged?',
          ['TCP', 'UDP', 'IP', 'HTTP'],
          1,
          'UDP headers are just ports, length, checksum.',
        ],
      ]
    ),
    lesson(
      M3,
      'cn-3-2',
      2,
      'DNS, HTTP & DHCP',
      'Recursive DNS resolution, HTTP request/response and status codes, cookies/keep-alive, and how DHCP hands out an address.',
      12,
      nineBlocks({
        objectives: [
          'Trace a recursive DNS lookup from stub resolver to authoritative server',
          'Identify the parts of an HTTP request/response and key status codes',
          'Explain the four DHCP steps (DORA) and what each returns',
        ],
        hook:
          'Opening tieedu.com runs two applications you never see: DNS (find the address) and DHCP (you already had one when you joined the Wi-Fi). Both are "boring" until they are down — then everything is broken.',
        concept: `**DNS (Domain Name System) — application layer, port 53 (UDP for queries, TCP for zone transfers):**
- Hierarchical tree: root → TLD (.com, .in) → authoritative (example.com) servers.
- **Iterative vs recursive:** client asks resolver recursively ("answer me fully"); resolver walks the tree iteratively, caching as it goes.
- Record types: **A** (name → IPv4), **AAAA** (→ IPv6), **CNAME** (alias), **MX** (mail), **NS** (name server), **PTR** (reverse).
- Caching with **TTL** — why a DNS change is not instant everywhere.

**HTTP (HyperText Transfer Protocol) — application layer, TCP 80 (443 for HTTPS/TLS):**
- Request: method (GET/POST/PUT/DELETE), path, version, headers, optional body.
- Response: status line (version, code, phrase), headers, body.
- Status classes: 2xx success (200 OK, 201 Created), 3xx redirect (301 permanent, 302 found, 304 not modified), 4xx client error (400 bad request, 401 unauthorised, 403 forbidden, 404 not found), 5xx server error (500 internal, 502 bad gateway, 503 unavailable).
- **Statelessness:** each request is independent; state carried by cookies (Set-Cookie header) or tokens.
- **Keep-alive:** reuse one TCP connection for many requests (faster than handshake per request).
- HTTP/1.1 pipelining, HTTP/2 multiplexing — mention for depth.

**DHCP (Dynamic Host Configuration Protocol) — UDP ports 67/68, DORA:**
1. **Discover** — client broadcasts "any DHCP server?"
2. **Offer** — server(s) offer an IP + lease parameters.
3. **Request** — client accepts one offer (broadcast, so all servers know).
4. **Ack** — server confirms; lease timer starts.
Delivers: IP, subnet mask, default gateway, DNS server(s), lease time. DHCP relay agents let one server serve many subnets.`,
        extras: [
          table('Class', ['Codes', 'Meaning'], [
            ['2xx', '200, 201, 204', 'Success'],
            ['3xx', '301, 302, 304', 'Redirect / not modified'],
            ['4xx', '400, 401, 403, 404', 'Client error'],
            ['5xx', '500, 502, 503', 'Server error'],
          ]),
          tip(
            'DHCP = DORA',
            'Discover → Offer → Request → Ack, all broadcast until the lease is confirmed.',
          ),
          warn(
            'DNS default port',
            '53 UDP for queries — mixing it with HTTP 80 is an easy lost mark.',
          ),
        ],
        worked: {
          title: 'Recursive DNS lookup for www.example.com',
          problem: 'Your stub resolver has a cold cache. List the steps to get the A record.',
          steps: [
            { title: 'Stub → resolver', desc: 'Your OS asks the configured recursive resolver (e.g. ISP or 8.8.8.8).' },
            { title: 'Root', desc: 'Resolver asks a root server: "who handles .com?" → referral to .com TLD servers.' },
            { title: 'TLD', desc: 'Resolver asks a .com TLD server → referral to example.com authoritative NS.' },
            { title: 'Authoritative', desc: 'Resolver asks example.com NS → answer: A record 93.184.216.34 (TTL 3600).' },
            { title: 'Cache + reply', desc: 'Resolver caches per TTL and returns the IP to the stub resolver; browser connects.' },
          ],
          solution: 'Stub → resolver → root → TLD → authoritative → cached answer; each hop cached for TTL.',
        },
        practice: {
          title: 'Status code choice',
          prompt: 'A logged-in user POSTs a form missing a required field. Which status code family, and one specific code?',
          hint: 'The server understood but refuses due to the client sending bad data.',
        },
        mistakes: [
          {
            mistake: 'Saying HTTP is stateful by itself',
            fix: 'HTTP is stateless; cookies/tokens add state at the application level.',
          },
          {
            mistake: 'Forgetting DHCP is UDP, not TCP',
            fix: 'Client has no address yet — connection setup is impossible; broadcast UDP is used.',
          },
        ],
        exam: {
          question: 'Explain the four steps of DHCP with the mnemonic.',
          answer: 'DORA: Discover (client broadcast), Offer (server), Request (client accepts), Ack (server confirms lease).',
          source: 'Frequent 4–6 mark question.',
        },
        summary: [
          'DNS: hierarchical name → address with A/AAAA/MX records and TTL caching.',
          'HTTP: request/response, 2xx/3xx/4xx/5xx status classes, cookie-based state.',
          'DHCP DORA configures IP, mask, gateway and DNS over UDP broadcasts.',
        ],
      }),
      [
        [
          'DNS queries usually default to:',
          ['TCP 53', 'UDP 53', 'TCP 80', 'UDP 67'],
          1,
          'UDP for single queries; TCP for zone transfers.',
        ],
        [
          'Status 404 means:',
          ['Server crashed', 'Resource not found on the server', 'Redirect loop', 'Unauthorised'],
          1,
          'Client error — server understood, no such resource.',
        ],
        [
          'In DORA, the step where the client broadcasts which offer it accepts is:',
          ['Discover', 'Offer', 'Request', 'Ack'],
          2,
          'Request — broadcast so other servers retract their offers.',
        ],
      ]
    ),
  ],
};
