// Real company logos without an admin having to paste a URL for every row.
//
// Most company records ship with an empty `logo_url`, so the UI used to fall
// back to coloured initials everywhere. `companyLogoSrc` keeps an admin-entered
// URL first, and otherwise maps the company name to its official domain and
// asks Google's favicon service for that site's own brand icon. Unknown names
// still return null, so callers keep their honest initials fallback.

// Keyword (lower-case, matched on word boundaries in the name) → official domain.
// Product names like "Hack With Infy" or "TCS — NQT" resolve through the brand
// word they contain.
const DOMAINS: Record<string, string> = {
  accenture: 'accenture.com',
  tcs: 'tcs.com',
  'tata consultancy': 'tcs.com',
  codevita: 'tcs.com',
  infosys: 'infosys.com',
  infy: 'infosys.com',
  wipro: 'wipro.com',
  capgemini: 'capgemini.com',
  cognizant: 'cognizant.com',
  genc: 'cognizant.com',
  hcltech: 'hcltech.com',
  hcl: 'hcltech.com',
  'tech mahindra': 'techmahindra.com',
  techmahindra: 'techmahindra.com',
  mphasis: 'mphasis.com',
  ltimindtree: 'ltimindtree.com',
  ltm: 'ltimindtree.com',
  mindtree: 'ltimindtree.com',
  ibm: 'ibm.com',
  deloitte: 'deloitte.com',
  hexaware: 'hexaware.com',
  virtusa: 'virtusa.com',
  persistent: 'persistent.com',
  'ntt data': 'nttdata.com',
  zscaler: 'zscaler.com',
  'palo alto': 'paloaltonetworks.com',
  razorpay: 'razorpay.com',
  google: 'google.com',
  microsoft: 'microsoft.com',
  amazon: 'amazon.com',
  adobe: 'adobe.com',
  oracle: 'oracle.com',
  sap: 'sap.com',
  cisco: 'cisco.com',
  intel: 'intel.com',
  nvidia: 'nvidia.com',
  qualcomm: 'qualcomm.com',
  salesforce: 'salesforce.com',
  meta: 'meta.com',
  apple: 'apple.com',
  flipkart: 'flipkart.com',
  paytm: 'paytm.com',
  zomato: 'zomato.com',
  swiggy: 'swiggy.com',
  phonepe: 'phonepe.com',
  'goldman sachs': 'goldmansachs.com',
  'jp morgan': 'jpmorgan.com',
  jpmorgan: 'jpmorgan.com',
  'morgan stanley': 'morganstanley.com',
  ey: 'ey.com',
  'ernst & young': 'ey.com',
  kpmg: 'kpmg.com',
  pwc: 'pwc.com',
  zoho: 'zoho.com',
  freshworks: 'freshworks.com',
  'l&t': 'larsentoubro.com',
  'larsen & toubro': 'larsentoubro.com',
  genpact: 'genpact.com',
  'dxc': 'dxc.com',
  'ust': 'ust.com',
  coforge: 'coforge.com',
  'zensar': 'zensar.com',
  'birlasoft': 'birlasoft.com',
  'cyient': 'cyient.com',
  'ola': 'olacabs.com',
  uber: 'uber.com',
  walmart: 'walmart.com',
  atlassian: 'atlassian.com',
  'samsung': 'samsung.com',
};

// Longest keys first so "tech mahindra" wins over a shorter overlapping key.
const KEYS = Object.keys(DOMAINS).sort((a, b) => b.length - a.length);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MATCHERS = KEYS.map((k) => [new RegExp(`(^|[^a-z0-9])${escape(k)}($|[^a-z0-9])`), DOMAINS[k]] as const);

export function companyDomain(name?: string | null): string | null {
  if (!name) return null;
  const n = name.toLowerCase();
  for (const [re, domain] of MATCHERS) if (re.test(n)) return domain;
  return null;
}

const isRealUrl = (src?: string | null): src is string =>
  !!src && /^(https?:\/\/|data:image\/)/.test(src.trim());

/** Admin-entered URL first, then the brand icon for a known company, else null. */
export function companyLogoSrc(name?: string | null, src?: string | null): string | null {
  if (isRealUrl(src)) return src.trim();
  const domain = companyDomain(name);
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;
}
