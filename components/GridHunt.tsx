
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { GRID_DATA } from '../constants';
import { Grid, RotateCcw, Gem, Bomb, Target, LogOut } from 'lucide-react';

interface GridHuntProps {
  channelConnected: boolean;
  // Add comment above fix: missing required onHome prop
  onHome: () => void;
}

type CellType = 'EMPTY' | 'TREASURE' | 'BOMB';
interface GridCell {
  type: CellType;
  revealed: boolean;
  finder?: string;
}

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  const el = document.getElementById('game-sidebar-portal');
  if (!mounted || !el) return null;
  return createPortal(children, el);
};

export const GridHunt: React.FC<GridHuntProps> = ({ channelConnected, onHome }) => {
  const [grid, setGrid] = useState<GridCell[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [scoreBoard, setScoreBoard] = useState<{name: string, score: number}[]>([]);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const isActiveRef = useRef(isActive);
  const gridRef = useRef(grid);

  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { gridRef.current = grid; }, [grid]);

  useEffect(() => {
     initializeGrid();
  }, []);

  const initializeGrid = () => {
     const totalCells = GRID_DATA.rows * GRID_DATA.cols;
     let newGrid: GridCell[] = Array(totalCells).fill({ type: 'EMPTY', revealed: false });
     
     // Place Treasures
     let placed = 0;
     while (placed < GRID_DATA.treasureCount) {
        const idx = Math.floor(Math.random() * totalCells);
        if (newGrid[idx].type === 'EMPTY') {
           newGrid[idx] = { ...newGrid[idx], type: 'TREASURE' };
           placed++;
        }
     }

     // Place Bombs
     placed = 0;
     while (placed < GRID_DATA.bombCount) {
        const idx = Math.floor(Math.random() * totalCells);
        if (newGrid[idx].type === 'EMPTY') {
           newGrid[idx] = { ...newGrid[idx], type: 'BOMB' };
           placed++;
        }
     }

     setGrid(newGrid);
     setIsActive(false);
     setScoreBoard([]);
     setLastAction(null);
  };

  useEffect(() => {
    if (!channelConnected) return;
    const cleanup = chatService.onMessage((msg) => {
       if (!isActiveRef.current) return;

       const content = msg.content.trim().toUpperCase();
       // Regex for !A1, !H8, etc.
       const match = content.match(/^!([A-H])([1-8])$/);
       
       if (match) {
          const colChar = match[1];
          const rowNum = parseInt(match[2]);
          
          const colIndex = colChar.charCodeAt(0) - 65; // A=0, B=1...
          const rowIndex = rowNum - 1; // 1=0, 2=1...
          const flatIndex = rowIndex * GRID_DATA.cols + colIndex;

          const currentGrid = [...gridRef.current];
          if (!currentGrid[flatIndex].revealed) {
             // Reveal Logic
             currentGrid[flatIndex] = { 
                ...currentGrid[flatIndex], 
                revealed: true, 
                finder: msg.user.username 
             };
             
             setGrid(currentGrid);
             
             // Scoring
             if (currentGrid[flatIndex].type === 'TREASURE') {
                setLastAction(`${msg.user.username} وجد كنزاً! 💎`);
                updateScore(msg.user.username, 100);
             } else if (currentGrid[flatIndex].type === 'BOMB') {
                setLastAction(`${msg.user.username} فجر قنبلة! 💥`);
                updateScore(msg.user.username, -50);
             } else {
                setLastAction(null);
             }
          }
       }
    });
    return cleanup;
  }, [channelConnected]);

  const updateScore = (user: string, points: number) => {
     setScoreBoard(prev => {
        const exists = prev.find(p => p.name === user);
        if (exists) {
           return prev.map(p => p.name === user ? { ...p, score: p.score + points } : p).sort((a,b) => b.score - a.score);
        }
        return [...prev, { name: user, score: points }].sort((a,b) => b.score - a.score);
     });
  };

  const startGame = () => setIsActive(true);

  // Render Rows A-H, Cols 1-8
  const renderGrid = () => {
     return (
        <div className="grid grid-cols-8 gap-1 md:gap-2">
           {grid.map((cell, idx) => {
              const row = Math.floor(idx / 8);
              const col = idx % 8;
              const coord = `${String.fromCharCode(65 + col)}${row + 1}`;
              
              return (
                 <div 
                    key={idx}
                    className={`
                       w-8 h-8 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded border border-white/5 flex items-center justify-center text-xs font-bold transition-all duration-300 relative overflow-hidden
                       ${!cell.revealed ? 'bg-[#1a1d21] hover:bg-white/5' : ''}
                       ${cell.revealed && cell.type === 'TREASURE' ? 'bg-blue-500/20 border-blue-500' : ''}
                       ${cell.revealed && cell.type === 'BOMB' ? 'bg-red-500/20 border-red-500' : ''}
                       ${cell.revealed && cell.type === 'EMPTY' ? 'bg-gray-800/50 text-gray-600' : ''}
                    `}
                 >
                    {!cell.revealed ? (
                       <span className="opacity-30">{coord}</span>
                    ) : (
                       <div className="animate-in zoom-in duration-300 flex flex-col items-center">
                          {cell.type === 'TREASURE' && <Gem size={20} className="text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />}
                          {cell.type === 'BOMB' && <Bomb size={20} className="text-red-500 animate-pulse" />}
                          {cell.type === 'EMPTY' && <div className="w-2 h-2 rounded-full bg-gray-600"></div>}
                       </div>
                    )}
                    {/* Finder Name (Optional, small tooltip) */}
                    {cell.revealed && cell.finder && cell.type !== 'EMPTY' && (
                       <div className="absolute bottom-0 text-[8px] w-full text-center bg-black/60 text-white truncate px-1">
                          {cell.finder}
                       </div>
                    )}
                 </div>
              );
           })}
        </div>
     );
  };

  return (
    <>
      <SidebarPortal>
         <div className="bg-[#141619] p-4 rounded-xl border border-white/5 space-y-3 animate-in slide-in-from-right-4">
             {/* Add comment above fix: provide game exit control in sidebar */}
             <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                   <Grid size={12} /> تحكم الشبكة
                </h4>
                <button onClick={onHome} className="p-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl transition-all border border-red-500/20">
                   <LogOut size={14} />
                </button>
             </div>
             <button 
                onClick={isActive ? initializeGrid : startGame}
                className={`w-full font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${isActive ? 'bg-red-500/20 text-red-500' : 'bg-kick-green text-black'}`}
             >
                {isActive ? <RotateCcw size={14} /> : <Target size={14} />} 
                {isActive ? 'إعادة الخريطة' : 'ابدأ البحث'}
             </button>
             <div className="text-[10px] text-gray-500 bg-white/5 p-2 rounded">
                الأوامر: !A1, !B5, !C3... <br/>
                💎 = +100 | 💥 = -50
             </div>
         </div>

         {scoreBoard.length > 0 && (
            <div className="bg-[#141619] rounded-xl border border-white/5 flex flex-col overflow-hidden h-[250px] mt-3">
               <div className="p-3 border-b border-white/5 bg-[#0b0e0f] text-xs font-bold text-gray-400">
                  النتائج
               </div>
               <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                  {scoreBoard.map((p, i) => (
                     <div key={i} className="flex justify-between p-2 rounded bg-white/5 text-xs">
                        <span className="text-gray-300">{p.name}</span>
                        <span className="font-mono text-kick-green">{p.score}</span>
                     </div>
                  ))}
               </div>
            </div>
         )}
      </SidebarPortal>

      <div className="w-full h-full flex flex-col items-center justify-center p-4 relative overflow-hidden">
         {lastAction && (
            <div className="absolute top-10 bg-black/60 backdrop-blur px-6 py-2 rounded-full border border-white/10 text-white font-bold animate-in fade-in slide-in-from-top-4 z-20">
               {lastAction}
            </div>
         )}

         {/* Coordinate Labels Top */}
         <div className="flex gap-1 md:gap-2 mb-2 ml-8 md:ml-12 lg:ml-16">
            {['A','B','C','D','E','F','G','H'].map(c => (
               <div key={c} className="w-8 md:w-12 lg:w-16 text-center text-kick-green font-black">{c}</div>
            ))}
         </div>

         <div className="flex gap-2">
             {/* Coordinate Labels Left */}
             <div className="flex flex-col gap-1 md:gap-2 pt-1 md:pt-2">
               {[1,2,3,4,5,6,7,8].map(n => (
                  <div key={n} className="h-8 md:h-12 lg:h-16 flex items-center justify-center text-kick-green font-black">{n}</div>
               ))}
             </div>
             
             {/* The Grid */}
             {renderGrid()}
         </div>
      </div>
    </>
  );
};
