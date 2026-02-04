
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import { TYPING_WORDS } from '../constants';
import { Keyboard as KeyboardIcon, Play, RotateCcw, Trophy, Zap, Timer, LogOut, Home } from 'lucide-react';

interface TypingRaceProps {
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

export const TypingRace: React.FC<TypingRaceProps> = ({ channelConnected, onHome }) => {
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [winner, setWinner] = useState<{name: string, time: number, avatar?: string, color?: string} | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const availableIndices = useRef<number[]>([]);
  const wordRef = useRef(currentWord);
  
  useEffect(() => { wordRef.current = currentWord; }, [currentWord]);

  useEffect(() => {
    let interval: number;
    if (currentWord && !winner) interval = window.setInterval(() => setElapsed(Date.now() - startTime), 50);
    return () => clearInterval(interval);
  }, [currentWord, winner, startTime]);

  const resetPool = () => {
     availableIndices.current = Array.from({ length: TYPING_WORDS.length }, (_, i) => i);
     for (let i = availableIndices.current.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableIndices.current[i], availableIndices.current[j]] = [availableIndices.current[j], availableIndices.current[i]];
     }
  };

  useEffect(() => {
    if (!channelConnected) return;
    const cleanup = chatService.onMessage(async (msg) => {
       if (!wordRef.current || !!winner) return;
       if (msg.content.trim() === wordRef.current) {
          const userWinner = { 
            name: msg.user.username, 
            time: (Date.now() - startTime) / 1000, 
            avatar: msg.user.avatar, 
            color: msg.user.color 
          };
          setWinner(userWinner);
          setCurrentWord(null);
          
          // التسجيل في لوحة الصدارة (50 نقطة للفوز بسباق الكتابة)
          await leaderboardService.recordWin(userWinner.name, userWinner.avatar || '', 50);
       }
    });
    return cleanup;
  }, [channelConnected, startTime, winner]);

  const startRound = () => {
    if (availableIndices.current.length === 0) resetPool();
    setWinner(null); setElapsed(0);
    setCurrentWord(TYPING_WORDS[availableIndices.current.pop() || 0]);
    setStartTime(Date.now());
  };

  return (
    <>
      <SidebarPortal>
         <div className="bg-black/40 p-4 rounded-[2rem] border border-white/5 space-y-4 animate-in slide-in-from-bottom-4">
             <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2"><KeyboardIcon size={12} /> تحكم الكتابة</h4>
                <button onClick={onHome} className="p-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl transition-all border border-red-500/20"><LogOut size={14} /></button>
             </div>
             <button onClick={startRound} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 italic border-t-2 border-white/20">
                <Play fill="currentColor" size={18}/> {currentWord ? 'تغيير الكلمة' : 'كلمة جديدة'}
             </button>
             <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { resetPool(); alert("تم خلط الكلمات!"); }} className="bg-white/5 text-gray-500 py-3 rounded-2xl text-[9px] font-black hover:text-white border border-white/5 uppercase italic tracking-tighter"><RotateCcw size={12} className="inline mr-1" /> إعادة خلط</button>
                <button onClick={onHome} className="bg-white/5 text-red-600 py-3 rounded-2xl text-[9px] font-black hover:bg-red-600/10 border border-white/5 uppercase italic tracking-tighter"><Home size={12} className="inline mr-1" /> خروج</button>
             </div>
         </div>
      </SidebarPortal>

      <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-black">
         {!currentWord && !winner && (
            <div className="text-center opacity-30 animate-in zoom-in">
               <KeyboardIcon size={120} className="mx-auto mb-6 text-gray-600" />
               <h2 className="text-8xl font-black text-white italic tracking-tighter uppercase leading-none">سباق الكتابة</h2>
               <p className="text-2xl text-red-600 font-bold uppercase tracking-[0.5em] mt-4">iABS Type Engine</p>
            </div>
         )}
         {currentWord && (
            <div className="text-center animate-in zoom-in duration-300 w-full max-w-5xl">
               <div className="flex items-center justify-center gap-3 mb-10 text-red-500">
                  <Timer size={24} className="animate-spin-slow" />
                  <span className="font-mono text-3xl font-black italic">{(elapsed / 1000).toFixed(2)}s</span>
               </div>
               <div className="relative group">
                  <div className="absolute inset-0 bg-red-600/20 blur-[100px] rounded-full opacity-50 group-hover:opacity-100 transition-all"></div>
                  <div className="relative text-[120px] font-black text-white bg-white/5 px-20 py-12 rounded-[4rem] border-2 border-red-600/30 shadow-[0_0_60px_rgba(255,0,0,0.15)] backdrop-blur-xl leading-none italic tracking-tighter">
                     <span className="drop-shadow-[0_10px_30px_rgba(0,0,0,1)] bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">{currentWord}</span>
                  </div>
               </div>
            </div>
         )}
         {winner && (
            <div className="text-center animate-in slide-in-from-bottom-12 duration-700">
               <Trophy size={140} className="text-[#FFD700] mx-auto mb-8 animate-bounce drop-shadow-[0_0_50px_rgba(255,215,0,0.4)]" fill="currentColor" />
               <div className="bg-black/60 border-2 border-red-600/40 p-16 rounded-[4rem] shadow-2xl relative overflow-hidden backdrop-blur-3xl min-w-[500px]">
                  <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                  <div className="text-red-500 font-black uppercase tracking-[0.4em] text-xs mb-8 italic">Fastest Fingers!</div>
                  <div className="flex items-center justify-center gap-8 mb-10">
                     <div className="w-24 h-24 rounded-[2rem] bg-white flex items-center justify-center text-5xl font-black text-black shadow-2xl" style={{ backgroundColor: winner.color || '#ff0000' }}>{winner.name.charAt(0).toUpperCase()}</div>
                     <div className="text-7xl font-black text-white italic tracking-tighter uppercase">{winner.name}</div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={startRound} className="flex-1 py-5 bg-white text-black font-black text-2xl rounded-3xl hover:scale-105 transition-all italic shadow-2xl">الجولة التالية</button>
                    <button onClick={onHome} className="flex-1 py-5 bg-red-600 text-white font-black text-2xl rounded-3xl hover:scale-105 transition-all italic shadow-2xl">خروج</button>
                  </div>
               </div>
            </div>
         )}
      </div>
    </>
  );
};
