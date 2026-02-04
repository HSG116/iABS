import React, { useState, useEffect, useRef } from 'react';
import { Timer, Trophy, ChevronLeft, Star, Settings, User, CheckCircle2, XCircle, BarChart3, Image as ImageIcon, Lock, Clock, RotateCcw, Home, Volume2, VolumeX, Zap, Skull, PlayCircle, ArrowRight } from 'lucide-react';
import { Question, ChatUser } from '../types';
import { QUESTIONS_DB, CATEGORIES } from '../constants';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';

const logoImage = "https://i.ibb.co/pvCN1NQP/95505180312.png";

const AVAILABLE_BACKGROUNDS = [
  { id: 'ramadan_1', url: 'https://images.unsplash.com/photo-1596627008794-d2e7ff2b415a?q=80&w=800', label: 'روحانيات' },
  { id: 'ramadan_2', url: 'https://i.ibb.co/k6mHccgc/content.png', label: 'ليالي رمضان' },
  { id: 'default', url: 'https://i.ibb.co/pjDLM8Hq/1000126047.png', label: 'الساحة' },
  { id: 'neon', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800', label: 'نيون' },
  { id: 'gold', url: 'https://images.unsplash.com/photo-1570450513510-148dc8233303?q=80&w=800', label: 'ذهب' },
  { id: 'tech', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800', label: 'تكنو' },
];

interface FawazirGameProps {
  category: string;
  onFinish: () => void;
  onHome: () => void;
}

interface GameSettings {
  winMode: 'SPEED' | 'POINTS';
  roundsCount: number;
  timerDuration: number;
  gameOverOnMiss: boolean;
  backgroundId: string;
  soundEnabled: boolean;
  autoNext: boolean;
  winnerDuration: number;
}

export const FawazirGame: React.FC<FawazirGameProps> = ({ category, onFinish, onHome }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timer, setTimer] = useState(20);
  const [gameState, setGameState] = useState<'PRE_START' | 'PLAYING' | 'ROUND_WIN' | 'SUMMARY'>('PRE_START');
  const [roundWinner, setRoundWinner] = useState<{ user: string, avatar: string } | null>(null);
  const [winnersList, setWinnersList] = useState<{ user: string, count: number, avatar: string }[]>([]);
  const [roundWinnersAccumulator, setRoundWinnersAccumulator] = useState<{ user: string, avatar: string }[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string>('');

  const [settings, setSettings] = useState<GameSettings>({
    winMode: 'SPEED',
    roundsCount: 10,
    timerDuration: 20,
    gameOverOnMiss: false,
    backgroundId: 'auto',
    soundEnabled: true,
    autoNext: false,
    winnerDuration: 5,
  });

  const questionsRef = useRef<Question[]>([]);
  const currentIndexRef = useRef(0);
  const gameStateRef = useRef(gameState);
  const settingsRef = useRef(settings);
  const userAttemptsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    questionsRef.current = questions;
    currentIndexRef.current = currentIndex;
    gameStateRef.current = gameState;
    settingsRef.current = settings;
  }, [questions, currentIndex, gameState, settings]);

  useEffect(() => {
    const filtered = QUESTIONS_DB.filter(q => q.category === category);
    setQuestions(filtered.sort(() => 0.5 - Math.random()));
    setGameState('PRE_START');
    updateBackground('auto');
  }, [category]);

  const updateBackground = (bgId: string) => {
    if (bgId === 'auto') {
      const catData = CATEGORIES.find(c => c.id === category);
      if (catData?.image) {
        if (Array.isArray(catData.image)) {
          const randomImg = catData.image[Math.floor(Math.random() * catData.image.length)];
          setBackgroundImage(`url('${randomImg}')`);
        } else {
          setBackgroundImage(`url('${catData.image}')`);
        }
      } else {
        setBackgroundImage(`url('${AVAILABLE_BACKGROUNDS[2].url}')`);
      }
    } else {
      const selected = AVAILABLE_BACKGROUNDS.find(b => b.id === bgId);
      if (selected) setBackgroundImage(`url('${selected.url}')`);
    }
  };

  useEffect(() => {
    updateBackground(settings.backgroundId);
  }, [settings.backgroundId]);

  const startGame = () => {
    const freshPool = QUESTIONS_DB.filter(q => q.category === category).sort(() => 0.5 - Math.random());
    const totalRounds = Math.min(settings.roundsCount, freshPool.length);
    const gameQuestions = freshPool.slice(0, totalRounds);

    setWinnersList([]);
    setCurrentIndex(0);
    setRoundWinnersAccumulator([]);
    userAttemptsRef.current.clear();
    setQuestions(gameQuestions);
    setTimer(settings.timerDuration);
    setGameState('PLAYING');
  };

  useEffect(() => {
    let interval: number;
    if (gameState === 'PLAYING' && timer > 0) {
      interval = window.setInterval(() => setTimer(prev => prev - 1), 1000);
    } else if (timer === 0 && gameState === 'PLAYING') {
      handleRoundEnd(null);
    }
    return () => clearInterval(interval);
  }, [gameState, timer]);

  const normalizeArabic = (text: string) => {
    if (!text) return "";
    return text.trim().toLowerCase()
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[ًٌٍَُِّْ]/g, '');
  };

  useEffect(() => {
    const unsubscribe = chatService.onMessage((msg) => {
      if (gameStateRef.current !== 'PLAYING') return;
      const currentQ = questionsRef.current[currentIndexRef.current];
      if (!currentQ) return;

      const username = msg.user.username;
      if (userAttemptsRef.current.has(username)) return;
      userAttemptsRef.current.add(username);

      const correctIndex = currentQ.correctIndex;
      const rawCorrectText = currentQ.options[correctIndex];
      const normalizedUser = normalizeArabic(msg.content);
      const normalizedCorrect = normalizeArabic(rawCorrectText);

      const isNumberMatch = normalizedUser === (correctIndex + 1).toString();
      const isTextMatch = normalizedUser.length >= 2 && (normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser));

      if (isNumberMatch || isTextMatch) {
        let avatarUrl = msg.user.avatar || '';
        if (settingsRef.current.winMode === 'SPEED') {
          handleRoundEnd({ user: username, avatar: avatarUrl });
        } else {
          setRoundWinnersAccumulator(prev => [...prev, { user: username, avatar: avatarUrl }]);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleRoundEnd = async (singleWinner: { user: string, avatar: string } | null) => {
    if (gameStateRef.current !== 'PLAYING') return;
    const winners = settingsRef.current.winMode === 'SPEED' ? (singleWinner ? [singleWinner] : []) : roundWinnersAccumulator;

    setGameState('ROUND_WIN');
    setRoundWinner(winners.length > 0 ? winners[0] : null);

    if (winners.length > 0) {
      winners.forEach(async (w) => {
        await leaderboardService.recordWin(w.user, w.avatar, 50);
      });

      setWinnersList(prev => {
        let newList = [...prev];
        winners.forEach(w => {
          const idx = newList.findIndex(u => u.user === w.user);
          if (idx !== -1) newList[idx] = { ...newList[idx], count: newList[idx].count + 1 };
          else newList.push({ user: w.user, avatar: w.avatar, count: 1 });
        });
        return newList.sort((a, b) => b.count - a.count);
      });
    }

    const waitTime = settingsRef.current.autoNext ? (settingsRef.current.winnerDuration * 1000) : 3500;

    setTimeout(() => {
      userAttemptsRef.current.clear();
      setRoundWinnersAccumulator([]);

      if (settingsRef.current.gameOverOnMiss && winners.length === 0) {
        setGameState('SUMMARY');
        return;
      }

      setCurrentIndex(prev => {
        const nextIdx = prev + 1;
        if (nextIdx < questionsRef.current.length) {
          setTimer(settingsRef.current.timerDuration);
          setGameState('PLAYING');
          return nextIdx;
        } else {
          setGameState('SUMMARY');
          return prev;
        }
      });
    }, waitTime);
  };

  if (gameState === 'SUMMARY') {
    const topWinner = winnersList[0];
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center animate-in zoom-in duration-500 p-6 text-center bg-black/80 backdrop-blur-md">
        <div className="glass-card w-full max-w-2xl rounded-[4rem] border-2 border-red-600/30 p-12 relative overflow-hidden shadow-[0_0_150px_rgba(255,0,0,0.2)]">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>
          <Trophy size={140} className="text-[#FFD700] mx-auto mb-8 animate-bounce drop-shadow-[0_0_40px_rgba(255,215,0,0.5)]" fill="currentColor" />
          <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase mb-2">النتائج النهائية</h1>
          <p className="text-red-500 font-black tracking-[0.5em] text-xs uppercase mb-12">Game Session Concluded</p>

          {topWinner ? (
            <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 mb-12">
              <div className="w-32 h-32 rounded-full border-4 border-[#FFD700] mx-auto mb-6 overflow-hidden shadow-2xl relative">
                {topWinner.avatar ? <img src={topWinner.avatar} className="w-full h-full object-cover" /> : <User size={48} className="text-white/20 mt-8 mx-auto" />}
                <div className="absolute bottom-0 w-full bg-[#FFD700] text-black font-black text-[10px] py-1">ULTIMATE</div>
              </div>
              <h2 className="text-5xl font-black text-white italic mb-2 tracking-tighter">{topWinner.user}</h2>
              <span className="text-xl font-bold text-kick-green font-mono">{topWinner.count} إجابة صحيحة</span>
            </div>
          ) : (
            <div className="text-3xl text-gray-500 font-bold mb-12">لا يوجد فائزون في هذه الجولة</div>
          )}

          <div className="flex flex-col gap-4 w-full">
            <button onClick={startGame} className="group w-full bg-white text-black font-black py-6 rounded-[2rem] text-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 italic shadow-2xl">
              إعادة اللعبة <RotateCcw size={28} className="group-hover:rotate-180 transition-transform duration-700" />
            </button>
            <button onClick={onHome} className="w-full bg-white/5 border border-white/10 text-white font-black py-6 rounded-[2rem] text-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-4 italic uppercase">
              <Home size={28} /> العودة للقائمة الرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden transition-all duration-1000 bg-cover bg-center" style={{ backgroundImage }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"></div>

      <div className="relative z-10 w-full h-full flex flex-col items-center p-8 max-w-7xl">
        <div className="w-full flex justify-between items-center mb-12">
          <button onClick={onHome} className="p-4 bg-black/60 rounded-3xl border border-white/10 text-white hover:bg-red-600 transition-all shadow-xl group">
            <ChevronLeft size={28} className="rotate-180 group-hover:scale-110" />
          </button>
          <img src={logoImage} className="h-20 drop-shadow-2xl" />
          <div className="flex flex-col gap-2 items-end">
            <div className="bg-black/80 px-8 py-3 rounded-2xl border border-white/10 flex items-center gap-4 shadow-2xl">
              <span className="text-xs font-black text-gray-500 uppercase">الجولة</span>
              <span className="text-4xl font-black text-white italic font-mono">{currentIndex + 1}/{questions.length}</span>
            </div>
            <div className={`bg-black/80 px-8 py-3 rounded-2xl border-2 flex items-center gap-4 shadow-2xl transition-all ${timer < 5 ? 'border-red-600 text-red-600 animate-pulse' : 'border-white/10 text-white'}`}>
              <Clock size={24} />
              <span className="text-4xl font-black font-mono italic">{timer}s</span>
            </div>
          </div>
        </div>

        {gameState === 'PRE_START' ? (
          <div className="flex-1 w-full flex items-center justify-center animate-in zoom-in overflow-y-auto custom-scrollbar p-4">
            <div className="glass-card p-10 rounded-[3rem] border border-red-600/20 w-full max-w-5xl text-center shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden backdrop-blur-xl bg-black/80">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>

              <div className="mb-10">
                <h2 className="text-6xl font-black text-white italic mb-2 tracking-tighter uppercase red-neon-text">إعدات الميدان</h2>
                <p className="text-gray-500 font-bold tracking-[0.5em] text-xs">ADVANCED BATTLE CONFIGURATION</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 text-right">
                {/* Column 1: Core Settings */}
                <div className="space-y-6">
                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors">
                    <label className="text-xs font-black text-iabs-red uppercase tracking-wider block mb-4 flex items-center gap-2"><Settings size={14} /> نظام اللعب</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[5, 10, 15, 20].map(n => (
                        <button key={n} onClick={() => setSettings({ ...settings, roundsCount: n })} className={`h-14 rounded-2xl font-black text-lg transition-all ${settings.roundsCount === n ? 'bg-red-600 text-white shadow-lg scale-105' : 'bg-black/40 text-gray-500 hover:bg-white/10'}`}>{n} جولة</button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors">
                    <label className="text-xs font-black text-iabs-red uppercase tracking-wider block mb-4 flex items-center gap-2"><Clock size={14} /> مؤقت الإجابة</label>
                    <input
                      type="range" min="5" max="60" step="5"
                      value={settings.timerDuration}
                      onChange={(e) => setSettings({ ...settings, timerDuration: parseInt(e.target.value) })}
                      className="w-full accent-red-600 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mb-2"
                    />
                    <div className="flex justify-between text-gray-400 font-mono text-sm">
                      <span>5s</span>
                      <span className="text-white font-black text-xl">{settings.timerDuration}s</span>
                      <span>60s</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Advanced & Visuals */}
                <div className="space-y-6">
                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors">
                    <label className="text-xs font-black text-iabs-red uppercase tracking-wider block mb-4 flex items-center gap-2"><ImageIcon size={14} /> خلفية اللعب</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button onClick={() => setSettings({ ...settings, backgroundId: 'auto' })} className={`aspect-video rounded-xl border-2 transition-all relative overflow-hidden group ${settings.backgroundId === 'auto' ? 'border-red-600 scale-105' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-blue-600"></div>
                        <span className="absolute inset-0 flex items-center justify-center font-black text-[10px] text-white z-10">تلقائي</span>
                      </button>
                      {AVAILABLE_BACKGROUNDS.map(bg => (
                        <button key={bg.id} onClick={() => setSettings({ ...settings, backgroundId: bg.id })} className={`aspect-video rounded-xl border-2 transition-all relative overflow-hidden group ${settings.backgroundId === bg.id ? 'border-red-600 scale-105' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                          <img src={bg.url} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setSettings({ ...settings, soundEnabled: !settings.soundEnabled })} className={`p-4 rounded-[2rem] border transition-all flex flex-col items-center justify-center gap-2 ${settings.soundEnabled ? 'bg-white/10 border-green-500/50 text-green-400' : 'bg-black/40 border-white/5 text-gray-600'}`}>
                      {settings.soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                      <span className="text-xs font-black">المؤثرات</span>
                    </button>

                    <button onClick={() => setSettings({ ...settings, autoNext: !settings.autoNext })} className={`p-4 rounded-[2rem] border transition-all flex flex-col items-center justify-center gap-2 ${settings.autoNext ? 'bg-white/10 border-blue-500/50 text-blue-400' : 'bg-black/40 border-white/5 text-gray-600'}`}>
                      <Zap size={24} />
                      <span className="text-xs font-black">التالي تلقائي</span>
                    </button>

                    <button onClick={() => setSettings({ ...settings, gameOverOnMiss: !settings.gameOverOnMiss })} className={`p-4 rounded-[2rem] border transition-all flex flex-col items-center justify-center gap-2 ${settings.gameOverOnMiss ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-black/40 border-white/5 text-gray-600'}`}>
                      <Skull size={24} />
                      <span className="text-xs font-black">الموت المفاجئ</span>
                    </button>

                    <button onClick={() => setSettings({ ...settings, winMode: settings.winMode === 'SPEED' ? 'POINTS' : 'SPEED' })} className={`p-4 rounded-[2rem] border transition-all flex flex-col items-center justify-center gap-2 ${settings.winMode === 'SPEED' ? 'bg-white/10 border-yellow-500/50 text-yellow-500' : 'bg-white/10 border-purple-500/50 text-purple-500'}`}>
                      <Trophy size={24} />
                      <span className="text-xs font-black">{settings.winMode === 'SPEED' ? 'الأسرع' : 'تجميع نقاط'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={startGame} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-6 rounded-[2.5rem] text-3xl shadow-[0_10px_40px_rgba(220,38,38,0.4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group">
                  <PlayCircle size={32} className="fill-white text-red-600" />
                  ابدأ التحدي
                </button>
                <button onClick={onHome} className="px-8 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-[2.5rem] flex items-center justify-center transition-all">
                  <Home size={24} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 w-full flex flex-col items-center justify-center mb-24 relative">
            {gameState === 'ROUND_WIN' && (
              <div className="absolute inset-0 z-50 flex items-center justify-center animate-in zoom-in duration-300">
                <div className="bg-black/90 p-12 rounded-[4rem] border-4 border-green-500 shadow-[0_0_100px_rgba(34,197,94,0.5)] text-center relative overflow-hidden max-w-2xl w-full">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500"></div>
                  <h3 className="text-green-500 font-black tracking-[0.4em] text-xs uppercase mb-8 italic">Round Victor Detected</h3>
                  {roundWinner ? (
                    <>
                      <div className="w-32 h-32 rounded-[2.5rem] border-4 border-green-500 mx-auto mb-6 overflow-hidden shadow-2xl">
                        {roundWinner.avatar ? <img src={roundWinner.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-white/20 font-black text-5xl">{roundWinner.user.charAt(0)}</div>}
                      </div>
                      <div className="text-7xl font-black text-white italic tracking-tighter uppercase drop-shadow-[0_5px_15px_black]">{roundWinner.user}</div>
                    </>
                  ) : (
                    <div className="text-5xl font-black text-red-500 italic uppercase">انتهى الوقت!</div>
                  )}
                </div>
              </div>
            )}

            <div className={`w-full max-w-4xl transition-all duration-700 ${gameState === 'ROUND_WIN' ? 'blur-2xl opacity-20 scale-90' : 'scale-100 opacity-100'}`}>
              <div className="text-center mb-16 px-6">
                <h2 className="text-5xl md:text-7xl font-black text-white leading-tight italic tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,1)]">
                  {questions[currentIndex]?.text}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {questions[currentIndex]?.options.map((opt, idx) => (
                  <div key={idx} className="group relative p-8 rounded-[2.5rem] border-2 border-white/10 bg-black/60 backdrop-blur-3xl flex items-center justify-between transition-all hover:border-red-600 hover:scale-105 shadow-2xl">
                    <span className="text-3xl font-bold text-gray-200 group-hover:text-white transition-colors italic">{opt}</span>
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-3xl text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all shadow-lg italic">
                      {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
