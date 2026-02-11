import React, { useState, useEffect, useRef } from 'react';
import { Settings, Play, Users, Trophy, Clock, Volume2, ChevronLeft, User, Trash2, Sparkles, CheckCircle2, Loader2, Gauge, Zap, Star, LogOut, Home, AlertTriangle, ShieldOff, Brain, Target, MessageSquare, EyeOff, Monitor, BarChart3, Cloud, Hash, Flame, Copy } from 'lucide-react';
import { ChatUser } from '../types';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';

interface ForbiddenWordsProps {
    onHome: () => void;
    isOBS?: boolean;
}

interface GameConfig {
    joinKeyword: string;
    maxPlayers: number;
    roundDuration: number;
    autoProgress: boolean;
    totalRounds: number;
}

type GamePhase = 'SETUP' | 'LOBBY' | 'PRE_ROUND' | 'SELECT_WORD' | 'PLAYING' | 'REVEAL' | 'FINALE';

interface ForbiddenChallenge {
    target: string;
    forbidden: string[];
    image?: string;
}

interface GuessStat {
    word: string;
    count: number;
    lastUser: string;
}

const CHALLENGES: ForbiddenChallenge[] = [
    { target: 'مطر', forbidden: ['غيمة', 'شتاء', 'مياه', 'سحاب'], image: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?q=80&w=1000' },
    { target: 'كرة قدم', forbidden: ['لاعب', 'هدف', 'ملعب', 'رياضة'], image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000' },
    { target: 'قهوة', forbidden: ['كوب', 'بن', 'ساخن', 'صباح'], image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1000' },
    { target: 'بحر', forbidden: ['سمك', 'موج', 'شاطئ', 'رمل'], image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000' },
    { target: 'سيارة', forbidden: ['بنزين', 'طريق', 'عجلات', 'سائق'] },
    { target: 'خبز', forbidden: ['دقيق', 'فرن', 'طعام', 'فطور'] },
    { target: 'طائرة', forbidden: ['مطار', 'سياحة', 'سماء', 'جواز'] },
    { target: 'أسد', forbidden: ['حيوان', 'غابة', 'ملك', 'مفترس'] },
    { target: 'مدرسة', forbidden: ['طالب', 'معلم', 'تعلم', 'حقيبة'] },
    { target: 'هاتف', forbidden: ['اتصال', 'رقم', 'شاشة', 'تطبيقات'] },
    { target: 'شمس', forbidden: ['حرارة', 'نور', 'نهار', 'كواكب'] },
    { target: 'كتاب', forbidden: ['قراءة', 'مكتبة', 'نص', 'مؤلف'] },
    { target: 'سرير', forbidden: ['نوم', 'غرفة', 'راحة', 'وسادة'] },
    { target: 'كرسي', forbidden: ['جلوس', 'خشب', 'طاولة', 'أثاث'] },
    { target: 'طبيب', forbidden: ['مستشفى', 'مرض', 'علاج', 'سماعة'] },
    { target: 'ثلج', forbidden: ['بارد', 'تجمد', 'أبيض', 'شتاء'] },
    { target: 'قلب', forbidden: ['حب', 'دم', 'نبض', 'جسم'] },
    { target: 'قلم', forbidden: ['كتابة', 'ورقة', 'حبر', 'أدوات'] },
    { target: 'قمر', forbidden: ['ليل', 'فضاء', 'نجوم', 'بدأ'] },
    { target: 'شجرة', forbidden: ['غصن', 'أوراق', 'طبيعة', 'غابة'] },
];

const levenshtein = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
};

export const ForbiddenWords: React.FC<ForbiddenWordsProps> = ({ onHome, isOBS }) => {
    const [config, setConfig] = useState<GameConfig>({
        joinKeyword: 'تحدي',
        maxPlayers: 100,
        roundDuration: 60,
        autoProgress: false,
        totalRounds: 10
    });

    const [phase, setPhase] = useState<GamePhase>('SETUP');
    const [participants, setParticipants] = useState<ChatUser[]>([]);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [timer, setTimer] = useState(0);
    const [currentRound, setCurrentRound] = useState(1);
    const [currentChallenge, setCurrentChallenge] = useState<ForbiddenChallenge | null>(null);
    const [roundWinner, setRoundWinner] = useState<ChatUser | null>(null);

    // Stats
    const [guessStats, setGuessStats] = useState<GuessStat[]>([]);
    const [closestGuess, setClosestGuess] = useState<{ user: string, word: string, distance: number } | null>(null);

    const phaseRef = useRef(phase);
    const configRef = useRef(config);
    const currentChallengeRef = useRef(currentChallenge);
    const participantsRef = useRef(participants);

    useEffect(() => {
        phaseRef.current = phase;
        configRef.current = config;
        currentChallengeRef.current = currentChallenge;
        participantsRef.current = participants;
    }, [phase, config, currentChallenge, participants]);

    const [suggestedChallenges, setSuggestedChallenges] = useState<ForbiddenChallenge[]>([]);

    const prepareNextChallenge = () => {
        const shuffled = [...CHALLENGES].sort(() => Math.random() - 0.5).slice(0, 3);
        setSuggestedChallenges(shuffled);
        setPhase('PRE_ROUND'); // Go to warning screen first
    };

    const confirmSafeToSelect = () => {
        setPhase('SELECT_WORD');
    };

    const selectChallenge = (challenge: ForbiddenChallenge) => {
        setCurrentChallenge(challenge);
        setRoundWinner(null);
        setTimer(config.roundDuration);
        setGuessStats([]);
        setClosestGuess(null);
        setPhase('PLAYING');
    };

    const nextChallenge = () => {
        if (currentRound >= config.totalRounds) {
            setPhase('FINALE');
        } else {
            setCurrentRound(r => r + 1);
            prepareNextChallenge();
        }
    };

    useEffect(() => {
        const unsubscribe = chatService.onMessage((msg) => {
            const content = msg.content.trim().toLowerCase();
            const username = msg.user.username;

            if (phaseRef.current === 'LOBBY') {
                if (content === configRef.current.joinKeyword.toLowerCase()) {
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

            if (phaseRef.current === 'PLAYING' && currentChallengeRef.current) {
                if (!participantsRef.current.some(p => p.username === username)) return;

                const challenge = currentChallengeRef.current;

                // Track stats
                setGuessStats(prev => {
                    const existing = prev.find(g => g.word === content);
                    if (existing) {
                        return prev.map(g => g.word === content ? { ...g, count: g.count + 1, lastUser: username } : g).sort((a, b) => b.count - a.count);
                    }
                    return [...prev, { word: content, count: 1, lastUser: username }].sort((a, b) => b.count - a.count).slice(0, 20);
                });

                // Calculate distance
                const dist = levenshtein(content, challenge.target);
                setClosestGuess(prev => {
                    if (!prev || dist < prev.distance) {
                        return { user: username, word: content, distance: dist };
                    }
                    return prev;
                });

                // Check Forbidden
                if (challenge.forbidden.some(f => content.includes(f))) {
                    console.log(`Forbidden word used by ${username}!`);
                    return;
                }

                // Check Win
                if (content === challenge.target) {
                    handleWin(msg.user);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const handleWin = (user: ChatUser) => {
        setRoundWinner(user);
        setScores(prev => ({ ...prev, [user.username]: (prev[user.username] || 0) + 1 }));
        setPhase('REVEAL');

        setTimeout(() => {
            if (currentRound >= config.totalRounds) {
                setPhase('FINALE');
                leaderboardService.recordWin(user.username, user.avatar || '', 250);
            } else {
                setCurrentRound(r => r + 1);
                prepareNextChallenge(); // Go to Pre-Round again
            }
        }, 5000);
    };

    useEffect(() => {
        let interval: number;
        if (phase === 'PLAYING' && timer > 0) {
            interval = window.setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
        } else if (phase === 'PLAYING' && timer === 0) {
            setPhase('REVEAL');
            setTimeout(() => {
                if (currentRound >= config.totalRounds) {
                    setPhase('FINALE');
                } else {
                    setCurrentRound(r => r + 1);
                    prepareNextChallenge();
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [phase, timer]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (phase === 'PRE_ROUND' && e.code === 'Space') {
                confirmSafeToSelect();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [phase]);

    const startLobby = () => setPhase('LOBBY');
    const startRound = () => {
        setCurrentRound(1);
        setScores({});
        prepareNextChallenge();
    };
    const resetGame = () => {
        setPhase('SETUP');
        setParticipants([]);
        setScores({});
        setCurrentRound(1);
    };

    const copyOBSLink = () => {
        const url = `${window.location.origin}/?obs=true&view=FORBIDDEN_WORDS&transparent=true`;
        navigator.clipboard.writeText(url);
        alert('تم نسخ رابط OBS بنجاح!');
    };

    // --- OBS VIEW ---
    if (isOBS) {
        return (
            <div className="w-[1920px] h-[1080px] flex flex-col p-8 bg-transparent text-right font-display select-none overflow-hidden" dir="rtl">
                <div className="absolute inset-0 bg-black/80 -z-10"></div>

                {/* Header - Always visible */}
                <div className="flex justify-between items-center mb-6 pl-4 pr-4">
                    <div className="flex items-center gap-6">
                        <div className="glass-card px-8 py-3 rounded-full bg-amber-900/50 border border-amber-500/30 flex items-center gap-4 shadow-lg">
                            <Clock size={36} className="text-white" />
                            <span className={`text-5xl font-black font-mono ${timer < 10 && phase === 'PLAYING' ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                                {phase === 'PLAYING' ? `${timer}s` : '--'}
                            </span>
                        </div>
                        <div className="glass-card px-6 py-3 rounded-full bg-white/5 border border-white/10">
                            <span className="text-2xl font-black text-gray-300">الجولة {currentRound} / {config.totalRounds}</span>
                        </div>
                    </div>

                    <div className="glass-card px-8 py-3 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                        <Users size={28} className="text-amber-500" />
                        <span className="text-white font-black text-3xl">{participants.length}</span>
                    </div>
                </div>

                {/* WAITING PHASES (SETUP, LOBBY) */}
                {(phase === 'SETUP' || phase === 'LOBBY') && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in duration-500">
                        {phase === 'SETUP' ? (
                            <>
                                <Loader2 size={100} className="text-amber-500 animate-spin mb-8" />
                                <h1 className="text-8xl font-black text-white italic tracking-tighter mb-4">بانتظار البث...</h1>
                                <p className="text-3xl text-gray-400 font-bold">المذيع يقوم بإعداد اللعبة</p>
                            </>
                        ) : (
                            <>
                                <h1 className="text-7xl font-black text-white italic tracking-tighter mb-6">قائمة الانتظار</h1>
                                <div className="flex items-center gap-4 px-12 py-4 bg-amber-500/10 rounded-full border border-amber-500/30 mb-12">
                                    <span className="text-2xl font-bold text-gray-300">أرسل الكلمة للانضمام:</span>
                                    <span className="text-6xl font-black text-amber-500">{config.joinKeyword}</span>
                                </div>

                                <div className="grid grid-cols-6 gap-6 w-full max-w-[1600px] px-8">
                                    {participants.map((p, i) => (
                                        <div key={p.username} className="glass-card p-4 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center gap-3 animate-in fade-in zoom-in">
                                            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-zinc-800">
                                                {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : <User className="text-white/20 m-auto mt-4" />}
                                            </div>
                                            <span className="text-white font-bold truncate w-full text-center">{p.username}</span>
                                        </div>
                                    ))}
                                    {participants.length === 0 && <div className="col-span-full text-center text-white/20 text-2xl">بانتظار اللاعبين...</div>}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* GAME PLAY PHASES */}
                {!['SETUP', 'LOBBY'].includes(phase) && (
                    <div className="flex-1 grid grid-cols-12 gap-8 pl-4 pr-4 pb-4">
                        {/* LEFT: Stats & Cloud */}
                        <div className="col-span-3 flex flex-col gap-6">
                            <div className="glass-card flex-1 bg-black/40 border border-white/10 rounded-[2.5rem] p-6 relative overflow-hidden flex flex-col">
                                <div className="flex items-center gap-3 text-amber-500 mb-6 font-black text-2xl z-10 relative border-b border-white/5 pb-4">
                                    <Cloud size={28} /> الكلمات المتكررة
                                </div>
                                <div className="flex flex-wrap gap-3 relative z-10 content-start">
                                    {guessStats.slice(0, 15).map((g, i) => (
                                        <div key={g.word} className="bg-white/10 px-4 py-2 rounded-xl text-white font-bold transition-all"
                                            style={{ fontSize: `${Math.max(1, 2.5 - i * 0.15)}rem`, opacity: Math.max(0.4, 1 - i * 0.05) }}>
                                            {g.word}
                                        </div>
                                    ))}
                                    {guessStats.length === 0 && <div className="text-white/30 text-center w-full mt-20 text-xl font-bold">...</div>}
                                </div>
                            </div>

                            {/* Closest Guess */}
                            <div className="glass-card bg-zinc-900/80 border border-white/10 rounded-[2.5rem] p-8">
                                <div className="flex items-center gap-3 text-blue-400 mb-4 font-black text-2xl">
                                    <Target size={28} /> أقرب محاولة
                                </div>
                                {closestGuess ? (
                                    <div className="flex flex-col gap-2">
                                        <span className="text-5xl text-white font-black truncate">{closestGuess.word}</span>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><User size={16} /></div>
                                            <span className="text-xl text-gray-300 font-bold">{closestGuess.user}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-white/30 text-xl font-bold">لا يوجد محاولات قريبة بعد</div>
                                )}
                            </div>
                        </div>

                        {/* CENTER: Game State */}
                        <div className="col-span-6 flex flex-col items-center justify-center relative px-4">
                            {(phase === 'PRE_ROUND' || phase === 'SELECT_WORD') && (
                                <div className="text-center animate-pulse">
                                    <Loader2 size={120} className="text-amber-500 animate-spin mx-auto mb-10" />
                                    <h2 className="text-6xl font-black text-white mb-6">جاري اختيار التحدي...</h2>
                                    <p className="text-gray-400 font-bold text-3xl">استعدوا للمنافسة!</p>
                                </div>
                            )}

                            {(phase === 'PLAYING' || phase === 'REVEAL') && (
                                <div className="flex flex-col items-center gap-10 w-full">
                                    {currentChallenge?.image && (
                                        <div className="w-full h-[400px] rounded-[3rem] overflow-hidden border-8 border-amber-500/20 relative shadow-[0_20px_60px_rgba(0,0,0,0.5)] bg-black">
                                            <img src={currentChallenge.image} className="w-full h-full object-cover opacity-80" />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                                                <div className="px-8 py-4 bg-black/60 rounded-full backdrop-blur-md border border-white/10">
                                                    <span className="text-white font-black text-2xl tracking-wider">IMAGE CLUE</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="text-center w-full">
                                        <h1 className="text-[7rem] font-black text-white italic drop-shadow-2xl mb-8 leading-none">خـــمّـــن!</h1>

                                        <div className="bg-red-900/20 border-2 border-red-500/20 rounded-[3rem] p-8 w-full backdrop-blur-sm">
                                            <div className="flex flex-wrap justify-center gap-4 mb-4">
                                                {currentChallenge?.forbidden.map((_, i) => (
                                                    <div key={i} className="w-32 h-12 bg-red-500/20 rounded-xl border border-red-500/30 animate-pulse"></div>
                                                ))}
                                            </div>
                                            <p className="text-red-400 font-black text-xl uppercase tracking-[0.3em]">الكلمات الممنوعة مخفية</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Winner Overlay */}
                            {(phase === 'REVEAL' || phase === 'FINALE') && (
                                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 rounded-[3rem] animate-in zoom-in duration-300 border border-white/10">
                                    {roundWinner ? (
                                        <div className="flex flex-col items-center scale-125">
                                            <div className="w-48 h-48 rounded-[3rem] border-8 border-amber-500 overflow-hidden mb-8 shadow-[0_0_80px_rgba(245,158,11,0.6)] bg-zinc-800">
                                                {roundWinner.avatar ? <img src={roundWinner.avatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-8 text-white/20" />}
                                            </div>
                                            <h2 className="text-7xl font-black text-white mb-4 drop-shadow-lg">{roundWinner.username}</h2>
                                            <div className="bg-green-600 px-12 py-4 rounded-3xl mt-4 shadow-2xl">
                                                <span className="text-4xl text-white font-black">{currentChallenge?.target}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <h2 className="text-8xl text-white font-black">انتهى الوقت!</h2>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* RIGHT: Leaderboard OR Participants in PRE_ROUND */}
                        <div className="col-span-3">
                            <div className="glass-card bg-black/40 border border-white/10 rounded-[2.5rem] p-8 h-full flex flex-col">
                                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
                                    {(phase === 'PRE_ROUND' || phase === 'SELECT_WORD') ? (
                                        <>
                                            <Users size={32} className="text-amber-500" />
                                            <span className="text-3xl font-black text-white">اللاعبين ({participants.length})</span>
                                        </>
                                    ) : (
                                        <>
                                            <Trophy className="text-amber-500" size={32} />
                                            <span className="text-3xl font-black text-white">المتصدرين</span>
                                        </>
                                    )}
                                </div>
                                <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                                    {(phase === 'PRE_ROUND' || phase === 'SELECT_WORD') ? (
                                        // WAITING LIST (PARTICIPANTS)
                                        participants.map((p, i) => (
                                            <div key={p.username} className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/5">
                                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 shrink-0">
                                                    {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : <User className="text-white/20 m-auto mt-2 h-8 w-8" />}
                                                </div>
                                                <span className="text-xl font-bold text-white truncate">{p.username}</span>
                                            </div>
                                        ))
                                    ) : (
                                        // LEADERBOARD (SCORES)
                                        Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([username, score], i) => (
                                            <div key={username} className="flex items-center gap-4 group">
                                                <div className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-xl ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-300 text-black' : i === 2 ? 'bg-orange-700 text-white' : 'bg-white/10 text-white/50'}`}>
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1 bg-white/5 group-hover:bg-white/10 rounded-2xl p-4 flex justify-between items-center border border-white/5 transition-colors">
                                                    <span className="text-lg font-bold text-white truncate max-w-[120px]">{username}</span>
                                                    <span className="text-xl text-amber-500 font-black">{score}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    {(phase === 'PRE_ROUND' || phase === 'SELECT_WORD') && participants.length === 0 && (
                                        <div className="text-white/20 text-center mt-10">لا يوجد لاعبين</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- STREAMER VIEW ---
    return (
        <div className="w-full h-full relative flex flex-col items-center bg-transparent text-right font-display select-none overflow-hidden" dir="rtl">
            <div className="absolute inset-0 bg-[#0a0a0c] -z-10">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-amber-600/10 via-orange-600/5 to-transparent blur-[150px] rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-zinc-700/10 via-zinc-900/5 to-transparent blur-[120px] rounded-full"></div>
                <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            </div>

            {/* PRE-ROUND "CLOSE SCREEN" WARNING */}
            {phase === 'PRE_ROUND' && (
                <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden z-50 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,#222_20px,#222_40px)] opacity-20 pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col items-center animate-in zoom-in duration-300">
                        <div className="w-32 h-32 bg-red-600 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-[0_0_50px_rgba(220,38,38,0.5)] animate-pulse">
                            <EyeOff size={64} className="text-white" />
                        </div>
                        <h1 className="text-6xl font-black text-white mb-4 uppercase tracking-tighter">أغـلـق الشـاشـة الآن!</h1>
                        <p className="text-2xl text-gray-400 font-bold mb-12">الرجاء إخفاء الشاشة لاختيار الكلمة السرية</p>

                        <div className="flex gap-4">
                            <div className="glass-card px-8 py-4 bg-zinc-900 border border-white/10 rounded-2xl">
                                <span className="text-gray-500 font-bold text-sm block mb-1">الحالة في OBS</span>
                                <span className="text-green-500 font-black text-xl flex items-center gap-2"><CheckCircle2 size={18} /> انتظار (آمن)...</span>
                            </div>
                            <div className="glass-card px-8 py-4 bg-zinc-900 border border-white/10 rounded-2xl">
                                <span className="text-gray-500 font-bold text-sm block mb-1">الحالة لديك</span>
                                <span className="text-red-500 font-black text-xl flex items-center gap-2"><EyeOff size={18} /> خاص - مخفي</span>
                            </div>
                        </div>

                        <button
                            onClick={confirmSafeToSelect}
                            className="mt-16 px-16 py-6 bg-white hover:bg-gray-200 text-black font-black text-2xl rounded-full shadow-2xl transition-all hover:scale-105 flex items-center gap-3 cursor-pointer z-50"
                        >
                            <Monitor size={24} /> فـتـح الـخـيـارات (Space)
                        </button>

                        <button
                            onClick={copyOBSLink}
                            className="mt-6 px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full border border-white/10 flex items-center gap-2 transition-all"
                        >
                            <Copy size={20} /> نسخ رابط OBS
                        </button>
                    </div>
                </div>
            )}

            {phase === 'SETUP' && (
                <div className="w-full max-w-4xl mt-12 animate-in fade-in zoom-in duration-700">
                    <div className="text-center mb-12">
                        <ShieldOff size={80} className="mx-auto text-amber-500 mb-6 drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]" />
                        <h1 className="text-7xl font-black text-white italic tracking-tighter uppercase font-serif">الـمـمـنـوع مـرغـوب</h1>
                        <p className="text-amber-500 font-black tracking-[0.4em] text-xs uppercase mt-3">Elite Forbidden Word Challenge</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="glass-card p-10 rounded-[3.5rem] border border-white/10 bg-white/5 backdrop-blur-3xl space-y-8">
                            <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                <Settings className="text-amber-400" /> إعـدادات الـلـعـبـة
                            </h3>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-400 uppercase">كلمة الانضمام</label>
                                    <input
                                        value={config.joinKeyword}
                                        onChange={e => setConfig({ ...config, joinKeyword: e.target.value })}
                                        className="w-full bg-black/50 border-2 border-white/10 focus:border-amber-400 rounded-3xl p-5 text-white font-bold outline-none transition-all shadow-inner"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-gray-400 uppercase">عـدد الـجـولات</label>
                                        <span className="text-3xl font-black font-mono text-white">{config.totalRounds}</span>
                                    </div>
                                    <input
                                        type="range" min="5" max="30" step="5"
                                        value={config.totalRounds}
                                        onChange={e => setConfig({ ...config, totalRounds: +e.target.value })}
                                        className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="glass-card p-10 rounded-[3.5rem] border border-white/10 bg-white/5 backdrop-blur-3xl flex-1 flex flex-col justify-center items-center text-center">
                                <AlertTriangle size={54} className="text-red-500 mb-4 animate-pulse" />
                                <h4 className="text-2xl font-black text-white mb-2">تـحـذير: احـذر الـحظـر!</h4>
                                <p className="text-gray-400 text-sm font-bold leading-relaxed px-6">
                                    حاول تخمين الكلمة الهدف، لكن حذاري! استخدام أي كلمة من قائمة <span className="text-red-500 underline">الكلمات الممنوعة</span> سيتجاهل إجابتك تماماً.
                                </p>
                                <button
                                    onClick={copyOBSLink}
                                    className="mt-6 px-5 py-2 bg-zinc-800 hover:bg-zinc-700 hover:border-amber-500 text-white text-xs font-bold rounded-full border border-white/10 flex items-center gap-2 transition-all group"
                                >
                                    <Monitor size={14} className="group-hover:text-amber-400" /> نسخ رابط OBS
                                </button>
                            </div>

                            <button
                                onClick={startLobby}
                                className="w-full bg-gradient-to-r from-amber-600 to-orange-700 hover:scale-[1.02] text-white font-black py-8 rounded-[3rem] text-4xl shadow-[0_20px_50px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-4 group"
                            >
                                دُخـول الـتـحدي <Zap className="group-hover:rotate-12 transition-transform" />
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
                        <h1 className="text-8xl font-black text-white italic tracking-tighter mb-4 red-neon-text">اخـتـبار الـذكـاء</h1>
                        <div className="flex items-center justify-center gap-4 bg-white/5 px-12 py-6 rounded-[3rem] border border-white/10 backdrop-blur-md shadow-2xl">
                            <span className="text-2xl font-bold text-gray-300">أرسل الكلمة لـحل التحدي:</span>
                            <span className="text-5xl font-black text-amber-500 px-8 py-2 bg-amber-500/10 rounded-2xl border border-amber-500/30 font-serif">{config.joinKeyword}</span>
                        </div>
                    </div>

                    <div className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 px-10 mb-20 overflow-y-auto max-h-[500px] custom-scrollbar">
                        {participants.map((p, i) => (
                            <div key={p.username} className="glass-card p-6 rounded-[3rem] border border-white/5 flex flex-col items-center gap-4 animate-in zoom-in group hover:border-amber-500/30 transition-all bg-white/5" style={{ animationDelay: `${(i as number) * 30}ms` }}>
                                <div className="w-24 h-24 rounded-[2.5rem] overflow-hidden border-4 border-white/10 shadow-xl group-hover:scale-110 transition-transform bg-zinc-900 flex items-center justify-center">
                                    {p.avatar ? (
                                        <img src={p.avatar} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <User className="text-white/20" size={48} />
                                    )}
                                </div>
                                <span className="font-black text-white text-base truncate w-full text-center">{p.username}</span>
                            </div>
                        ))}
                    </div>

                    <div className="fixed bottom-12 left-0 right-0 flex justify-center gap-8 z-50">
                        <button onClick={resetGame} className="px-10 py-6 bg-white/5 hover:bg-white/10 rounded-[2.5rem] text-gray-400 font-black border border-white/10 transition-all flex items-center gap-3">
                            <Trash2 size={24} /> إلـغـاء
                        </button>
                        <button
                            onClick={startRound}
                            className="px-24 py-6 bg-gradient-to-r from-amber-600 to-orange-600 border-b-8 border-orange-800 hover:border-b-4 hover:translate-y-1 rounded-[2.5rem] text-white font-black text-3xl shadow-[0_20px_40px_rgba(245,158,11,0.3)] transition-all flex items-center gap-4"
                        >
                            <Play size={32} /> بـدء الـمـنـافـسـة ({participants.length})
                        </button>
                        <button
                            onClick={copyOBSLink}
                            className="w-20 h-20 rounded-[2rem] bg-zinc-800 hover:bg-zinc-700 border border-white/10 flex items-center justify-center text-white transition-all shadow-xl hover:scale-105 group"
                            title="نسخ رابط OBS"
                        >
                            <Copy size={32} className="group-hover:text-amber-500 transition-colors" />
                        </button>
                    </div>
                </div>
            )}

            {phase === 'SELECT_WORD' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in zoom-in duration-500">
                    <h2 className="text-6xl font-black text-white mb-16 italic tracking-tighter">اخـتـر الـتـحدي الـقادم</h2>
                    <div className="flex gap-10">
                        {suggestedChallenges.map((c, i) => (
                            <button
                                key={i}
                                onClick={() => selectChallenge(c)}
                                className="px-16 py-12 bg-white/5 hover:bg-amber-600 rounded-[4rem] border-2 border-white/10 hover:border-white text-5xl font-black text-white transition-all hover:scale-110 shadow-2xl flex flex-col items-center gap-4"
                            >
                                <span>{c.target}</span>
                                <span className="text-xs text-white/50">{c.forbidden.join(' - ')}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {(phase === 'PLAYING' || phase === 'REVEAL') && currentChallenge && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 relative">
                    {/* Header Overlay */}
                    <div className="absolute top-10 left-10 right-10 flex justify-between items-start">
                        <div className="flex flex-col gap-4">
                            <div className="glass-card px-10 py-5 rounded-[2.5rem] border border-white/10 flex items-center gap-6 bg-black/60 backdrop-blur-xl">
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">الـجـولـة</div>
                                    <div className="text-5xl font-black text-white font-mono">{currentRound} / {config.totalRounds}</div>
                                </div>
                                <Target size={40} className="text-amber-500" />
                            </div>
                            <div className="glass-card px-10 py-5 rounded-[2.5rem] border border-white/10 flex items-center gap-6 bg-black/60 backdrop-blur-xl">
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-red-500 uppercase tracking-widest">الـمـؤقـت</div>
                                    <div className={`text-4xl font-black font-mono ${timer < 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timer}s</div>
                                </div>
                                <Clock size={32} className={timer < 5 ? 'text-red-500' : 'text-gray-500'} />
                            </div>
                        </div>

                        <div className="glass-card w-80 rounded-[3rem] border border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h3 className="font-black text-white italic">قـائـمـة الـشـرف</h3>
                                <Trophy size={18} className="text-yellow-500" />
                            </div>
                            <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([user, score], i) => (
                                    <div key={user} className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5">
                                        <div className="w-10 h-10 rounded-xl bg-amber-600 text-white font-black flex items-center justify-center">#{i + 1}</div>
                                        <div className="flex-1">
                                            <div className="text-sm font-black text-white">{user}</div>
                                            <div className="text-xs text-amber-500 font-bold">{score} تـخـمينات</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-10 mt-20">
                        {currentChallenge.image && (
                            <div className="w-[400px] h-[300px] rounded-[3rem] overflow-hidden border-8 border-white/5 shadow-2xl relative group">
                                <img src={currentChallenge.image} className="w-full h-full object-cover" alt="" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                <div className="absolute bottom-6 inset-x-0 text-center text-white/40 font-black italic tracking-tighter uppercase text-xs">Challenge Image Clue</div>
                            </div>
                        )}
                        <div className="text-center">
                            <h2 className="text-8xl font-black text-white italic tracking-tighter mb-4 drop-shadow-[0_0_40px_rgba(255,255,255,0.2)]">خـمّـن الـكـلـمـة!</h2>
                            <div className="flex items-center justify-center gap-3 opacity-30">
                                <div className="h-px w-20 bg-white"></div>
                                <Brain size={24} className="text-white" />
                                <div className="h-px w-20 bg-white"></div>
                            </div>
                        </div>

                        <div className="glass-card p-12 rounded-[5rem] border-8 border-red-500/20 bg-black/40 backdrop-blur-3xl shadow-[0_0_100px_rgba(239,68,68,0.1)] relative">
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white font-black px-10 py-2 rounded-full text-xl shadow-xl uppercase tracking-widest border-2 border-white">
                                الـمـمـنـوعـات
                            </div>
                            <div className="flex flex-wrap justify-center gap-6 mt-4">
                                {currentChallenge.forbidden.map((f, i) => (
                                    <div key={i} className="px-10 py-6 bg-red-500/10 border-2 border-red-500/30 rounded-[2.5rem] flex flex-col items-center gap-2 group hover:border-red-600 transition-all transform hover:scale-105">
                                        <span className="text-5xl font-black text-white italic">{f}</span>
                                        <div className="flex gap-2">
                                            <ShieldOff size={16} className="text-red-500" />
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Forbidden</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {phase === 'PLAYING' ? (
                            <div className="flex items-center gap-6 animate-pulse">
                                <MessageSquare size={32} className="text-amber-500" />
                                <span className="text-3xl font-black text-gray-400 italic">بـانـتـظـار الإجـابـة الأولـى الـصـحـيـحـة...</span>
                            </div>
                        ) : (
                            <div className="animate-in slide-in-from-bottom duration-500">
                                {roundWinner ? (
                                    <div className="flex flex-col items-center gap-8 bg-amber-500/10 p-10 rounded-[4rem] border-4 border-amber-500/30 backdrop-blur-2xl">
                                        <div className="flex items-center gap-8">
                                            <div className="w-32 h-32 rounded-[3rem] overflow-hidden border-4 border-amber-500 shadow-2xl bg-zinc-900 flex items-center justify-center">
                                                {roundWinner.avatar ? (
                                                    <img src={roundWinner.avatar} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <User className="text-white/20" size={64} />
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-6xl font-black text-white mb-2 italic tracking-tighter">{roundWinner.username}</div>
                                                <div className="text-3xl font-bold text-gray-400">عرف الكلمة: <span className="text-amber-500 text-6xl mr-6">{currentChallenge.target}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center bg-zinc-900/80 p-12 rounded-[4rem] border-4 border-white/5">
                                        <h2 className="text-6xl font-black text-white/30 italic mb-4 uppercase">نـفذ الـوقـت!</h2>
                                        <div className="text-3xl font-bold text-gray-500">الـكلمة الـهـدف: <span className="text-white text-6xl mr-6">{currentChallenge.target}</span></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {phase === 'FINALE' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in fade-in duration-1000">
                    <div className="mb-12 relative scale-125">
                        <div className="absolute inset-0 bg-amber-500 blur-[150px] opacity-25 rounded-full"></div>
                        <Brain size={150} className="text-amber-500 animate-pulse relative z-10" />
                    </div>

                    <h1 className="text-9xl font-black text-white italic tracking-tighter mb-8 drop-shadow-[0_20px_60px_rgba(245,158,11,0.2)]">عـبـقـري الـكلمـات</h1>

                    {Object.entries(scores).sort((a, b) => b[1] - a[1])[0] && (
                        <div className="flex flex-col items-center gap-8 mb-20 animate-in zoom-in duration-700 delay-300">
                            <div className="w-80 h-80 rounded-[5rem] overflow-hidden border-8 border-amber-500 shadow-[0_0_120px_rgba(245,158,11,0.4)] relative bg-zinc-900 flex items-center justify-center">
                                {participants.find(p => p.username === Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0])?.avatar ? (
                                    <img src={participants.find(p => p.username === Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0])?.avatar} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <User className="text-white/20" size={120} />
                                )}
                            </div>
                            <div className="text-center">
                                <div className="text-8xl font-black text-white mb-6 italic tracking-tighter">{Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]}</div>
                                <div className="text-4xl px-20 py-5 bg-amber-500 text-black font-black rounded-[2.5rem] shadow-2xl italic tracking-widest uppercase">
                                    TOTAL SCORE: {Object.entries(scores).sort((a, b) => b[1] - a[1])[0][1]} POINTS
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-8">
                        <button onClick={onHome} className="px-16 py-6 bg-white/5 hover:bg-white/10 text-white font-black rounded-[2.5rem] border border-white/10 transition-all text-2xl">
                            الـرئـيـسـيـة
                        </button>
                        <button onClick={resetGame} className="px-24 py-6 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-[2.5rem] transition-all text-3xl shadow-[0_20px_50px_rgba(245,158,11,0.3)] hover:scale-105">
                            تـحدي جـديـد
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
