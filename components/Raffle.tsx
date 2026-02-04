
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChatUser } from '../types';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import { Gift, Play, UserPlus, Clock, Crown, Terminal, RotateCcw, LogOut, Home } from 'lucide-react';

interface RaffleProps {
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

export const Raffle: React.FC<RaffleProps> = ({ channelConnected, onHome }) => {
  const [keyword, setKeyword] = useState('!دخول');
  const [duration, setDuration] = useState(60);
  const [participants, setParticipants] = useState<ChatUser[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [winner, setWinner] = useState<ChatUser | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [lastJoined, setLastJoined] = useState<string | null>(null);

  const isActiveRef = useRef(isActive);
  const keywordRef = useRef(keyword);
  const participantsRef = useRef(participants);
  useEffect(() => { isActiveRef.current = isActive; keywordRef.current = keyword; participantsRef.current = participants; }, [isActive, keyword, participants]);

  useEffect(() => {
    let timer: number;
    if (isActive && timeLeft > 0) timer = window.setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    else if (timeLeft === 0 && isActive) setIsActive(false);
    return () => clearInterval(timer);
  }, [isActive, timeLeft]);

  useEffect(() => {
    if (!channelConnected) return;
    const cleanup = chatService.onMessage((msg) => {
      if (!isActiveRef.current) return;
      if (msg.content.includes(keywordRef.current)) {
         if (participantsRef.current.find(p => p.username === msg.user.username)) return;
         setParticipants(prev => [...prev, msg.user]);
         setLastJoined(msg.user.username);
         setTimeout(() => setLastJoined(null), 2000);
      }
    });
    return cleanup;
  }, [channelConnected]);

  const pickWinner = () => {
    if (participants.length === 0) return;
    setIsRolling(true); setWinner(null);
    let counter = 0;
    const rollInterval = setInterval(async () => {
       const tempWin = participants[Math.floor(Math.random() * participants.length)];
       setWinner(tempWin);
       if (++counter >= 30) { 
         clearInterval(rollInterval); 
         setIsRolling(false); 
         // تسجيل الفوز النهائي (200 نقطة لفائز السحب)
         await leaderboardService.recordWin(tempWin.username, tempWin.avatar || '', 200);
       }
    }, 100);
  };

  return (
    <>
      <SidebarPortal>
         <div className="bg-black/40 p-4 rounded-[2rem] border border-white/5 space-y-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
               <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2"><Gift size={12} /> إعدادات السحب</h4>
               <button onClick={onHome} className="p-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl transition-all border border-red-500/20"><LogOut size={14} /></button>
            </div>
            <div className="space-y-3">
               <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl py-2 px-3 pl-8 text-[10px] font-bold text-white focus:border-red-500 outline-none" disabled={isActive} />
                    <Terminal size={12} className="absolute left-2.5 top-2.5 text-gray-600" />
                  </div>
                  <select value={duration} onChange={e => setDuration(+e.target.value)} className="bg-black border border-white/10 rounded-xl px-2 text-[10px] text-gray-400 font-bold outline-none" disabled={isActive}>
                     <option value={30}>30 ثانية</option>
                     <option value={60}>60 ثانية</option>
                     <option value={120}>دقيقتين</option>
                  </select>
               </div>
               {!isActive ? (
                  <button onClick={() => { setParticipants([]); setWinner(null); setTimeLeft(duration); setIsActive(true); }} className="w-full bg-red-600 text-white font-black py-3 rounded-2xl text-[10px] shadow-lg shadow-red-600/20 italic uppercase tracking-widest border-t border-white/20">ابدأ التجميع</button>
               ) : (
                  <button onClick={() => setIsActive(false)} className="w-full bg-white/5 border border-red-600/50 text-red-500 font-black py-3 rounded-2xl text-[10px] animate-pulse uppercase italic">إيقاف ({timeLeft}s)</button>
               )}
               {participants.length > 0 && !isActive && (
                  <button onClick={pickWinner} className="w-full bg-white text-black font-black py-3 rounded-2xl text-[10px] shadow-xl hover:scale-105 transition-all italic flex items-center justify-center gap-2 border-2 border-red-600"><Crown size={14} /> سـحـب الـفـائز</button>
               )}
            </div>
         </div>
         <div className="bg-black/40 rounded-[2rem] border border-white/5 flex flex-col overflow-hidden h-[250px] mt-4">
            <div className="p-3 border-b border-white/5 bg-white/5 flex justify-between items-center text-[9px] font-black text-gray-500 uppercase tracking-widest"><span>قائمة الدخول</span> <span className="text-red-500">{participants.length} لاعب</span></div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
               {participants.map((p, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded-xl transition-all border border-white/5 bg-white/5 ${lastJoined === p.username ? 'border-red-500/50 bg-red-500/5' : ''}`}>
                     <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-black text-white bg-zinc-800" style={{ backgroundColor: p.color || '#ff0000' }}>{p.username.charAt(0).toUpperCase()}</div>
                     <span className="text-[10px] font-black text-gray-300 truncate">{p.username}</span>
                  </div>
               ))}
            </div>
         </div>
      </SidebarPortal>

      <div className="w-full h-full flex flex-col items-center justify-center p-6 relative">
         {isActive && (
            <div className="text-center animate-in zoom-in duration-500">
               <div className="text-[180px] font-black text-white italic tracking-tighter leading-none mb-4 drop-shadow-[0_0_50px_rgba(255,0,0,0.5)] font-mono">{timeLeft}</div>
               <div className="text-4xl font-black text-red-600 uppercase tracking-[1em] animate-pulse italic">تـجـمـيـع...</div>
            </div>
         )}
         {winner && (
            <div className="text-center animate-in zoom-in duration-500">
               <Crown className="text-yellow-400 mx-auto mb-10 animate-bounce drop-shadow-[0_0_50px_rgba(255,215,0,0.6)]" size={150} fill="currentColor" />
               <h1 className={`text-9xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-[0_10px_40px_rgba(0,0,0,1)] ${isRolling ? 'opacity-50' : 'animate-glow'}`}>{winner.username}</h1>
            </div>
         )}
         {!isActive && !winner && (
            <div className="text-center opacity-30 animate-pulse">
               <Gift size={160} className="mx-auto mb-8 text-gray-600" />
               <h1 className="text-8xl font-black text-white italic tracking-tighter uppercase">بانتظار السحب</h1>
            </div>
         )}
      </div>
    </>
  );
};
