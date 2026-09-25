import React, { useEffect, useRef, useState } from 'react';
import { Company, ContentModule, CartItem, CompanyModuleItem } from '@/types';
import { BrandTile } from '@/components/common/BrandTile';
import {
  validateCouponApi, createOrderApi, confirmPaymentApi, getOrderStatusApi,
  getCheckoutPaymentInfoApi, verifyRazorpayPaymentApi, fetchActiveCouponsApi,
} from '@/lib/api';
import { summarizePackItems, isCompanyItem, isModuleItem } from '@/lib/packPricing';
import {
  X, ShoppingBag, Lock, ShieldCheck, CheckCircle2, Trash2,
  Tag, ArrowRight, Sparkles, RefreshCw, PartyPopper, Layers, Zap,
  Copy, ArrowLeft, Hourglass, AlertTriangle, QrCode
} from 'lucide-react';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  companyName?: string;
  missingModules?: ContentModule[];
  onRemoveItem: (index: number) => void;
  onAddModules?: (modules: ContentModule[]) => void;
  onAddCompletePack?: () => void;
  suggestedCompanies?: Company[];
  onAddCompany?: (company: Company) => void;
  onCheckoutSuccess: () => void;
}

const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-[#FAFAF9] focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white";

const ROUND_CHIP: Record<string, string> = {
  OA: 'bg-amber-100 text-amber-800',
  Technical: 'bg-blue-100 text-blue-700',
  SystemDesign: 'bg-purple-100 text-purple-700',
  HR: 'bg-emerald-100 text-emerald-700',
  Managerial: 'bg-teal-100 text-teal-700',
};

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  onClose,
  items,
  companyName = 'your',
  missingModules = [],
  onRemoveItem,
  onAddModules,
  onAddCompletePack,
  suggestedCompanies = [],
  onAddCompany,
  onCheckoutSuccess
}) => {
  const [couponCode, setCouponCode] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [activeCoupons, setActiveCoupons] = useState<any[]>([]);

  // UPI lifecycle: 'cart' -> 'pay' (QR shown) -> 'pending' (manual verification) -> 'done' | 'rejected'
  const [step, setStep] = useState<'cart' | 'pay' | 'pending' | 'rejected'>('cart');
  const [order, setOrder] = useState<any>(null);
  const [upiId, setUpiId] = useState('');
  const [upiQr, setUpiQr] = useState('');
  const [merchantName, setMerchantName] = useState('TieEdu');
  const [upiInstructions, setUpiInstructions] = useState('');
  const [paymentMode, setPaymentMode] = useState<'upi' | 'razorpay'>('upi');
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const summary = summarizePackItems(items);
  const finalTotal = Math.max(0, summary.subtotal - discount);
  const comboFillSavings = missingModules.length > 0 && onAddCompletePack
    ? summarizePackItems([...items, ...missingModules.map(m => ({ kind: 'company' as const, id: missingModules[0].company_id || 'x', slug: 'x', name: companyName, logo_url: '', module_id: m.id, module_title: m.title, module_count: 1, price: 99 } as CompanyModuleItem))]).subtotal - summary.subtotal
    : 0;

  // Load merchant UPI settings + live coupon chips when the drawer opens.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getCheckoutPaymentInfoApi().then((info) => {
      if (cancelled) return;
      setPaymentMode(info.mode || 'upi');
      setMerchantName(info.merchant_name || 'TieEdu');
      setUpiInstructions(info.instructions || '');
    }).catch(() => { /* keep defaults */ });
    fetchActiveCouponsApi().then((data) => {
      if (!cancelled) setActiveCoupons(data || []);
    }).catch(() => { /* no coupon chips */ });
    return () => { cancelled = true; };
  }, [isOpen]);

  // Reset per-open state (order/step) so reopening never shows a stale order.
  useEffect(() => {
    if (isOpen) {
      setStep('cart');
      setOrder(null);
      setPayError(null);
      setCopied(false);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
  }, [isOpen]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const applyCouponHandler = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    setCouponCode(cleanCode);
    if (!cleanCode) return;
    setApplyingCoupon(true);
    setCouponMessage(null);
    try {
      const res = await validateCouponApi(cleanCode, summary.subtotal);
      if (res.valid) {
        setDiscount(res.discount || 0);
        setAppliedCouponCode(cleanCode);
        setCouponMessage({ text: `${res.message}${res.discount ? ` — ₹${res.discount} off` : ''}`, type: 'success' });
      } else {
        setDiscount(0);
        setAppliedCouponCode('');
        setCouponMessage({ text: `❌ ${res.message || 'Invalid or expired coupon code'}`, type: 'error' });
      }
    } catch (e: any) {
      setDiscount(0);
      setAppliedCouponCode('');
      setCouponMessage({ text: `❌ ${e?.message || 'Could not validate coupon'}`, type: 'error' });
    } finally {
      setApplyingCoupon(false);
    }
  };

  const buildOrderItems = () => {
    return items.map((item) => {
      if (isModuleItem(item)) {
        const mi = item as CompanyModuleItem;
        return {
          kind: 'company',
          id: mi.id,
          slug: mi.slug,
          name: mi.name,
          logo_url: mi.logo_url,
          module_id: mi.module_id,
          module_title: mi.module_title,
          round_type: mi.round_type,
          module_ids: mi.module_ids,
          price: mi.price || 99,
        };
      }
      if (isCompanyItem(item)) {
        const company = item as Company;
        return { kind: 'company', id: company.id, slug: company.slug, name: company.name, price: 249 };
      }
      const plan = item as any;
      return { kind: 'plan', id: plan.id, scope: plan.scope, name: plan.name, price: plan.price };
    });
  };

  const loadRazorpayCheckout = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if ((window as any).Razorpay) return resolve();
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Razorpay checkout script could not be loaded'));
      document.head.appendChild(s);
    });

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const copyUpiId = async () => {
    if (!upiId) return;
    try { await navigator.clipboard.writeText(upiId); } catch { /* fallback below */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const finishPurchase = () => {
    stopPolling();
    setStep('cart');
    setTimeout(() => {
      onCheckoutSuccess();
      onClose();
      setOrder(null);
      setDiscount(0);
      setCouponCode('');
      setAppliedCouponCode('');
      setCouponMessage(null);
      setPayError(null);
    }, 1500);
  };

  // Persistent poll until an admin verifies (paid) or rejects the payment.
  const startVerificationPolling = (orderId: string) => {
    stopPolling();
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const st = await getOrderStatusApi(orderId);
        if (st.status === 'paid') {
          setStep('cart');
          finishPurchase();
        } else if (st.status === 'rejected') {
          stopPolling();
          setStep('rejected');
          setPayError(st.reject_reason ? `Payment could not be verified: ${st.reject_reason}` : 'Payment could not be verified by our team.');
        }
      } catch { /* transient — keep polling */ }
      if (attempts > 180) stopPolling(); // ~15 min cap
    }, 5000);
  };

  const handleConfirmPayment = async () => {
    if (!order) return;
    setIsProcessing(true);
    setPayError(null);
    try {
      await confirmPaymentApi(order.id);
      setIsProcessing(false);
      setStep('pending');
      startVerificationPolling(order.id);
    } catch (e: any) {
      setIsProcessing(false);
      setPayError(e?.message || 'Could not confirm your payment — please try again.');
    }
  };

  const handlePay = async () => {
    setIsProcessing(true);
    setPayError(null);
    try {
      const created = await createOrderApi({
        amount: summary.subtotal,
        items: buildOrderItems(),
        coupon_code: appliedCouponCode || undefined,
      });
      if (!created?.id) throw new Error('Order could not be created — please retry.');

      // Real gateway: Razorpay checkout + server-side signature verification.
      if (created.gateway === 'razorpay' && created.gateway_order_id && created.key_id) {
        await loadRazorpayCheckout();
        const rzp = new (window as any).Razorpay({
          key: created.key_id,
          amount: created.amount_paisa,
          currency: 'INR',
          name: 'TieEdu',
          description: 'Vault access unlock',
          order_id: created.gateway_order_id,
          handler: async (resp: any) => {
            try {
              await verifyRazorpayPaymentApi(created.id, resp.razorpay_payment_id, resp.razorpay_signature);
              setIsProcessing(false);
              finishPurchase();
            } catch {
              setIsProcessing(false);
              setPayError('Payment could not be verified — contact support@tieedu.in for help.');
            }
          },
          modal: { ondismiss: () => setIsProcessing(false) },
          theme: { color: '#0284C7' },
        });
        rzp.on?.('payment.failed', () => {
          setIsProcessing(false);
          setPayError('Payment failed or was cancelled — please try again.');
        });
        rzp.open();
        return;
      }

      // UPI flow: fetch QR/UPI-id for this order, show the payment screen.
      const st = await getOrderStatusApi(created.id);
      if (st.status !== 'created') throw new Error('Order is not in a payable state.');
      if (st.upi_id || st.upi_qr) {
        setUpiId(st.upi_id || '');
        setUpiQr(st.upi_qr || '');
        setMerchantName(st.merchant_name || merchantName);
        setUpiInstructions(st.instructions || upiInstructions);
      }
      setOrder(created);
      setStep('pay');
    } catch (e: any) {
      const msg = e?.message || 'Checkout failed — please try again.';
      setPayError(msg.includes('Authentication required') ? 'Please sign in before checking out.' : msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetToCart = () => {
    stopPolling();
    setStep('cart');
    setPayError(null);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Full-Height Slide-In Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] md:w-[540px] bg-white border-l border-gray-200 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-label="Cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1F3A5F]/5 border border-[#1F3A5F]/10 text-[#1F3A5F] flex items-center justify-center shadow-sm">
              <ShoppingBag className="w-5 h-5 text-[#E8A33D]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#1F3A5F]">Your Vault Cart</h3>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-[11px] font-bold">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <p className="text-[13px] text-[#8A8A8A]">Combo pricing · server-validated coupons</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#FAFAF9] hover:bg-[#F0EFEC] text-[#8A8A8A] flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {step === 'pay' && (
          /* UPI PAYMENT SCREEN */
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            <button onClick={resetToCart} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#8A8A8A] hover:text-[#1F3A5F]">
              <ArrowLeft className="w-4 h-4" /> Back to cart
            </button>

            <div className="bg-gradient-to-br from-[#1F3A5F] to-[#2A4D7E] rounded-2xl text-white p-6 text-center space-y-4 shadow-md">
              <div className="flex items-center justify-center gap-2 text-[#8AB9F1] text-xs font-bold uppercase tracking-widest">
                <QrCode className="w-4 h-4" /> Pay via UPI
              </div>
              <div>
                <div className="text-[13px] text-[#B8CCE4]">Amount to pay</div>
                <div className="text-4xl font-extrabold mt-1">₹{finalTotal}</div>
                <div className="text-[12px] text-[#8AB9F1] mt-1">Pay the exact amount — larger/smaller transfers delay verification</div>
              </div>

              {upiQr ? (
                <div className="inline-block bg-white p-3 rounded-xl">
                  <img src={upiQr} alt="UPI QR code" className="w-48 h-48 object-contain rounded-lg" />
                </div>
              ) : upiId ? (
                <div className="bg-white/10 border border-white/20 rounded-xl p-4">
                  <div className="text-[12px] text-[#B8CCE4] mb-2">Pay to UPI ID</div>
                  <button onClick={copyUpiId} className="inline-flex items-center gap-2 bg-white text-[#1F3A5F] font-mono font-bold px-4 py-2.5 rounded-lg text-sm hover:bg-[#F0EFEC] transition-colors">
                    {upiId}
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <p className="text-[12px] text-[#B8CCE4] mt-2">Or {copied ? 'copied!' : 'tap to copy'} — open any UPI app and send the exact amount.</p>
                </div>
              ) : (
                <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-[13px]">
                  <p className="text-[#B8CCE4]">{merchantName} hasn&apos;t linked a UPI ID yet. Please contact support@tieedu.in to complete your purchase.</p>
                </div>
              )}

              {upiInstructions && (
                <p className="text-[13px] text-[#B8CCE4] leading-relaxed">{upiInstructions}</p>
              )}
            </div>

            <div className="bg-[#FAFAF9] border border-gray-200 rounded-xl p-4 space-y-2 text-[13px] text-[#4A4A4A]">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1E8E5A] mt-0.5 shrink-0" />
                <span>After transferring, tap <b>“I&apos;ve made the payment”</b>. Our team verifies every UPI payment manually before unlocking.</span>
              </div>
              <div className="flex items-start gap-2">
                <Hourglass className="w-4 h-4 text-[#E8A33D] mt-0.5 shrink-0" />
                <span>Verification usually takes a few minutes. Your vault unlocks automatically once approved.</span>
              </div>
            </div>

            <button
              onClick={handleConfirmPayment}
              disabled={isProcessing || (!upiId && !upiQr)}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {isProcessing ? 'Confirming…' : "I&apos;ve made the payment"}
            </button>

            {payError && (
              <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{payError}</div>
            )}
          </div>
        )}

        {step === 'pending' && (
          /* AWAITING VERIFICATION */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shadow-md">
                <RefreshCw className="w-10 h-10 animate-spin" />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#E8A33D] border-2 border-white" />
            </div>
            <h4 className="font-bold text-xl text-[#1A1A1A]">Payment received — verification in progress</h4>
            <p className="text-[13px] text-[#4A4A4A] max-w-sm leading-relaxed">
              Order <b className="text-[#1F3A5F]">{order?.id}</b> is now with our team. We manually verify every UPI transfer; your vault unlocks automatically once approved. This page updates on its own.
            </p>
            <div className="flex items-center gap-2 text-[12px] text-[#8A8A8A]">
              <Hourglass className="w-4 h-4" /> Usually approved within minutes
            </div>
            <button onClick={onClose} className="mt-2 px-5 py-2.5 bg-[#FAFAF9] hover:bg-[#F0EFEC] border border-gray-200 text-[#4A4A4A] text-[13px] font-semibold rounded-xl transition-all">
              Close & track later from your account
            </button>
            {payError && (
              <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 w-full">{payError}</div>
            )}
          </div>
        )}

        {step === 'rejected' && (
          /* VERIFICATION REJECTED */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-red-100 text-red-600 flex items-center justify-center shadow-md">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h4 className="font-bold text-xl text-[#1A1A1A]">Payment couldn&apos;t be verified</h4>
            <p className="text-[13px] text-[#4A4A4A] max-w-sm leading-relaxed">
              {payError || 'Our team could not match this payment to a transfer. If you did pay, share your screenshot with the UTR at support@tieedu.in.'}
            </p>
            <div className="px-4 py-2.5 bg-[#FAFAF9] border border-gray-200 rounded-xl text-[13px] text-[#4A4A4A]">
              Order <b className="text-[#1F3A5F]">{order?.id}</b>
            </div>
            <button
              onClick={resetToCart}
              className="mt-2 px-5 py-2.5 bg-[#1F3A5F] hover:bg-[#2A4D7E] text-white text-[13px] font-bold rounded-xl transition-all"
            >
              Try again with a new order
            </button>
          </div>
        )}

        {step === 'cart' && items.length === 0 && (
          /* EMPTY STATE */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FAFAF9] text-[#8A8A8A] flex items-center justify-center border border-gray-200">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-lg text-[#1A1A1A]">Your cart is empty</h4>
            <p className="text-[13px] text-[#8A8A8A] max-w-xs">
              Add a premium round pack or the full {companyName} Complete Pack to start.
            </p>
            <button onClick={onClose} className="px-5 py-2.5 bg-[#1F3A5F] hover:bg-[#2A4D7E] text-white text-[14px] font-semibold rounded-xl transition-all shadow-sm">
              Browse Vault Directory
            </button>
          </div>
        )}

        {step === 'cart' && items.length > 0 && (
          <>
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">

              {/* Combo helper */}
              {missingModules.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#E8A33D] text-white flex items-center justify-center shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-[#1F3A5F]">
                        Complete Pack for just ₹{Math.max(0, comboFillSavings)} more — unlock everything
                      </h4>
                      <p className="text-[13px] text-[#4A4A4A] leading-relaxed mt-1">
                        Missing {missingModules.map(m => m.round_type).filter(Boolean).join(', ') || 'rounds'} included — add them and save more with the combo. Compare: {summary.moduleCount} module{summary.moduleCount === 1 ? '' : 's'} = ₹{summary.subtotal}, the whole pack = ₹249 only.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onAddModules?.(missingModules)}
                      className="flex-1 px-3 py-2 bg-white border-2 border-amber-300 hover:border-amber-400 text-amber-800 text-[13px] font-bold rounded-xl transition-all"
                    >
                      <Zap className="w-3.5 h-3.5 inline -mt-0.5 mr-1" /> Add remaining {missingModules.length}
                    </button>
                    <button
                      onClick={() => onAddCompletePack?.()}
                      className="flex-1 px-3 py-2 bg-[#E8A33D] hover:bg-[#D4902C] text-white text-[13px] font-bold rounded-xl transition-all"
                    >
                      Complete Pack ₹249
                    </button>
                  </div>
                </div>
              )}

              {/* Item List */}
              <div className="space-y-2.5">
                {items.map((item, idx) => {
                  const isModule = isModuleItem(item);
                  const mi = isModule ? (item as CompanyModuleItem) : null;
                  const isCompanyLegacy = !isModule && isCompanyItem(item);
                  const name = isModule ? mi!.name : 'name' in item ? item.name : (item as any).name;
                  const logoUrl = isModule ? mi!.logo_url : isCompanyLegacy ? (item as Company).logo_url : null;
                  const price = isModule ? (mi!.price || 99) : isCompanyLegacy ? 249 : (item as any).price;
                  const label = isModule
                    ? (mi!.module_ids && mi!.module_ids.length > 0 ? 'Complete Pack — all rounds' : mi!.module_title || 'Round pack')
                    : isCompanyLegacy ? 'Company vault unlock' : 'All-Access Placement Pass';

                  return (
                    <div key={idx} className="flex items-center justify-between p-3.5 bg-[#FAFAF9] rounded-xl border border-gray-200 text-sm hover:border-[#0284C7]/40 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        {logoUrl ? (
                          <img src={logoUrl} alt={name} className="w-10 h-10 rounded-lg object-cover border bg-white p-0.5" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#1F3A5F] text-white flex items-center justify-center font-bold text-xs">
                            {isModule ? 'PK' : 'PRO'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-[#1A1A1A] block truncate">{name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[13px] text-[#8A8A8A] truncate">{label}</span>
                            {isModule && mi!.round_type && (
                              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${ROUND_CHIP[mi!.round_type] || 'bg-gray-100 text-gray-600'}`}>
                                {mi!.round_type}
                              </span>
                            )}
                            {isModule && mi!.module_ids && mi!.module_ids.length > 0 && (
                              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">BEST DEAL</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-sm text-[#1F3A5F]">₹{price}</span>
                        <button onClick={() => onRemoveItem(idx)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remove item">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Section */}
              <div className="bg-[#FAFAF9] p-4 rounded-xl border border-gray-200 space-y-2.5">
                <span className="text-[13px] font-bold text-[#4A4A4A] flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#E8A33D]" /> Apply Discount Code <span className="text-[12px] font-semibold text-emerald-600">server-validated</span>
                </span>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className={inputCls}
                  />
                  <button onClick={() => applyCouponHandler(couponCode)} disabled={applyingCoupon} className="px-4 py-2 bg-[#1F3A5F] hover:bg-[#2A4D7E] disabled:opacity-60 text-white text-[13px] font-bold rounded-xl transition-all inline-flex items-center gap-1.5">
                    {applyingCoupon ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Tag className="w-3.5 h-3.5" />} Apply
                  </button>
                </div>

                {activeCoupons.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {activeCoupons.map(c => (
                      <button
                        key={c.id}
                        onClick={() => applyCouponHandler(c.code)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[12px] font-bold rounded-md transition-all flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3 text-[#E8A33D]" /> {c.label || c.code}
                      </button>
                    ))}
                  </div>
                )}

                {couponMessage && (
                  <p className={`text-[13px] font-semibold ${couponMessage.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
                    {couponMessage.text}
                  </p>
                )}
              </div>

              {/* Cross-sell */}
              {suggestedCompanies.length > 0 && (
                <div className="bg-[#FAFAF9] p-4 rounded-xl border border-gray-200 space-y-2.5">
                  <span className="text-[13px] font-bold text-[#4A4A4A] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#E8A33D]" /> Students also add these packs
                  </span>
                  {suggestedCompanies.map(c => (
                    <button
                      key={c.id}
                      onClick={() => onAddCompany?.(c)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-white border border-gray-200 hover:border-[#0284C7]/40 rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BrandTile name={c.name} src={c.logo_url} className="w-8 h-8 rounded-lg p-0.5" />
                        <div className="text-left min-w-0">
                          <span className="font-bold text-[13px] text-[#1A1A1A] block truncate">{c.name} Complete Pack</span>
                          <span className="text-[13px] text-[#8A8A8A]">{c.accuracy_report_count ? `${c.accuracy_report_count} verified detail` : 'Full round-by-round detail'} · 4 Rounds</span>
                        </div>
                      </div>
                      <span className="text-[13px] font-extrabold text-[#E8A33D] group-hover:underline">+ Add ₹249</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Payment Method Note */}
              <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3.5 text-[13px] text-[#075985] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0284C7] mt-0.5 shrink-0" />
                <span>
                  {paymentMode === 'razorpay'
                    ? 'Checkout runs through Razorpay with card/UPI support — your vault unlocks instantly.'
                    : 'Pay by UPI QR — our team manually verifies your transfer before unlocking. No cards, no auto-debit.'}
                </span>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-gray-200 bg-[#FAFAF9] shrink-0 space-y-3">
              <div className="text-sm space-y-1.5">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal{summary.savingsTotal > 0 ? ` (${summary.moduleCount} module pack)` : ''}</span><span>₹{summary.subtotal}</span>
                </div>
                {summary.savingsTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Pack savings (combo)</span><span>-₹{summary.savingsTotal}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Coupon Discount ({appliedCouponCode})</span><span>-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>GST & Taxes</span><span className="text-emerald-700">Inclusive</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-[#1A1A1A] pt-2 border-t border-dashed border-gray-300">
                  <span>Total Payable</span><span className="text-[#0284C7]">₹{finalTotal}</span>
                </div>
              </div>

              <button onClick={handlePay} disabled={isProcessing} className="w-full py-3.5 bg-[#E8A33D] hover:bg-[#D4902C] text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-75">
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating your order…</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{paymentMode === 'razorpay' ? `Pay ₹${finalTotal} Securely` : `Pay ₹${finalTotal} via UPI`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {payError && (
                <div className="mt-2 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{payError}</div>
              )}

              <div className="flex items-center justify-center text-[12px] text-[#8A8A8A] pt-1">
                <div className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-[#1E8E5A]" /> 256-Bit SSL Encrypted</div>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
};