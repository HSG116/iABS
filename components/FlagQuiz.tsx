
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import { FLAGS_DATA } from '../constants';
import { Flag, Play, RotateCcw, Award, CheckCircle2, LogOut, Home } from 'lucide-react';

interface FlagQuizProps {
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

export const FlagQuiz: React.FC<FlagQuizProps> = ({ channelConnected, onHome }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentFlag, setCurrentFlag] = useState<typeof FLAGS_DATA[0] | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [lastWinner, setLastWinner] = useState<{name: string, answer: string} | null>(null);

  const currentFlagRef = useRef(currentFlag);
  const isActiveRef = useRef(isActive);

  useEffect(() => { currentFlagRef.current = currentFlag; }, [currentFlag]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  useEffect(() => {
    if (!channelConnected) return;
    const cleanup = chatService.onMessage(async (msg) => {
      if (!isActiveRef.current || !currentFlagRef.current) return;
      const content = msg.content.toLowerCase().trim();
      const isCorrect = currentFlagRef.current.names.some(name => content.includes(name.toLowerCase()));
      if (isCorrect) await handleRoundWin(msg.user.username, content, msg.user.avatar);
    });
    return cleanup;
  }, [channelConnected]);

  const nextRound = () => {
    setLastWinner(null);
    const randomFlag = FLAGS_DATA[Math.floor(Math.random() * FLAGS_DATA.length)];
    setCurrentFlag(randomFlag);
    setIsActive(true);
  };

  const handleRoundWin = async (username: string, answer: string, avatar?: string) => {
    setIsActive(false);
    setLastWinner({ name: username, answer });
    setScores(prev => ({ ...prev, [username]: (prev[username] || 0) + 1 }));
    
    // تسجيل في لوحة الصدارة (25 نقطة لكل علم صحيح)
    await leaderboardService.recordWin(username, avatar || '', 25);
    
    setTimeout(() => { nextRound(); }, 3000);
  };

  const startGame = () => { setScores({}); nextRound(); };
  const stopGame = () => { setIsActive(false); setCurrentFlag(null); };
  const sortedScores = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number));

  return (
    <>
      <SidebarPortal>
         <div className="bg-black/40 p-4 rounded-[2rem] border border-white/5 space-y-4 animate-in slide-in-from-bottom-4">
             <div className="flex items-center justify-between">
                 <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                   <Flag size={12} /> تحدي الأعلام
                 </h4>
                 <button onClick={onHome} className="p-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl transition-all border border-red-500/20"><LogOut size={14} /></button>
             </div>
             <div className="space-y-3">
                <div className="flex gap-2">
                   {!currentFlag ? (
                       <button onClick={startGame} className="flex-1 bg-red-600 text-white font-black py-3 rounded-2xl text-[10px] shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 border-t border-white/20 uppercase italic">
                          <Play size={14} fill="currentColor" /> ابدأ التحدي
                       </button>
                   ) : (
                       <button onClick={stopGame} className="flex-1 bg-white/5 text-red-500 font-bold py-3 rounded-2xl text-[10px] hover:bg-white/10 transition-all border border-white/10 uppercase">
                          إنهاء الجولة
                       </button>
                   )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <button onClick={() => nextRound()} disabled={!isActive} className="bg-white/5 text-gray-400 py-3 rounded-2xl text-[9px] font-black hover:text-white border border-white/5 transition-all flex items-center justify-center gap-2 uppercase tracking-tighter italic"><RotateCcw size={12} /> تخطي</button>
                   <button onClick={onHome} className="bg-white/5 text-red-600 py-3 rounded-2xl text-[9px] font-black hover:bg-red-600/10 border border-white/5 transition-all flex items-center justify-center gap-2 uppercase tracking-tighter italic"><Home size={12} /> خروج</button>
                </div>
             </div>
         </div>

         <div className="bg-black/40 rounded-[2rem] border border-white/5 flex flex-col overflow-hidden h-[300px] mt-4">
            <div className="p-3 border-b border-white/5 bg-white/5 flex justify-between items-center">
               <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Award size={12} className="text-yellow-500" /> المتصدرون</span>
               <span className="bg-red-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-black italic">{sortedScores.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
               {sortedScores.map(([name, score], i) => (
                   <div key={name} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                     <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black font-mono ${i===0?'text-yellow-500':'text-gray-500'}`}>#{i+1}</span>
                        <span className="text-[10px] font-bold text-gray-300 truncate max-w-[120px]">{name}</span>
                     </div>
                     <span className="text-red-500 font-black italic">{score}</span>
                   </div>
               ))}
            </div>
         </div>
      </SidebarPortal>

      <div className="w-full h-full flex flex-col items-center justify-center p-6 relative">
          {!currentFlag ? (
             <div className="text-center opacity-30 animate-in zoom-in">
                <Flag size={120} className="mx-auto mb-6 text-gray-600" />
                <h2 className="text-7xl font-black text-white italic tracking-tighter uppercase">تحدي الأعلام</h2>
                <p className="text-2xl text-red-600 font-bold uppercase tracking-[1em] mt-4">iABS World Quiz</p>
             </div>
          ) : (
             <div className="flex flex-col items-center animate-in zoom-in duration-300">
                <div className="bg-white/5 border border-white/10 backdrop-blur-xl px-12 py-3 rounded-full text-lg font-black text-red-500 mb-10 shadow-2xl tracking-widest italic uppercase">خمن الـدولة!</div>
                <div className="relative group">
                   <div className="absolute inset-0 bg-red-600/20 blur-[100px] rounded-full group-hover:bg-red-600/40 transition-all"></div>
                   <div className="relative p-6 bg-black/40 border-2 border-white/10 rounded-[3rem] shadow-2xl backdrop-blur-sm group-hover:scale-105 transition-all duration-700">
                      <img src={`https://flagcdn.com/w640/${currentFlag.code}.png`} alt="Flag" className="w-full max-w-lg h-auto rounded-[2rem] shadow-2xl" />
                   </div>
                </div>
                {lastWinner ? (
                   <div className="mt-12 text-center animate-in slide-in-from-bottom-4 bg-black/60 p-10 rounded-[3rem] border border-white/5 shadow-2xl">
                      <div className="flex items-center justify-center gap-3 text-kick-green mb-4">
                         <CheckCircle2 size={48} className="drop-shadow-[0_0_15px_green]" />
                         <span className="text-5xl font-black italic tracking-tighter uppercase">بطل الجولة!</span>
                      </div>
                      <div className="text-7xl font-black text-white italic tracking-tighter mb-4 uppercase drop-shadow-[0_10px_20px_black]">{lastWinner.name}</div>
                      <div className="text-gray-500 font-bold tracking-[0.5em] text-sm uppercase">الدولة: <span className="text-red-500">{lastWinner.answer}</span></div>
                   </div>
                ) : (
                   <div className="mt-12 text-center animate-pulse">
                      <p className="text-4xl font-black text-gray-500 italic tracking-widest uppercase">اكتب اسم الدولة في الشات...</p>
                   </div>
                )}
             </div>
          )}
      </div>
    </>
  );
};
