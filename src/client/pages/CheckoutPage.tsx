import React, { useState, useEffect } from 'react';
import { ArrowLeft, Lock, ShieldCheck, Tag, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext.js';
import { useAuth } from '../context/AuthContext.js';
import { orderApi, authApi } from '../services/api.js';

interface CheckoutPageProps {
  onBack: () => void;
  onOrderSuccess: (orderData: any) => void;
  onOpenAuth: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  onBack,
  onOrderSuccess,
  onOpenAuth,
}) => {
  const { items, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();

  // Shipping Address Form State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [streetAddress, setStreetAddress] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country] = useState('United States');

  // Coupon & Quote State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  // Server Calculated Pricing
  const [quote, setQuote] = useState<any | null>(null);
  const [loadingQuote, setLoadingQuote] = useState<boolean>(true);

  // Payment Simulation Controls
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [simulateFailure, setSimulateFailure] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => 'idemp_' + Math.random().toString(36).substring(2) + Date.now());

  // Load Saved Addresses if logged in
  useEffect(() => {
    async function loadAddress() {
      if (isAuthenticated) {
        try {
          const profile = await authApi.getProfile();
          if (profile.addresses && profile.addresses.length > 0) {
            const def = profile.addresses.find((a: any) => a.is_default) || profile.addresses[0];
            setFullName(def.full_name);
            setPhone(def.phone);
            setStreetAddress(def.street_address);
            setApartment(def.apartment || '');
            setCity(def.city);
            setState(def.state);
            setPostalCode(def.postal_code);
          }
        } catch {
          // ignore
        }
      }
    }
    loadAddress();
  }, [isAuthenticated]);

  // Recalculate quote strictly on server-side
  useEffect(() => {
    async function fetchServerQuote() {
      if (items.length === 0) {
        setLoadingQuote(false);
        return;
      }
      try {
        setLoadingQuote(true);
        const pricingItems = items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
        }));
        const data = await orderApi.getQuote(pricingItems, appliedCoupon);
        setQuote(data);
      } catch (err: any) {
        console.error('Failed to get server quote:', err);
      } finally {
        setLoadingQuote(false);
      }
    }

    fetchServerQuote();
  }, [items, appliedCoupon]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    try {
      setCouponError(null);
      setCouponSuccess(null);
      const res = await orderApi.validateCoupon(couponInput.trim());
      setAppliedCoupon(res.coupon.code);
      setCouponSuccess(`Coupon ${res.coupon.code} applied!`);
    } catch (err: any) {
      setCouponError(err.message || 'Invalid or expired promo code');
      setAppliedCoupon(null);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }

    // Client-side validations
    const errors: Record<string, string[]> = {};
    if (!fullName.trim()) errors.fullName = ['Full name is required'];
    if (!phone.trim()) errors.phone = ['Phone number is required'];
    if (!streetAddress.trim()) errors.streetAddress = ['Street address is required'];
    if (!city.trim()) errors.city = ['City is required'];
    if (!state.trim()) errors.state = ['State is required'];
    if (!postalCode.trim()) errors.postalCode = ['Postal code is required'];

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      const checkoutPayload = {
        items: items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        shippingAddress: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          streetAddress: streetAddress.trim(),
          apartment: apartment.trim() || undefined,
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim(),
          country,
        },
        couponCode: appliedCoupon,
        paymentMethod: 'credit_card',
        idempotencyKey,
        simulatePaymentFailure: simulateFailure,
      };

      const orderResult = await orderApi.checkout(checkoutPayload, idempotencyKey);
      await clearCart();
      onOrderSuccess(orderResult);
    } catch (err: any) {
      setGeneralError(err.message || 'Checkout failed');
      if (err.details) {
        setFieldErrors(err.details);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold uppercase text-white font-heading">
          Your cart is empty
        </h2>
        <p className="text-xs text-gray-400 mt-2">
          Add items before proceeding to checkout.
        </p>
        <button
          onClick={onBack}
          className="mt-6 bg-white text-black font-extrabold text-xs px-6 py-3 uppercase tracking-wider"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#222222]">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          <span>Back to Cart</span>
        </button>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <Lock size={14} className="text-green-500" />
          <span>256-bit Encrypted Checkout</span>
        </div>
      </div>

      {!isAuthenticated && (
        <div className="bg-[#181818] border border-[#2a2a2a] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs">
            <p className="font-bold text-white uppercase">Already have an account?</p>
            <p className="text-gray-400">Sign in for faster checkout with saved addresses.</p>
          </div>
          <button
            onClick={onOpenAuth}
            className="bg-white text-black text-xs font-black px-4 py-2 uppercase tracking-wider hover:bg-gray-200"
          >
            Sign In / Register
          </button>
        </div>
      )}

      {generalError && (
        <div className="bg-red-950/70 border border-red-800 p-4 text-xs text-red-200 flex items-start space-x-3">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold uppercase tracking-wide">Checkout Error</p>
            <p className="mt-0.5">{generalError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Column: Delivery & Payment Details (8 cols) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Shipping Address */}
          <div className="bg-[#111111] border border-[#222222] p-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-white font-heading">
              1. Delivery Address
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Marcus Vance"
                  className="w-full bg-[#181818] border border-[#333333] text-white text-xs px-3 py-2.5 focus:outline-none focus:border-white"
                />
                {fieldErrors.fullName && (
                  <p className="text-[11px] text-red-400 mt-1">{fieldErrors.fullName[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className="w-full bg-[#181818] border border-[#333333] text-white text-xs px-3 py-2.5 focus:outline-none focus:border-white"
                />
                {fieldErrors.phone && (
                  <p className="text-[11px] text-red-400 mt-1">{fieldErrors.phone[0]}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1">
                Street Address *
              </label>
              <input
                type="text"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="452 Broadway Ave"
                className="w-full bg-[#181818] border border-[#333333] text-white text-xs px-3 py-2.5 focus:outline-none focus:border-white"
              />
              {fieldErrors.streetAddress && (
                <p className="text-[11px] text-red-400 mt-1">{fieldErrors.streetAddress[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="New York"
                  className="w-full bg-[#181818] border border-[#333333] text-white text-xs px-3 py-2.5 focus:outline-none focus:border-white"
                />
                {fieldErrors.city && (
                  <p className="text-[11px] text-red-400 mt-1">{fieldErrors.city[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1">
                  State / Region *
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="NY"
                  className="w-full bg-[#181818] border border-[#333333] text-white text-xs px-3 py-2.5 focus:outline-none focus:border-white"
                />
                {fieldErrors.state && (
                  <p className="text-[11px] text-red-400 mt-1">{fieldErrors.state[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1">
                  Postal Code *
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="10013"
                  className="w-full bg-[#181818] border border-[#333333] text-white text-xs px-3 py-2.5 focus:outline-none focus:border-white"
                />
                {fieldErrors.postalCode && (
                  <p className="text-[11px] text-red-400 mt-1">{fieldErrors.postalCode[0]}</p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Method & QA Test Toggles */}
          <div className="bg-[#111111] border border-[#222222] p-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-white font-heading">
              2. Payment & Sandbox Simulation
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1">
                  Card Number (Sandbox Mode)
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full bg-[#181818] border border-[#333333] text-white text-xs px-3 py-2.5 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1">
                    Expires
                  </label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full bg-[#181818] border border-[#333333] text-white text-xs px-3 py-2.5 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1">
                    CVC
                  </label>
                  <input
                    type="text"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    className="w-full bg-[#181818] border border-[#333333] text-white text-xs px-3 py-2.5 focus:outline-none"
                  />
                </div>
              </div>

              {/* Edge Case #11 Tester Toggle */}
              <div className="mt-4 pt-4 border-t border-[#262626] bg-[#161616] p-3 border border-dashed border-[#383838]">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="simFailure"
                    checked={simulateFailure}
                    onChange={(e) => setSimulateFailure(e.target.checked)}
                    className="w-4 h-4 accent-[#e63946]"
                  />
                  <label htmlFor="simFailure" className="text-xs font-bold text-red-300 uppercase cursor-pointer">
                    QA Test: Simulate Payment Gateway Failure
                  </label>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 pl-7">
                  Verifies that failed transactions rollback cleanly and leave no phantom orders or oversold inventory.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#111111] border border-[#222222] p-6 space-y-6 sticky top-28">
            <h3 className="text-sm font-black uppercase tracking-wider text-white font-heading">
              Order Summary ({items.length} items)
            </h3>

            {/* Items mini list */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.cartItemId} className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-3">
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="w-10 h-12 object-cover bg-[#1c1c1c]"
                    />
                    <div>
                      <p className="font-bold text-white uppercase truncate max-w-[140px]">
                        {item.productName}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Qty: {item.quantity} • Size: {item.size}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-white">
                    ${Number(item.totalPrice).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Promo Code Input */}
            <div className="border-t border-[#222222] pt-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1 flex items-center space-x-1">
                <Tag size={12} />
                <span>Promo / Coupon Code</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="WELCOME10 or URBAN20"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className="flex-1 bg-[#181818] border border-[#333333] text-white text-xs px-3 py-2 uppercase focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="bg-[#242424] hover:bg-white text-white hover:text-black text-xs font-bold px-3 py-2 uppercase tracking-wider transition-colors"
                >
                  Apply
                </button>
              </div>
              {couponSuccess && (
                <p className="text-[11px] text-green-400 mt-1 font-semibold">{couponSuccess}</p>
              )}
              {couponError && (
                <p className="text-[11px] text-red-400 mt-1">{couponError}</p>
              )}
            </div>

            {/* Reconciled Calculations */}
            <div className="border-t border-[#222222] pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>Subtotal</span>
                <span className="font-bold text-white">
                  ${quote ? Number(quote.subtotal).toFixed(2) : '0.00'}
                </span>
              </div>

              {quote && quote.discountAmount > 0 && (
                <div className="flex justify-between text-[#e63946]">
                  <span>Discount ({quote.couponCode})</span>
                  <span className="font-bold">-${Number(quote.discountAmount).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-300">
                <span>Estimated Tax (8%)</span>
                <span>${quote ? Number(quote.taxAmount).toFixed(2) : '0.00'}</span>
              </div>

              <div className="flex justify-between text-gray-300">
                <span>Shipping</span>
                <span>
                  {quote && quote.shippingFee === 0 ? (
                    <span className="text-green-400 font-bold uppercase">Free</span>
                  ) : (
                    `$${quote ? Number(quote.shippingFee).toFixed(2) : '10.00'}`
                  )}
                </span>
              </div>

              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-[#222222]">
                <span>Total</span>
                <span>${quote ? Number(quote.totalAmount).toFixed(2) : '0.00'} USD</span>
              </div>
            </div>

            {/* Place Order CTA */}
            <button
              type="submit"
              disabled={isSubmitting || loadingQuote}
              className="w-full bg-white hover:bg-gray-200 text-black font-black text-xs py-4 uppercase tracking-widest transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <ShieldCheck size={16} />
              <span>{isSubmitting ? 'PROCESSING ORDER...' : 'PLACE ORDER'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

