
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChatUser } from '../types';
import { chatService } from '../services/chatService';
import { Armchair, Play, Pause, RotateCcw, UserPlus, Skull, Crown } from 'lucide-react';

interface MusicalChairsProps {
  channelConnected: boolean;
}

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
     setMounted(true);
     return () => setMounted(false);
  }, []);
  const el = document.getElementById('game-sidebar-portal');
  if (!mounted || !el) return null;
  return createPortal(children, el);
};

export const MusicalChairs: React.FC<MusicalChairsProps> = ({ channelConnected }) => {
  const [gameState, setGameState] = useState<'WAITING' | 'PLAYING' | 'ELIMINATING' | 'WINNER'>('WAITING');
  const [participants, setParticipants] = useState<ChatUser[]>([]);
  const [winner, setWinner] = useState<ChatUser | null>(null);
  const [round, setRound] = useState(0);
  const [eliminatedCount, setEliminatedCount] = useState(0);

  // Connection refs
  const participantsRef = useRef(participants);
  const gameStateRef = useRef(gameState);

  useEffect(() => { participantsRef.current = participants; }, [participants]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Chat Listener
  useEffect(() => {
    if (!channelConnected) return;
    const cleanup = chatService.onMessage((msg) => {
      // Only allow joining in WAITING state or early game if needed
      if (gameStateRef.current !== 'WAITING') return;

      const content = msg.content || "";
      const normalizedContent = content.replace(/[إأآا]/g, 'ا').trim();
      
      if (normalizedContent.includes('!دخول') || normalizedContent.includes('!join')) {
        const currentList = participantsRef.current;
        if (!currentList.find(p => p.username === msg.user.username)) {
          setParticipants(prev => [...prev, msg.user]);
        }
      }
    });
    return cleanup;
  }, [channelConnected]);

  // Game Logic
  const startGame = () => {
    if (participants.length < 1) return;
    setRound(1);
    startRound();
  };

  const startRound = () => {
    setGameState('PLAYING');
    // Random duration between 5s and 15s
    const duration = 5000 + Math.random() * 10000;
    setTimeout(() => {
       stopMusic();
    }, duration);
  };

  const stopMusic = () => {
    setGameState('ELIMINATING');
    const currentPlayers = [...participantsRef.current];
    
    // Logic: If > 2 players, eliminate ~30-50%. If 2 players, eliminate 1.
    // If 1 player, eliminate 0 (they win).
    let toEliminate = 1;
    if (currentPlayers.length > 2) {
       toEliminate = Math.max(1, Math.floor(currentPlayers.length * 0.4));
    } else if (currentPlayers.length === 1) {
       toEliminate = 0;
    }

    setEliminatedCount(toEliminate);

    setTimeout(() => {
        // Shuffle and remove
        const shuffled = currentPlayers.sort(() => 0.5 - Math.random());
        const survivors = shuffled.slice(toEliminate); // Keep the rest
        setParticipants(survivors);

        if (survivors.length === 1) {
            setWinner(survivors[0]);
            setGameState('WINNER');
        } else {
            setRound(r => r + 1);
            // Auto start next round after 3 seconds
            setTimeout(() => {
                startRound();
            }, 3000);
        }
    }, 2000); // 2 seconds tension before elimination
  };

  const resetGame = () => {
    setParticipants([]);
    setGameState('WAITING');
    setWinner(null);
    setRound(0);
  };

  return (
    <>
      <SidebarPortal>
         <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
             {/* Controls */}
             <div className="bg-[#141619] p-4 rounded-xl border border-white/5 space-y-3">
                 <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                   <Armchair size={12} /> تحكم الكراسي
                 </h4>
                 
                 <div className="flex gap-2">
                    {gameState === 'WAITING' && (
                        <button 
                           onClick={startGame}
                           disabled={participants.length < 1}
                           className="flex-1 bg-kick-green text-black font-bold py-2 rounded-lg text-xs hover:bg-[#4ce615] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                           <Play size={14} /> ابدأ اللعبة
                        </button>
                    )}
                    
                    <button 
                       onClick={resetGame}
                       className="px-3 bg-white/5 text-white font-bold py-2 rounded-lg text-xs hover:bg-white/10 transition-all flex items-center justify-center"
                    >
                       <RotateCcw size={14} />
                    </button>
                 </div>
                 
                 <div className="bg-black/30 p-2 rounded text-center">
                    <span className="text-gray-400 text-xs">الحالة: </span>
                    <span className={`text-xs font-bold ${gameState === 'PLAYING' ? 'text-green-400 animate-pulse' : 'text-white'}`}>
                       {gameState === 'WAITING' && 'بانتظار اللاعبين'}
                       {gameState === 'PLAYING' && 'الموسيقى تعمل...'}
                       {gameState === 'ELIMINATING' && 'توقف! اقصاء...'}
                       {gameState === 'WINNER' && 'انتهت اللعبة'}
                    </span>
                 </div>
             </div>

             {/* Player List */}
             <div className="bg-[#141619] rounded-xl border border-white/5 flex flex-col overflow-hidden h-[300px]">
               <div className="p-3 border-b border-white/5 flex justify-between items-center bg-[#0b0e0f]">
                  <span className="text-xs font-bold text-gray-400 flex items-center gap-2">
                     <UserPlus size={14} className="text-blue-400" /> الباقون
                  </span>
                  <span className="bg-blue-500/10 px-2 py-0.5 rounded text-[10px] font-mono text-blue-400 border border-blue-500/20">
                    {participants.length}
                  </span>
               </div>
               <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                  {participants.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-transparent">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black" style={{ backgroundColor: p.color || '#53FC18' }}>
                          {p.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-gray-300 truncate">{p.username}</span>
                      </div>
                  ))}
               </div>
            </div>
         </div>
      </SidebarPortal>

      {/* Main Visuals */}
      <div className="w-full h-full flex flex-col items-center justify-center relative p-6 overflow-hidden">
         
         {/* Background Decoration */}
         <div className={`absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent pointer-events-none transition-opacity duration-500 ${gameState === 'PLAYING' ? 'opacity-100' : 'opacity-20'}`} />

         {/* GAME STATE: WAITING */}
         {gameState === 'WAITING' && !winner && (
            <div className="text-center opacity-60">
               <Armchair size={80} className="mx-auto mb-4 text-gray-600" />
               <h2 className="text-4xl font-black text-white mb-2">الكراسي الموسيقية</h2>
               <p className="text-xl text-gray-400">اكتب <span className="text-kick-green">!دخول</span> للمشاركة</p>
               <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-2xl">
                  {participants.map((p, i) => (
                     <div key={i} className="animate-in zoom-in duration-300">
                        <div className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center text-xs font-bold text-black" style={{ backgroundColor: p.color || '#fff' }}>
                           {p.username.charAt(0).toUpperCase()}
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         )}

         {/* GAME STATE: PLAYING (Walking) */}
         {gameState === 'PLAYING' && (
            <div className="relative w-full max-w-2xl h-[400px] flex items-center justify-center">
                <div className="absolute w-64 h-64 border-4 border-dashed border-white/10 rounded-full animate-spin-slow"></div>
                <Armchair size={64} className="text-kick-green animate-bounce" />
                <div className="absolute top-10 text-2xl font-black text-white animate-pulse">
                   الموسيقى تعمل 🎵
                </div>
                {/* Avatars Orbiting */}
                {participants.slice(0, 10).map((p, i) => {
                   const angle = (i / Math.min(participants.length, 10)) * 2 * Math.PI;
                   return (
                      <div 
                        key={i}
                        className="absolute w-12 h-12 rounded-full border-2 border-white flex items-center justify-center text-black font-bold text-xs shadow-lg animate-pulse"
                        style={{ 
                           backgroundColor: p.color,
                           top: `${50 + 35 * Math.sin(angle)}%`,
                           left: `${50 + 35 * Math.cos(angle)}%`,
                           transform: 'translate(-50%, -50%)'
                        }}
                      >
                         {p.username.charAt(0)}
                      </div>
                   )
                })}
                {participants.length > 10 && (
                   <div className="absolute bottom-0 text-gray-500 font-bold">+{participants.length - 10} آخرين</div>
                )}
            </div>
         )}

         {/* GAME STATE: ELIMINATING */}
         {gameState === 'ELIMINATING' && (
             <div className="text-center">
                 <Pause size={80} className="mx-auto mb-6 text-red-500 animate-pulse" />
                 <h2 className="text-6xl font-black text-white mb-4">توقفت الموسيقى!</h2>
                 <p className="text-2xl text-red-400">جاري إقصاء {eliminatedCount} لاعبين...</p>
             </div>
         )}

         {/* GAME STATE: WINNER */}
         {winner && (
            <div className="text-center animate-in zoom-in duration-500">
               <Crown size={100} className="mx-auto mb-6 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-bounce" />
               <div className="text-sm font-black text-yellow-500 uppercase tracking-[0.5em] mb-4">Survivor</div>
               <div 
                  className="w-40 h-40 mx-auto rounded-full flex items-center justify-center text-6xl font-black text-black shadow-[0_0_40px_rgba(255,255,255,0.3)] mb-6"
                  style={{ backgroundColor: winner.color }}
               >
                  {winner.username.charAt(0).toUpperCase()}
               </div>
               <h1 className="text-6xl font-black text-white neon-text">{winner.username}</h1>
            </div>
         )}
      </div>
    </>
  );
};
