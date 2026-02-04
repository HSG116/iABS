
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import { Eye, EyeOff, Search, Play, RotateCcw, Trophy, Image as ImageIcon, AlertTriangle, Trash2, Wand2, ChevronRight, ChevronLeft, LogOut, Home } from 'lucide-react';

interface BlurGuessProps {
  channelConnected: boolean;
  onHome: () => void;
}

const PEXELS_API_KEY = "uZQAx7uPvBboEvI8i6pN9NsvGFvZi5qDPQNPFHchF0DnuBZdrPm7wt54";

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  const el = document.getElementById('game-sidebar-portal');
  if (!mounted || !el) return null;
  return createPortal(children, el);
};

export const BlurGuess: React.FC<BlurGuessProps> = ({ channelConnected, onHome }) => {
  const [gameState, setGameState] = useState<'SETUP' | 'PLAYING' | 'WINNER'>('SETUP');
  const [arabicWord, setArabicWord] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [photos, setPhotos] = useState<any[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blurLevel, setBlurLevel] = useState(50);
  const [timer, setTimer] = useState(0);
  const [winner, setWinner] = useState<{name: string, avatar?: string, color?: string} | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [showSolution, setShowSolution] = useState(false);

  const gameStateRef = useRef(gameState);
  const arabicWordRef = useRef(arabicWord);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { arabicWordRef.current = arabicWord; }, [arabicWord]);

  useEffect(() => {
    if (photos.length > 0 && photos[photoIndex]) {
       setImageUrl(photos[photoIndex].src.large2x);
    }
  }, [photos, photoIndex]);

  useEffect(() => {
    let interval: number;
    if (gameState === 'PLAYING') {
      interval = window.setInterval(() => setTimer(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
     if (gameState !== 'PLAYING') return;
     if (timer < 15) setBlurLevel(50);
     else if (timer < 30) setBlurLevel(20);
     else if (timer < 45) setBlurLevel(5);
     else setBlurLevel(0);
  }, [timer, gameState]);

  useEffect(() => {
    if (!channelConnected) return;
    const cleanup = chatService.onMessage(async (msg) => {
      if (gameStateRef.current !== 'PLAYING') return;
      if (msg.content.trim().toLowerCase() === arabicWordRef.current.trim().toLowerCase()) {
        const username = msg.user.username;
        const userWinner = { name: username, avatar: msg.user.avatar, color: msg.user.color };
        setWinner(userWinner);
        setScores(prev => ({ ...prev, [username]: (prev[username] || 0) + 1 }));
        setGameState('WINNER');
        setBlurLevel(0);

        // تسجيل في لوحة الصدارة (100 نقطة لتخمين الصورة)
        await leaderboardService.recordWin(userWinner.name, userWinner.avatar || '', 100);
      }
    });
    return cleanup;
  }, [channelConnected]);

  const autoTranslate = async () => {
    if (!arabicWord) return;
    setIsTranslating(true);
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(arabicWord)}&langpair=ar|en`);
      const data = await res.json();
      if (data.responseData?.translatedText) {
         setSearchQuery(data.responseData.translatedText.replace(/[.!?,]/g, ''));
      }
    } catch (e) {} finally { setIsTranslating(false); }
  };

  const fetchImages = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=30`, {
        headers: { Authorization: PEXELS_API_KEY }
      });
      const data = await res.json();
      if (data.photos?.length > 0) {
        setPhotos(data.photos);
        setPhotoIndex(0);
      } else { alert("لم يتم العثور على صور!"); }
    } catch (e) {} finally { setIsSearching(false); }
  };

  const resetGame = () => { setGameState('SETUP'); setWinner(null); setBlurLevel(50); setTimer(0); };
  
  return (
    <>
      <SidebarPortal>
         <div className="bg-black/40 p-4 rounded-[2rem] border border-white/5 space-y-4 animate-in slide-in-from-bottom-4">
             <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                   <Eye size={12} /> تحكم الصورة
                </h4>
                <button onClick={onHome} className="p-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl transition-all border border-red-500/20">
                   <LogOut size={14} />
                </button>
             </div>

             {gameState === 'SETUP' && (
               <div className="space-y-3">
                 <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl flex items-start gap-2">
                    <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-red-200 leading-tight font-bold">تحذير: لا تبحث عن الصورة أمام المشاهدين!</p>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-gray-500 uppercase">كلمة الحل</label>
                   <div className="flex gap-2">
                      <input value={arabicWord} onChange={(e) => setArabicWord(e.target.value)} placeholder="مثال: أسد" className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none transition-all" />
                      <button onClick={autoTranslate} className="bg-white/5 hover:bg-white/10 text-red-500 p-2 rounded-xl border border-white/5"><Wand2 size={16} /></button>
                   </div>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-gray-500 uppercase">كلمة البحث (EN)</label>
                   <div className="flex gap-2">
                      <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="e.g. Lion" className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none" />
                      <button onClick={fetchImages} className="bg-red-600 text-white p-2 rounded-xl shadow-lg shadow-red-600/20"><Search size={14}/></button>
                   </div>
                 </div>
                 {imageUrl && (
                   <div className="relative h-28 rounded-2xl overflow-hidden border border-white/10 group bg-zinc-900">
                      <img src={imageUrl} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-between px-4">
                          <button onClick={() => setPhotoIndex(p => (p-1+photos.length)%photos.length)} className="p-1 hover:bg-white/20 rounded-lg"><ChevronRight size={18} /></button>
                          <button onClick={() => setPhotoIndex(p => (p+1)%photos.length)} className="p-1 hover:bg-white/20 rounded-lg"><ChevronLeft size={18} /></button>
                      </div>
                   </div>
                 )}
                 <button onClick={() => setGameState('PLAYING')} disabled={!imageUrl || !arabicWord} className="w-full bg-red-600 text-white font-black py-3 rounded-2xl text-xs shadow-xl shadow-red-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-20 italic border-t-2 border-white/20">بدء التحدي الآن</button>
               </div>
             )}

             {gameState !== 'SETUP' && (
               <div className="space-y-3">
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div>
                        <div className="text-[8px] text-gray-500 mb-1 uppercase font-black">الحل الصحيح</div>
                        <div className="text-sm font-black text-white">{showSolution ? arabicWord : '••••••'}</div>
                    </div>
                    <button onClick={() => setShowSolution(!showSolution)} className="text-red-500 hover:scale-110 transition-transform">{showSolution ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                 </div>
                 <button onClick={resetGame} className="w-full bg-white/5 py-3 rounded-2xl text-[10px] font-black text-gray-400 hover:text-white border border-white/5"><RotateCcw size={12} className="inline mr-1" /> صورة جديدة</button>
                 <button onClick={onHome} className="w-full bg-red-600/10 py-3 rounded-2xl text-[10px] font-black text-red-500 hover:bg-red-600/20 border border-red-500/20"><Home size={12} className="inline mr-1" /> خروج للقائمة</button>
               </div>
             )}
         </div>
      </SidebarPortal>

      <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-black">
          {gameState === 'SETUP' && !imageUrl && (
             <div className="text-center animate-pulse opacity-40">
                <ImageIcon size={100} className="mx-auto mb-6 text-gray-600" />
                <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-none">تخمين الصورة</h1>
                <p className="text-lg text-gray-500 mt-2 font-bold uppercase tracking-widest">iABS Gaming Engine</p>
             </div>
          )}
          {imageUrl && (gameState === 'PLAYING' || gameState === 'SETUP') && (
             <div className="relative w-full h-full max-w-4xl max-h-[80%] rounded-[3rem] overflow-hidden border-[12px] border-white/5 bg-zinc-900 shadow-2xl transition-all duration-700">
                <img src={imageUrl} className="w-full h-full object-contain transition-all duration-1000" style={{ filter: `blur(${gameState === 'SETUP' ? 0 : blurLevel}px)` }} />
                {gameState === 'PLAYING' && (
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-12 py-3 rounded-full font-black italic text-2xl shadow-[0_0_50px_rgba(255,0,0,0.4)] animate-glow border-t-2 border-white/20">خمن الـصـورة!</div>
                )}
             </div>
          )}
          {gameState === 'WINNER' && winner && (
             <div className="text-center animate-in zoom-in duration-500 z-10">
                <Trophy size={140} className="text-[#FFD700] mx-auto mb-8 animate-bounce drop-shadow-[0_0_50px_rgba(255,215,0,0.4)]" fill="currentColor" />
                <h1 className="text-9xl font-black text-white italic tracking-tighter mb-4 uppercase drop-shadow-[0_10px_40px_rgba(0,0,0,1)]">{arabicWord}</h1>
                <div className="bg-white/5 backdrop-blur-2xl px-16 py-8 rounded-[3rem] border border-red-500/30 inline-block shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                    <div className="text-red-500 font-black uppercase tracking-[0.4em] text-xs mb-4 italic">Winner Winner!</div>
                    <div className="flex items-center gap-6">
                       <div className="w-20 h-20 rounded-[1.5rem] bg-white text-black flex items-center justify-center text-4xl font-black shadow-xl" style={{ backgroundColor: winner.color || '#ff0000' }}>{winner.name.charAt(0).toUpperCase()}</div>
                       <div className="text-6xl font-black text-white italic tracking-tighter">{winner.name}</div>
                    </div>
                </div>
                <div className="mt-10 flex gap-4 justify-center">
                   <button onClick={resetGame} className="px-12 py-4 bg-white text-black font-black text-xl rounded-2xl hover:scale-110 transition-all italic shadow-2xl">جولة جديدة</button>
                   <button onClick={onHome} className="px-12 py-4 bg-red-600 text-white font-black text-xl rounded-2xl hover:scale-110 transition-all italic shadow-2xl">خروج</button>
                </div>
             </div>
          )}
      </div>
    </>
  );
};
