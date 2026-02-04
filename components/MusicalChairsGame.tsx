
import React, { useState, useEffect, useRef } from 'react';
import { Settings, Play, Music, Users, Armchair, Skull, Trophy, Clock, Volume2, ChevronLeft, User, Trash2, Sparkles, CheckCircle2, Loader2, Gauge, Zap, Ghost, Target, FastForward, Map as MapIcon, LogOut, Home } from 'lucide-react';
import { ChatUser } from '../types';
import { chatService } from '../services/chatService';
import { SONGS_DB } from '../constants';
import { ARENA_MAPS, ArenaMap } from '../data/maps';
import { leaderboardService } from '../services/supabase';

interface MusicalChairsGameProps {
  onHome: () => void;
}

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'RANDOM';

interface GameConfig {
  joinKeyword: string;
  maxPlayers: number;
  musicDuration: number;
  selectionDuration: number;
  volume: number;
  hideNumbers: boolean;
  selectedSongs: string[];
  selectedMap: ArenaMap;
  autoProgress: boolean;
  eliminationCount: number;
  difficulty: Difficulty;
  neonGlow: boolean;
  fastResults: boolean;
  luckyChair: boolean;
  ghostMode: boolean;
}

type GamePhase = 'SETUP' | 'LOBBY' | 'ROUND_START' | 'MUSIC_ON' | 'MUSIC_OFF' | 'RESULTS' | 'FINALE';

