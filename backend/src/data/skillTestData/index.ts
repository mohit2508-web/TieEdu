import { QuestionBank } from './types';
import { BANK as programming } from './questions/programming';
import { BANK as web } from './questions/web';
import { BANK as corecs } from './questions/corecs';
import { BANK as databases } from './questions/databases';
import { BANK as dataAi } from './questions/data-ai';
import { BANK as cloudDevops } from './questions/cloud-devops';
import { BANK as mobileDesign } from './questions/mobile-design';
import { BANK as careerBusiness } from './questions/career-business';

export const ALL_QUESTIONS: QuestionBank = {
  ...programming,
  ...web,
  ...corecs,
  ...databases,
  ...dataAi,
  ...cloudDevops,
  ...mobileDesign,
  ...careerBusiness,
};

export default ALL_QUESTIONS;
