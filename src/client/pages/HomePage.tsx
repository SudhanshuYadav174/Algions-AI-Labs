import React, { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, Truck, RefreshCw, Flame } from 'lucide-react';
import { ProductCard } from '../components/ProductCard.js';
import { productApi } from '../services/api.js';

interface HomePageProps {
  onNavigate: (view: string, params?: any) => void;
  onSelectProduct: (product: any) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectProduct }) => {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeatured() {
      try {
        const data = await productApi.getFeatured();
        setFeaturedProducts(data.featured || []);
      } catch (err) {
        console.error('Failed to load featured products:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFeatured();
  }, []);

  return (
    <div className="space-y-16 pb-16">
      
      {/* 1. HERO SECTION - Exact Match to Screenshot */}
      <section className="relative min-h-[580px] lg:min-h-[660px] flex items-center bg-[#0a0a0a] overflow-hidden border-b border-[#222222]">
        
        {/* Background Streetwear Model Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1800&q=85"
            alt="Urban Threads Streetwear NYC"
            className="w-full h-full object-cover object-right md:object-center opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
        </div>

        {/* Hero Copy */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-xl space-y-6">
            
            <div className="inline-flex items-center space-x-2">
              <span className="text-[#e63946] text-xs font-black tracking-widest uppercase">
                NEW YORK. REAL STYLE.
              </span>
            </div>

            <h1 className="text-5xl sm:text-7xl font-extrabold uppercase text-white font-bebas leading-[0.9] tracking-tight">
              BUILT IN THE CITY.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500">
                MADE TO STAND OUT.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-gray-300 font-normal leading-relaxed max-w-md">
              Premium streetwear for those who move different. Heavyweight cotton, tactical trims, and relaxed NYC silhouettes.
            </p>

            <div className="pt-2">
              <button
                onClick={() => onNavigate('catalog', { category: 'new-arrivals' })}
                className="bg-white hover:bg-gray-200 text-black font-black text-xs py-4 px-8 uppercase tracking-widest flex items-center space-x-3 transition-transform hover:scale-105 duration-200"
              >
                <span>SHOP NEW ARRIVALS</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel indicators simulation */}
        <div className="absolute bottom-6 left-8 flex space-x-2 z-10">
          <div className="w-8 h-1 bg-white"></div>
          <div className="w-4 h-1 bg-gray-600"></div>
          <div className="w-4 h-1 bg-gray-600"></div>
        </div>
      </section>

      {/* 2. FEATURED PRODUCTS SECTION - Matching Screenshot */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8 pb-3 border-b border-[#222222]">
          <div className="flex items-center space-x-3">
            <Flame className="text-[#e63946]" size={22} />
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white font-heading">
              FEATURED PRODUCTS
            </h2>
          </div>
          <button
            onClick={() => onNavigate('catalog')}
            className="text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider flex items-center space-x-1"
          >
            <span>VIEW ALL</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-96 bg-[#141414] animate-pulse border border-[#222222]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.slice(0, 4).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
              />
            ))}
          </div>
        )}
      </section>

      {/* 3. STREETWEAR CATEGORIES SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div
            onClick={() => onNavigate('catalog', { category: 'men' })}
            className="relative h-80 overflow-hidden bg-[#161616] cursor-pointer group border border-[#222222]"
          >
            <img
              src="https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=800&q=80"
              alt="Men's Streetwear"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent flex flex-col justify-end p-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#e63946]">Category</span>
              <h3 className="text-2xl font-extrabold uppercase font-bebas text-white">MEN'S APPAREL</h3>
              <p className="text-xs text-gray-400 mt-1">Cargo pants, graphic tees, relaxed denim</p>
            </div>
          </div>

          <div
            onClick={() => onNavigate('catalog', { category: 'women' })}
            className="relative h-80 overflow-hidden bg-[#161616] cursor-pointer group border border-[#222222]"
          >
            <img
              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80"
              alt="Women's Streetwear"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent flex flex-col justify-end p-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#e63946]">Category</span>
              <h3 className="text-2xl font-extrabold uppercase font-bebas text-white">WOMEN'S SILHOUETTES</h3>
              <p className="text-xs text-gray-400 mt-1">Cropped denim jackets, oversized hoodies</p>
            </div>
          </div>

          <div
            onClick={() => onNavigate('catalog', { category: 'accessories' })}
            className="relative h-80 overflow-hidden bg-[#161616] cursor-pointer group border border-[#222222]"
          >
            <img
              src="https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80"
              alt="Accessories"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent flex flex-col justify-end p-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#e63946]">Category</span>
              <h3 className="text-2xl font-extrabold uppercase font-bebas text-white">HEADWEAR & BAGS</h3>
              <p className="text-xs text-gray-400 mt-1">Utility caps, crossbody slings, tactical gear</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. VALUE PILLARS */}
      <section className="bg-[#0e0e0e] border-y border-[#1e1e1e] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
            <div className="flex items-start space-x-4">
              <Truck className="text-[#e63946] flex-shrink-0 mt-1" size={24} />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">Free US Shipping Over $100</h4>
                <p className="text-xs text-gray-400 mt-1">Fast domestic dispatch with live end-to-end order tracking.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <ShieldCheck className="text-[#e63946] flex-shrink-0 mt-1" size={24} />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">Heavyweight Fabrication</h4>
                <p className="text-xs text-gray-400 mt-1">280–450 GSM custom French terry and ring-spun combed cotton.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <RefreshCw className="text-[#e63946] flex-shrink-0 mt-1" size={24} />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">30-Day Hassle-Free Returns</h4>
                <p className="text-xs text-gray-400 mt-1">Instant returns and stock restoration with one click.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

