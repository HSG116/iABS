
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { PaintBucket, RotateCcw, Zap, LogOut } from 'lucide-react';

interface TerritoryWarProps {
  channelConnected: boolean;
  // Add comment above fix: missing required onHome prop
  onHome: () => void;
}

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  const el = document.getElementById('game-sidebar-portal');
  if (!mounted || !el) return null;
  return createPortal(children, el);
};

export const TerritoryWar: React.FC<TerritoryWarProps> = ({ channelConnected, onHome }) => {
  const ROWS = 20;
  const COLS = 20;
  const [grid, setGrid] = useState<number[]>(Array(ROWS * COLS).fill(0)); // 0=Empty, 1=Red, 2=Blue
  const [stats, setStats] = useState({ red: 0, blue: 0 });
  
  useEffect(() => {
     // Calculate stats
     let r = 0, b = 0;
     grid.forEach(cell => {
        if (cell === 1) r++;
        if (cell === 2) b++;
     });
     setStats({ red: r, blue: b });
  }, [grid]);

  useEffect(() => {
    if (!channelConnected) return;
    const cleanup = chatService.onMessage((msg) => {
       const content = msg.content.trim().toLowerCase();
       let team = 0;
       
       if (content === '!red' || content === '!أحمر') team = 1;
       if (content === '!blue' || content === '!أزرق') team = 2;

       if (team !== 0) {
          // Paint a random available pixel? Or random enemy pixel?
          // To make it fast, we pick a random index.
          // Optional: Spread effect (paint 3x3)
          setGrid(prev => {
             const newGrid = [...prev];
             // Paint 3 random spots to make it faster
             for(let i=0; i<3; i++) {
                const idx = Math.floor(Math.random() * (ROWS * COLS));
                newGrid[idx] = team;
             }
             return newGrid;
          });
       }
    });
    return cleanup;
  }, [channelConnected]);

  const resetGame = () => {
     setGrid(Array(ROWS * COLS).fill(0));
  };

  const triggerRandomEvent = (type: 'NUKE' | 'SWAP') => {
      if (type === 'NUKE') {
          // Clear random 30%
          setGrid(prev => prev.map(c => Math.random() > 0.7 ? 0 : c));
      } else if (type === 'SWAP') {
          // Swap Red/Blue
          setGrid(prev => prev.map(c => c === 1 ? 2 : c === 2 ? 1 : 0));
      }
  };

  return (
    <>
      <SidebarPortal>
         <div className="bg-[#141619] p-4 rounded-xl border border-white/5 space-y-3 animate-in slide-in-from-right-4">
             {/* Add comment above fix: provide game exit control in sidebar */}
             <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                   <PaintBucket size={12} /> تحكم الحرب
                </h4>
                <button onClick={onHome} className="p-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl transition-all border border-red-500/20">
                   <LogOut size={14} />
                </button>
             </div>
             <button onClick={resetGame} className="w-full bg-white/5 py-2 rounded-lg text-xs text-gray-400 font-bold">
                <RotateCcw size={12} className="inline mr-1" /> تصفية اللوحة
             </button>
             <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => triggerRandomEvent('NUKE')} className="bg-orange-500/20 text-orange-500 py-2 rounded text-xs font-bold hover:bg-orange-500/30">
                    <Zap size={12} className="inline" /> زلزال
                 </button>
                 <button onClick={() => triggerRandomEvent('SWAP')} className="bg-purple-500/20 text-purple-500 py-2 rounded text-xs font-bold hover:bg-purple-500/30">
                    تبديل الأماكن
                 </button>
             </div>
         </div>
      </SidebarPortal>

      <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
         <div className="flex justify-between w-full max-w-xl mb-4 text-2xl font-black uppercase tracking-widest">
            <div className="text-red-500">RED: {Math.round((stats.red / (ROWS*COLS))*100)}%</div>
            <div className="text-blue-500">BLUE: {Math.round((stats.blue / (ROWS*COLS))*100)}%</div>
         </div>

         <div className="relative border-4 border-white/10 shadow-2xl bg-black" style={{ 
             display: 'grid', 
             gridTemplateColumns: `repeat(${COLS}, 1fr)`, 
             width: 'min(90vw, 600px)', 
             height: 'min(90vw, 600px)' 
         }}>
             {grid.map((cell, i) => (
                 <div key={i} className={`
                    w-full h-full transition-colors duration-300
                    ${cell === 0 ? 'bg-[#111]' : ''}
                    ${cell === 1 ? 'bg-red-600 shadow-[0_0_5px_rgba(220,38,38,0.8)] z-10' : ''}
                    ${cell === 2 ? 'bg-blue-600 shadow-[0_0_5px_rgba(37,99,235,0.8)] z-10' : ''}
                 `}></div>
             ))}
         </div>
         
         <div className="mt-6 text-gray-500 font-mono text-sm">
             اكتب <span className="text-red-500">!red</span> أو <span className="text-blue-500">!blue</span> للسيطرة
         </div>
      </div>
    </>
  );
};
