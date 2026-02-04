
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import { Coffee, Play, RotateCcw, Trophy, CheckCircle2, Lock, LogOut, Home } from 'lucide-react';

interface CupShuffleProps {
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

export const CupShuffle: React.FC<CupShuffleProps> = ({ channelConnected, onHome }) => {
  const [gameState, setGameState] = useState<'IDLE' | 'VOTING' | 'SHUFFLING' | 'REVEAL' | 'FINISHED'>('IDLE');
  const [ballPosition, setBallPosition] = useState(1);
  const [cupPositions, setCupPositions] = useState([0, 1, 2]); 
  const [totalRounds, setTotalRounds] = useState(3);
  const [currentRound, setCurrentRound] = useState(1);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [roundVotes, setRoundVotes] = useState<Record<string, {vote: number, avatar?: string}>>({});
  const [voteCounts, setVoteCounts] = useState([0, 0, 0]);

  const gameStateRef = useRef(gameState);
  const roundVotesRef = useRef(roundVotes);
  useEffect(() => { gameStateRef.current = gameState; roundVotesRef.current = roundVotes; }, [gameState, roundVotes]);

  useEffect(() => {
    if (!channelConnected) return;
    const cleanup = chatService.onMessage((msg) => {
       if (gameStateRef.current !== 'VOTING') return;
       const user = msg.user.username;
       if (roundVotesRef.current[user] !== undefined) return;
       let vote = -1;
       if (msg.content === '!1') vote = 0;
       if (msg.content === '!2') vote = 1;
       if (msg.content === '!3') vote = 2;
       if (vote !== -1) {
          setRoundVotes(prev => ({ ...prev, [user]: { vote, avatar: msg.user.avatar } }));
          setVoteCounts(prev => { const nc = [...prev]; nc[vote]++; return nc; });
       }
    });
    return cleanup;
  }, [channelConnected]);

  const beginShuffle = async () => {
      setGameState('SHUFFLING');
      let pos = [0, 1, 2]; let ball = ballPosition;
      for (let i = 0; i < 25; i++) {
          await new Promise(r => setTimeout(r, Math.max(50, 300 - (i * 10))));
          const a = Math.floor(Math.random() * 3); let b = Math.floor(Math.random() * 3);
          while (a === b) b = Math.floor(Math.random() * 3);
          const t = pos[a]; pos[a] = pos[b]; pos[b] = t;
          if (ball === a) ball = b; else if (ball === b) ball = a;
          setCupPositions([...pos]); setBallPosition(ball);
      }
      
      setTimeout(async () => {
          setGameState('REVEAL');
          const ns = { ...scores };
          // تسجيل في لوحة الصدارة لكل فائز في الجولة (50 نقطة)
          for (const [u, data] of Object.entries(roundVotes)) {
            if (data.vote === ball) {
              ns[u] = (ns[u] || 0) + 1;
              await leaderboardService.recordWin(u, data.avatar || '', 50);
            }
          }
          setScores(ns);
          if (currentRound >= totalRounds) {
             setTimeout(() => setGameState('FINISHED'), 4000);
          } else {
             setTimeout(() => { 
                setCurrentRound(prev => prev + 1);
                setRoundVotes({});
                setVoteCounts([0,0,0]);
                setGameState('VOTING');
             }, 5000);
          }
      }, 500);
  };

  const sortedScores = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number));

  return (
    <>
      <SidebarPortal>
         <div className="bg-black/40 p-4 rounded-[2rem] border border-white/5 space-y-4 animate-in slide-in-from-bottom-4">
             <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2"><Coffee size={12} /> تحكم الأكواب</h4>
                <button onClick={onHome} className="p-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl transition-all border border-red-500/20"><LogOut size={14} /></button>
             </div>
             {gameState === 'IDLE' && (
                <div className="space-y-3">
                   <button onClick={() => { setRoundVotes({}); setVoteCounts([0,0,0]); setGameState('VOTING'); }} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl text-xs shadow-2xl italic border-t-2 border-white/20 uppercase tracking-widest">بـدء اللـعـب</button>
                </div>
             )}
             {gameState === 'VOTING' && (
                <button onClick={beginShuffle} className="w-full bg-white text-black font-black py-4 rounded-2xl text-xs shadow-2xl italic border-t-2 border-red-600/20 uppercase tracking-widest">خـلـط الآن</button>
             )}
         </div>
      </SidebarPortal>

      <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-black">
         {gameState === 'FINISHED' ? (
             <div className="text-center animate-in zoom-in duration-500">
                <Trophy size={140} className="mx-auto text-yellow-400 mb-8 animate-bounce drop-shadow-[0_0_50px_rgba(255,215,0,0.5)]" fill="currentColor" />
                <h1 className="text-9xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,1)]">{sortedScores[0]?.[0]}</h1>
             </div>
         ) : (
             <div className="w-full max-w-5xl flex flex-col items-center">
                 <div className="mb-20 text-center">
                    <div className="bg-red-600/10 border-2 border-red-600/40 px-12 py-3 rounded-[2rem] inline-block text-red-500 font-black text-2xl italic tracking-tighter shadow-2xl mb-8 uppercase">الجولة {currentRound} من {totalRounds}</div>
                    <div className="h-24 flex flex-col items-center justify-center">
                        {gameState === 'VOTING' && <h1 className="text-7xl font-black text-white italic tracking-tighter uppercase animate-pulse">اختر الكوب: !1 !2 !3</h1>}
                        {gameState === 'SHUFFLING' && <h1 className="text-7xl font-black text-white italic tracking-tighter uppercase">يـتـم الـخـلـط...</h1>}
                        {gameState === 'REVEAL' && <h1 className="text-8xl font-black text-red-600 italic tracking-tighter uppercase drop-shadow-[0_0_30px_red]">تـم الـكـشـف!</h1>}
                    </div>
                 </div>
                 <div className="flex gap-20 items-end h-64">
                     {[0, 1, 2].map((idx) => {
                         const isUp = (gameState === 'REVEAL' || (gameState === 'VOTING' && currentRound === 1)) && ballPosition === idx;
                         return (
                            <div key={idx} className="relative flex flex-col items-center">
                                <div className={`transition-all duration-700 ease-in-out relative z-10 ${isUp ? '-translate-y-48 rotate-12' : ''}`}>
                                    <div className="w-40 h-56 bg-gradient-to-b from-zinc-800 to-zinc-900 border-4 border-red-600 rounded-t-3xl rounded-b-[4rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex items-center justify-center relative group">
                                        <div className="absolute inset-4 border border-white/5 rounded-t-xl rounded-b-[3rem]"></div>
                                        <span className="text-7xl font-black text-red-600 italic drop-shadow-[0_0_20px_red]">{idx + 1}</span>
                                    </div>
                                </div>
                                {ballPosition === idx && (
                                    <div className="absolute bottom-4 w-16 h-16 bg-white rounded-full shadow-[0_0_50px_white] z-0 animate-pulse border-[6px] border-red-600"></div>
                                )}
                            </div>
                         )
                     })}
                 </div>
             </div>
         )}
      </div>
    </>
  );
};
