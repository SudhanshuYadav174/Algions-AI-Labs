import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger.js';

gsap.registerPlugin(ScrollTrigger);

interface BrandLogo {
  id: string;
  name: string;
  className: string;
  subtitle?: string;
}

const PARTNER_LOGOS: BrandLogo[] = [
  { id: 'nova', name: 'Nova', className: 'font-nova text-3xl text-gray-200 tracking-tight' },
  { id: 'forge', name: 'Forge', className: 'font-forge text-3xl text-gray-200' },
  { id: 'flux', name: 'flux', className: 'font-flux text-3xl font-extrabold text-white tracking-tighter' },
  { id: 'beam', name: 'Beam', className: 'font-beam text-3xl italic text-gray-200 font-bold' },
  { id: 'echo', name: 'echo', className: 'font-echo text-3xl text-gray-200' },
  { id: 'hype', name: 'HYPEBEAST', className: 'font-bebas text-2xl tracking-[0.2em] text-gray-300' },
  { id: 'complex', name: 'COMPLEX', className: 'font-heading font-black text-xl tracking-[0.25em] text-gray-300' },
  { id: 'highsnobiety', name: 'HIGHSNOBIETY', className: 'text-xs font-black tracking-[0.3em] uppercase text-gray-400' },
  { id: 'dazed', name: 'DAZED', className: 'font-nova italic text-2xl font-black text-gray-300 tracking-wider' },
  { id: 'vogue', name: 'VOGUE STREET', className: 'font-nova text-lg tracking-[0.18em] text-gray-400 font-semibold' },
];

export const InfiniteBrandMarquee: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Scroll-triggered entrance animation
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 35 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 85%',
          },
        }
      );

      // 2. Infinite horizontal ticker animation
      if (trackRef.current) {
        tweenRef.current = gsap.to(trackRef.current, {
          xPercent: -50,
          repeat: -1,
          duration: 28,
          ease: 'none',
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleMouseEnter = () => {
    if (tweenRef.current) {
      gsap.to(tweenRef.current, { timeScale: 0.25, duration: 0.5 });
    }
  };

  const handleMouseLeave = () => {
    if (tweenRef.current) {
      gsap.to(tweenRef.current, { timeScale: 1, duration: 0.5 });
    }
  };

  return (
    <section
      ref={containerRef}
      className="relative w-full py-12 bg-[#080808] border-y border-[#1a1a1a] overflow-hidden"
    >
      {/* Subtle top ambient glowing warm rim matching screenshot reference */}
      <div className="absolute top-0 right-0 w-96 h-28 bg-gradient-to-bl from-amber-600/10 via-orange-500/5 to-transparent pointer-events-none blur-2xl" />
      <div className="absolute bottom-0 left-0 w-80 h-24 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none blur-xl" />

      {/* Subtle Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-7">
        <p className="text-[11px] sm:text-xs font-medium tracking-wider text-gray-400">
          Partnering with leading culture curators & streetwear editorials worldwide
        </p>
      </div>

      {/* Marquee Ticker with Edge Mask Gradients */}
      <div
        className="relative w-full overflow-hidden cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Left and right fade gradient overlays for smooth infinite appearance */}
        <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-36 bg-gradient-to-r from-[#080808] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-36 bg-gradient-to-l from-[#080808] to-transparent z-10 pointer-events-none" />

        {/* Double array track for seamless -50% loop */}
        <div
          ref={trackRef}
          className="flex items-center space-x-14 sm:space-x-20 whitespace-nowrap will-change-transform py-2"
        >
          {/* First loop */}
          {PARTNER_LOGOS.map((brand) => (
            <div
              key={`logo-1-${brand.id}`}
              className="flex items-center justify-center min-w-[130px] sm:min-w-[170px] select-none opacity-70 hover:opacity-100 transition-opacity duration-300"
            >
              <span className={brand.className}>{brand.name}</span>
            </div>
          ))}

          {/* Duplicate loop for seamless infinite continuation */}
          {PARTNER_LOGOS.map((brand) => (
            <div
              key={`logo-2-${brand.id}`}
              className="flex items-center justify-center min-w-[130px] sm:min-w-[170px] select-none opacity-70 hover:opacity-100 transition-opacity duration-300"
            >
              <span className={brand.className}>{brand.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

