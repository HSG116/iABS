
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { AUCTION_ITEMS } from '../constants';
import { Gavel, Play, RotateCcw, TrendingUp } from 'lucide-react';

interface SecretAuctionProps {
  channelConnected: boolean;
}

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  const el = document.getElementById('game-sidebar-portal');
  if (!mounted || !el) return null;
  return createPortal(children, el);
};

export const SecretAuction: React.FC<SecretAuctionProps> = ({ channelConnected }) => {
  const [currentItem, setCurrentItem] = useState(AUCTION_ITEMS[0]);
  const [isActive, setIsActive] = useState(false);
  const [highestBid, setHighestBid] = useState<{user: string, amount: number} | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);

  const isActiveRef = useRef(isActive);
  const highestBidRef = useRef(highestBid);

  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { highestBidRef.current = highestBid; }, [highestBid]);

  // Timer
  useEffect(() => {
     let interval: number;
     if (isActive && timeLeft > 0) {
        interval = window.setInterval(() => {
           setTimeLeft(prev => prev - 1);
        }, 1000);
     } else if (isActive && timeLeft === 0) {
        setIsActive(false); // Sold!
     }
     return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  useEffect(() => {
    if (!channelConnected) return;
    const cleanup = chatService.onMessage((msg) => {
       if (!isActiveRef.current) return;
       const content = msg.content.trim();
       
       // Regex for !bid 500
       const match = content.match(/!bid (\d+)/i) || content.match(/!زايد (\d+)/);
       if (match) {
          const amount = parseInt(match[1]);
          const currentHigh = highestBidRef.current?.amount || 0;
          
          if (amount > currentHigh) {
             setHighestBid({ user: msg.user.username, amount });
             // Sniper logic: Add 5 seconds if bid comes in last 5 seconds
             setTimeLeft(prev => prev < 5 ? 10 : prev); 
          }
       }
    });
    return cleanup;
  }, [channelConnected]);

  const startAuction = () => {
     const randomItem = AUCTION_ITEMS[Math.floor(Math.random() * AUCTION_ITEMS.length)];
     setCurrentItem(randomItem);
     setHighestBid(null);
     setTimeLeft(30);
     setIsActive(true);
  };

  return (
    <>
      <SidebarPortal>
         <div className="bg-[#141619] p-4 rounded-xl border border-white/5 space-y-3 animate-in slide-in-from-right-4">
             <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Gavel size={12} /> تحكم المزاد
             </h4>
             <button onClick={startAuction} disabled={isActive} className="w-full bg-yellow-600 text-black font-bold py-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                <Play size={14} /> {isActive ? 'جاري المزايدة...' : 'بدء مزاد جديد'}
             </button>
             <div className="text-xs text-gray-500 text-center">
                 الأمر: <span className="text-yellow-500 font-mono">!bid 500</span>
             </div>
         </div>
         {highestBid && (
            <div className="bg-[#141619] rounded-xl border border-white/5 p-4 mt-3">
               <div className="text-xs font-bold text-gray-400 mb-2">أعلى مزايدة حالياً</div>
               <div className="text-2xl font-black text-kick-green">{highestBid.amount} 🪙</div>
               <div className="text-sm text-white">{highestBid.user}</div>
            </div>
         )}
      </SidebarPortal>

      <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
         {/* Spotlight Effect */}
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-[600px] bg-gradient-to-b from-yellow-500/20 to-transparent blur-3xl pointer-events-none"></div>

         <div className="relative z-10 text-center">
            <div className="text-sm font-black text-yellow-500 uppercase tracking-[0.5em] mb-4">Secret Auction</div>
            
            <div className="text-9xl mb-6 drop-shadow-[0_0_50px_rgba(250,204,21,0.5)] animate-bounce-slow">
               {currentItem.icon}
            </div>
            
            <h1 className="text-5xl font-black text-white mb-2">{currentItem.name}</h1>
            <p className="text-gray-400 text-xl font-light mb-8">{currentItem.value}</p>

            {isActive ? (
               <div className="bg-white/5 backdrop-blur-md border border-white/10 px-8 py-4 rounded-2xl inline-block">
                  <div className="text-red-500 font-mono text-4xl font-bold animate-pulse">
                     00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                  </div>
               </div>
            ) : highestBid ? (
               <div className="animate-in zoom-in duration-300 bg-gradient-to-r from-yellow-600 to-yellow-800 px-10 py-6 rounded-3xl shadow-2xl">
                  <div className="text-2xl font-black text-white mb-2">SOLD TO</div>
                  <div className="text-4xl font-black text-black">{highestBid.user}</div>
                  <div className="text-xl text-yellow-100 font-mono mt-2">{highestBid.amount} 🪙</div>
               </div>
            ) : (
               <div className="text-gray-500">ابدأ المزاد من القائمة الجانبية</div>
            )}
         </div>
      </div>
    </>
  );
};
