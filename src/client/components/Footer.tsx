import React, { useState } from 'react';
import { ArrowRight, CheckCircle, Instagram, Twitter, Youtube } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string, params?: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail && newsletterEmail.includes('@')) {
      setSubscribed(true);
      setNewsletterEmail('');
      setTimeout(() => setSubscribed(false), 5000);
    }
  };

  return (
    <footer className="bg-[#080808] border-t border-[#1a1a1a] text-white pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#1c1c1c]">
          
          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="bg-white text-black font-extrabold text-sm px-2 py-0.5">
                UT
              </div>
              <span className="font-extrabold text-lg tracking-wider text-white font-bebas">
                URBAN THREADS
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed pr-4">
              New York streetwear rooted in authenticity, individuality, and everyday rebellion. Built in the city, made to stand out.
            </p>
            <div className="flex items-center space-x-4 pt-2 text-gray-400">
              <a href="#instagram" className="hover:text-white transition-colors" aria-label="Instagram">
                <Instagram size={18} />
              </a>
              <a href="#twitter" className="hover:text-white transition-colors" aria-label="Twitter">
                <Twitter size={18} />
              </a>
              <a href="#youtube" className="hover:text-white transition-colors" aria-label="YouTube">
                <Youtube size={18} />
              </a>
            </div>
          </div>

          {/* Col 2: Shop Navigation */}
          <div>
            <h4 className="text-xs font-black tracking-widest uppercase text-white mb-4">
              SHOP
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li>
                <button
                  onClick={() => onNavigate('catalog', { category: 'new-arrivals' })}
                  className="hover:text-white transition-colors uppercase tracking-wider"
                >
                  New Arrivals
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('catalog', { category: 'men' })}
                  className="hover:text-white transition-colors uppercase tracking-wider"
                >
                  Men's Streetwear
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('catalog', { category: 'women' })}
                  className="hover:text-white transition-colors uppercase tracking-wider"
                >
                  Women's Drops
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('catalog', { category: 'accessories' })}
                  className="hover:text-white transition-colors uppercase tracking-wider"
                >
                  Accessories & Headwear
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('catalog', { category: 'sale' })}
                  className="text-[#e63946] hover:text-red-400 transition-colors uppercase tracking-wider font-semibold"
                >
                  Archival Sale
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Care */}
          <div>
            <h4 className="text-xs font-black tracking-widest uppercase text-white mb-4">
              CUSTOMER CARE
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li>
                <button
                  onClick={() => setActiveModal('help')}
                  className="hover:text-white transition-colors tracking-wide"
                >
                  Help Center & FAQs
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveModal('shipping')}
                  className="hover:text-white transition-colors tracking-wide"
                >
                  Shipping & Returns
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveModal('sizing')}
                  className="hover:text-white transition-colors tracking-wide"
                >
                  Streetwear Size Guide
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('orders')}
                  className="hover:text-white transition-colors tracking-wide"
                >
                  Track Your Order
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveModal('contact')}
                  className="hover:text-white transition-colors tracking-wide"
                >
                  Contact Concierge
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Newsletter */}
          <div>
            <h4 className="text-xs font-black tracking-widest uppercase text-white mb-4">
              NEWSLETTER
            </h4>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Get 10% off your first order and private access to limited streetwear drops. Use code <span className="text-white font-bold">WELCOME10</span>.
            </p>

            {subscribed ? (
              <div className="flex items-center space-x-2 text-xs text-green-400 bg-green-950/40 p-3 border border-green-800">
                <CheckCircle size={16} />
                <span>You're on the insider list.</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletter} className="relative">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  required
                  className="w-full bg-[#141414] border border-[#2b2b2b] text-white text-xs px-3 py-2.5 pr-10 focus:outline-none focus:border-white transition-colors rounded-none placeholder-gray-500"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 bottom-1 px-3 bg-white text-black hover:bg-gray-200 transition-colors flex items-center justify-center"
                  aria-label="Subscribe"
                >
                  <ArrowRight size={14} />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar: Copyright & Legal */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-[11px] text-gray-500 space-y-4 md:space-y-0">
          <p>© 2026 Urban Threads NYC. All Rights Reserved.</p>
          <div className="flex flex-wrap gap-4 text-gray-400">
            <button onClick={() => setActiveModal('privacy')} className="hover:text-white transition-colors">
              Privacy Policy
            </button>
            <span>•</span>
            <button onClick={() => setActiveModal('terms')} className="hover:text-white transition-colors">
              Terms of Service
            </button>
            <span>•</span>
            <button onClick={() => setActiveModal('accessibility')} className="hover:text-white transition-colors">
              Accessibility
            </button>
          </div>
          <div className="flex items-center space-x-1 font-semibold text-gray-300">
            <span>🇺🇸 USD $</span>
          </div>
        </div>
      </div>

      {/* Info Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setActiveModal(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative bg-[#141414] border border-[#2a2a2a] max-w-lg w-full p-6 text-white shadow-2xl z-10">
            <div className="flex justify-between items-center mb-4 border-b border-[#242424] pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider font-heading">
                {activeModal.toUpperCase()}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="text-xs text-gray-300 space-y-3 leading-relaxed">
              {activeModal === 'help' && (
                <p>
                  For inquiries regarding your orders, sizes, or collaborations, our concierge team is available Monday through Friday from 9AM - 6PM EST. Email support@urbanthreads.com.
                </p>
              )}
              {activeModal === 'shipping' && (
                <p>
                  Orders over $100.00 qualify for complimentary standard shipping. Standard domestic delivery takes 2–4 business days with end-to-end tracking provided upon dispatch.
                </p>
              )}
              {activeModal === 'sizing' && (
                <p>
                  All Urban Threads apparel features an authentic boxy, drop-shoulder streetwear silhouette. If you prefer a tailored fit, we recommend ordering one size down from your usual size.
                </p>
              )}
              {(activeModal === 'privacy' || activeModal === 'terms' || activeModal === 'accessibility' || activeModal === 'contact') && (
                <p>
                  Urban Threads is committed to customer data security and complete transparency. All transactions use server-side cryptographic verification and strict customer isolation.
                </p>
              )}
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="mt-6 w-full bg-white text-black text-xs font-bold py-2 uppercase tracking-wider hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </footer>
  );
};

