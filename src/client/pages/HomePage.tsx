import React, { useEffect, useState, useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Truck, RefreshCw, Flame } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger.js';
import { ProductCard } from '../components/ProductCard.js';
import { InfiniteBrandMarquee } from '../components/InfiniteBrandMarquee.js';
import { productApi } from '../services/api.js';

gsap.registerPlugin(ScrollTrigger);

interface HomePageProps {
  onNavigate: (view: string, params?: any) => void;
  onSelectProduct: (product: any) => void;
}

interface HeroSlide {
  id: number;
  tagline: string;
  badge: string;
  headlineFirst: string;
  headlineSecond: string;
  description: string;
  cta: string;
  category: string;
  image: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    badge: 'DROP 01 / SOHO CORE',
    tagline: 'NEW YORK. REAL STYLE.',
    headlineFirst: 'BUILT IN THE CITY.',
    headlineSecond: 'MADE TO STAND OUT.',
    description: 'Premium streetwear for those who move different. Heavyweight cotton, tactical trims, and relaxed NYC silhouettes.',
    cta: 'SHOP NEW ARRIVALS',
    category: 'new-arrivals',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1920&q=85',
  },
  {
    id: 2,
    badge: 'DROP 02 / HEAVYWEIGHT TACTICAL',
    tagline: 'TACTICAL APPAREL & ARCHIVE FLEECE',
    headlineFirst: 'UNDERGROUND ROOTS.',
    headlineSecond: 'ENGINEERED PRECISION.',
    description: '450 GSM French terry hoodies and multi-pocket cargo joggers engineered for maximum durability and boxy NYC streetwear proportions.',
    cta: "EXPLORE MEN'S APPAREL",
    category: 'men',
    image: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=1920&q=85',
  },
  {
    id: 3,
    badge: 'DROP 03 / ACID WASH & ARCHIVE',
    tagline: 'VINTAGE STONEWASH & RAW FINISHES',
    headlineFirst: 'DISTRESSED DENIM.',
    headlineSecond: 'UNAPOLOGETIC ATTITUDE.',
    description: 'Custom 14oz rigid denim trucker jackets, boxy cuts, and archival statement jewelry for everyday rebellion.',
    cta: "VIEW WOMEN'S DROPS",
    category: 'women',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1920&q=85',
  },
];

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectProduct }) => {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  const SLIDE_DURATION = 4000; // 4 seconds per slide

  // Animation references
  const heroContainerRef = useRef<HTMLDivElement>(null);
  const slideImageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const progressBarRefs = useRef<(HTMLDivElement | null)[]>([]);

  const featuredSectionRef = useRef<HTMLElement>(null);
  const categoriesSectionRef = useRef<HTMLElement>(null);
  const pillarsSectionRef = useRef<HTMLElement>(null);

  // 1. Fetch featured products
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

  // 2. Continuous Auto-slide progression (advances every 4 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, SLIDE_DURATION);

    return () => clearTimeout(timer);
  }, [activeSlide]);

  // 3. GSAP animations when activeSlide changes
  useEffect(() => {
    // A. Animate active progress bar from 0% to 100%
    progressBarRefs.current.forEach((bar, idx) => {
      if (!bar) return;
      gsap.killTweensOf(bar);
      if (idx === activeSlide) {
        gsap.fromTo(
          bar,
          { width: '0%' },
          {
            width: '100%',
            duration: SLIDE_DURATION / 1000,
            ease: 'none',
          }
        );
      } else {
        gsap.set(bar, { width: '0%' });
      }
    });

    // B. Subtle Ken Burns Zoom on active hero image
    const activeImg = slideImageRefs.current[activeSlide];
    if (activeImg) {
      gsap.killTweensOf(activeImg);
      gsap.fromTo(
        activeImg,
        { scale: 1.06 },
        { scale: 1.0, duration: SLIDE_DURATION / 1000, ease: 'power1.out' }
      );
    }

    // C. Stagger in hero textual elements
    if (heroContentRef.current) {
      const elements = heroContentRef.current.querySelectorAll('.hero-animate-item');
      if (elements.length > 0) {
        gsap.fromTo(
          elements,
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power2.out' }
        );
      }
    }
  }, [activeSlide]);

  // 4. GSAP ScrollTrigger Scroll Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Featured Products entrance animation
      if (featuredSectionRef.current) {
        gsap.fromTo(
          '.featured-header',
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: featuredSectionRef.current,
              start: 'top 85%',
            },
          }
        );

        gsap.fromTo(
          '.featured-card',
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: '.featured-grid',
              start: 'top 85%',
            },
          }
        );
      }

      // Categories Showcase entrance
      if (categoriesSectionRef.current) {
        gsap.fromTo(
          '.category-tile',
          { opacity: 0, y: 40, scale: 0.97 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            stagger: 0.18,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: categoriesSectionRef.current,
              start: 'top 85%',
            },
          }
        );
      }

      // Value Pillars entrance
      if (pillarsSectionRef.current) {
        gsap.fromTo(
          '.pillar-item',
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.14,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: pillarsSectionRef.current,
              start: 'top 90%',
            },
          }
        );
      }
    });

    return () => ctx.revert();
  }, [featuredProducts]);

  const handlePrevSlide = () => {
    setActiveSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const currentSlideData = HERO_SLIDES[activeSlide];

  return (
    <div className="space-y-16 pb-16">
      
      {/* 1. HERO SECTION WITH 3 AUTO-SLIDING PHOTOS & GSAP ANIMATIONS */}
      <section
        ref={heroContainerRef}
        className="relative min-h-[600px] lg:min-h-[700px] flex items-center bg-[#0a0a0a] overflow-hidden border-b border-[#222222]"
      >
        {/* Background Photos Layer with Silky CSS Crossfade & GSAP Ken Burns Zoom */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {HERO_SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                idx === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img
                ref={(el) => (slideImageRefs.current[idx] = el)}
                src={slide.image}
                alt={slide.headlineFirst}
                className="w-full h-full object-cover object-right md:object-center opacity-45 will-change-transform"
              />
            </div>
          ))}

          {/* Atmospheric Gradients */}
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/85 to-transparent pointer-events-none" />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/40 pointer-events-none" />
        </div>

        {/* Dynamic Hero Copy Layer */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div
            key={activeSlide}
            ref={heroContentRef}
            className="max-w-xl space-y-6"
          >
            {/* Tagline & Collection Badge */}
            <div className="hero-animate-item flex items-center space-x-3">
              <span className="bg-[#e63946] text-white text-[10px] font-black uppercase px-2 py-0.5 tracking-wider">
                {currentSlideData.badge}
              </span>
              <span className="text-[#e63946] text-xs font-black tracking-widest uppercase">
                {currentSlideData.tagline}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="hero-animate-item text-5xl sm:text-7xl font-extrabold uppercase text-white font-bebas leading-[0.9] tracking-tight">
              {currentSlideData.headlineFirst}<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500">
                {currentSlideData.headlineSecond}
              </span>
            </h1>

            {/* Description */}
            <p className="hero-animate-item text-sm sm:text-base text-gray-300 font-normal leading-relaxed max-w-md">
              {currentSlideData.description}
            </p>

            {/* Action CTA Button */}
            <div className="hero-animate-item pt-2 flex items-center space-x-4">
              <button
                onClick={() => onNavigate('catalog', { category: currentSlideData.category })}
                className="bg-white hover:bg-gray-200 text-black font-black text-xs py-4 px-8 uppercase tracking-widest flex items-center space-x-3 transition-transform hover:scale-105 duration-200"
              >
                <span>{currentSlideData.cta}</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => onNavigate('catalog')}
                className="border border-[#383838] hover:border-white text-gray-300 hover:text-white font-bold text-xs py-4 px-6 uppercase tracking-wider transition-colors"
              >
                View Full Lookbook
              </button>
            </div>
          </div>
        </div>

        {/* Interactive 3-Bar Slide Indicators & Timer Progress */}
        <div className="absolute bottom-8 left-4 sm:left-8 flex items-center space-x-3 z-30">
          {HERO_SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => setActiveSlide(idx)}
              className="group flex flex-col items-start py-2"
              aria-label={`Go to slide ${idx + 1}`}
            >
              <div className="relative w-12 sm:w-16 h-1 bg-white/20 overflow-hidden rounded-full">
                {/* Active progress fill animated via GSAP */}
                <div
                  ref={(el) => (progressBarRefs.current[idx] = el)}
                  className="absolute left-0 top-0 bottom-0 bg-white"
                  style={{ width: '0%' }}
                />
              </div>
              <span
                className={`text-[9px] font-bold tracking-widest uppercase mt-1 transition-colors ${
                  idx === activeSlide ? 'text-white' : 'text-gray-400 group-hover:text-white'
                }`}
              >
                0{idx + 1}
              </span>
            </button>
          ))}
        </div>

        {/* Manual Arrow Controls */}
        <div className="absolute bottom-8 right-4 sm:right-8 flex items-center space-x-2 z-30">
          <button
            onClick={handlePrevSlide}
            className="w-10 h-10 border border-[#333333] bg-[#121212]/80 hover:bg-white text-gray-300 hover:text-black flex items-center justify-center transition-colors backdrop-blur-sm"
            aria-label="Previous Slide"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={handleNextSlide}
            className="w-10 h-10 border border-[#333333] bg-[#121212]/80 hover:bg-white text-gray-300 hover:text-black flex items-center justify-center transition-colors backdrop-blur-sm"
            aria-label="Next Slide"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* 2. FEATURED PRODUCTS SECTION (With GSAP Scroll Stagger) */}
      <section ref={featuredSectionRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="featured-header flex items-center justify-between mb-8 pb-3 border-b border-[#222222]">
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
          <div className="featured-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.slice(0, 4).map((product) => (
              <div key={product.id} className="featured-card">
                <ProductCard
                  product={product}
                  onSelect={onSelectProduct}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. INFINITE BRAND & PARTNER LOGO MARQUEE (BELOW FEATURED SECTION) */}
      <InfiniteBrandMarquee />

      {/* 4. STREETWEAR CATEGORIES SHOWCASE (With GSAP Scroll Trigger) */}
      <section ref={categoriesSectionRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div
            onClick={() => onNavigate('catalog', { category: 'men' })}
            className="category-tile relative h-80 overflow-hidden bg-[#161616] cursor-pointer group border border-[#222222]"
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
            className="category-tile relative h-80 overflow-hidden bg-[#161616] cursor-pointer group border border-[#222222]"
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
            className="category-tile relative h-80 overflow-hidden bg-[#161616] cursor-pointer group border border-[#222222]"
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

      {/* 5. VALUE PILLARS (With GSAP Scroll Trigger) */}
      <section ref={pillarsSectionRef} className="bg-[#0e0e0e] border-y border-[#1e1e1e] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
            <div className="pillar-item flex items-start space-x-4">
              <Truck className="text-[#e63946] flex-shrink-0 mt-1" size={24} />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">Free US Shipping Over $100</h4>
                <p className="text-xs text-gray-400 mt-1">Fast domestic dispatch with live end-to-end order tracking.</p>
              </div>
            </div>
            <div className="pillar-item flex items-start space-x-4">
              <ShieldCheck className="text-[#e63946] flex-shrink-0 mt-1" size={24} />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">Heavyweight Fabrication</h4>
                <p className="text-xs text-gray-400 mt-1">280–450 GSM custom French terry and ring-spun combed cotton.</p>
              </div>
            </div>
            <div className="pillar-item flex items-start space-x-4">
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
