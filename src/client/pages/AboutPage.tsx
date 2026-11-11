import React from 'react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-4">
        <span className="text-xs font-black uppercase tracking-widest text-[#e63946]">
          THE MANIFESTO
        </span>
        <h1 className="text-4xl sm:text-6xl font-extrabold uppercase text-white font-bebas tracking-wide">
          BUILT IN THE CITY. MADE TO STAND OUT.
        </h1>
        <p className="text-sm text-gray-300 max-w-xl mx-auto leading-relaxed">
          Urban Threads was conceived on the concrete grid of New York City. We engineer high-density heavyweight streetwear garments designed to outlast transient fashion cycles.
        </p>
      </div>

      <div className="aspect-[16/9] w-full bg-[#161616] border border-[#222222] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1600&q=80"
          alt="NYC Streetwear"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-gray-300 leading-relaxed">
        <div className="bg-[#111111] border border-[#222222] p-6 space-y-3">
          <h3 className="text-sm font-black uppercase text-white font-heading">
            Fabrication & Precision
          </h3>
          <p>
            Every piece is cut from custom-milled combed cotton ranging from 280 GSM tees to 450 GSM diagonal-loop French terry fleece. Pre-shrunk with stone enzyme washes to deliver an authentic worn-in drape from Day 1.
          </p>
        </div>

        <div className="bg-[#111111] border border-[#222222] p-6 space-y-3">
          <h3 className="text-sm font-black uppercase text-white font-heading">
            Zero Hardcoded Illusion
          </h3>
          <p>
            Urban Threads is engineered with transactional integrity. Our entire inventory system, customer isolation, role-based controls, and price recalculations execute natively with PostgreSQL consistency.
          </p>
        </div>
      </div>
    </div>
  );
};
