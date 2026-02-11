
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { ChatUser } from '../types';
import { Disc, RotateCcw, Skull, User } from 'lucide-react';

interface RussianRouletteProps {
   channelConnected: boolean;
}

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
   const [mounted, setMounted] = useState(false);
   useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
   const el = document.getElementById('game-sidebar-portal');
   if (!mounted || !el) return null;
   return createPortal(children, el);
};

export const RussianRoulette: React.FC<RussianRouletteProps> = ({ channelConnected }) => {
   const [participants, setParticipants] = useState<ChatUser[]>([]);
   const [gameState, setGameState] = useState<'WAITING' | 'ACTIVE' | 'ELIMINATED' | 'WINNER'>('WAITING');
   const [bulletIndex, setBulletIndex] = useState(0);
   const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
   const [cylinderPosition, setCylinderPosition] = useState(0);

   const participantsRef = useRef(participants);
   const gameStateRef = useRef(gameState);
   const turnIndexRef = useRef(currentTurnIndex);

   useEffect(() => { participantsRef.current = participants; }, [participants]);
   useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
   useEffect(() => { turnIndexRef.current = currentTurnIndex; }, [currentTurnIndex]);

   useEffect(() => {
      if (!channelConnected) return;
      const cleanup = chatService.onMessage((msg) => {
         const content = msg.content.trim().toLowerCase();

         // Join
         if (gameStateRef.current === 'WAITING' && (content === '!join' || content === '!دخول')) {
            if (participantsRef.current.length < 6 && !participantsRef.current.find(p => p.username === msg.user.username)) {
               setParticipants(prev => [...prev, msg.user]);

               // Fetch real Kick avatar asynchronously
               chatService.fetchKickAvatar(msg.user.username).then(avatar => {
                  if (avatar) {
                     setParticipants(current => current.map(p =>
                        p.username === msg.user.username ? { ...p, avatar } : p
                     ));
                  }
               });
            }
         }

         // Pull Trigger
         if (gameStateRef.current === 'ACTIVE') {
            const currentPlayer = participantsRef.current[turnIndexRef.current];
            if (currentPlayer && currentPlayer.username === msg.user.username) {
               if (content === '!pull' || content === '!أطلق' || content === '!shoot') {
                  pullTrigger();
               }
            }
         }
      });
      return cleanup;
   }, [channelConnected]);

   const startGame = () => {
      if (participants.length < 1) return;
      // Randomize bullet
      setBulletIndex(Math.floor(Math.random() * 6));
      setCurrentTurnIndex(0);
      setCylinderPosition(0);
      setGameState('ACTIVE');
   };

   const pullTrigger = () => {
      const isHit = cylinderPosition === bulletIndex;

      if (isHit) {
         setGameState('ELIMINATED');
         setTimeout(() => {
            // Eliminate
            const loser = participants[currentTurnIndex];
            const survivors = participants.filter(p => p.username !== loser.username);
            setParticipants(survivors);

            if (survivors.length === 1) {
               setGameState('WINNER');
            } else if (survivors.length === 0) {
               setGameState('WAITING'); // Game Over (Everyone died)
            } else {
               // Reset for next round
               setGameState('ACTIVE');
               setBulletIndex(Math.floor(Math.random() * 6));
               setCylinderPosition(0);
               setCurrentTurnIndex(currentTurnIndex % survivors.length);
            }
         }, 2000);
      } else {
         // Next Turn
         setCylinderPosition(prev => prev + 1);
         setCurrentTurnIndex(prev => (prev + 1) % participants.length);
      }
   };

   const resetGame = () => {
      setParticipants([]);
      setGameState('WAITING');
   };

   return (
      <>
         <SidebarPortal>
            <div className="bg-[#141619] p-4 rounded-xl border border-white/5 space-y-3 animate-in slide-in-from-right-4">
               <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Disc size={12} /> الروليت
               </h4>
               {gameState === 'WAITING' && (
                  <button
                     onClick={startGame}
                     disabled={participants.length < 1}
                     className="w-full bg-red-600 text-white font-bold py-2 rounded-lg disabled:opacity-50"
                  >
                     بدء اللعبة ({participants.length}/6)
                  </button>
               )}
               <button onClick={resetGame} className="w-full bg-white/5 py-2 rounded-lg text-xs text-gray-400">
                  <RotateCcw size={12} className="inline mr-1" /> تصفية
               </button>
            </div>
         </SidebarPortal>

         <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {gameState === 'WAITING' && (
               <div className="text-center opacity-60">
                  <Skull size={80} className="mx-auto mb-4 text-gray-400" />
                  <h2 className="text-4xl font-black text-white">الروليت الروسي</h2>
                  <div className="mt-8 flex gap-4 justify-center">
                     {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className={`w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center overflow-hidden ${participants[i] ? 'bg-kick-green shadow-[0_0_15px_rgba(5,255,0,0.3)]' : 'bg-transparent'}`}>
                           {participants[i] ? (
                              participants[i].avatar ? (
                                 <img src={participants[i].avatar} className="w-full h-full object-cover" alt="" />
                              ) : (
                                 <User className="w-6 h-6 text-black" />
                              )
                           ) : (
                              <span className="text-gray-500">?</span>
                           )}
                        </div>
                     ))}
                  </div>
                  <p className="mt-6 text-gray-500">مطلوب لاعب واحد على الأقل. اكتب <span className="text-kick-green">!دخول</span></p>
               </div>
            )}

            {gameState === 'ACTIVE' && participants.length > 0 && (
               <div className="text-center">
                  <h3 className="text-2xl text-gray-400 mb-8">دور اللاعب</h3>
                  <h1 className="text-6xl font-black text-white neon-text mb-10 animate-pulse">
                     {participants[currentTurnIndex].username}
                  </h1>
                  <div className="w-40 h-40 rounded-full border-[20px] border-gray-800 mx-auto relative flex items-center justify-center animate-spin-slow">
                     <div className="w-4 h-4 bg-red-500 rounded-full absolute top-2"></div>
                  </div>
                  <p className="mt-10 text-xl font-bold">اكتب <span className="text-red-500">!أطلق</span> أو <span className="text-red-500">!pull</span></p>
               </div>
            )}

            {gameState === 'ELIMINATED' && (
               <div className="text-center animate-in zoom-in duration-200">
                  <h1 className="text-8xl font-black text-red-600">BANG!</h1>
               </div>
            )}

            {gameState === 'WINNER' && participants[0] && (
               <div className="text-center animate-in zoom-in duration-500">
                  <h1 className="text-6xl font-black text-yellow-500 mb-4">الناجي الوحيد</h1>
                  <div className="text-4xl font-black text-white">{participants[0].username}</div>
               </div>
            )}
         </div>
      </>
   );
};
