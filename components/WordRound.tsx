import React, { useState, useEffect, useRef } from 'react';
import { Settings, Play, Users, Trophy, Clock, Volume2, ChevronLeft, User, Trash2, Sparkles, CheckCircle2, Loader2, Gauge, Zap, Star, LogOut, Home, Send, BookOpen, Target, Brain, Award, EyeOff, Monitor, Activity, Flame } from 'lucide-react';
import { ChatUser } from '../types';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';

interface WordRoundProps {
    onHome: () => void;
    isOBS?: boolean;
}

interface GameConfig {
    joinKeyword: string;
    maxPlayers: number;
    roundDuration: number;
    autoProgress: boolean;
    minWordLength: number;
    pointsPerLetter: number;
}

type GamePhase = 'SETUP' | 'LOBBY' | 'PRE_ROUND' | 'PLAYING' | 'RESULTS' | 'FINALE';

interface PlayerScore {
    user: ChatUser;
    score: number;
    words: string[];
}

const ARABIC_LETTERS = 'أبتثجحخدذرزسشصضطظعغفقكلمنهوي';

export const WordRound: React.FC<WordRoundProps> = ({ onHome, isOBS }) => {
    const [config, setConfig] = useState<GameConfig>({
        joinKeyword: 'دخول',
        maxPlayers: 100,
        roundDuration: 60,
        autoProgress: false,
        minWordLength: 3,
        pointsPerLetter: 10
    });

    const [phase, setPhase] = useState<GamePhase>('SETUP');
    const [participants, setParticipants] = useState<ChatUser[]>([]);
    const [scores, setScores] = useState<Record<string, PlayerScore>>({});
    const [timer, setTimer] = useState(0);
    const [currentLetters, setCurrentLetters] = useState<{ central: string, outer: string[] }>({ central: '', outer: [] });
    const [round, setRound] = useState(1);
    const [totalRounds] = useState(5);

    // Stats for OBS
    const [latestWords, setLatestWords] = useState<{ word: string, user: string, points: number }[]>([]);
    const [topWord, setTopWord] = useState<{ word: string, user: string, points: number } | null>(null);

    const phaseRef = useRef(phase);
    const configRef = useRef(config);
    const participantsRef = useRef(participants);
    const scoresRef = useRef(scores);
    const lettersRef = useRef(currentLetters);

    useEffect(() => {
        phaseRef.current = phase;
        configRef.current = config;
        participantsRef.current = participants;
        scoresRef.current = scores;
        lettersRef.current = currentLetters;
    }, [phase, config, participants, scores, currentLetters]);

    const generateLetters = () => {
        const letters = ARABIC_LETTERS.split('');
        const shuffled = letters.sort(() => Math.random() - 0.5);
        const central = shuffled[0];
        const outer = shuffled.slice(1, 7); // 6 outer letters
        setCurrentLetters({ central, outer });
    };

    const isValidWord = (word: string): boolean => {
        // Basic validation: length & central letter
        if (word.length < configRef.current.minWordLength) return false;
        if (!word.includes(lettersRef.current.central)) return false;

        // Check if all characters are in the allowed set
        const allAllowed = [lettersRef.current.central, ...lettersRef.current.outer];
        for (const char of word) {
            if (!allAllowed.includes(char)) return false;
        }
        return true;
    };

    useEffect(() => {
        const unsubscribe = chatService.onMessage((msg) => {
            const content = msg.content.trim();
            const username = msg.user.username;

            if (phaseRef.current === 'LOBBY') {
                if (content.toLowerCase() === configRef.current.joinKeyword.toLowerCase() || content === 'دخول') {
                    setParticipants(prev => {
                        if (prev.length >= configRef.current.maxPlayers) return prev;
                        if (prev.some(p => p.username === username)) return prev;

                        chatService.fetchKickAvatar(username).then(avatar => {
                            if (avatar) {
                                setParticipants(current => current.map(p =>
                                    p.username === username ? { ...p, avatar } : p
                                ));
                            }
                        });

                        return [...prev, msg.user];
                    });
                }
            }

            if (phaseRef.current === 'PLAYING') {
                if (!participantsRef.current.some(p => p.username === username)) return;

                if (isValidWord(content)) {
                    setScores(prev => {
                        const current = prev[username] || { user: msg.user, score: 0, words: [] };
                        if (current.words.includes(content)) return prev;

                        const points = content.length * configRef.current.pointsPerLetter;

                        // Update OBS Stats
                        setLatestWords(l => [{ word: content, user: username, points }, ...l].slice(0, 8));
                        setTopWord(curr => {
                            if (!curr || content.length > curr.word.length || (content.length === curr.word.length && points > curr.points)) {
                                return { word: content, user: username, points };
                            }
                            return curr;
                        });

                        return {
                            ...prev,
                            [username]: {
                                ...current,
                                score: current.score + points,
                                words: [...current.words, content]
                            }
                        };
                    });
                }
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Allow 'Space' to toggle phase if in PRE_ROUND (Hot key for streamer)
            if (phase === 'PRE_ROUND' && e.code === 'Space') {
                startRound();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [phase]);

    useEffect(() => {
        let interval: number;
        if (phase === 'PLAYING' && timer > 0) {
            interval = window.setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
        } else if (phase === 'PLAYING' && timer === 0) {
            endRound();
        }
        return () => clearInterval(interval);
    }, [phase, timer]);

    const startLobby = () => setPhase('LOBBY');

    const goToPreRound = () => {
        generateLetters();
        setPhase('PRE_ROUND');
    };

    const startRound = () => {
        setTimer(config.roundDuration);
        setLatestWords([]);
        setTopWord(null);
        setPhase('PLAYING');
    };

    const endRound = () => {
        if (round >= totalRounds) {
            setPhase('FINALE');
            const sortedResults = Object.values(scoresRef.current).sort((a, b) => b.score - a.score);
            if (sortedResults.length > 0) {
                leaderboardService.recordWin(sortedResults[0].user.username, sortedResults[0].user.avatar || '', sortedResults[0].score);
            }
        } else {
            setPhase('RESULTS');
            if (config.autoProgress) {
                setTimeout(() => {
                    setRound(r => r + 1);
                    goToPreRound();
                }, 5000);
            }
        }
    };

    const resetGame = () => {
        setPhase('SETUP');
        setParticipants([]);
        setScores({});
        setRound(1);
        setLatestWords([]);
        setTopWord(null);
    };

    const copyOBSLink = () => {
        const url = `${window.location.origin}/?obs=true&view=WORD_ROUND&transparent=true`;
        navigator.clipboard.writeText(url);
        alert('تم نسخ رابط OBS بنجاح! قم بإضافته كمصدر متصفح في OBS.');
    };

    // --- OBS SPECIFIC VIEW ---
    if (isOBS) {
        return (
            <div className="w-full h-full flex flex-col items-center bg-transparent text-right font-display select-none overflow-hidden p-6" dir="rtl">
                {/* OBS Dynamic Background - slightly transparent for overlay usage */}
                <div className="absolute inset-0 bg-black/80 -z-10"></div>

                {/* Header: Timer & Round */}
                <div className="w-full flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <div className="glass-card px-8 py-3 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center gap-4">
                            <Clock size={32} className="text-white" />
                            <span className={`text-4xl font-black font-mono ${timer < 10 && phase === 'PLAYING' ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                                {phase === 'PRE_ROUND' ? 'استعد...' : phase === 'PLAYING' ? `${timer}s` : '0s'}
                            </span>
                        </div>
                        <div className="glass-card px-6 py-3 rounded-full bg-white/5 border border-white/10">
                            <span className="text-xl font-black text-gray-300">الجولة {round} / {totalRounds}</span>
                        </div>
                    </div>

                    {/* Top Word Display */}
                    {topWord && (
                        <div className="glass-card px-6 py-2 rounded-2xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 flex items-center gap-4 animate-in slide-in-from-top">
                            <Trophy size={24} className="text-yellow-500" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-yellow-200 uppercase">أقـوى كـلـمة</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-white">{topWord.word}</span>
                                    <span className="text-xs font-bold text-gray-400">({topWord.user})</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 w-full grid grid-cols-12 gap-8">
                    {/* LEFT: Live Words Feed */}
                    <div className="col-span-3 flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-white/50 mb-2">
                            <Activity size={18} />
                            <span className="text-sm font-bold">كلمات مباشرة</span>
                        </div>
                        <div className="space-y-3 mask-linear-gradient-bottom min-h-[400px]">
                            {latestWords.map((w, i) => (
                                <div key={`${w.word}-${i}`} className="glass-card bg-white/5 border border-white/10 p-3 rounded-xl flex items-center justify-between animate-in slide-in-from-right fade-in duration-300">
                                    <span className="text-xl font-black text-purple-400">{w.word}</span>
                                    <span className="text-[10px] font-bold text-gray-500 truncate max-w-[80px]">{w.user}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CENTER: Game Board */}
                    <div className="col-span-6 flex flex-col items-center justify-center relative">
                        {phase === 'PLAYING' ? (
                            <div className="relative scale-125 transform-gpu">
                                <div className="absolute inset-0 bg-purple-500/20 blur-[60px] rounded-full animate-pulse"></div>
                                {/* Letters */}
                                <div className="relative w-[400px] h-[400px] flex items-center justify-center">
                                    <div className="absolute z-20 w-32 h-32 bg-purple-600 rounded-3xl flex items-center justify-center border-4 border-white shadow-2xl">
                                        <span className="text-7xl font-black text-white">{currentLetters.central}</span>
                                    </div>
                                    {currentLetters.outer.map((letter, i) => {
                                        const angle = (i * 60) * (Math.PI / 180);
                                        const radius = 150;
                                        const x = Math.cos(angle) * radius;
                                        const y = Math.sin(angle) * radius;
                                        return (
                                            <div key={i} className="absolute w-20 h-20 bg-zinc-800 rounded-2xl border-2 border-white/20 flex items-center justify-center text-4xl font-black text-white shadow-lg"
                                                style={{ transform: `translate(${x}px, ${y}px)` }}>
                                                {letter}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-12 text-center bg-black/50 px-6 py-2 rounded-full border border-white/10 backdrop-blur-md">
                                    <span className="text-gray-300 font-bold">يجب استخدام حرف <span className="text-purple-400 text-xl font-black px-2">{currentLetters.central}</span></span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center animate-pulse">
                                <Loader2 size={80} className="text-purple-500 animate-spin mb-6" />
                                <h2 className="text-4xl font-black text-white">
                                    {phase === 'PRE_ROUND' ? 'الجولة على وشك البدء...' : 'بانتظار الجولة القادمة'}
                                </h2>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Leaderboard */}
                    <div className="col-span-3">
                        <div className="glass-card bg-black/40 border border-white/10 rounded-[2rem] p-6 h-full">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                                <Trophy className="text-yellow-500" size={24} />
                                <span className="text-xl font-black text-white">المتصدرين</span>
                            </div>
                            <div className="space-y-4">
                                {Object.values(scores).sort((a, b) => b.score - a.score).slice(0, 5).map((s, i) => (
                                    <div key={s.user.username} className="flex items-center gap-3">
                                        <div className="text-xl font-black text-white/30 w-6">#{i + 1}</div>
                                        <div className="flex-1 bg-white/5 rounded-xl p-2 flex items-center gap-3 border border-white/5">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-800 overflow-hidden">
                                                {s.user.avatar && <img src={s.user.avatar} className="w-full h-full object-cover" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-white truncate max-w-[80px]">{s.user.username}</span>
                                                <span className="text-[10px] text-purple-400 font-black">{s.score} pts</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Winner Overlay for OBS */}
                {phase === 'FINALE' && (
                    <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center animate-in zoom-in">
                        <Award size={120} className="text-yellow-500 mb-8 animate-bounce" />
                        <h1 className="text-6xl font-black text-white mb-4">الفــائـز!</h1>
                        {Object.values(scores).sort((a, b) => b.score - a.score)[0] && (
                            <div className="text-center">
                                <div className="w-40 h-40 rounded-full border-4 border-yellow-500 mx-auto mb-6 overflow-hidden">
                                    <img src={Object.values(scores).sort((a, b) => b.score - a.score)[0].user.avatar || ''} className="w-full h-full object-cover" />
                                </div>
                                <div className="text-5xl font-black text-white">{Object.values(scores).sort((a, b) => b.score - a.score)[0].user.username}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // --- STANDARD STREAMER VIEW (Existing + New PRE_ROUND) ---
    return (
        <div className="w-full h-full relative flex flex-col items-center bg-transparent text-right font-display select-none overflow-hidden" dir="rtl">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[#050505] -z-10">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(124,58,237,0.1),transparent_70%)]"></div>
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full"></div>
            </div>

            {/* PRE-ROUND "CLOSE SCREEN" WARNING */}
            {phase === 'PRE_ROUND' && (
                <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden z-50 animate-in fade-in duration-300">
                    {/* Warning Stripes */}
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,#222_20px,#222_40px)] opacity-20 pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col items-center animate-in zoom-in duration-300">
                        <div className="w-32 h-32 bg-red-600 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-[0_0_50px_rgba(220,38,38,0.5)] animate-pulse">
                            <EyeOff size={64} className="text-white" />
                        </div>
                        <h1 className="text-6xl font-black text-white mb-4 uppercase tracking-tighter">أغـلـق الشـاشـة الآن!</h1>
                        <p className="text-2xl text-gray-400 font-bold mb-12">الرجاء إخفاء الشاشة أو تغيير المشهد في OBS</p>

                        <div className="flex gap-4">
                            <div className="glass-card px-8 py-4 bg-zinc-900 border border-white/10 rounded-2xl">
                                <span className="text-gray-500 font-bold text-sm block mb-1">الحالة في OBS</span>
                                <span className="text-green-500 font-black text-xl flex items-center gap-2"><CheckCircle2 size={18} /> انتظار الجولة...</span>
                            </div>
                            <div className="glass-card px-8 py-4 bg-zinc-900 border border-white/10 rounded-2xl">
                                <span className="text-gray-500 font-bold text-sm block mb-1">الحالة لديك</span>
                                <span className="text-red-500 font-black text-xl flex items-center gap-2"><EyeOff size={18} /> خاص - مخفي</span>
                            </div>
                        </div>

                        <button
                            onClick={startRound}
                            className="mt-16 px-16 py-6 bg-white hover:bg-gray-200 text-black font-black text-2xl rounded-full shadow-2xl transition-all hover:scale-105 flex items-center gap-3 cursor-pointer z-50"
                        >
                            <Monitor size={24} /> إظـهـار وبـدء الـجـولـة (Space)
                        </button>
                    </div>
                </div>
            )}

            {phase === 'SETUP' && (
                <div className="w-full max-w-4xl mt-12 animate-in fade-in zoom-in duration-700">
                    <div className="text-center mb-12">
                        <img src="https://i.ibb.co/pvCN1NQP/95505180312.png" className="h-32 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(124,58,237,0.5)]" alt="Logo" />
                        <h1 className="text-6xl font-black text-white italic tracking-tighter">جولة الكـلـمات</h1>
                        <p className="text-purple-500 font-black tracking-[0.4em] text-[10px] uppercase mt-2">Premium Word Challenge</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-card p-8 rounded-[3rem] border border-white/10 bg-white/5 backdrop-blur-xl space-y-8">
                            <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                <Settings className="text-purple-500" /> الإعـدادات
                            </h3>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-400 uppercase">كلمة الانضمام</label>
                                    <input
                                        value={config.joinKeyword}
                                        onChange={e => setConfig({ ...config, joinKeyword: e.target.value })}
                                        className="w-full bg-black/40 border-2 border-white/10 focus:border-purple-500 rounded-2xl p-4 text-white font-bold outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-gray-400 uppercase">مدة الجولة</label>
                                        <span className="text-2xl font-black text-purple-400 font-mono">{config.roundDuration}ث</span>
                                    </div>
                                    <input
                                        type="range" min="30" max="180" step="10"
                                        value={config.roundDuration}
                                        onChange={e => setConfig({ ...config, roundDuration: +e.target.value })}
                                        className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="glass-card p-8 rounded-[3rem] border border-white/10 bg-white/5 backdrop-blur-xl flex-1 flex flex-col justify-center items-center text-center">
                                <Brain size={64} className="text-purple-500 mb-4 animate-pulse" />
                                <h4 className="text-xl font-black text-white mb-2">كيفية اللعب</h4>
                                <p className="text-gray-400 text-sm font-bold leading-relaxed px-4">
                                    يتم عرض حرف مركزي و6 حروف إضافية. يجب تكوين كلمات تحتوي على <span className="text-purple-500">الحرف المركزي</span> فقط من الحروف المتاحة.
                                </p>

                                <button
                                    onClick={copyOBSLink}
                                    className="mt-6 px-5 py-2 bg-zinc-800 hover:bg-zinc-700 hover:border-purple-500 text-white text-xs font-bold rounded-full border border-white/10 flex items-center gap-2 transition-all group"
                                >
                                    <Monitor size={14} className="group-hover:text-purple-400" /> نسخ رابط OBS
                                </button>
                            </div>

                            <button
                                onClick={startLobby}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-8 rounded-[2.5rem] text-3xl shadow-[0_20px_50px_rgba(124,58,237,0.3)] transition-all flex items-center justify-center gap-4 group"
                            >
                                بـدء الـلـعـب <Zap className="group-hover:rotate-12 transition-transform" />
                            </button>
                        </div>
                    </div>

                    <button onClick={onHome} className="mt-8 mx-auto flex items-center gap-2 text-gray-500 hover:text-white font-bold transition-all">
                        <ChevronLeft /> العودة للرئيسية
                    </button>
                </div>
            )}

            {phase === 'LOBBY' && (
                <div className="w-full max-w-6xl mt-12 animate-in fade-in duration-700 flex flex-col items-center">
                    <div className="text-center mb-12">
                        <h1 className="text-8xl font-black text-white italic tracking-tighter mb-4 red-neon-text">انـتـظـار الـلاعبـيـن</h1>
                        <div className="flex items-center justify-center gap-4 bg-white/5 px-8 py-4 rounded-full border border-white/10 backdrop-blur-md">
                            <span className="text-2xl font-bold text-gray-300">أرسل الـكـلـمـة للانـضـمـام:</span>
                            <span className="text-4xl font-black text-purple-500 px-6 py-1 bg-purple-500/10 rounded-2xl border border-purple-500/30">{config.joinKeyword}</span>
                        </div>
                    </div>

                    <div className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 px-10 mb-20 overflow-y-auto max-h-[500px] custom-scrollbar">
                        {participants.map((p, i) => (
                            <div key={p.username} className="glass-card p-4 rounded-3xl border border-white/5 flex flex-col items-center gap-3 animate-in zoom-in" style={{ animationDelay: `${i * 50}ms` }}>
                                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-purple-500/20 bg-zinc-900 flex items-center justify-center">
                                    {p.avatar ? (
                                        <img src={p.avatar} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <User className="text-white/20" size={40} />
                                    )}
                                </div>
                                <span className="font-black text-white text-sm truncate w-full text-center">{p.username}</span>
                            </div>
                        ))}
                    </div>

                    <div className="fixed bottom-12 left-0 right-0 flex justify-center gap-8">
                        <button onClick={resetGame} className="px-10 py-5 bg-white/5 hover:bg-white/10 rounded-3xl text-gray-400 font-black border border-white/10 transition-all flex items-center gap-3">
                            <Trash2 size={24} /> إلـغـاء
                        </button>
                        <button
                            onClick={goToPreRound}
                            className="px-20 py-5 bg-purple-600 hover:bg-purple-700 rounded-3xl text-white font-black text-2xl shadow-[0_20px_40px_rgba(124,58,237,0.3)] transition-all flex items-center gap-4 cursor-pointer"
                        >
                            <Play size={28} /> ابـدأ الـجـولـة ({participants.length})
                        </button>
                    </div>
                </div>
            )}

            {phase === 'PLAYING' && (
                <div className="w-full h-full flex flex-col items-center justify-center relative p-10 animate-in fade-in duration-1000">
                    {/* Timer & Stats Overlay */}
                    <div className="absolute top-10 left-10 right-10 flex justify-between items-start">
                        <div className="flex flex-col gap-4">
                            <div className="glass-card px-8 py-4 rounded-3xl border border-white/10 flex items-center gap-6 bg-black/40 backdrop-blur-xl">
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest">الوقت المتبقي</div>
                                    <div className={`text-5xl font-black font-mono ${timer < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timer}s</div>
                                </div>
                                <Clock size={40} className={timer < 10 ? 'text-red-500' : 'text-white/20'} />
                            </div>
                            <div className="glass-card px-8 py-4 rounded-3xl border border-white/10 flex items-center gap-6 bg-black/40 backdrop-blur-xl">
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">الـجـولـة</div>
                                    <div className="text-4xl font-black text-white">{round} / {totalRounds}</div>
                                </div>
                                <Target size={32} className="text-white/20" />
                            </div>
                        </div>

                        <div className="glass-card w-80 rounded-[2.5rem] border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden shadow-2xl">
                            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h3 className="font-black text-white flex items-center gap-2 italic"><Trophy className="text-yellow-500" size={18} /> الـمتصـدرين</h3>
                                <Users size={16} className="text-gray-500" />
                            </div>
                            <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {Object.values(scores).sort((a, b) => b.score - a.score).slice(0, 5).map((s, i) => (
                                    <div key={s.user.username} className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5 group">
                                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-purple-500/30 bg-zinc-900 flex items-center justify-center">
                                            {s.user.avatar ? (
                                                <img src={s.user.avatar} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <User className="text-white/20" size={20} />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-black text-white truncate">{s.user.username}</div>
                                            <div className="text-xs text-purple-500 font-bold">{s.score} نقطة</div>
                                        </div>
                                        <div className="text-2xl font-black text-white/20">#{i + 1}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Central Game Area */}
                    <div className="flex flex-col items-center gap-12 mt-20">
                        <h2 className="text-7xl font-black text-white italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                            كـوّن مـنـهـم كـلـمـة!
                        </h2>

                        <div className="relative w-[500px] h-[500px] flex items-center justify-center">
                            {/* Outer Rings */}
                            <div className="absolute inset-0 border-8 border-purple-900/10 rounded-full animate-rotate-slow"></div>
                            <div className="absolute inset-12 border-4 border-purple-500/5 rounded-full animate-rotate-reverse"></div>

                            {/* Central Hexagon */}
                            <div className="relative z-10 w-44 h-44 bg-purple-600 rounded-[2.5rem] flex items-center justify-center border-4 border-white transform hover:rotate-6 transition-transform shadow-[0_0_80px_rgba(124,58,237,0.6)] group">
                                <span className="text-9xl font-black text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform">{currentLetters.central}</span>
                            </div>

                            {/* Outer Letters */}
                            {currentLetters.outer.map((letter, i) => {
                                const angle = (i * 60) * (Math.PI / 180);
                                const radius = 200;
                                const x = Math.cos(angle) * radius;
                                const y = Math.sin(angle) * radius;
                                return (
                                    <div
                                        key={i}
                                        className="absolute w-24 h-24 bg-zinc-900/80 backdrop-blur-md rounded-3xl border-2 border-white/10 flex items-center justify-center text-5xl font-black text-white shadow-2xl hover:scale-110 transition-transform hover:border-purple-500/50"
                                        style={{
                                            transform: `translate(${x}px, ${y}px)`,
                                            animation: `bounce-slow ${3 + i * 0.2}s ease-in-out infinite`
                                        }}
                                    >
                                        {letter}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="text-center space-y-4">
                            <p className="text-2xl font-black text-gray-400">يجب أن تحتوي الكلمة على الحرف <span className="text-purple-500 text-4xl mx-2 underline">{currentLetters.central}</span></p>
                            <div className="flex gap-4 items-center justify-center">
                                {currentLetters.outer.map(l => (
                                    <span key={l} className="text-3xl font-black text-white/40">{l}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recently Found Words */}
                    <div className="absolute bottom-10 left-10 overflow-hidden h-32 w-64 pointer-events-none">
                        <div className="flex flex-col-reverse gap-2 mask-linear-gradient">
                            {latestWords.slice(0, 5).map((item, i) => (
                                <div key={i} className="bg-white/5 px-4 py-2 rounded-xl border border-white/5 animate-in slide-in-from-left duration-300">
                                    <span className="text-purple-500 font-black text-lg">{item.word}</span>
                                    <span className="text-gray-500 text-xs mr-3 font-bold">{item.user}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {phase === 'RESULTS' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in zoom-in duration-500">
                    <div className="text-center mb-16">
                        <Star size={80} className="text-yellow-500 mx-auto mb-6 animate-spin-slow" />
                        <h1 className="text-7xl font-black text-white italic tracking-tighter mb-4">نـتائـج الـجولـة {round}</h1>
                        <p className="text-gray-500 font-black tracking-widest uppercase">الاستعداد للجولة القادمة...</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
                        {Object.values(scores).sort((a, b) => b.score - a.score).slice(0, 3).map((s, i) => (
                            <div key={s.user.username} className={`glass-card p-10 rounded-[3rem] border-2 flex flex-col items-center gap-6 relative transition-all hover:scale-105 ${i === 0 ? 'border-yellow-500/50 bg-yellow-500/5 shadow-[0_0_80px_rgba(234,179,8,0.1)]' : 'border-white/10 bg-white/5'}`}>
                                <div className="absolute -top-6 bg-black border-2 border-inherit px-6 py-1 rounded-full text-white font-black text-xl">
                                    {i === 0 ? 'المتصدر' : `#${i + 1}`}
                                </div>
                                <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-inherit bg-zinc-900 flex items-center justify-center">
                                    {s.user.avatar ? (
                                        <img src={s.user.avatar} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <User className="text-white/20" size={64} />
                                    )}
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-black text-white mb-2">{s.user.username}</div>
                                    <div className="text-5xl font-black text-purple-500">{s.score}</div>
                                    <div className="text-sm font-bold text-gray-500 mt-2 uppercase">{s.words.length} كـلمة صـحيحة</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {!config.autoProgress && (
                        <button
                            onClick={() => { setRound(r => r + 1); goToPreRound(); }}
                            className="mt-20 px-20 py-6 bg-white text-black font-black rounded-3xl text-3xl hover:scale-105 transition-all"
                        >
                            الـجولـة الـتـالـيـة
                        </button>
                    )}
                </div>
            )}

            {phase === 'FINALE' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in fade-in duration-1000">
                    <div className="mb-12 relative">
                        <div className="absolute inset-0 bg-yellow-500 blur-[150px] opacity-20 rounded-full animate-pulse"></div>
                        <Award size={150} className="text-yellow-500 animate-bounce relative z-10" />
                    </div>

                    <h1 className="text-9xl font-black text-white italic tracking-tighter mb-4 drop-shadow-[0_20px_60px_rgba(255,255,255,0.2)]">بـطـل الجـولة</h1>

                    {Object.values(scores).sort((a, b) => b.score - a.score)[0] && (
                        <div className="flex flex-col items-center gap-8 mb-20 animate-in zoom-in duration-700 delay-300">
                            <div className="w-64 h-64 rounded-[4rem] overflow-hidden border-8 border-yellow-500 shadow-[0_0_100px_rgba(234,179,8,0.4)] relative bg-zinc-900 flex items-center justify-center">
                                {Object.values(scores).sort((a, b) => b.score - a.score)[0].user.avatar ? (
                                    <img src={Object.values(scores).sort((a, b) => b.score - a.score)[0].user.avatar} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <User className="text-white/20" size={120} />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                            </div>
                            <div className="text-center">
                                <div className="text-7xl font-black text-white mb-4 italic">{Object.values(scores).sort((a, b) => b.score - a.score)[0].user.username}</div>
                                <div className="text-4xl px-12 py-3 bg-yellow-500 text-black font-black rounded-full shadow-2xl">
                                    {Object.values(scores).sort((a, b) => b.score - a.score)[0].score} نـقـطة
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-6">
                        <button onClick={onHome} className="px-12 py-5 bg-white/5 hover:bg-white/10 text-white font-black rounded-3xl border border-white/10 transition-all text-2xl">
                            الـرئـيـسـيـة
                        </button>
                        <button onClick={resetGame} className="px-20 py-5 bg-yellow-500 hover:bg-yellow-600 text-black font-black rounded-3xl transition-all text-2xl shadow-xl">
                            لـعـب مـجـدداً
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
