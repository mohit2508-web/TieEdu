import fs from 'fs';
import path from 'path';

export interface ReportItem {
  id: string;
  company_id: string;
  company_name?: string;
  user_id?: string | null;
  user_name: string;
  user_role: string;
  rounds: {
    round_name: string;
    difficulty: string;
    summary: string;
    matched_questions: boolean;
  }[];
  accuracy_rating: number | null;
  outcome: 'selected' | 'rejected' | 'pending' | null;
  status: 'pending_review' | 'published' | 'rejected';
  salary_lpa?: number;
  created_at: string;
}

export interface BlockContentPayload {
  company_name: string;
  round_title: string;
  question_text: string;
  block_type: 'markdown' | 'code' | 'diagram' | 'callout';
  payload_content: string;
}

export interface ModulePdf {
  id: string;
  file_name: string;
  stored_name: string;
  size_bytes: number;
  title: string;
  uploaded_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  xp?: number;
  streak?: number;
  college?: string;
  badge?: string;
  avatar?: string;
  license_id?: string;
  roll_no?: string;
  disabled?: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
}

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const initialDbData = {
  companies: [
    {
      id: 'comp-1',
      slug: 'zscaler',
      name: 'Zscaler',
      logo_url: '',
      industry: 'Cybersecurity & Cloud Security',
      tags: ['Network Security', 'Zero Trust', 'Cloud SaaS'],
      difficulty_rating: 4,
      avg_process_days: 14,
      avg_rounds: 4,
      ctc_min: 18,
      ctc_max: 32,
      unlock_count: 0,
      accuracy_score: 94,
      last_updated_days_ago: 2,
      status: 'published',
      seo_title: 'Zscaler Interview Questions & Vault | TieEdu',
      seo_description: 'Verified round-by-round interview intelligence, HR Qs, Technical DSA bank, and Zero Trust system design guides for Zscaler.',
      trust_stats: {
        rating: 0,
        rating_count: 0,
        weekly_unlocks: 0,
        verified_by_role: null,
        recency_label: 'Updated for 2026 Hiring Season',
        accuracy_rate: 0
      },
      rounds_pipeline: [
        { step_number: 1, title: 'Round 1: Online Assessment', subtitle: '90 Mins • 2 DSA + 10 MCQs', round_type: 'OA', difficulty: 'medium', module_count: 3 },
        { step_number: 2, title: 'Round 2: Technical R1', subtitle: 'Core OS, Networks & Kernel', round_type: 'Technical', difficulty: 'hard', module_count: 4 },
        { step_number: 3, title: 'Round 3: System Design R2', subtitle: 'Zero Trust Proxy & Rate Limiter', round_type: 'SystemDesign', difficulty: 'hard', module_count: 2 },
        { step_number: 4, title: 'Round 4: HR & Behavioral', subtitle: 'STAR Model & Cultural Fit', round_type: 'HR', difficulty: 'easy', module_count: 2 }
      ],
      modules: [
        {
          id: 'mod-1-1',
          company_id: 'comp-1',
          module_type: 'preparation_guide',
          round_type: 'OA',
          title: 'Zscaler Recruitment Overview & Preparation Strategy',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-1-1-1',
              module_id: 'mod-1-1',
              question_text: 'What is Zscaler hiring pattern & round breakdown?',
              is_free_preview: true,
              difficulty: 'easy',
              role_tag: 'SDE-1 Security',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 8,
              upvotes_count: 45,
              blocks: [
                {
                  id: 'b-1-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Zscaler Hiring Process\nZscaler recruits for Security Software Engineer, Cloud Network Engineer, and Frontend/Backend SDE roles. Process takes ~14 days.\n\n- **Stage 1:** Online Assessment (2 DSA Questions - 90 mins)\n- **Stage 2:** Technical Round 1 (Core OS, Computer Networks, Linux Kernel)\n- **Stage 3:** Technical Round 2 (System Design & Distributed Systems)\n- **Stage 4:** HR & Culture Fit Round`
                  }
                },
                {
                  id: 'b-1-1-2',
                  block_type: 'diagram',
                  block_order: 2,
                  payload: {
                    source: `flowchart LR\n  A[Online Assessment] --> B[Technical Round 1: OS & Networking]\n  B --> C[Technical Round 2: System Design]\n  C --> D[HR & Culture Fit]`
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'mod-1-2',
          company_id: 'comp-1',
          module_type: 'technical_question',
          title: 'Technical Round 1: Core Networking & Operating Systems',
          sort_order: 2,
          is_premium: true,
          items: [
            {
              id: 'item-1-2-1',
              module_id: 'mod-1-2',
              question_text: 'How does Zscaler Zero Trust Exchange differ from traditional VPN architecture?',
              is_free_preview: true,
              difficulty: 'medium',
              role_tag: 'SDE-1 Security',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 14,
              upvotes_count: 89,
              blocks: [
                {
                  id: 'b-1-2-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Core Concept Breakdown\nTraditional VPNs grant network-level access. **Zscaler Zero Trust Exchange (ZTE)** reverses this model completely by enforcing identity-based proxy connections outbound to ZEN nodes.`
                  }
                },
                {
                  id: 'b-1-2-2',
                  block_type: 'diagram',
                  block_order: 2,
                  payload: {
                    source: `flowchart TD\n  Client[User Laptop] -->|TLS Proxy| ZEN[Zscaler Enforcement Node]\n  ZEN -->|Policy Validation| ZPA[App Connector]\n  ZPA -->|TLS Tunnel| App[Internal App]`
                  }
                }
              ]
            },
            {
              id: 'item-1-2-2',
              module_id: 'mod-1-2',
              question_text: 'Implement a Thread-Safe LRU Cache in C++ / Java with O(1) ops',
              is_free_preview: false,
              difficulty: 'hard',
              role_tag: 'Systems Engineer',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 6,
              upvotes_count: 34,
              blocks: [
                {
                  id: 'b-1-2-3',
                  block_type: 'code',
                  block_order: 1,
                  payload: {
                    language: 'cpp',
                    code: `class ThreadSafeLRUCache {\n    int capacity;\n    std::mutex mtx;\n    std::list<pair<int, int>> items;\n    unordered_map<int, decltype(items.begin())> cache;\npublic:\n    ThreadSafeLRUCache(int cap) : capacity(cap) {}\n    int get(int key) {\n        std::lock_guard<std::mutex> lock(mtx);\n        auto it = cache.find(key);\n        if (it == cache.end()) return -1;\n        items.splice(items.begin(), items, it->second);\n        return it->second->second;\n    }\n};`
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'mod-1-3',
          company_id: 'comp-1',
          module_type: 'hr_question',
          title: 'HR & Behavioral Round Questions',
          sort_order: 3,
          is_premium: false,
          items: [
            {
              id: 'item-1-3-1',
              module_id: 'mod-1-3',
              question_text: 'Why do you want to work in cloud security at Zscaler?',
              is_free_preview: true,
              difficulty: 'easy',
              role_tag: 'All Roles',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 3,
              upvotes_count: 22,
              blocks: [
                {
                  id: 'b-1-3-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Winning STAR Model Answer\n- **Situation:** Noticed traditional perimeters fail with remote work during internship.\n- **Task:** Wanted to specialize in cloud-native inline zero trust proxies.\n- **Action:** Studied Zscaler ZEN architecture, proxy forwarding, and TLS inspection at scale.\n- **Result:** Ready to solve zero-trust scale challenges directly at Zscaler.`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'comp-2',
      slug: 'palo-alto-networks',
      name: 'Palo Alto Networks',
      logo_url: '',
      industry: 'Enterprise Security & Firewall',
      tags: ['Prisma Cloud', 'PAN-OS', 'Threat Intelligence'],
      difficulty_rating: 4,
      avg_process_days: 18,
      avg_rounds: 5,
      ctc_min: 20,
      ctc_max: 36,
      unlock_count: 0,
      accuracy_score: 91,
      last_updated_days_ago: 4,
      status: 'published',
      seo_title: 'Palo Alto Networks Interview Intelligence | TieEdu',
      seo_description: 'Complete Palo Alto Networks interview vault including PAN-OS architecture questions, DSA problems, and compensation insights.',
      modules: [
        {
          id: 'mod-2-1',
          company_id: 'comp-2',
          module_type: 'preparation_guide',
          title: 'Palo Alto Networks Complete Preparation Guide',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-2-1-1',
              module_id: 'mod-2-1',
              question_text: 'How to prepare for Palo Alto Networks Technical & Systems Rounds?',
              is_free_preview: true,
              difficulty: 'medium',
              role_tag: 'SDE-1 Security',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 12,
              upvotes_count: 55,
              blocks: [
                {
                  id: 'b-2-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Overview & Strategy\nPalo Alto Networks tests Linux Kernel Internals, Packet Inspection, socket programming, graph algorithms, and rate limiters.\nFocus areas:\n1. Socket Programming & Linux epoll\n2. Graph algorithms & Trie structures for IP matching\n3. Distributed Log Analytics system design`
                  }
                },
                {
                  id: 'b-2-1-2',
                  block_type: 'diagram',
                  block_order: 2,
                  payload: {
                    source: `flowchart TD\n  A[OA: 3 Graph/DP Questions] --> B[Tech 1: C++/Linux Socket Programming]\n  B --> C[Tech 2: Data Plane & Rate Limiting]\n  C --> D[System Design: Prisma Log Stream]\n  D --> E[Managerial & Behavioral]`
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'mod-2-2',
          company_id: 'comp-2',
          module_type: 'system_design',
          title: 'System Design: Distributed Threat Intelligence & Log Aggregator',
          sort_order: 2,
          is_premium: true,
          items: [
            {
              id: 'item-2-2-1',
              module_id: 'mod-2-2',
              question_text: 'Design a Real-Time Threat Intelligence Feed Collector handling 500,000 logs/sec',
              is_free_preview: true,
              difficulty: 'hard',
              role_tag: 'Backend / Systems SDE',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 9,
              upvotes_count: 76,
              blocks: [
                {
                  id: 'b-2-2-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### System Architecture Breakdown\n1. **Ingestion Layer:** Kafka cluster partitioned by IP Subnet Hash.\n2. **Processing Layer:** Flink streaming pipeline performing CIDR subnet lookup using compressed Trie.\n3. **Storage Layer:** ClickHouse for real-time analytics + S3 cold storage.`
                  }
                },
                {
                  id: 'b-2-2-2',
                  block_type: 'diagram',
                  block_order: 2,
                  payload: {
                    source: `flowchart LR\n  Firewall[PAN-OS Firewall] -->|Syslog| Ingest[Kafka Ingest Cluster]\n  Ingest --> Flink[Apache Flink Analytics]\n  Flink --> Trie[Prefix Trie IP Lookup]\n  Flink --> DB[(ClickHouse Analytics)]`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'comp-3',
      slug: 'razorpay',
      name: 'Razorpay',
      logo_url: '',
      industry: 'Fintech & Payment Gateway',
      tags: ['Payment Infrastructure', 'Microservices', 'Distributed Systems'],
      difficulty_rating: 4,
      avg_process_days: 12,
      avg_rounds: 4,
      ctc_min: 16,
      ctc_max: 28,
      unlock_count: 0,
      accuracy_score: 95,
      last_updated_days_ago: 1,
      status: 'published',
      seo_title: 'Razorpay Interview Vault & System Design | TieEdu',
      seo_description: 'Verified Razorpay hiring process questions, idempotent payment system design, and SDE interview breakdowns.',
      modules: [
        {
          id: 'mod-3-1',
          company_id: 'comp-3',
          module_type: 'preparation_guide',
          title: 'Razorpay Hiring Guide & Machine Coding Blueprint',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-3-1-1',
              module_id: 'mod-3-1',
              question_text: 'What to expect in Razorpay Machine Coding Round?',
              is_free_preview: true,
              difficulty: 'medium',
              role_tag: 'SDE-1 / SDE-2',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 18,
              upvotes_count: 112,
              blocks: [
                {
                  id: 'b-3-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Razorpay Machine Coding Guidelines\nYou will be asked to code a clean, working object-oriented application in 90 minutes (e.g. Splitwise, Rate Limiter, Payment Gateway Router).\n- Code must run with unit tests.\n- Use OOP design patterns (Strategy, Factory, Singleton).\n- Handle edge cases and concurrency.`
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'mod-3-2',
          company_id: 'comp-3',
          module_type: 'system_design',
          title: 'System Design: Idempotent Payment Settlement Gateway',
          sort_order: 2,
          is_premium: true,
          items: [
            {
              id: 'item-3-2-1',
              module_id: 'mod-3-2',
              question_text: 'Design an Idempotent Payment Webhook Processing Handler',
              is_free_preview: true,
              difficulty: 'hard',
              role_tag: 'Backend SDE-2',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 15,
              upvotes_count: 98,
              blocks: [
                {
                  id: 'b-3-2-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: "### Idempotency Key Pattern\nTo prevent double debits during network retries:\n- Client sends unique Idempotency-Key header.\n- Redis stores key with atomic SETNX lock.\n- If key exists, return cached response directly."
                  }
                },
                {
                  id: 'b-3-2-2',
                  block_type: 'code',
                  block_order: 2,
                  payload: {
                    language: 'typescript',
                    code: `async function processPayment(req, res) {\n  const idempotencyKey = req.headers['idempotency-key'];\n  const isNew = await redis.set(idempotencyKey, 'LOCKED', 'NX', 'EX', 60);\n  if (!isNew) {\n    const existingResult = await redis.get(\`result:\${idempotencyKey}\`);\n    return res.status(200).json(JSON.parse(existingResult));\n  }\n  // Perform actual charge...\n  const result = await bankApi.charge(req.body);\n  await redis.set(\`result:\${idempotencyKey}\`, JSON.stringify(result));\n  res.json(result);\n}`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'comp-4',
      slug: 'tcs',
      name: 'TCS (Tata Consultancy Services)',
      logo_url: '',
      industry: 'IT Services & Consulting',
      tags: ['TCS NQT', 'Digital', 'Prime', 'Ninja'],
      difficulty_rating: 2,
      avg_process_days: 10,
      avg_rounds: 3,
      ctc_min: 3.36,
      ctc_max: 9.0,
      unlock_count: 0,
      accuracy_score: 97,
      last_updated_days_ago: 1,
      status: 'published',
      seo_title: 'TCS NQT & Digital Interview Preparation Guide 2026 | TieEdu',
      seo_description: 'Crack TCS NQT Ninja, Digital & Prime cadres with repeated coding questions, aptitude patterns, and HR questions.',
      modules: [
        {
          id: 'mod-4-1',
          company_id: 'comp-4',
          module_type: 'preparation_guide',
          title: 'TCS NQT Test Pattern & Cadre Selection',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-4-1-1',
              module_id: 'mod-4-1',
              question_text: 'What is the difference between TCS Ninja, Digital, and Prime cadres?',
              is_free_preview: true,
              difficulty: 'easy',
              role_tag: 'Freshers 2025/2026',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 42,
              upvotes_count: 210,
              blocks: [
                {
                  id: 'b-4-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### TCS Cadres Breakdown\n- **Ninja Cadre:** 3.36 - 3.6 LPA (Foundation NQT cleared)\n- **Digital Cadre:** 7.0 - 7.5 LPA (Advanced NQT cleared)\n- **Prime Cadre:** 9.0 - 11.5 LPA (Top percentile in Advanced Coding + AI/ML Qs)`
                  }
                },
                {
                  id: 'b-4-1-2',
                  block_type: 'diagram',
                  block_order: 2,
                  payload: {
                    source: `flowchart TD\n  NQT[TCS NQT Test] -->|Foundation Score| Ninja[Ninja Offer: 3.6 LPA]\n  NQT -->|Advanced Coding Score| Digital[Digital Offer: 7.0 LPA]\n  NQT -->|Top 1% Score| Prime[Prime Offer: 9.0 LPA]`
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'mod-4-2',
          company_id: 'comp-4',
          module_type: 'dsa_question',
          title: 'TCS Digital/Prime Advanced Coding Questions',
          sort_order: 2,
          is_premium: false,
          items: [
            {
              id: 'item-4-2-1',
              module_id: 'mod-4-2',
              question_text: 'Find the Minimum Number of Swaps required to Sort an Array',
              is_free_preview: true,
              difficulty: 'medium',
              role_tag: 'Digital / Prime',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 19,
              upvotes_count: 88,
              blocks: [
                {
                  id: 'b-4-2-1',
                  block_type: 'code',
                  block_order: 1,
                  payload: {
                    language: 'java',
                    code: `import java.util.*;\npublic class MinSwaps {\n    public static int minSwaps(int[] arr) {\n        int n = arr.length;\n        ArrayList<Pair<Integer, Integer>> list = new ArrayList<>();\n        for (int i = 0; i < n; i++) list.add(new Pair<>(arr[i], i));\n        list.sort(Comparator.comparingInt(a -> a.getKey()));\n        boolean[] vis = new boolean[n];\n        int ans = 0;\n        for (int i = 0; i < n; i++) {\n            if (vis[i] || list.get(i).getValue() == i) continue;\n            int cycle_size = 0, j = i;\n            while (!vis[j]) {\n                vis[j] = true;\n                j = list.get(j).getValue();\n                cycle_size++;\n            }\n            if (cycle_size > 0) ans += (cycle_size - 1);\n        }\n        return ans;\n    }\n}`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'comp-5',
      slug: 'infosys',
      name: 'Infosys',
      logo_url: '',
      industry: 'IT Services & Consulting',
      tags: ['InfyTQ', 'HackWithInfy', 'SP / DSE'],
      difficulty_rating: 3,
      avg_process_days: 12,
      avg_rounds: 3,
      ctc_min: 3.6,
      ctc_max: 9.5,
      unlock_count: 0,
      accuracy_score: 95,
      last_updated_days_ago: 2,
      status: 'published',
      seo_title: 'Infosys HackWithInfy & Specialist Programmer Guide | TieEdu',
      seo_description: 'Infosys SP (Specialist Programmer - 9.5 LPA) and DSE (Digital Specialist Engineer - 6.2 LPA) interview vaults.',
      modules: [
        {
          id: 'mod-5-1',
          company_id: 'comp-5',
          module_type: 'preparation_guide',
          title: 'Infosys HackWithInfy & SP Role Roadmap',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-5-1-1',
              module_id: 'mod-5-1',
              question_text: 'How to crack Infosys Specialist Programmer (9.5 LPA) round?',
              is_free_preview: true,
              difficulty: 'medium',
              role_tag: 'Specialist Programmer',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 24,
              upvotes_count: 140,
              blocks: [
                {
                  id: 'b-5-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Specialist Programmer (SP) Prep Strategy\n1. Master Dynamic Programming (Knapsack, LCS, Matrix Chain Multiplication).\n2. Graph algorithms: Dijkstra, Disjoint Set Union (DSU).\n3. Expect 3 questions in 3 hours during HackWithInfy Round 2.`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'comp-6',
      slug: 'google',
      name: 'Google',
      logo_url: '',
      industry: 'Big Tech & Cloud',
      tags: ['FAANG', 'Google L3', 'Google L4', 'System Design'],
      difficulty_rating: 5,
      avg_process_days: 35,
      avg_rounds: 6,
      ctc_min: 32,
      ctc_max: 65,
      unlock_count: 0,
      accuracy_score: 98,
      last_updated_days_ago: 1,
      status: 'published',
      seo_title: 'Google SDE L3/L4 Interview Questions & Vault | TieEdu',
      seo_description: 'Verified Google coding rounds, Googliness & Leadership scenarios, and Large Scale Distributed System Design diagrams.',
      modules: [
        {
          id: 'mod-6-1',
          company_id: 'comp-6',
          module_type: 'preparation_guide',
          title: 'Google Hiring Process & Round Breakdown (L3/L4)',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-6-1-1',
              module_id: 'mod-6-1',
              question_text: 'What is Google 6-round hiring flow and HC (Hiring Committee) evaluation?',
              is_free_preview: true,
              difficulty: 'hard',
              role_tag: 'Software Engineer L3/L4',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 38,
              upvotes_count: 340,
              blocks: [
                {
                  id: 'b-6-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Google Recruitment Flow\n- **Phone Screen (45 mins):** 1 LeetCode Hard DSA problem.\n- **Onsite Round 1 & 2:** Algorithms & Data Structures (Graphs, DP, Trees).\n- **Onsite Round 3:** System Design & Scalability (L4+) or Advanced DSA (L3).\n- **Googliness & Leadership:** Behavioral scenarios evaluated against 4 Google core principles.`
                  }
                },
                {
                  id: 'b-6-1-2',
                  block_type: 'diagram',
                  block_order: 2,
                  payload: {
                    source: `flowchart LR\n  A[Phone Screen] --> B[Onsite 1: Algorithms]\n  B --> C[Onsite 2: Algorithms]\n  C --> D[Onsite 3: System Design]\n  D --> E[Googliness & Leadership]\n  E --> F[Hiring Committee HC Approval]`
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'mod-6-2',
          company_id: 'comp-6',
          module_type: 'dsa_question',
          title: 'Google Recent DSA Problem Bank',
          sort_order: 2,
          is_premium: true,
          items: [
            {
              id: 'item-6-2-1',
              module_id: 'mod-6-2',
              question_text: 'Design a Distributed Rate Limiter for Google Search API (Sliding Window Log)',
              is_free_preview: true,
              difficulty: 'hard',
              role_tag: 'SDE L4',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 22,
              upvotes_count: 185,
              blocks: [
                {
                  id: 'b-6-2-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Sliding Window Log Algorithm\nStore timestamps in Redis Sorted Set (\`ZADD\`). Remove elements older than \`current_time - window_size\` (\`ZREMRANGEBYSCORE\`).`
                  }
                },
                {
                  id: 'b-6-2-2',
                  block_type: 'code',
                  block_order: 2,
                  payload: {
                    language: 'python',
                    code: "import time, redis\nr = redis.Redis()\ndef is_allowed(user_id, limit=100, window=60):\n    now = time.time()\n    key = f'rate:{user_id}'\n    pipe = r.pipeline()\n    pipe.zremrangebyscore(key, 0, now - window)\n    pipe.zcard(key)\n    pipe.zadd(key, {now: now})\n    pipe.expire(key, window)\n    res = pipe.execute()\n    return res[1] < limit"
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'mod-6-3',
          company_id: 'comp-6',
          module_type: 'hr_question',
          title: 'Googliness & Leadership Round Scenarios',
          sort_order: 3,
          is_premium: false,
          items: [
            {
              id: 'item-6-3-1',
              module_id: 'mod-6-3',
              question_text: 'Tell me about a time you pushed back against a senior colleague product decision.',
              is_free_preview: true,
              difficulty: 'medium',
              role_tag: 'All Google Candidates',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 14,
              upvotes_count: 95,
              blocks: [
                {
                  id: 'b-6-3-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Googliness Evaluation Rubric\nGoogle looks for **intellectual humility, psychological safety, and data-driven debate**.\n- Framework: State disagreement respectfully, present data/benchmarks, test hypothesis with A/B experiment, align on user impact.`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'comp-7',
      slug: 'microsoft',
      name: 'Microsoft',
      logo_url: '',
      industry: 'Enterprise Tech & Cloud',
      tags: ['Azure', 'SDE-1', 'SDE-2', 'AA Round'],
      difficulty_rating: 4,
      avg_process_days: 20,
      avg_rounds: 5,
      ctc_min: 24,
      ctc_max: 48,
      unlock_count: 0,
      accuracy_score: 96,
      last_updated_days_ago: 3,
      status: 'published',
      seo_title: 'Microsoft SDE Interview Questions & As-Appropriate Round | TieEdu',
      seo_description: 'Microsoft hiring rounds, AA (As-Appropriate) Bar Raiser interview questions, and Azure Cloud system design.',
      modules: [
        {
          id: 'mod-7-1',
          company_id: 'comp-7',
          module_type: 'preparation_guide',
          title: 'Microsoft Hiring Process & AA (As-Appropriate) Round Strategy',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-7-1-1',
              module_id: 'mod-7-1',
              question_text: 'What is Microsoft AA (As-Appropriate / Bar Raiser) Round?',
              is_free_preview: true,
              difficulty: 'hard',
              role_tag: 'SDE-1 / SDE-2',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 16,
              upvotes_count: 130,
              blocks: [
                {
                  id: 'b-7-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Understanding Microsoft AA Round\nThe AA interviewer is a Senior Partner/Principal SDE outside your prospective team who holds veto power. They assess long-term growth, culture fit, and systemic problem solving.`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'comp-8',
      slug: 'amazon',
      name: 'Amazon',
      logo_url: '',
      industry: 'E-commerce & AWS Cloud',
      tags: ['16 Leadership Principles', 'Bar Raiser', 'AWS SDE'],
      difficulty_rating: 4,
      avg_process_days: 25,
      avg_rounds: 5,
      ctc_min: 28,
      ctc_max: 52,
      unlock_count: 0,
      accuracy_score: 97,
      last_updated_days_ago: 1,
      status: 'published',
      seo_title: 'Amazon 16 Leadership Principles & SDE Vault | TieEdu',
      seo_description: 'Master Amazon 16 Leadership Principles with STAR stories, Bar Raiser interview questions, and AWS system design guides.',
      modules: [
        {
          id: 'mod-8-1',
          company_id: 'comp-8',
          module_type: 'preparation_guide',
          title: 'Amazon 16 Leadership Principles Masterclass',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-8-1-1',
              module_id: 'mod-8-1',
              question_text: 'How to map STAR stories to Amazon 16 Leadership Principles (Customer Obsession, Ownership, Bias for Action)?',
              is_free_preview: true,
              difficulty: 'medium',
              role_tag: 'AWS / Retail SDE',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 45,
              upvotes_count: 290,
              blocks: [
                {
                  id: 'b-8-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Amazon 16 Leadership Principles Framework\nEvery single technical interviewer at Amazon reserves 15-20 minutes for Leadership Principle STAR questions.\n- Top LPs tested: Customer Obsession, Ownership, Dive Deep, Bias for Action, Have Backbone; Disagree & Commit.`
                  }
                },
                {
                  id: 'b-8-1-2',
                  block_type: 'diagram',
                  block_order: 2,
                  payload: {
                    source: `flowchart TD\n  Situation[1. Situation: Set context & metrics]\n  Task[2. Task: Your specific responsibility]\n  Action[3. Action: Deep-dive steps you took]\n  Result[4. Result: Quantifiable business outcome]`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'comp-9',
      slug: 'adobe',
      name: 'Adobe',
      logo_url: '',
      industry: 'Creative Cloud & Document Cloud',
      tags: ['C++', 'Graphics Engine', 'SDE-1'],
      difficulty_rating: 4,
      avg_process_days: 15,
      avg_rounds: 4,
      ctc_min: 22,
      ctc_max: 42,
      unlock_count: 0,
      accuracy_score: 94,
      last_updated_days_ago: 3,
      status: 'published',
      seo_title: 'Adobe Interview Questions & C++ DSA Vault | TieEdu',
      seo_description: 'Adobe Member of Technical Staff (MTS) interview questions, C++ memory optimization, and tree/graph DSA bank.',
      modules: [
        {
          id: 'mod-9-1',
          company_id: 'comp-9',
          module_type: 'preparation_guide',
          title: 'Adobe MTS-1 Preparation & Technical Focus',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-9-1-1',
              module_id: 'mod-9-1',
              question_text: 'What topics are heavily asked in Adobe MTS technical interviews?',
              is_free_preview: true,
              difficulty: 'medium',
              role_tag: 'MTS-1',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 11,
              upvotes_count: 67,
              blocks: [
                {
                  id: 'b-9-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Adobe Core Technical Focus\n- C++ Smart Pointers & Memory Management\n- Segment Trees & Quad Trees (Spatial Indexing for Graphics)\n- Multi-threaded rendering pipelines.`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'comp-10',
      slug: 'capgemini',
      name: 'Capgemini',
      logo_url: '',
      industry: 'IT Consulting & Services',
      tags: ['Exceller Program', 'Senior Analyst', 'Consulting'],
      difficulty_rating: 2,
      avg_process_days: 7,
      avg_rounds: 3,
      ctc_min: 4.2,
      ctc_max: 7.5,
      unlock_count: 0,
      accuracy_score: 96,
      last_updated_days_ago: 1,
      status: 'published',
      seo_title: 'Capgemini Exceller Interview Questions & Pseudo Code Guide | TieEdu',
      seo_description: 'Crack Capgemini Exceller drive with pseudo-code MCQs, coding questions, and technical interview questions.',
      modules: [
        {
          id: 'mod-10-1',
          company_id: 'comp-10',
          module_type: 'preparation_guide',
          title: 'Capgemini Exceller Drive Pattern & Round Breakdown',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-10-1-1',
              module_id: 'mod-10-1',
              question_text: 'What is Capgemini Exceller recruitment pattern and test syllabus?',
              is_free_preview: true,
              difficulty: 'easy',
              role_tag: 'Analyst / Senior Analyst',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 29,
              upvotes_count: 175,
              blocks: [
                {
                  id: 'b-10-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Capgemini Exceller Pattern\n1. **Technical Pseudocode & MCQ (30 mins)**\n2. **English Communication Test (Interactive Speaking)**\n3. **Coding Test (2 Questions - 45 mins)**\n4. **Technical + HR Interview**`
                  }
                },
                {
                  id: 'b-10-1-2',
                  block_type: 'diagram',
                  block_order: 2,
                  payload: {
                    source: `flowchart LR\n  A[Pseudocode & MCQs] --> B[English Communication]\n  B --> C[Coding Test]\n  C --> D[Tech + HR Interview]`
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  reports: [],
  leaderboard: [],
  orders: [],
  coupons: [
    { id: 'coup-1', code: 'TIEEDU20', discount_percent: 20, discount_flat: 0, is_active: true, max_uses: 0, uses: 0, label: '20% Placement Discount' },
    { id: 'coup-2', code: 'FIRST50', discount_percent: 0, discount_flat: 50, is_active: true, max_uses: 0, uses: 0, label: 'Flat ₹50 Early Bird' }
  ],
  unlocks: [],
  users: [],
  sessions: [],
  progress: {},
  interview_progress: {},
  audit: [],
  settings: {
    platform_name: 'TieEdu',
    support_email: 'support@tieedu.in',
    demo_mode: true
  }
};

export function loadDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // If db.json exists, load it and auto-upgrade modules missing section_data
  if (fs.existsSync(DB_FILE)) {
    try {
      let raw = fs.readFileSync(DB_FILE, 'utf-8');
      if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1); // strip BOM
      const data = JSON.parse(raw);
      let upgraded = false;
      if (!Array.isArray(data.orders)) { data.orders = []; upgraded = true; }
      if (!Array.isArray(data.unlocks)) { data.unlocks = []; upgraded = true; }
      if (!Array.isArray(data.users)) { data.users = []; upgraded = true; }
      if (!Array.isArray(data.sessions)) { data.sessions = []; upgraded = true; }
      if (!data.progress) { data.progress = {}; upgraded = true; }
      if (!data.interview_progress) { data.interview_progress = {}; upgraded = true; }
      if (!data.audit) { data.audit = []; upgraded = true; }
      if (!data.settings) { data.settings = initialDbData.settings; upgraded = true; }
      if (!Array.isArray(data.coupons) || data.coupons.length === 0) {
        data.coupons = initialDbData.coupons;
        upgraded = true;
      }
      if (data.companies && data.companies.length > 0) {
        data.companies.forEach((company: any) => {
          if (company.modules) {
            company.modules.forEach((mod: any) => {
              if (!mod.section_data) {
                mod.section_data = getDefaultSectionData(company.name, mod.title);
                upgraded = true;
              }
            });
          }
        });
      }
      if (upgraded) {
        saveDb(data);
      }
      return data;
    } catch {
      // Fall through to rewrite
    }
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(initialDbData, null, 2), 'utf-8');
  return initialDbData;
}

export function getDefaultSectionData(companyName: string, moduleTitle: string) {
  return {
    overview: {
      companyInfo: `${companyName} interview preparation for this module — ${moduleTitle}.`,
      eligibility: 'Eligibility criteria vary by drive. Check the latest official notification from the company before applying.',
      salaryBreakdown: 'Salary data not disclosed yet. Verified offer figures appear here once candidates share them.',
      reviews: []
    },
    core_subjects: [
      {
        subject: 'Database Management Systems (DBMS)',
        topics: [
          {
            title: 'SQL Indexing, ACID Properties & Transactions',
            content: `### Core DBMS Concepts\nACID stands for Atomicity, Consistency, Isolation, and Durability. Indexes (B+ Trees) drastically speed up SELECT queries from O(N) to O(log N).`,
            pyqs: [
              { year: 2025, question: `Explain 4 isolation levels in SQL transactions and dirty reads.`, answer: `Read Uncommitted, Read Committed, Repeatable Read, Serializable. Dirty reads occur when a transaction reads uncommitted changes.` },
              { year: 2024, question: `Difference between Clustered and Non-Clustered Indexing?`, answer: `Clustered index defines physical order of data rows (only 1 per table). Non-clustered stores index separately with pointer to data.` }
            ]
          }
        ]
      },
      {
        subject: 'Operating Systems (OS)',
        topics: [
          {
            title: 'Virtual Memory, Paging & Process Scheduling',
            content: `### Operating System Fundamentals\nVirtual memory maps process logical addresses to physical RAM pages. Page faults trigger page replacement algorithms like LRU, FIFO, and Optimal.`,
            pyqs: [
              { year: 2025, question: `What is Thrashing in OS and how to prevent it?`, answer: `Thrashing occurs when high page replacement frequency consumes CPU time. Fix by increasing RAM or lowering multiprogramming degree.` },
              { year: 2023, question: `Differentiate between Process and Thread with memory layout.`, answer: `Process has its own virtual address space (Code, Data, Heap, Stack). Threads share Code, Data, and Heap, but have private Stacks.` }
            ]
          }
        ]
      }
    ],
    interview_questions: [
      {
        category: 'Technical',
        title: `Core Architectural Principles at ${companyName}`,
        question: `How would you handle high concurrent traffic spike in ${companyName} distributed systems?`,
        solution: `Use rate limiters (Token Bucket algorithm), load balancers (Nginx / ALB), Redis caching layer, and asynchronous message queues (Kafka / RabbitMQ).`
      },
      {
        category: 'Coding',
        title: 'Two Sum & Subarray Sum Equals K',
        question: 'Find the total number of continuous subarrays whose sum equals to K.',
        solution: 'Use Prefix Sum with HashMap to achieve O(N) time complexity and O(N) space complexity.',
        code: `int subarraySum(vector<int>& nums, int k) {\n    unordered_map<int, int> prefixCounts;\n    prefixCounts[0] = 1;\n    int currSum = 0, count = 0;\n    for (int num : nums) {\n        currSum += num;\n        if (prefixCounts.find(currSum - k) != prefixCounts.end()) {\n            count += prefixCounts[currSum - k];\n        }\n        prefixCounts[currSum]++;\n    }\n    return count;\n}`,
        language: 'cpp'
      }
    ],
    cheatsheets: [
      {
        title: 'Core Computer Science Quick Cheatsheet',
        summary: 'Essential formulas and complexity tables for instant revision.',
        content: 'QuickSort: Avg O(N log N), Worst O(N^2) | MergeSort: O(N log N) | Binary Search: O(log N) | Hash Table: Avg O(1), Worst O(N)'
      }
    ],
    never_skip_topics: [
      {
        topic: 'Dynamic Programming & Graph Traversal (BFS/DFS)',
        priority: 'High',
        notes: 'Commonly practiced for Round 1 Online Assessment and Technical rounds.'
      },
      {
        topic: 'OOPs Design Patterns (Singleton, Factory, Observer)',
        priority: 'Must Do',
        notes: 'Frequently tested in low-level system design rounds.'
      }
    ],
    last_minute_revision: [
      {
        title: '24-Hour Placement Sprint Checklist',
        points: [
          'Revise Time & Space complexity of Top 15 Sorting and Searching algorithms.',
          'Review TCP 3-way handshake and HTTP response status codes (200, 301, 400, 401, 403, 404, 500, 502, 503).',
          'Prepare your 90-second self introduction emphasizing your best technical projects.'
        ]
      }
    ],
    hr_round: [
      {
        question: `Why do you want to join ${companyName} over other tech companies?`,
        answer: `I admire ${companyName}'s innovation leadership, growth culture, and engineering scale. My technical background in core CS and problem solving aligns directly with your team's mission.`,
        tips: [
          `Research ${companyName}'s recent product announcements or tech blogs before the interview.`,
          `Structure your answer with the STAR framework (Situation, Task, Action, Result).`
        ]
      }
    ]
  };
}

export function saveDb(data: any) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  // Async waterfall to the CockroachDB replica (if enabled). Never blocks the sync API.
  if (mirrorHook) {
    try {
      const r = mirrorHook(data);
      if (r && typeof (r as any).catch === 'function') (r as any).catch(() => {});
    } catch {
      // mirror must never break the file commit
    }
  }
}

let mirrorHook: ((data: any) => void | Promise<void>) | null = null;

/** server.ts wires the storage facade here once at boot. */
export function setMirrorHook(fn: ((data: any) => void | Promise<void>) | null) {
  mirrorHook = fn;
}

// Cautious write: refuses to destroy the store on obviously-broken payloads.
export function safeSaveDb(data: any) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.companies)) {
    throw new Error('Refusing to write a corrupt database state');
  }
  saveDb(data);
}

