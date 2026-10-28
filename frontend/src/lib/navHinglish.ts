/**
 * Hinglish for the navigation (A4), keyed by nav item / section / group id
 * from navConfig. Kept beside navConfig rather than inside it so the English
 * catalogue stays the single source of routes and rules; a missing entry
 * simply shows the English.
 *
 * Style: everyday Roman-script Hinglish. Labels students already use in
 * English stay English ("Mock interview", "Companies"); descriptions, which
 * are sentences, carry the Hindi.
 */
import { pick, type Lang } from './lang';

export const SECTION_HI: Record<string, string> = {
  home: 'Home',
  learn: 'Seekho',
  practise: 'Practice',
  companies: 'Companies',
  feed: 'Feed',
  account: 'Account',
  today: 'Aaj',
};

export const ITEM_HI: Record<string, { label?: string; description: string }> = {
  home: { description: 'Aaj kya karna hai, aapka streak aur agla step' },
  companies: { description: 'Har company ke rounds, sawaal aur tayari ka plan' },
  tracks: { label: 'Learning tracks', description: 'Step-by-step raasta, shuru se job-ready tak' },
  compare: { label: 'Compare karo', description: 'Do companies ko side by side dekho' },
  skillTest: { description: 'Timed test do aur dekho kaunse topics weak hain' },
  drives: { description: 'Asli jaisa mock drive — online test se interview tak' },
  guarantee: { description: 'Pattern alag nikla to paise wapas — shartein yahan padho' },
  offers: { description: 'Seniors ko offer kaise mila, unki zubaani' },
  debrief: { label: 'Rejection ke baad', description: 'No mila? Kya hua likho aur agli company ka plan pao' },
  offerCheck: { description: 'Job offer asli hai ya fake? Message check karo' },
  calendar: { description: 'Test ki date daalo, din-ba-din plan pao' },
  daily: { description: 'Roz 10 minute: ek aptitude, ek coding, ek HR sawaal' },
  mockInterview: { description: 'Paanch HR ya technical sawaal, har jawab pe feedback' },
  talent: { label: 'Recruiters ko dikho', description: 'Verified recruiters aapke tested skills dekh sakein — naam tab tak private' },
  studyGroups: { description: 'Ek company ki tayari saath mein — kaun practice kar raha hai dekho' },
  peerMock: { description: 'Dost ka interview lo, phir swap — dono ko points' },
  englishCoach: { description: 'Aadha minute bolo, English pe pyaar se tips pao — Hinglish mein bhi' },
  drops: { description: 'Nayi jobs, drives aur updates ek jagah' },
  freeCourse: { description: 'Bina paise ke shuru karo' },
  courses: { description: 'Saare courses — coding, aptitude, core subjects' },
  studyPlan: { description: 'Aapka week-by-week padhai plan' },
  myCourses: { description: 'Jo courses aapne shuru kiye' },
  myCertificates: { description: 'Aapke certificates, verify link ke saath' },
  account: { description: 'Profile, notifications aur settings' },
  campus: { description: 'College ka placement portal' },
  admin: { description: 'Admin console' },
  pricing: { description: 'Plans aur daam' },
  search: { label: 'Search', description: 'Koi bhi page ya topic dhoondo' },
  cart: { description: 'Aapka cart' },
  leaderboard: { description: 'Points mein kaun aage hai' },
};

export const navLabel = (lang: Lang, id: string, en: string) => pick(lang, en, ITEM_HI[id]?.label);
export const navDescription = (lang: Lang, id: string, en: string) => pick(lang, en, ITEM_HI[id]?.description);
export const sectionLabel = (lang: Lang, id: string, en: string) => pick(lang, en, SECTION_HI[id]);
