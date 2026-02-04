
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChatUser } from '../types';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import { Trophy, Users, Play, RotateCcw, Lock, Unlock, Trash2, LogOut, Home } from 'lucide-react';

interface SpinWheelProps {
  channelConnected: boolean;
  onHome: () => void;
}

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  const el = document.getElementById('game-sidebar-portal');
  if (!mounted || !el) return null;
  return createPortal(children, el);
};

export const SpinWheel: React.FC<SpinWheelProps> = ({ channelConnected, onHome }) => {
  const [participants, setParticipants] = useState<ChatUser[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [winner, setWinner] = useState<ChatUser | null>(null);
  const [rotation, setRotation] = useState(0);
  const [lastJoined, setLastJoined] = useState<string | null>(null);

  const isOpenRef = useRef(isOpen);
  const participantsRef = useRef(participants);
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
  useEffect(() => { participantsRef.current = participants; }, [participants]);
  
  useEffect(() => {
    if (!channelConnected) return;
    const cleanup = chatService.onMessage((msg) => {
      if (!isOpenRef.current) return;
      if (msg.content.includes('!دخول')) {
        if (!participantsRef.current.find(p => p.username === msg.user.username)) {
          setParticipants(prev => [...prev, msg.user]);
          setLastJoined(msg.user.username);
          setTimeout(() => setLastJoined(null), 2000);
        }
      }
    });
    return cleanup;
  }, [channelConnected]);

  const spinTheWheel = () => {
    if (participants.length < 1) return;
    setIsSpinning(true); setIsOpen(false); setWinner(null);
    const winIndex = Math.floor(Math.random() * participants.length);
    const segmentAngle = 360 / participants.length;
    const extraSpins = 360 * (5 + Math.floor(Math.random() * 5));
    const newRotation = rotation + extraSpins + (360 - (winIndex * segmentAngle));
    setRotation(newRotation);
    
    setTimeout(async () => { 
      const winUser = participants[winIndex];
      setIsSpinning(false); 
      setWinner(winUser); 
      // تسجيل الفوز (100 نقطة لفائز العجلة)
      await leaderboardService.recordWin(winUser.username, winUser.avatar || '', 100);
    }, 5000); 
  };

  const resetGame = () => { setParticipants([]); setWinner(null); setRotation(0); setIsOpen(false); };
  const colors = useMemo(() => ['#ff0000', '#cc0000', '#990000', '#660000', '#330000', '#1a1a1a'], []);

  return (
    <>
      <SidebarPortal>
         <div className="bg-black/40 p-4 rounded-[2rem] border border-white/5 space-y-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                <Trophy size={12} /> تحكم العجلة
              </h4>
              <button onClick={onHome} className="p-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl transition-all">
                 <LogOut size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
               {!isOpen ? (
                  <button onClick={() => setIsOpen(true)} className="bg-white/5 text-red-500 border border-red-500/20 font-black py-3 rounded-2xl text-[10px] hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 uppercase tracking-tighter italic">
                    <Unlock size={14} /> فتح الباب
                  </button>
               ) : (
                 <button onClick={() => setIsOpen(false)} className="bg-red-600 text-white font-black py-3 rounded-2xl text-[10px] shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 uppercase tracking-tighter italic">
                   <Lock size={14} /> إغلاق الباب
                 </button>
               )}
               <button onClick={resetGame} className="bg-white/5 text-gray-500 font-black py-3 rounded-2xl text-[10px] border border-white/5 hover:text-white transition-all italic uppercase tracking-tighter">
                 <RotateCcw size={14} className="inline mr-1" /> مسح
               </button>
            </div>
            <button onClick={spinTheWheel} disabled={isSpinning || participants.length < 1} className="w-full bg-red-600 text-white font-black py-4 rounded-[1.5rem] text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 italic border-t-2 border-white/20">
               <Play fill="currentColor" size={16} /> تدوير الـعـجـلـة
            </button>
         </div>

         <div className="bg-black/40 rounded-[2rem] border border-white/5 flex flex-col overflow-hidden h-[250px] mt-4">
            <div className="p-3 border-b border-white/5 bg-white/5 flex justify-between items-center">
               <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Users size={12} className="text-red-500" /> المحاربون</span>
               <span className="bg-red-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-black italic">{participants.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
               {participants.map((p, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded-xl transition-all border border-white/5 bg-white/5 group`}>
                     <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white bg-zinc-800" style={{ backgroundColor: p.color || '#ff0000' }}>{p.username.charAt(0).toUpperCase()}</div>
                     <span className="text-[10px] font-black text-gray-300 truncate">{p.username}</span>
                  </div>
               ))}
            </div>
         </div>
      </SidebarPortal>

      <div className="w-full h-full flex flex-col items-center justify-center p-4 relative">
         {winner && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
               <div className="bg-[#0b0e0f] p-16 rounded-[4rem] border-[10px] border-red-600 shadow-[0_0_100px_rgba(255,0,0,0.5)] text-center relative max-w-2xl w-full mx-4 overflow-hidden">
                  <Trophy className="text-yellow-400 mx-auto mb-8 animate-bounce drop-shadow-[0_0_30px_rgba(255,215,0,0.6)]" size={100} />
                  <div className="text-red-500 font-black uppercase tracking-[0.5em] text-xs mb-10 italic">The Winner Is...</div>
                  <div className="text-7xl font-black text-white mb-12 italic tracking-tighter uppercase drop-shadow-[0_5px_20px_rgba(0,0,0,1)]">{winner.username}</div>
                  <div className="flex gap-4 justify-center">
                    <button onClick={() => setWinner(null)} className="px-12 py-6 bg-white text-black font-black text-2xl rounded-3xl hover:scale-110 transition-all italic">إغلاق</button>
                    <button onClick={onHome} className="px-12 py-6 bg-red-600 text-white font-black text-2xl rounded-3xl hover:scale-110 transition-all italic">خروج</button>
                  </div>
               </div>
            </div>
         )}
         <div className="relative w-[800px] h-[800px] transform scale-75 xl:scale-100">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-40">
               <div className="w-0 h-0 border-l-[40px] border-l-transparent border-r-[40px] border-r-transparent border-t-[60px] border-t-red-600 drop-shadow-[0_5px_15px_rgba(255,0,0,0.5)]"></div>
            </div>
            <div className="w-full h-full rounded-full border-[20px] border-[#16161a] shadow-[0_0_100px_rgba(0,0,0,1)] relative overflow-hidden transition-all ease-out" style={{ transform: `rotate(${rotation}deg)`, transitionDuration: isSpinning ? '5s' : '0s', transitionTimingFunction: 'cubic-bezier(0.1, 0, 0, 1)' }}>
               {participants.length > 0 ? (
                  participants.map((p, i) => {
                     const angle = 360 / participants.length;
                     const rotation = i * angle;
                     return (
                        <div key={i} className="absolute w-full h-full origin-center" style={{ transform: `rotate(${rotation}deg)` }}>
                           <div className="w-1/2 h-full absolute right-0 origin-left border-l border-black/20" style={{ backgroundColor: colors[i % colors.length], transform: `rotate(${angle}deg) skewY(-${90 - angle}deg)` }}></div>
                           <div className="absolute top-0 left-1/2 w-0 h-[50%] origin-bottom flex justify-center pt-24 pointer-events-none" style={{ transform: `translateX(-50%) rotate(${angle/2}deg)` }}>
                              <span className="text-white font-black text-3xl italic tracking-tighter whitespace-nowrap -rotate-90 origin-center truncate w-64 text-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]" dir="ltr">{p.username}</span>
                           </div>
                        </div>
                     );
                  })
               ) : (
                  <div className="w-full h-full bg-[#111] flex items-center justify-center italic opacity-20">
                     <div className="text-center"><h2 className="text-8xl font-black text-white">JOIN</h2><p className="text-2xl text-red-600 font-bold uppercase tracking-[1em]">Empty Arena</p></div>
                  </div>
               )}
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#16161a] rounded-full z-30 border-[10px] border-white/5 flex items-center justify-center shadow-2xl">
               <div className="w-32 h-32 bg-red-600 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_rgba(255,0,0,0.6)] relative overflow-hidden transform rotate-45 border-2 border-white/20">
                  <div className="text-white font-black text-4xl -rotate-45 italic tracking-tighter">iABS</div>
               </div>
            </div>
         </div>
      </div>
    </>
  );
};
