// Module 4 — Security, Wireless & Modern Networks
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Security, Wireless & Modern Networks',
  summary:
    'Symmetric vs asymmetric crypto, TLS in one page, firewalls and NAT, Wi-Fi basics, and how CDNs and cloud networking changed delivery.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'cn-4-1',
      1,
      'Network Security: TLS, Firewalls & Threats',
      'Encryption basics, the TLS handshake at exam depth, firewall types, and the attacks every syllabus names.',
      12,
      nineBlocks({
        objectives: [
          'Differentiate symmetric and asymmetric encryption and where each is used',
          'Outline what the TLS handshake achieves (auth, key exchange, integrity)',
          'Classify packet-filtering vs application-layer firewalls and name core attack types',
        ],
        hook:
          'The padlock in the address bar is three ideas stacked: asymmetric crypto to prove identity and share a secret, symmetric crypto to encrypt the bulk fast, and a firewall somewhere in the middle deciding what may pass. Interviewers pull on any one thread.',
        concept: `**Crypto foundations:**
- **Symmetric** (AES, ChaCha20, DES/3DES legacy): one shared key encrypts and decrypts. Fast — used for the data itself. Problem: how do two strangers share the key?
- **Asymmetric** (RSA, ECC, Ed25519): key pair — public key encrypts (or verifies), private key decrypts (or signs). Slower; solves key exchange and signatures.
- **Hashing** (SHA-256): one-way fixed digest — integrity, not confidentiality.
- **Hybrid in practice:** asymmetric protects a pre-master secret; both sides derive symmetric session keys.

**TLS 1.3 handshake (simplified, exam-friendly):**
1. ClientHello (supported ciphers, key share) → ServerHello + certificate.
2. Client verifies certificate chain against a trusted CA, authenticates the server (and optionally mutual TLS).
3. Key exchange derives shared session keys; Finished messages verify integrity of the handshake.
4. Application data flows encrypted with symmetric keys (integrity via AEAD — encryption + MAC together).

**HTTPS = HTTP over TLS.** Certificate binds domain name to public key — that binding is what stops trivial MITM.

**Firewalls:**
- **Packet filtering (layer 3/4):** rules on src/dst IP, port, protocol; fast, blind to payload.
- **Stateful:** tracks connections (knows SYN/ACK belongs to an established flow).
- **Application/NGFW (layer 7):** inspects actual HTTP/TLS SNI content; can block URLs/apps.
- **DMZ:** semi-trusted zone between internet and internal network for public servers.

**Attack taxonomy:**
- **MITM:** attacker relays and can alter traffic (defeated by TLS authentication).
- **Sniffing:** promiscuous capture on shared media (Wi-Fi legacy WEP broken; use WPA3).
- **DoS/DDoS:** exhaust resources; distributed botnets; mitigated by scrubbing/CDN/anycast.
- **Injection/spoofing:** IP spoofing, DNS spoofing/cache poisoning (Kaminsky-style randomness matters).
- **Password attacks:** brute force vs credential stuffing; countermeasures = rate limits + MFA.`,
        extras: [
          table('Mechanism', ['Key type', 'Primary job'], [
            ['Symmetric (AES)', 'One shared key', 'Bulk data encryption (fast)'],
            ['Asymmetric (RSA/ECC)', 'Public + private', 'Key exchange, signatures, auth'],
            ['Hash (SHA-256)', 'None', 'Integrity fingerprints'],
          ]),
          tip(
            'TLS authenticates via certificates, not encryption itself',
            'Encryption hides data; the certificate chain is what proves who you are talking to.',
          ),
          warn(
            'DoS vs DDoS',
            'DoS = one source; DDoS = distributed botnet — mitigation differs (scale matters).',
          ),
        ],
        worked: {
          title: 'Where does each crypto type run in HTTPS?',
          problem: 'Map certificate verification, session-key exchange and page data encryption to symmetric/asymmetric.',
          steps: [
            { title: 'Certificate check', desc: 'Server RSA/ECDSA signature over its cert verified with the CA public key — asymmetric.' },
            { title: 'Key exchange', desc: 'Ephemeral Diffie-Hellman (in TLS 1.3 key share) derives the pre-master secret — asymmetric family, forward secrecy.' },
            { title: 'Session keys', desc: 'Both sides derive identical symmetric keys from the shared secret.' },
            { title: 'Page data', desc: 'HTTP body encrypted with AES-GCM (symmetric AEAD) — fast enough for video.' },
            { title: 'Integrity', desc: 'AEAD tag detects tampering on every record.' },
          ],
          solution: 'Asymmetric for identity and key agreement; symmetric for the actual traffic.',
        },
        practice: {
          title: 'Firewall choice',
          prompt: 'You must block a specific malware URL path inside HTTPS traffic. Packet filtering or layer-7 firewall — and what else do you need?',
          hint: 'Deep inspection of application content implies terminating or proxying TLS.',
        },
        mistakes: [
          {
            mistake: 'Saying encryption alone proves the server identity',
            fix: 'Anyone can encrypt; certificates + chain validation prove identity.',
          },
          {
            mistake: 'Calling hashing encryption',
            fix: 'Hashes are one-way and not reversible — integrity, not confidentiality.',
          },
        ],
        exam: {
          question: 'Differentiate symmetric and asymmetric encryption with one example of each.',
          answer: 'Symmetric: one shared key (AES) — fast bulk data. Asymmetric: public/private pair (RSA) — key exchange and signatures.',
          source: 'Standard 6-mark question.',
        },
        summary: [
          'Symmetric = speed, asymmetric = trust bootstrap and signatures.',
          'TLS: certificate auth + key exchange + AEAD-encrypted application data.',
          'Firewalls progress: packet filter → stateful → layer-7; TLS + MFA defeat most classics.',
        ],
      }),
      [
        [
          'Which pair is asymmetric?',
          ['AES and ChaCha20', 'RSA and ECC', 'SHA-256 and MD5', 'DH and AES'],
          1,
          'Public/private key pairs.',
        ],
        [
          'The main defence against man-in-the-middle on HTTPS is:',
          ['Long passwords', 'Certificate chain validation against trusted CAs', 'Firewall rules', 'UDP source ports'],
          1,
          'Authenticity of the key binding.',
        ],
        [
          'A firewall that can read HTTP paths inside TLS must be:',
          ['A pure packet filter', 'An application-layer / NGFW (with TLS visibility)', 'A hub', 'A DNS resolver'],
          1,
          'Payload inspection requires L7 awareness.',
        ],
      ]
    ),
    lesson(
      M4,
      'cn-4-2',
      2,
      'Wireless, SDN & Modern Delivery',
      'Wi-Fi generations at a glance, 4G/5G concepts, software-defined networking, load balancing, and how CDNs put content near you.',
      12,
      nineBlocks({
        objectives: [
          'Summarise Wi-Fi evolution (WEP→WPA3) and why each generation existed',
          'Explain what SDN separates (control vs data plane) and why it matters',
          'Describe how a CDN and load balancer reduce latency and add resilience',
        ],
        hook:
          'A user in Chennai watches a lecture served from an edge node 10 km away while the origin server sits in Virginia — that is a CDN. The exam version and the interview version are the same answer: put bits close to the consumer.',
        concept: `**Wi-Fi (IEEE 802.11):**
- Standards: 802.11a/b/g/n/ac/ax (Wi-Fi 4/5/6/6E) — more channels, MIMO, OFDMA, higher modulation.
- Security evolution: **WEP** (broken, static keys) → **WPA** (TKIP, temporary fix) → **WPA2** (CCMP/AES, the long-time standard) → **WPA3** (SAE handshake, resistant to offline dictionary attacks).
- CSMA/CA: wireless cannot sense collisions reliably (hidden node), so senders avoid collisions instead of detecting them (RTS/CTS optional).

**Cellular (4G/5G) concepts:** cell towers, handover between cells, spectrum bands; 4G = all-IP packet core; 5G = eMBB (speed), URLLC (ultra-reliable low latency), mMTC (massive IoT); network slicing gives virtual networks with different guarantees on shared infrastructure.

**SDN (Software-Defined Networking):**
- Separates **control plane** (routing decisions) from **data plane** (packet forwarding) from centralised controllers with programmable flow tables.
- Network becomes software: central view, fast reconfiguration, easier automation; traditional routers bundle both planes per device.

**Load balancing:** distribute requests across servers (round robin, least connections, consistent hashing); health checks; horizontal scale. L4 (TCP connections) vs L7 (HTTP routing, cookies, paths).

**CDN (Content Delivery Network):**
- Cache static content at edge PoPs near users; DNS steers you to the nearest edge.
- Reduces latency (shorter RTT), absorbs traffic spikes, origin stays protected.
- Dynamic content: edge compute / cache-busting; cache headers (max-age, ETag) control reuse.

**Cloud networking ideas:** VPC, subnets, security groups (stateful firewall rules), gateways, anycast routing — same primitives, different branding.`,
        extras: [
          table('Gen', ['Key idea', 'Security note'], [
            ['WEP', 'First Wi-Fi encryption', 'Broken — never use'],
            ['WPA', 'TKIP stopgap', 'Deprecated'],
            ['WPA2', 'CCMP/AES', 'Standard for a decade'],
            ['WPA3', 'SAE handshake', 'Resists offline cracking'],
          ]),
          tip(
            'CDN in one sentence',
            'Cache at the edge + DNS steering = content delivered from near the user.',
          ),
          warn(
            '5G is not only "faster"',
            'URLLC and mMTC matter as much as eMBB in exams and interviews.',
          ),
        ],
        worked: {
          title: 'A request through a CDN',
          problem: 'A student in Pune loads a course thumbnail. Trace the request with a CDN in front.',
          steps: [
            { title: 'DNS', desc: 'Asset hostname resolves via CDN authoritative DNS to the nearest edge PoP (geo/DNS steering).' },
            { title: 'Edge hit', desc: 'Edge has the object cached (fresh per max-age) → served directly over TLS; origin not contacted.' },
            { title: 'Cache miss', desc: 'Edge fetches from origin (or a mid-tier cache), stores it, then serves the student.' },
            { title: 'Latency', desc: 'RTT drops from international to city-scale — noticeable page-load win.' },
            { title: 'Invalidation', desc: 'Origin purge/short TTL updates the object; ETag revalidation avoids full re-download.' },
          ],
          solution: 'DNS → nearest edge → cache hit serves locally; miss pulls from origin then caches.',
        },
        practice: {
          title: 'SDN planes',
          prompt: 'Name the two planes SDN separates and one benefit of centralising one of them.',
          hint: 'Decisions vs forwarding.',
        },
        mistakes: [
          {
            mistake: 'Calling WPA/WEP secure today',
            fix: 'WEP is cryptographically broken; WPA is deprecated — WPA2 minimum, WPA3 preferred.',
          },
          {
            mistake: 'Saying a CDN caches everything by default',
            fix: 'Only cacheable responses per cache headers; dynamic/ personalised data needs explicit strategies.',
          },
        ],
        exam: {
          question: 'What is the main idea of SDN?',
          answer: 'Separate the control plane from the data plane and centralise network control in programmable software controllers.',
          source: 'Modern networks short question.',
        },
        summary: [
          'Wi-Fi security: WEP broken → WPA2 baseline → WPA3 preferred.',
          'SDN = control plane centralised in software; data plane just forwards.',
          'CDNs and load balancers cut latency and add resilience by design.',
        ],
      }),
      [
        [
          'The secure modern replacement for WPA2 is:',
          ['WEP', 'WPA', 'WPA3', 'Bluetooth pairing'],
          2,
          'WPA3 SAE resists offline dictionary attacks.',
        ],
        [
          'SDN primarily separates:',
          ['MAC from IP', 'Control plane from data plane', 'TCP from UDP', 'Public from private keys'],
          1,
          'Centralised programmable control.',
        ],
        [
          'A CDN reduces latency mainly by:',
          ['Compressing every image to 1 bit', 'Serving content from edge caches near the user', 'Switching everyone to HTTP/1.0', 'Removing DNS'],
          1,
          'Shorter RTT + cached objects.',
        ],
      ]
    ),
  ],
};
