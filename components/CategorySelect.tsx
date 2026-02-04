
import React from 'react';
import { CATEGORIES } from '../constants';
import { ArrowRight, Home, LayoutGrid } from 'lucide-react';

interface CategorySelectProps {
  onSelect: (id: string) => void;
  onBack: () => void;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({ onSelect, onBack }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-7xl mx-auto px-4 pb-20">
      {/* --- Top Navigation Header --- */}
      <div className="flex items-center justify-between mb-12">
        <button
          onClick={onBack}
          className="group flex items-center gap-4 bg-white/5 hover:bg-red-600 transition-all p-2 pr-6 rounded-2xl border border-white/10 text-white font-black italic shadow-xl active:scale-95"
        >
          <span className="text-xs uppercase tracking-widest group-hover:text-white text-gray-400">العودة للرئيسية</span>
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:bg-white group-hover:text-red-600 transition-colors">
            <Home size={20} />
          </div>
        </button>

        <div className="text-right">
          <h2 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-[0_10px_20px_rgba(0,0,0,1)]">أقـسـام الـفـوازير</h2>
          <p className="text-red-600 font-black tracking-[0.4em] text-[10px] uppercase mt-2 opacity-80">iABS Question Hub v2.0</p>
        </div>
      </div>

      {/* --- Special Ramadan Banner --- */}
      <div className="w-full mb-12">
        <button
          onClick={() => onSelect('ramadan')}
          className="group relative w-full h-64 md:h-80 rounded-[3.5rem] overflow-hidden border-2 border-white/10 hover:border-red-600 transition-all duration-700 shadow-[0_30px_70px_rgba(0,0,0,0.8)] hover:shadow-[0_0_100px_rgba(220,38,38,0.3)] hover:scale-[1.01] active:scale-95 bg-[#050505]"
        >
          <div className="absolute inset-0">
            <img
              src="https://i.ibb.co/k6mHccgc/content.png"
              alt="Ramadan Background"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 brightness-[0.6] group-hover:brightness-[0.9]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
            <div className="absolute inset-0 bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>

          <div className="absolute inset-0 flex items-center justify-between px-12 md:px-24">
            <div className="flex flex-col items-start text-right">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-red-600 p-3 rounded-2xl shadow-xl shadow-red-600/40 animate-pulse">
                  <span className="text-3xl">🪔</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 text-xs font-black text-white uppercase tracking-widest italic">
                  موسم رمضان 2026
                </div>
              </div>
              <h2 className="text-6xl md:text-9xl font-black text-white italic tracking-tighter drop-shadow-[0_8px_30px_rgba(0,0,0,1)] group-hover:red-neon-text transition-all duration-500">
                فوازير رمضان
              </h2>
              <p className="text-xl md:text-3xl text-gray-300 font-bold tracking-wide mt-2">
                تحدى معلوماتك الدينية والثقافية واربح النقاط
              </p>
            </div>

            <div className="hidden lg:flex flex-col items-center gap-4 group/btn">
              <div className="w-28 h-28 rounded-full border-4 border-white/20 bg-black/40 backdrop-blur-xl flex items-center justify-center group-hover:bg-white group-hover:text-black group-hover:scale-110 transition-all duration-500 shadow-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="ml-2 rotate-180"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              </div>
              <span className="text-xs font-black text-white/40 uppercase tracking-[0.5em]">إبدأ الآن</span>
            </div>
          </div>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {CATEGORIES.filter(c => c.id !== 'ramadan').map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className="group relative aspect-square rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-red-600 transition-all duration-500 shadow-2xl hover:scale-105 active:scale-95 bg-black"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="absolute inset-0">
              <img src={cat.image} className="w-full h-full object-cover grayscale brightness-[0.3] group-hover:grayscale-0 group-hover:brightness-[0.7] transition-all duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-80"></div>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-4xl mb-4 border border-white/10 group-hover:bg-red-600 group-hover:text-white transition-all duration-500 shadow-lg group-hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] transform group-hover:rotate-12">
                {cat.icon}
              </div>
              <h3 className="text-lg md:text-xl font-black text-white group-hover:text-red-600 transition-colors uppercase italic leading-tight px-2">
                {cat.label}
              </h3>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
