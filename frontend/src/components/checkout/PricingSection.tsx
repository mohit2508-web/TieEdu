import React from 'react';
import { PricingPlan, Company, CompanyModuleItem } from '@/types';
import { Check, Sparkles } from 'lucide-react';
import { SINGLE_MODULE_PRICE, COMPLETE_PACK_PRICE } from '@/lib/packPricing';

interface PricingSectionProps {
  onSelectPlan: (plan: PricingPlan | Company | CompanyModuleItem) => void;
}

const plans: PricingPlan[] = [
  {
    id: 'plan-single-module',
    name: 'Single Round Module',
    price: SINGLE_MODULE_PRICE,
    billing_cycle: 'one_time',
    scope: 'single_company',
    features: [
      'One live round module (e.g. Online Assessment, Technical, HR)',
      'Verified questions, code solutions and system design guides',
      'Free preview items included with every module',
      'One-time purchase, lifetime access once unlocked',
    ],
  },
  {
    id: 'plan-complete-pack',
    name: 'Complete Company Pack',
    price: COMPLETE_PACK_PRICE,
    billing_cycle: 'one_time',
    scope: 'single_company',
    popular: true,
    features: [
      'All premium round modules for one company',
      'Full coverage of OA, Technical, System Design and HR rounds',
      'Candidate-verified interview reports & Q&A',
      'Cheapest per-module rate across the vault',
    ],
  },
];

export const PricingSection: React.FC<PricingSectionProps> = ({ onSelectPlan }) => {
  return (
    <section id="pricing" className="py-16 border-t border-[#EDEDEB] bg-white">
      <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12">

        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-[#1F3A5F] border border-indigo-100 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#E8A33D]" />
            Transparent Pricing Structure
          </span>
          <h2 className="font-serif-heading text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-3">
            Invest in Placement Success, Not Static PDFs
          </h2>
          <p className="text-xs sm:text-sm text-[--text-muted]">
            Continuous updates, candidate-verified reports, and round-by-round interview intelligence.
            Pay once per module or grab the complete pack — no subscriptions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => {
            const isPopular = plan.popular;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 flex flex-col justify-between relative transition-all ${
                  isPopular
                    ? 'bg-[#FAFAF9] border-2 border-[#1F3A5F] shadow-md ring-1 ring-[#1F3A5F]/20'
                    : 'bg-white border border-[#EDEDEB] card-hover'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1F3A5F] text-white text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full shadow-sm">
                    Best Value
                  </div>
                )}

                <div>
                  <h3 className="font-serif-heading font-bold text-lg text-[#1A1A1A] mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="font-serif-heading text-3xl font-bold text-[#1A1A1A]">₹{plan.price}</span>
                    <span className="text-xs text-[--text-muted]">one-time</span>
                  </div>

                  <ul className="space-y-2.5 mb-8 text-xs text-[#4A4A4A]">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#1E8E5A] shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => onSelectPlan(plan)}
                  className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                    isPopular
                      ? 'bg-[#E8A33D] hover:bg-[#D4902C] text-[#241A06]'
                      : 'bg-[#1F3A5F] hover:bg-[#2A4D7E] text-white'
                  }`}
                >
                  Choose {plan.name}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-[--text-muted] max-w-2xl mx-auto">
          Prices are set by the pack ladder on the server: ₹99 for one module,
          ₹169 for two, ₹219 for three and ₹{COMPLETE_PACK_PRICE} for the complete pack.
          Payments are verified manually by our team after you complete the UPI transfer.
        </p>

      </div>
    </section>
  );
};