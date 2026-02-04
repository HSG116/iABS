
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { ZOMBIE_OBSTACLES } from '../constants';
import { ChatUser } from '../types';
import { Biohazard, Play, RotateCcw, UserPlus } from 'lucide-react';

interface ZombieEscapeProps {
  channelConnected: boolean;
}

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  const el = document.getElementById('game-sidebar-portal');
  if (!mounted || !el) return null;
  return createPortal(children, el);
};

export const ZombieEscape: React.FC<ZombieEscapeProps> = ({ channelConnected }) => {
  const [gameState, setGameState] = useState<'WAITING' | 'RUNNING' | 'FINISHED'>('WAITING');
  const [players, setPlayers] = useState<{user: ChatUser, status: 'ALIVE'|'ZOMBIE'}[]>([]);
  const [obstacle, setObstacle] = useState<{question: string, answer: string, endsAt: number} | null>(null);
  
  const playersRef = useRef(players);
  const gameStateRef = useRef(gameState);
  const obstacleRef = useRef(obstacle);

  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { obstacleRef.current = obstacle; }, [obstacle]);

  useEffect(() => {
    if (!channelConnected) return;
    const cleanup = chatService.onMessage((msg) => {
       const content = msg.content.trim();

       // Join
       if (gameStateRef.current === 'WAITING' && (content === '!JOIN' || content === '!دخول')) {
          if (!playersRef.current.find(p => p.user.username === msg.user.username)) {
             setPlayers(prev => [...prev, { user: msg.user, status: 'ALIVE' }]);
          }
       }

       // Solve Obstacle
       if (gameStateRef.current === 'RUNNING' && obstacleRef.current) {
          if (content === obstacleRef.current.answer) {
             // Correct answer logic? 
             // Ideally everyone must answer to survive.
             // Simplified: If you type correctly you are marked "Safe" for this round.
             // We need a "Safe" state.
             // Let's implement: "First 5 to answer get a speed boost?" No.
             // Implementation: Individual Survival. 
             // We track who answered correctly in this obstacle phase.
             markPlayerSafe(msg.user.username);
          }
       }
    });
    return cleanup;
  }, [channelConnected]);

  const [safePlayers, setSafePlayers] = useState<string[]>([]);

  const markPlayerSafe = (username: string) => {
      if (!safePlayers.includes(username)) {
          setSafePlayers(prev => [...prev, username]);
      }
  };

  const startGame = () => {
      if (players.length < 1) return;
      setGameState('RUNNING');
      nextObstacle();
  };

  const nextObstacle = () => {
      setSafePlayers([]);
      const obs = ZOMBIE_OBSTACLES[Math.floor(Math.random() * ZOMBIE_OBSTACLES.length)];
      const duration = 5000; // 5 seconds to answer
      setObstacle({ ...obs, endsAt: Date.now() + duration });

      setTimeout(() => {
          resolveObstacle();
      }, duration);
  };

  const resolveObstacle = () => {
      // Turn un-safe players to ZOMBIES
      setPlayers(prev => prev.map(p => {
          if (p.status === 'ZOMBIE') return p;
          if (safePlayers.includes(p.user.username)) return p;
          return { ...p, status: 'ZOMBIE' };
      }));

      // Check if all zombies
      const aliveCount = playersRef.current.filter(p => p.status === 'ALIVE').length; // using ref might be stale if inside timeout?
      // Actually inside timeout `setPlayers` callback is safe, but check needs fresh state.
      // We'll proceed to next obstacle or finish.
      
      setTimeout(() => {
         if (Math.random() > 0.7) { // 30% chance to end
             setGameState('FINISHED');
             setObstacle(null);
         } else {
             nextObstacle();
         }
      }, 2000);
  };

  const resetGame = () => {
      setPlayers([]);
      setGameState('WAITING');
      setObstacle(null);
  };

  return (
    <>
      <SidebarPortal>
         <div className="bg-[#141619] p-4 rounded-xl border border-white/5 space-y-3 animate-in slide-in-from-right-4">
             <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Biohazard size={12} /> تحكم الزومبي
             </h4>
             {gameState === 'WAITING' && (
                <button onClick={startGame} className="w-full bg-green-600 text-black font-bold py-2 rounded-lg">
                   ابدأ الهروب
                </button>
             )}
             <button onClick={resetGame} className="w-full bg-white/5 py-2 rounded-lg text-xs text-gray-400">
                <RotateCcw size={12} className="inline mr-1" /> تصفية
             </button>
         </div>
         <div className="bg-[#141619] rounded-xl border border-white/5 flex flex-col overflow-hidden h-[300px] mt-3">
             <div className="p-3 border-b border-white/5 bg-[#0b0e0f] text-xs font-bold text-gray-400">
                اللاعبين
             </div>
             <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                {players.map(p => (
                   <div key={p.user.username} className={`flex justify-between px-2 py-1 rounded text-xs mb-1 ${p.status === 'ZOMBIE' ? 'bg-red-900/20 text-red-500' : 'bg-green-900/20 text-green-500'}`}>
                      <span>{p.user.username}</span>
                      <span>{p.status === 'ZOMBIE' ? '🧟' : '🏃'}</span>
                   </div>
                ))}
             </div>
         </div>
      </SidebarPortal>

      <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-black">
         {/* Background Parallax Simulation */}
         <div className="absolute inset-0 opacity-30 bg-[url('https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center"></div>
         
         {gameState === 'RUNNING' && obstacle && (
             <div className="z-10 text-center animate-in zoom-in duration-200">
                 <div className="text-2xl text-red-500 font-black mb-4 animate-pulse">عقبة! بسرعة!</div>
                 <div className="text-6xl font-black text-white bg-black/80 px-10 py-6 rounded-2xl border-2 border-red-500 shadow-[0_0_30px_red]">
                     {obstacle.question}
                 </div>
                 <div className="mt-4 text-gray-400 text-sm">لديك 5 ثواني للإجابة</div>
             </div>
         )}

         {gameState === 'FINISHED' && (
             <div className="z-10 text-center">
                 <div className="text-4xl font-black text-green-500 mb-4">تم النجاة!</div>
                 <div className="text-xl text-white">الناجون: {players.filter(p => p.status === 'ALIVE').length}</div>
             </div>
         )}
         
         {/* Running Animation Visuals */}
         <div className="absolute bottom-10 left-0 w-full h-32 overflow-hidden flex items-end px-10 gap-2">
             {players.filter(p => p.status === 'ALIVE').slice(0, 10).map((p, i) => (
                 <div key={i} className="text-4xl animate-bounce" style={{ animationDuration: `${0.5 + Math.random()*0.5}s` }}>🏃</div>
             ))}
             {players.filter(p => p.status === 'ZOMBIE').slice(0, 10).map((p, i) => (
                 <div key={i} className="text-4xl animate-pulse delay-100">🧟</div>
             ))}
         </div>
      </div>
    </>
  );
};