export const MusicalChairsGame: React.FC<MusicalChairsGameProps> = ({ onHome }) => {
  const [config, setConfig] = useState<GameConfig>({
    joinKeyword: 'دخول',
    maxPlayers: 100, 
    musicDuration: 10,
    selectionDuration: 12,
    volume: 0.6,
    hideNumbers: false,
    selectedSongs: SONGS_DB.map(s => s.id),
    selectedMap: ARENA_MAPS[0],
    autoProgress: false,
    eliminationCount: 1,
    difficulty: 'EASY',
    neonGlow: true,
    fastResults: false,
    luckyChair: false,
    ghostMode: false
  });

  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [participants, setParticipants] = useState<ChatUser[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [chairs, setChairs] = useState<{ id: string, occupiedBy: string | null, isLucky?: boolean }[]>([]);
  const [timer, setTimer] = useState(0);
  const [winner, setWinner] = useState<ChatUser | null>(null);
  const [lastEliminated, setLastEliminated] = useState<ChatUser[]>([]);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [walkingOffset, setWalkingOffset] = useState(0); 
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const phaseRef = useRef(phase);
  const configRef = useRef(config);
  const participantsRef = useRef(participants);

  useEffect(() => { 
    phaseRef.current = phase;
    configRef.current = config;
    participantsRef.current = participants;
  }, [phase, config, participants]);

  const generateChairId = (index: number, diff: Difficulty): string => {
    switch (diff) {
      case 'MEDIUM': return (Math.floor(Math.random() * 900) + 100).toString();
      case 'HARD': return (Math.floor(Math.random() * 9000) + 1000).toString();
      case 'RANDOM':
        const pool = ['EASY', 'MEDIUM', 'HARD'];
        return generateChairId(index, pool[Math.floor(Math.random() * pool.length)] as Difficulty);
      case 'EASY':
      default: return (index + 1).toString();
    }
  };

  const fetchKickAvatar = async (username: string): Promise<string> => {
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://kick.com/api/v2/channels/${username.toLowerCase()}`)}`;
      const response = await fetch(proxyUrl);
      if (response.ok) {
        const rawData = await response.json();
        const data = JSON.parse(rawData.contents);
        return data.user?.profile_pic || '';
      }
    } catch (e) {}
    return '';
  };

  useEffect(() => {
    const unsubscribe = chatService.onMessage(async (msg) => {
      const content = msg.content.trim().toLowerCase();
      
      if (phaseRef.current === 'LOBBY') {
        const keyword = configRef.current.joinKeyword.toLowerCase();
        if (content === keyword || content === `!${keyword}`) {
          if (participantsRef.current.length < configRef.current.maxPlayers && 
              !participantsRef.current.find(p => p.username === msg.user.username)) {
            const newUser: ChatUser = { ...msg.user };
            setParticipants(prev => [...prev, newUser]);
            const realPic = await fetchKickAvatar(msg.user.username);
            if (realPic) {
              setParticipants(prev => prev.map(p => p.username === msg.user.username ? { ...p, avatar: realPic } : p));
            }
          }
        }
      }

      if (phaseRef.current === 'MUSIC_OFF') {
        setChairs(prev => {
          const index = prev.findIndex(c => c.id.toLowerCase() === content);
          if (index !== -1 && !prev[index].occupiedBy) {
             const alreadySeated = prev.some(c => c.occupiedBy === msg.user.username);
             if (!alreadySeated) {
                const newChairs = [...prev];
                newChairs[index] = { ...newChairs[index], occupiedBy: msg.user.username };
                return newChairs;
             }
          }
          return prev;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Animation Loop for Circular Movement ---
  useEffect(() => {
    let frameId: number;
    const animate = () => {
      if (phaseRef.current === 'MUSIC_ON') {
        // Increase rotation speed and bobbing speed
        setRotationAngle(prev => (prev + 1.5) % 360);
        setWalkingOffset(prev => (prev + 0.15) % (Math.PI * 2));
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    let interval: number;
    if (phase === 'MUSIC_ON' || phase === 'MUSIC_OFF') {
      interval = window.setInterval(() => {
        setTimer(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (timer === 0) {
      if (phase === 'MUSIC_ON') stopMusic();
      else if (phase === 'MUSIC_OFF') resolveRound();
    }
  }, [timer, phase]);

  const startMusic = () => {
    if (participants.length <= 1) return;
    const survivorsCount = participants.length;
    let chairsCount = survivorsCount - config.eliminationCount;
    if (chairsCount < 1) chairsCount = 1;

    const luckyIndex = config.luckyChair ? Math.floor(Math.random() * chairsCount) : -1;
    const newChairs = Array.from({ length: chairsCount }, (_, i) => ({ 
      id: generateChairId(i, config.difficulty), 
      occupiedBy: null,
      isLucky: i === luckyIndex
    }));

    setChairs(newChairs);
    setCurrentRound(r => r + 1);
    setTimer(config.musicDuration);
    setPhase('MUSIC_ON');
    
    if (audioRef.current) {
        const songs = SONGS_DB.filter(s => config.selectedSongs.includes(s.id));
        if (songs.length === 0) return;
        const song = songs[Math.floor(Math.random() * songs.length)];
        audioRef.current.src = song.url;
        audioRef.current.volume = config.volume;
        audioRef.current.play().catch(() => {});
    }
  };

  const stopMusic = () => {
    if (audioRef.current) audioRef.current.pause();
    setTimer(config.selectionDuration);
    setPhase('MUSIC_OFF');
  };

  const resolveRound = () => {
    const winnersNames = chairs.filter(c => c.occupiedBy).map(c => c.occupiedBy!);
    const losers = participants.filter(p => !winnersNames.includes(p.username));
    const winners = participants.filter(p => winnersNames.includes(p.username));

    setLastEliminated(losers);
    setParticipants(winners);

    if (winners.length === 1) {
      setWinner(winners[0]);
      setPhase('FINALE');
      leaderboardService.recordWin(winners[0].username, winners[0].avatar || '', 500);
    } else {
      setPhase('RESULTS');
      if (config.autoProgress) setTimeout(startMusic, config.fastResults ? 1500 : 4000);
    }
  };

  const resetGame = () => {
    setPhase('SETUP');
    setParticipants([]);
    setWinner(null);
    setCurrentRound(0);
    setChairs([]);
    setRotationAngle(0);
    if (audioRef.current) audioRef.current.pause();
  };

  const getDynamicSize = (count: number) => {
    if (count < 12) return { box: 'w-20 h-20', icon: 32, text: 'text-xs' };
    if (count < 30) return { box: 'w-14 h-14', icon: 24, text: 'text-[10px]' };
    if (count < 60) return { box: 'w-10 h-10', icon: 16, text: 'text-[8px]' };
    return { box: 'w-7 h-7', icon: 12, text: 'hidden' };
  };

  // Improved coordinate math to ensure players orbit exactly around the center
  const getPlayerOrbitPos = (index: number, total: number, radius: number) => {
    const angleOffset = (rotationAngle * Math.PI / 180);
    const angle = (index / total) * 2 * Math.PI + angleOffset;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      angle: angle
    };
  };

  const getArenaShapeClass = (shape: ArenaMap['shape']) => {
    switch (shape) {
      case 'square': return 'rounded-[2.5rem]';
      case 'hexagon': return 'clip-path-hexagon';
      case 'triangle': return 'clip-path-triangle';
      case 'star': return 'clip-path-star';
      case 'circle':
      default: return 'rounded-full';
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center bg-transparent text-right font-display select-none" dir="rtl">
      <audio ref={audioRef} />

      <style>{`
        .clip-path-hexagon { clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%); }
        .clip-path-triangle { clip-path: polygon(50% 0%, 0% 100%, 100% 100%); }
        .clip-path-star { clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
      `}</style>

      {/* --- PHASE: SETUP --- */}
      {phase === 'SETUP' && (
        <div className="w-full max-w-7xl animate-in fade-in zoom-in duration-700 py-6 px-4 pb-20 overflow-y-auto custom-scrollbar h-full">
          <div className="flex items-center justify-between mb-8">
             <button onClick={onHome} className="p-4 bg-red-600/10 rounded-3xl hover:bg-red-600/20 text-red-500 transition-all border border-red-500/20 shadow-xl group">
                <LogOut size={24} className="group-hover:scale-110" />
             </button>
             <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-1">
                   <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase">إعدادات الحلبة</h1>
                </div>
                <p className="text-red-600 font-black tracking-[0.4em] text-[10px] uppercase">iABS Musical Chairs Premium</p>
             </div>
             <div className="w-14"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
             <div className="lg:col-span-4 space-y-6">
                <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                   <h3 className="text-lg font-black text-white flex items-center gap-3 mb-6">
                      <Settings size={18} className="text-red-600" /> الإعدادات الأساسية
                   </h3>
                   
                   <div className="space-y-6">
                      <div className="bg-black/30 p-5 rounded-3xl border border-white/5 group hover:border-red-600/30 transition-all">
                         <div className="flex justify-between items-center mb-3">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">الحد الأقصى للمتسابقين</label>
                            <span className="text-2xl font-black text-red-600 font-mono">{config.maxPlayers}</span>
                         </div>
                         <input type="range" min="2" max="2000" step="1" value={config.maxPlayers} onChange={e => setConfig({...config, maxPlayers: +e.target.value})} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-600" />
                      </div>

                      <div className="space-y-3">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Gauge size={12} className="text-red-600" /> مستوى الصعوبة
                         </label>
                         <div className="grid grid-cols-2 gap-2">
                            {(['EASY', 'MEDIUM', 'HARD', 'RANDOM'] as Difficulty[]).map(d => (
                               <button key={d} onClick={() => setConfig({...config, difficulty: d})} className={`py-3 rounded-2xl font-black text-[10px] transition-all border-2 ${config.difficulty === d ? 'bg-red-600 text-white border-red-600 shadow-[0_0_15px_rgba(255,0,0,0.3)]' : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10'}`}>
                                  {d === 'EASY' ? 'سهل' : d === 'MEDIUM' ? 'متوسط' : d === 'HARD' ? 'صعب' : 'عشوائي'}
                               </button>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">كلمة الانضمام</label>
                         <input value={config.joinKeyword} onChange={e => setConfig({...config, joinKeyword: e.target.value})} className="w-full bg-black border border-white/10 focus:border-red-600 rounded-xl p-3 text-white font-bold text-sm text-center outline-none transition-all" />
                      </div>
                   </div>
                </div>

                <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
                   <h3 className="text-lg font-black text-white flex items-center gap-3 mb-6">
                      <MapIcon size={18} className="text-red-600" /> اختيار الخريطة
                   </h3>
                   <div className="grid grid-cols-1 gap-2">
                      {ARENA_MAPS.map(m => (
                         <button key={m.id} onClick={() => setConfig({...config, selectedMap: m})} className={`p-3 rounded-2xl border-2 flex items-center gap-4 transition-all ${config.selectedMap.id === m.id ? 'bg-white/10 border-white/30 scale-[1.02]' : 'bg-black/20 border-transparent opacity-60'}`}>
                            <span className="text-2xl">{m.icon}</span>
                            <div className="text-right">
                               <div className={`text-xs font-black ${config.selectedMap.id === m.id ? 'text-white' : 'text-gray-500'}`}>{m.name}</div>
                            </div>
                            {config.selectedMap.id === m.id && <div className="mr-auto w-2 h-2 rounded-full bg-red-600 shadow-[0_0_10px_red]"></div>}
                         </button>
                      ))}
                   </div>
                </div>
             </div>

             <div className="lg:col-span-8 space-y-6">
                <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 flex flex-col shadow-2xl">
                   <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-black text-white flex items-center gap-4"><Music size={22} className="text-red-600" /> قائمة الموسيقى</h3>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mb-6">
                      {SONGS_DB.map(song => (
                         <div key={song.id} onClick={() => setConfig({...config, selectedSongs: config.selectedSongs.includes(song.id) ? config.selectedSongs.filter(id => id !== song.id) : [...config.selectedSongs, song.id]})} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${config.selectedSongs.includes(song.id) ? 'bg-red-600/10 border-red-600' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                            <div className="flex items-center gap-3">
                               <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${config.selectedSongs.includes(song.id) ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-500'}`}><Music size={16} /></div>
                               <span className={`font-bold text-xs ${config.selectedSongs.includes(song.id) ? 'text-white' : 'text-gray-400'}`}>{song.title}</span>
                            </div>
                            {config.selectedSongs.includes(song.id) && <CheckCircle2 size={18} className="text-red-600" />}
                         </div>
                      ))}
                   </div>

                   <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="bg-black/30 p-4 rounded-3xl text-center space-y-2">
                         <label className="text-[9px] font-bold text-gray-500 uppercase">وقت الموسيقى</label>
                         <div className="flex items-center justify-center gap-3">
                            <button onClick={() => setConfig({...config, musicDuration: Math.max(5, config.musicDuration - 5)})} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">-</button>
                            <span className="text-xl font-black text-white font-mono">{config.musicDuration}s</span>
                            <button onClick={() => setConfig({...config, musicDuration: config.musicDuration + 5})} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">+</button>
                         </div>
                      </div>
                      <div className="bg-black/30 p-4 rounded-3xl text-center space-y-2">
                         <label className="text-[9px] font-bold text-gray-500 uppercase">وقت الجلوس</label>
                         <div className="flex items-center justify-center gap-3">
                            <button onClick={() => setConfig({...config, selectionDuration: Math.max(5, config.selectionDuration - 2)})} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">-</button>
                            <span className="text-xl font-black text-white font-mono">{config.selectionDuration}s</span>
                            <button onClick={() => setConfig({...config, selectionDuration: config.selectionDuration + 2})} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">+</button>
                         </div>
                      </div>
                      <div className="bg-black/30 p-4 rounded-3xl text-center space-y-2">
                         <label className="text-[9px] font-bold text-gray-500 uppercase">المستبعدين</label>
                         <div className="flex items-center justify-center gap-3">
                            <button onClick={() => setConfig({...config, eliminationCount: Math.max(1, config.eliminationCount - 1)})} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">-</button>
                            <span className="text-xl font-black text-white font-mono">{config.eliminationCount}</span>
                            <button onClick={() => setConfig({...config, eliminationCount: config.eliminationCount + 1})} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">+</button>
                         </div>
                      </div>
                   </div>

                   <button onClick={() => setPhase('LOBBY')} disabled={config.selectedSongs.length === 0} className="mt-4 bg-red-600 text-white font-black py-6 rounded-3xl text-4xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-20 shadow-[0_15px_40px_rgba(255,0,0,0.4)] border-t border-white/20 italic">
                      بـدء الـمـعـركة <Play fill="currentColor" size={32} />
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* --- PHASE: LOBBY --- */}
      {phase === 'LOBBY' && (
        <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in fade-in duration-1000 relative bg-transparent">
           <div className="text-center mb-10 z-10">
              <h1 className="text-8xl font-black text-white italic tracking-tighter mb-4 drop-shadow-[0_10px_40px_rgba(0,0,0,1)] uppercase">في انتظار اللاعبين</h1>
              <div className="flex items-center justify-center gap-6 text-3xl text-gray-400 font-bold uppercase tracking-widest mb-12">
                 أرسل <span className="bg-red-600 text-white px-10 py-3 rounded-[2.5rem] font-black italic shadow-[0_15px_40px_rgba(255,0,0,0.6)] animate-glow border-2 border-white/30">{config.joinKeyword}</span> للمشاركة
              </div>
           </div>

           <div className="flex-1 w-full max-w-6xl relative flex flex-col items-center justify-center mb-10 overflow-y-auto custom-scrollbar px-6">
              {participants.length === 0 ? (
                 <div className="flex flex-col items-center animate-pulse opacity-30">
                    <Loader2 size={100} className="text-gray-700 animate-spin mb-4" />
                 </div>
              ) : (
                 <div className="flex flex-wrap justify-center gap-5 max-w-5xl transition-all duration-700">
                    {participants.map((p) => {
                       const sizes = getDynamicSize(participants.length);
                       return (
                          <div key={p.id} className="animate-in zoom-in duration-500 flex flex-col items-center gap-2 group">
                             <div className={`${sizes.box} rounded-[2rem] border-2 p-1 transition-all duration-300 shadow-2xl relative overflow-hidden bg-black/40 backdrop-blur-xl group-hover:border-red-600`} style={{ borderColor: p.color || 'rgba(255,255,255,0.1)' }}>
                                {p.avatar ? (
                                   <img src={p.avatar} className="w-full h-full object-cover rounded-[1.7rem]" />
                                ) : (
                                   <div className="w-full h-full bg-zinc-900 rounded-[1.7rem] flex items-center justify-center text-gray-600"><User size={sizes.icon} /></div>
                                )}
                             </div>
                             <span className={`${sizes.text} font-black uppercase truncate max-w-[100px] drop-shadow-md transition-colors group-hover:text-white`} style={{ color: p.color || '#9ca3af' }}>{p.username}</span>
                          </div>
                       )
                    })}
                 </div>
              )}
           </div>

           <div className="w-full max-w-5xl bg-black/60 backdrop-blur-[40px] p-10 rounded-[3.5rem] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.9)] flex items-center justify-between z-20">
              <div className="flex items-center gap-6 bg-white/5 px-8 py-4 rounded-[2rem] border border-white/5">
                 <span className="text-7xl font-black text-white font-mono italic tabular-nums leading-none">{participants.length}</span>
                 <span className="text-xl text-red-600 font-black opacity-40">/ {config.maxPlayers} MAX</span>
              </div>
              <div className="flex gap-4">
                 <button onClick={resetGame} className="px-10 py-6 rounded-[2.5rem] bg-white/5 text-gray-500 font-black hover:text-white transition-all text-lg border border-white/10">تراجع</button>
                 <button onClick={startMusic} disabled={participants.length < 2} className="px-16 py-6 bg-white text-black font-black text-3xl rounded-[2.5rem] shadow-2xl hover:scale-[1.05] active:scale-95 transition-all disabled:opacity-10 italic flex items-center gap-4">بـدء اللعب <Play fill="currentColor" size={32} /></button>
              </div>
           </div>
        </div>
      )}

      {/* --- PHASE: IN-GAME (CIRCULAR MOVEMENT) --- */}
      {(phase === 'MUSIC_ON' || phase === 'MUSIC_OFF' || phase === 'RESULTS') && (
        <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden bg-black">
           
           <div className="absolute top-10 left-10 right-10 flex justify-between items-center z-50 pointer-events-none">
              <div className="bg-black/60 backdrop-blur-2xl px-8 py-4 rounded-[2rem] border border-white/10 shadow-2xl pointer-events-auto">
                 <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">الـجـولـة</span>
                 <span className="text-4xl font-black text-white italic">{currentRound}</span>
              </div>
              
              <div className={`px-12 py-6 rounded-[2.5rem] border-4 transition-all duration-500 flex flex-col items-center min-w-[280px] shadow-2xl pointer-events-auto ${phase === 'MUSIC_ON' ? 'bg-red-600 border-white scale-110 shadow-[0_0_50px_rgba(255,0,0,0.4)]' : 'bg-black/80 border-red-600 shadow-none'}`}>
                 <span className="text-xs font-black uppercase tracking-widest mb-1 opacity-70">{phase === 'MUSIC_ON' ? 'تـحـرك الآن!' : 'تـوقـف واحـجـز!'}</span>
                 <div className="text-6xl font-black font-mono italic tabular-nums leading-none">{timer}s</div>
              </div>

              <button onClick={onHome} className="bg-black/60 p-5 rounded-[2rem] border border-white/10 text-red-500 hover:bg-red-600/10 transition-all pointer-events-auto shadow-xl"><LogOut size={28} /></button>
           </div>

           {/* --- THE ARENA --- */}
           <div className="relative w-[800px] h-[800px] flex items-center justify-center">
              
              <div 
                className={`absolute w-[400px] h-[400px] border-[10px] bg-black/40 backdrop-blur-sm transition-all duration-1000 ${getArenaShapeClass(config.selectedMap.shape)}`}
                style={{ 
                  borderColor: '#ff0000',
                  boxShadow: `0 0 100px rgba(255, 0, 0, 0.4), inset 0 0 50px rgba(255, 0, 0, 0.3)`
                }}
              >
                 <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <img src="https://i.ibb.co/pvCN1NQP/95505180312.png" alt="Center Logo" className="w-48 h-48 object-contain" />
                 </div>
              </div>

              {/* CHAIRS (Static in the middle) */}
              <div className="absolute inset-0 z-10 pointer-events-none">
                 {chairs.map((chair, i) => {
                    // Coordinates for a fixed circle inside the arena
                    const angle = (i / chairs.length) * 2 * Math.PI;
                    const radius = 160;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    const isOccupied = !!chair.occupiedBy;

                    return (
                       <div key={chair.id} className={`absolute w-16 h-16 rounded-2xl transition-all duration-500 flex items-center justify-center shadow-2xl border-2 -translate-x-1/2 -translate-y-1/2 ${isOccupied ? 'bg-green-600 border-white scale-125 z-40 shadow-[0_0_20px_green]' : 'bg-black/80 border-red-600/40 backdrop-blur-md z-30'}`} style={{ top: `calc(50% + ${y}px)`, left: `calc(50% + ${x}px)`, transform: `translate(-50%, -50%) rotate(${i * (360/chairs.length)}deg)` }}>
                          <Armchair size={28} className={isOccupied ? 'text-white' : 'text-red-600 opacity-30'} />
                          <div className={`absolute -top-4 bg-black border-2 px-2 py-0.5 rounded-lg text-sm font-black italic shadow-xl z-50 transition-colors ${isOccupied ? 'border-green-400 text-green-400' : 'border-red-600 text-red-600'}`}>
                             {chair.id}
                          </div>
                          {isOccupied && (
                            <div className="absolute -bottom-14 whitespace-nowrap bg-white text-black px-4 py-1.5 rounded-full text-[11px] font-black italic shadow-2xl border-2 border-green-600 animate-in zoom-in duration-300">
                               {chair.occupiedBy}
                            </div>
                          )}
                       </div>
                    )
                 })}
              </div>

              {/* PLAYERS (The actual movement happens here) */}
              <div className="absolute inset-0 z-20">
                 {participants.map((p, i) => {
                    const sizes = getDynamicSize(participants.length);
                    const isSeated = chairs.some(c => c.occupiedBy === p.username);
                    
                    // Logic to calculate orbital position + bobbing walk
                    const radius = 320;
                    const orbit = getPlayerOrbitPos(i, participants.length, radius);
                    
                    // Walking animation: sin wave bobbing
                    const bob = phase === 'MUSIC_ON' ? Math.sin(walkingOffset * 15 + i) * 12 : 0;
                    const tilt = phase === 'MUSIC_ON' ? Math.cos(walkingOffset * 10 + i) * 8 : 0;
                    
                    // Don't render survivors who are seated during the "Music Off" countdown
                    if (phase === 'MUSIC_OFF' && isSeated) return null; 

                    return (
                       <div 
                          key={p.id} 
                          className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 group ${phase === 'MUSIC_ON' ? 'z-30' : 'z-50 scale-110'}`} 
                          style={{ 
                            top: `calc(50% + ${orbit.y}px + ${bob}px)`, 
                            left: `calc(50% + ${orbit.x}px)`,
                            // Disable transitions when music is ON to allow frame-perfect movement
                            transition: phase === 'MUSIC_ON' ? 'none' : 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            transform: `translate(-50%, -50%) rotate(${tilt}deg)`
                          }}
                        >
                          <div className={`
                             ${sizes.box} rounded-[1.8rem] border-2 p-1 bg-black shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden relative border-white/20 group-hover:border-red-600
                             ${phase === 'MUSIC_ON' ? 'shadow-[0_0_20px_rgba(255,0,0,0.2)]' : ''}
                          `}>
                             {p.avatar ? (
                                <img src={p.avatar} className="w-full h-full object-cover rounded-[1.5rem]" />
                             ) : (
                                <div className="w-full h-full bg-zinc-900 rounded-[1.5rem] flex items-center justify-center text-gray-500"><User size={sizes.icon} /></div>
                             )}
                          </div>
                          <span className={`
                             ${sizes.text} font-black text-white/50 drop-shadow-lg transition-all group-hover:text-white group-hover:scale-110
                          `}>
                             {p.username}
                          </span>
                       </div>
                    )
                 })}
              </div>
           </div>

           {/* RESULTS OVERLAY */}
           {phase === 'RESULTS' && (
              <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-3xl animate-in zoom-in duration-500 p-4">
                 <div className="text-center max-w-4xl w-full flex flex-col items-center">
                    <div className="p-8 bg-red-600/10 rounded-full border-4 border-red-600 mb-8 animate-pulse shadow-[0_0_50px_rgba(220,38,38,0.4)]">
                       <Skull size={100} className="text-red-600" />
                    </div>
                    <h2 className="text-8xl font-black text-white italic uppercase tracking-tighter mb-4">تم الإقصاء!</h2>
                    <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 w-full mb-8 shadow-2xl relative overflow-hidden">
                       <div className="max-h-[35vh] overflow-y-auto custom-scrollbar flex flex-wrap justify-center gap-6 px-4">
                          {lastEliminated.map(p => (
                             <div key={p.id} className="flex flex-col items-center gap-2 grayscale brightness-50 opacity-40 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="w-24 h-24 rounded-[2.5rem] bg-zinc-900 border-2 border-red-600 overflow-hidden shadow-lg">
                                   {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : <User size={32} className="text-white/20 mt-6 mx-auto" />}
                                </div>
                                <span className="text-[12px] font-black text-red-600 uppercase tracking-widest">{p.username}</span>
                             </div>
                          ))}
                          {lastEliminated.length === 0 && <span className="text-gray-500 font-black text-4xl italic opacity-20 py-10">لم يتم استبعاد أحد!</span>}
                       </div>
                    </div>
                    <button onClick={startMusic} className="px-20 py-8 bg-red-600 text-white font-black text-4xl rounded-[3rem] hover:scale-110 active:scale-95 transition-all shadow-[0_20px_80px_rgba(255,0,0,0.5)] italic border-t-2 border-white/20 uppercase">الجولة التالية</button>
                 </div>
              </div>
           )}
        </div>
      )}

      {/* --- PHASE: FINALE --- */}
      {phase === 'FINALE' && winner && (
        <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in zoom-in duration-1000 bg-black relative">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600/20 via-transparent to-transparent opacity-60"></div>
           
           <div className="relative z-10 text-center w-full max-w-5xl">
              <Trophy size={180} className="text-[#FFD700] mx-auto drop-shadow-[0_0_80px_rgba(255,215,0,0.6)] animate-bounce mb-8" />
              <div className="text-red-600 font-black text-4xl uppercase tracking-[0.8em] mb-10 italic">WINNER SURVIVOR</div>
              
              <div className="relative inline-block mb-16 group">
                 <div className="absolute inset-0 bg-white/20 blur-[120px] rounded-full scale-[1.8] animate-pulse"></div>
                 <div className="w-72 h-72 rounded-[5rem] border-[12px] border-white bg-zinc-900/80 backdrop-blur-xl overflow-hidden shadow-2xl relative transform hover:rotate-6 transition-all duration-700">
                    {winner.avatar ? <img src={winner.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-zinc-800"><User size={100} className="text-white/20" /></div>}
                    <div className="absolute bottom-0 w-full bg-red-600 text-white font-black py-4 text-xl tracking-[0.3em] italic">C H A M P I O N</div>
                 </div>
              </div>

              <h1 className="text-[100px] font-black text-white italic tracking-tighter mb-16 uppercase leading-none drop-shadow-[0_25px_60px_rgba(0,0,0,1)]">{winner.username}</h1>
              
              <div className="flex gap-10 justify-center">
                 <button onClick={resetGame} className="px-16 py-6 bg-white text-black font-black text-xl rounded-[2rem] hover:scale-110 transition-all shadow-2xl italic">إعادة اللعبة</button>
                 <button onClick={onHome} className="px-16 py-6 bg-white/5 border-2 border-white/20 text-white font-black text-xl rounded-[2rem] hover:bg-white/10 transition-all italic backdrop-blur-xl">الرئيسية</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
