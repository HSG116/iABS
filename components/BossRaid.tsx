
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { BOSS_DATA } from '../constants';
import { Skull, RotateCcw, Shield, Sword, Trophy } from 'lucide-react';

interface BossRaidProps {
  channelConnected: boolean;
}

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  const el = document.getElementById('game-sidebar-portal');
  if (!mounted || !el) return null;
  return createPortal(children, el);
};

export const BossRaid: React.FC<BossRaidProps> = ({ channelConnected }) => {
  const [hp, setHp] = useState(BOSS_DATA.initialHP);
  const [maxHp] = useState(BOSS_DATA.initialHP);
  const [isActive, setIsActive] = useState(false);
  const [damageLog, setDamageLog] = useState<{user: string, dmg: number, id: number}[]>([]);
  const [mvpList, setMvpList] = useState<Record<string, number>>({});
  const [isShielded, setIsShielded] = useState(false);
  const [shake, setShake] = useState(false);

  const isActiveRef = useRef(isActive);
  const isShieldedRef = useRef(isShielded);
  const hpRef = useRef(hp);

  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { isShieldedRef.current = isShielded; }, [isShielded]);
  useEffect(() => { hpRef.current = hp; }, [hp]);

  useEffect(() => {
    if (!channelConnected) return;
    const cleanup = chatService.onMessage((msg) => {
      if (!isActiveRef.current || hpRef.current <= 0) return;

      const content = msg.content.trim().toLowerCase();
      // Commands: !attack, !هجوم, or just "attack" spam
      if (content.includes('!attack') || content.includes('!هجوم') || content.includes('هجوم') || content === 'attack') {
         if (isShieldedRef.current) return; // Shield blocks damage

         const dmg = 10 + Math.floor(Math.random() * 20); // 10-30 DMG
         
         setHp(prev => Math.max(0, prev - dmg));
         setShake(true);
         setTimeout(() => setShake(false), 100);

         // Log visual damage
         const logId = Date.now() + Math.random();
         setDamageLog(prev => [...prev.slice(-4), { user: msg.user.username, dmg, id: logId }]);

         // Track MVP
         setMvpList(prev => ({
            ...prev,
            [msg.user.username]: (prev[msg.user.username] || 0) + dmg
         }));
      }
    });
    return cleanup;
  }, [channelConnected]);

  const resetGame = () => {
    setHp(maxHp);
    setDamageLog([]);
    setMvpList({});
    setIsActive(true);
    setIsShielded(false);
  };

  const toggleShield = () => setIsShielded(!isShielded);

  // Get Top 3 MVPs
  const sortedMvps = Object.entries(mvpList).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 3);

  return (
    <>
      <SidebarPortal>
         <div className="bg-[#141619] p-4 rounded-xl border border-white/5 space-y-3 animate-in slide-in-from-right-4">
             <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Skull size={12} /> تحكم الزعيم
             </h4>
             <button 
                onClick={resetGame}
                className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-600/50 font-bold py-2 rounded-lg flex items-center justify-center gap-2"
             >
                <RotateCcw size={14} /> {isActive ? 'إعادة الزعيم' : 'استدعاء زعيم جديد'}
             </button>
             <button 
                onClick={toggleShield}
                disabled={!isActive || hp <= 0}
                className={`w-full font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${isShielded ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400'}`}
             >
                <Shield size={14} /> {isShielded ? 'إزالة الدرع' : 'تفعيل الدرع'}
             </button>
         </div>

         <div className="bg-[#141619] rounded-xl border border-white/5 flex flex-col overflow-hidden h-[300px] mt-3">
             <div className="p-3 border-b border-white/5 bg-[#0b0e0f]">
                <span className="text-xs font-bold text-gray-400 flex items-center gap-2">
                   <Trophy size={14} className="text-yellow-500" /> أكثر الضرر (MVPs)
                </span>
             </div>
             <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                {sortedMvps.map(([name, dmg], i) => (
                    <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                        <div className="flex items-center gap-2">
                           <span className={`text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ${i===0 ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white'}`}>
                              {i+1}
                           </span>
                           <span className="text-xs font-bold text-gray-300">{name}</span>
                        </div>
                        <span className="text-xs font-mono text-red-400">{dmg}</span>
                    </div>
                ))}
             </div>
         </div>
      </SidebarPortal>

      <div className={`w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden ${shake ? 'translate-x-1 translate-y-1' : ''}`}>
         
         {/* Boss Visual */}
         <div className="relative z-10 text-center">
            {hp > 0 ? (
               <div className="relative">
                  {/* Floating Damage Numbers */}
                  {damageLog.map((log) => (
                     <div key={log.id} className="absolute top-0 left-1/2 -translate-x-1/2 text-3xl font-black text-red-500 animate-out slide-out-to-top fade-out duration-1000 pointer-events-none whitespace-nowrap z-50" style={{ transform: `translate(-50%, -${Math.random() * 50 + 50}px) rotate(${Math.random() * 20 - 10}deg)` }}>
                        -{log.dmg}
                     </div>
                  ))}

                  <div className={`text-[150px] md:text-[220px] transition-transform duration-100 ${shake ? 'scale-95 grayscale-0' : 'scale-100'} ${isShielded ? 'opacity-50 blur-sm' : ''} filter drop-shadow-[0_0_50px_rgba(220,38,38,0.5)]`}>
                     {BOSS_DATA.image}
                  </div>
                  
                  {isShielded && (
                     <div className="absolute inset-0 flex items-center justify-center">
                        <Shield size={150} className="text-blue-500 opacity-80 animate-pulse" />
                     </div>
                  )}
               </div>
            ) : (
               <div className="animate-in zoom-in duration-500">
                   <div className="text-[150px]">💀</div>
                   <h1 className="text-6xl font-black text-red-600 mt-4 neon-text">تم القضاء عليه!</h1>
               </div>
            )}

            {/* Health Bar */}
            <div className="w-[80vw] max-w-2xl mx-auto mt-10">
               <div className="flex justify-between text-white font-black mb-2 uppercase tracking-widest text-lg">
                  <span>{BOSS_DATA.name}</span>
                  <span>{hp} / {maxHp}</span>
               </div>
               <div className="h-8 bg-[#1a1d21] rounded-full overflow-hidden border-2 border-white/20 relative shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                  <div 
                     className="h-full bg-gradient-to-r from-red-600 to-orange-600 transition-all duration-200 ease-out relative"
                     style={{ width: `${(hp / maxHp) * 100}%` }}
                  >
                     <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
               </div>
            </div>

            <div className="mt-8 text-gray-500 font-bold animate-pulse">
               اكتب <span className="text-red-500 text-xl mx-2">!هجوم</span> في الشات لقتله!
            </div>
         </div>
      </div>
    </>
  );
};
