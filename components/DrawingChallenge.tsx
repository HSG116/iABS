
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, Play, Users, Trophy, Clock, Volume2, ChevronLeft, User, Trash2, Sparkles, CheckCircle2, Loader2, Gauge, Zap, Star, LogOut, Home, Send, BookOpen, Target, Brain, Eraser, Move, Type, Square, Circle, Triangle, Palette, Download, Redo, Undo } from 'lucide-react';
import { ChatUser } from '../types';
import { chatService } from '../services/chatService';
import { leaderboardService, supabase } from '../services/supabase';

interface DrawingChallengeProps {
    onHome: () => void;
    isOBS?: boolean;
}

interface GameConfig {
    joinKeyword: string;
    maxPlayers: number;
    roundDuration: number;
    autoProgress: boolean;
    pointsForWinner: number;
}

type GamePhase = 'SETUP' | 'LOBBY' | 'SELECT_WORD' | 'DRAWING' | 'RESULTS' | 'FINALE';

interface PlayerScore {
    user: ChatUser;
    score: number;
    wins: number;
}

const WORDS_TO_DRAW = [
    'سيارة', 'بيت', 'شجرة', 'شمس', 'قمر', 'بحر', 'كتاب', 'قلم', 'تفاحة', 'موزة',
    'قطة', 'كلب', 'اسد', 'فيل', 'طائرة', 'هاتف', 'كمبيوتر', 'كرسي', 'طاولة', 'خبز'
];

export const DrawingChallenge: React.FC<DrawingChallengeProps> = ({ onHome, isOBS }) => {
    const [config, setConfig] = useState<GameConfig>({
        joinKeyword: 'رسم',
        maxPlayers: 100,
        roundDuration: 90,
        autoProgress: true,
        pointsForWinner: 100
    });

    const [phase, setPhase] = useState<GamePhase>('SETUP');
    const [participants, setParticipants] = useState<ChatUser[]>([]);
    const [scores, setScores] = useState<Record<string, PlayerScore>>({});
    const [timer, setTimer] = useState(0);
    const [targetWord, setTargetWord] = useState('');
    const [suggestedWords, setSuggestedWords] = useState<string[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushColor, setBrushColor] = useState('#FFFFFF');
    const [brushSize, setBrushSize] = useState(5);
    const [tool, setTool] = useState<'PEN' | 'ERASER' | 'SQUARE' | 'CIRCLE' | 'LINE'>('PEN');
    const [round, setRound] = useState(1);
    const [winner, setWinner] = useState<ChatUser | null>(null);
    const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
    const [undoStack, setUndoStack] = useState<string[]>([]);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const phaseRef = useRef(phase);
    const configRef = useRef(config);
    const targetWordRef = useRef(targetWord);
    const participantsRef = useRef(participants);

    const [broadcastChannel, setBroadcastChannel] = useState<any>(null);

    useEffect(() => {
        phaseRef.current = phase;
        configRef.current = config;
        targetWordRef.current = targetWord;
        participantsRef.current = participants;

        if (broadcastChannel && !isOBS) {
            broadcastChannel.send({
                type: 'broadcast',
                event: 'state_sync',
                payload: { phase, timer, targetWord, round, score: scores }
            });
        }
    }, [phase, config, targetWord, participants, timer, scores, round]);

    // Remote Sync Context
    useEffect(() => {
        const channel = supabase.channel('drawing_sync', {
            config: { broadcast: { self: true } }
        });

        channel
            .on('broadcast', { event: 'state_sync' }, ({ payload }) => {
                if (isOBS) {
                    setPhase(payload.phase);
                    setTimer(payload.timer);
                    setTargetWord(payload.targetWord);
                    setRound(payload.round);
                    setScores(payload.score);
                }
            })
            .on('broadcast', { event: 'draw' }, ({ payload }) => {
                if (isOBS && contextRef.current) {
                    const ctx = contextRef.current;
                    ctx.strokeStyle = payload.color;
                    ctx.lineWidth = payload.size;
                    ctx.globalCompositeOperation = payload.tool === 'ERASER' ? 'destination-out' : 'source-over';

                    if (payload.type === 'start') {
                        ctx.beginPath();
                        ctx.moveTo(payload.x, payload.y);
                    } else if (payload.type === 'draw') {
                        ctx.lineTo(payload.x, payload.y);
                        ctx.stroke();
                    } else if (payload.type === 'shape') {
                        ctx.beginPath();
                        if (payload.tool === 'LINE') {
                            ctx.moveTo(payload.startX, payload.startY);
                            ctx.lineTo(payload.x, payload.y);
                        } else if (payload.tool === 'SQUARE') {
                            ctx.strokeRect(payload.startX, payload.startY, payload.x - payload.startX, payload.y - payload.startY);
                        } else if (payload.tool === 'CIRCLE') {
                            const radius = Math.sqrt(Math.pow(payload.x - payload.startX, 2) + Math.pow(payload.y - payload.startY, 2));
                            ctx.arc(payload.startX, payload.startY, radius, 0, 2 * Math.PI);
                        }
                        ctx.stroke();
                    } else {
                        ctx.closePath();
                    }
                }
            })
            .on('broadcast', { event: 'undo' }, ({ payload }) => {
                if (isOBS && contextRef.current) {
                    const img = new Image();
                    img.src = payload.data;
                    img.onload = () => {
                        contextRef.current?.clearRect(0, 0, 1200, 700);
                        contextRef.current?.drawImage(img, 0, 0);
                    };
                }
            })
            .on('broadcast', { event: 'clear' }, () => {
                if (isOBS) clearCanvas();
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') setBroadcastChannel(channel);
            });

        return () => { channel.unsubscribe(); };
    }, [isOBS]);

    // Canvas init
    useEffect(() => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            canvas.width = 1200;
            canvas.height = 700;
            const context = canvas.getContext('2d');
            if (context) {
                context.lineCap = 'round';
                context.strokeStyle = brushColor;
                context.lineWidth = brushSize;
                contextRef.current = context;
            }
        }
    }, [phase]);

    const saveState = () => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!canvas || !ctx) return;
        setUndoStack(prev => [...prev, canvas.toDataURL()].slice(-20));
    };

    const undo = () => {
        if (undoStack.length === 0) return;
        const previous = undoStack[undoStack.length - 1];
        const img = new Image();
        img.src = previous;
        img.onload = () => {
            const canvas = canvasRef.current;
            const ctx = contextRef.current;
            if (canvas && ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                setUndoStack(prev => prev.slice(0, -1));
                if (!isOBS) {
                    broadcastChannel?.send({ type: 'broadcast', event: 'undo', payload: { data: previous } });
                }
            }
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (isOBS || phase !== 'DRAWING') return;
        setIsDrawing(true);
        saveState();
        const { offsetX, offsetY } = getCoordinates(e);
        setStartPoint({ x: offsetX, y: offsetY });

        const ctx = contextRef.current;
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(offsetX, offsetY);
        }

        broadcastChannel?.send({
            type: 'broadcast',
            event: 'draw',
            payload: { type: 'start', x: offsetX, y: offsetY, color: brushColor, size: brushSize, tool }
        });
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || isOBS || phase !== 'DRAWING') return;
        const { offsetX, offsetY } = getCoordinates(e);
        const ctx = contextRef.current;
        if (!ctx) return;

        if (tool === 'PEN' || tool === 'ERASER') {
            ctx.lineTo(offsetX, offsetY);
            ctx.stroke();

            broadcastChannel?.send({
                type: 'broadcast',
                event: 'draw',
                payload: { type: 'draw', x: offsetX, y: offsetY, color: brushColor, size: brushSize, tool }
            });
        }
    };

    const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || isOBS) return;
        setIsDrawing(false);
        const ctx = contextRef.current;
        if (!ctx) return;

        if (tool !== 'PEN' && tool !== 'ERASER') {
            const { offsetX, offsetY } = getCoordinates(e);

            // Draw shape locally for final
            ctx.beginPath();
            ctx.strokeStyle = brushColor;
            ctx.lineWidth = brushSize;
            if (tool === 'LINE') {
                ctx.moveTo(startPoint.x, startPoint.y);
                ctx.lineTo(offsetX, offsetY);
            } else if (tool === 'SQUARE') {
                ctx.strokeRect(startPoint.x, startPoint.y, offsetX - startPoint.x, offsetY - startPoint.y);
            } else if (tool === 'CIRCLE') {
                const radius = Math.sqrt(Math.pow(offsetX - startPoint.x, 2) + Math.pow(offsetY - startPoint.y, 2));
                ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
            }
            ctx.stroke();

            broadcastChannel?.send({
                type: 'broadcast',
                event: 'draw',
                payload: {
                    type: 'shape',
                    x: offsetX,
                    y: offsetY,
                    startX: startPoint.x,
                    startY: startPoint.y,
                    color: brushColor,
                    size: brushSize,
                    tool
                }
            });
        }

        ctx.closePath();
        broadcastChannel?.send({
            type: 'broadcast',
            event: 'draw',
            payload: { type: 'stop' }
        });
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        if ('touches' in e) {
            return {
                offsetX: (e.touches[0].clientX - rect.left) * scaleX,
                offsetY: (e.touches[0].clientY - rect.top) * scaleY
            };
        } else {
            return {
                offsetX: (e.nativeEvent.clientX - rect.left) * scaleX,
                offsetY: (e.nativeEvent.clientY - rect.top) * scaleY
            };
        }
    };

    useEffect(() => {
        if (contextRef.current) {
            contextRef.current.strokeStyle = tool === 'ERASER' ? '#000000' : brushColor;
            contextRef.current.lineWidth = brushSize;
            if (tool === 'ERASER') {
                contextRef.current.globalCompositeOperation = 'destination-out';
            } else {
                contextRef.current.globalCompositeOperation = 'source-over';
            }
        }
    }, [brushColor, brushSize, tool]);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (context && canvas) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            if (!isOBS) {
                broadcastChannel?.send({ type: 'broadcast', event: 'clear' });
            }
        }
    };

    useEffect(() => {
        const unsubscribe = chatService.onMessage((msg) => {
            const content = msg.content.trim();
            const username = msg.user.username;

            if (phaseRef.current === 'LOBBY') {
                if (content.toLowerCase() === configRef.current.joinKeyword.toLowerCase()) {
                    setParticipants(prev => {
                        if (prev.length >= configRef.current.maxPlayers) return prev;
                        if (prev.some(p => p.username === username)) return prev;

                        // Fetch real Kick avatar asynchronously
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

            if (phaseRef.current === 'DRAWING') {
                if (!participantsRef.current.some(p => p.username === username)) return;

                if (content === targetWordRef.current) {
                    handleCorrectGuess(msg.user);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const handleCorrectGuess = (user: ChatUser) => {
        setWinner(user);
        setScores(prev => {
            const current = prev[user.username] || { user, score: 0, wins: 0 };
            return {
                ...prev,
                [user.username]: { ...current, score: current.score + configRef.current.pointsForWinner, wins: current.wins + 1 }
            };
        });
        setPhase('RESULTS');
        if (config.autoProgress) {
            setTimeout(() => {
                setRound(r => r + 1);
                prepareNextRound();
            }, 5000);
        }
    };

    useEffect(() => {
        let interval: number;
        if (phase === 'DRAWING' && timer > 0) {
            interval = window.setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
        } else if (phase === 'DRAWING' && timer === 0) {
            setPhase('RESULTS'); // Round end without winner
            if (config.autoProgress) {
                setTimeout(() => {
                    setRound(r => r + 1);
                    prepareNextRound();
                }, 5000);
            }
        }
        return () => clearInterval(interval);
    }, [phase, timer]);

    const prepareNextRound = () => {
        const words = WORDS_TO_DRAW.sort(() => Math.random() - 0.5).slice(0, 3);
        setSuggestedWords(words);
        setPhase('SELECT_WORD');
        setWinner(null);
        clearCanvas();
    };

    const startLobby = () => setPhase('LOBBY');
    const startDirectly = () => {
        setPhase('SELECT_WORD');
        prepareNextRound();
    };

    const startRound = () => {
        prepareNextRound();
    };

    const selectWord = (word: string) => {
        setTargetWord(word);
        setTimer(config.roundDuration);
        setPhase('DRAWING');
    };

    const resetGame = () => {
        setPhase('SETUP');
        setParticipants([]);
        setScores({});
        setRound(1);
    };

    return (
        <div className="w-full h-full flex flex-col items-center bg-transparent text-right font-display select-none overflow-hidden" dir="rtl">
            {/* Colorful Background Overlay */}
            <div className="absolute inset-0 bg-[#0a0a0b] -z-10">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-pink-600/10 via-purple-600/5 to-transparent blur-[120px] rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-600/10 via-blue-600/5 to-transparent blur-[120px] rounded-full"></div>
                {/* Geometric decorative elements */}
                <div className="absolute top-20 left-1/4 w-32 h-32 border-4 border-white/5 rounded-[2rem] rotate-12"></div>
                <div className="absolute bottom-40 right-1/4 w-40 h-40 border-4 border-white/5 rounded-full"></div>
                <div className="absolute top-1/2 right-20 w-24 h-24 border-4 border-white/5 transform rotate-45"></div>
            </div>

            {phase === 'SETUP' && (
                <div className="w-full max-w-4xl mt-12 animate-in fade-in zoom-in duration-700">
                    <div className="text-center mb-12">
                        <Palette size={80} className="mx-auto text-pink-500 mb-6 drop-shadow-[0_0_30px_rgba(236,72,153,0.5)]" />
                        <h1 className="text-7xl font-black text-white italic tracking-tighter">تـحـدي الـرسـم</h1>
                        <p className="text-pink-500 font-black tracking-[0.4em] text-[10px] uppercase mt-2">Premium Creative Challenge</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-card p-8 rounded-[3.5rem] border border-white/10 bg-white/5 backdrop-blur-3xl space-y-8">
                            <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                <Settings className="text-cyan-400" /> إعـدادات الـمـرسم
                            </h3>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-400 uppercase">كلمة الانضمام</label>
                                    <input
                                        value={config.joinKeyword}
                                        onChange={e => setConfig({ ...config, joinKeyword: e.target.value })}
                                        className="w-full bg-black/40 border-2 border-white/10 focus:border-cyan-400 rounded-2xl p-4 text-white font-bold outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-gray-400 uppercase">وقت الرسم</label>
                                        <span className="text-2xl font-black text-cyan-400 font-mono">{config.roundDuration}ث</span>
                                    </div>
                                    <input
                                        type="range" min="30" max="300" step="15"
                                        value={config.roundDuration}
                                        onChange={e => setConfig({ ...config, roundDuration: +e.target.value })}
                                        className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="glass-card p-8 rounded-[3.5rem] border border-white/10 bg-white/5 backdrop-blur-3xl flex-1 flex flex-col justify-center items-center text-center">
                                <Sparkles size={54} className="text-yellow-400 mb-4 animate-bounce" />
                                <h4 className="text-xl font-black text-white mb-2">قوانين التحدي</h4>
                                <p className="text-gray-400 text-sm font-bold leading-relaxed px-4">
                                    المذيع يختار كلمة ويبدأ برسمها، والمشاهدين يحاولون تخمين الكلمة من خلال الشات. أول من يخمن بشكل صحيح يفوز!
                                </p>
                            </div>

                            <button
                                onClick={startLobby}
                                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-black py-8 rounded-[2.5rem] text-4xl shadow-[0_20px_50px_rgba(219,39,119,0.3)] transition-all flex items-center justify-center gap-4 group"
                            >
                                افـتـح الـمـرسـم <Play className="group-hover:scale-125 transition-transform" fill="currentColor" />
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
                        <h1 className="text-8xl font-black text-white italic tracking-tighter mb-4 red-neon-text">تجهـيز الـجمـهور</h1>
                        <div className="flex items-center justify-center gap-4 bg-white/5 px-10 py-5 rounded-[2rem] border border-white/10 backdrop-blur-md">
                            <span className="text-2xl font-bold text-gray-300">أكتب العبارة للـدخول:</span>
                            <span className="text-5xl font-black text-cyan-400 px-8 py-2 bg-cyan-400/10 rounded-2xl border border-cyan-400/30 tracking-tighter">{config.joinKeyword}</span>
                        </div>
                    </div>

                    <div className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 px-10 mb-20 overflow-y-auto max-h-[500px] custom-scrollbar">
                        {participants.map((p, i) => (
                            <div key={p.username} className="glass-card p-5 rounded-[2.5rem] border border-white/5 flex flex-col items-center gap-4 animate-in zoom-in bg-white/5 backdrop-blur-md" style={{ animationDelay: `${i * 50}ms` }}>
                                <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-4 border-white/10 shadow-xl group hover:border-pink-500/50 transition-all bg-zinc-900 flex items-center justify-center">
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

                    <div className="fixed bottom-12 left-0 right-0 flex justify-center gap-8">
                        <button onClick={resetGame} className="px-10 py-6 bg-white/5 hover:bg-white/10 rounded-[2rem] text-gray-400 font-black border border-white/10 transition-all flex items-center gap-3">
                            <Trash2 size={24} /> إلـغـاء
                        </button>
                        <button
                            onClick={startRound}
                            disabled={participants.length < 1}
                            className="px-24 py-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:grayscale rounded-[2rem] text-white font-black text-3xl shadow-[0_20px_40px_rgba(6,182,212,0.3)] transition-all flex items-center gap-4"
                        >
                            <Play size={32} /> ابـدأ الـتـحدي ({participants.length})
                        </button>
                    </div>
                </div>
            )}

            {phase === 'SELECT_WORD' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in zoom-in duration-500">
                    {isOBS ? (
                        <div className="fixed inset-0 bg-[#0a0a0b] z-[100] flex flex-col items-center justify-center p-20 text-center">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.15),transparent_70%)] opacity-50"></div>
                            <div className="relative">
                                <div className="absolute inset-0 bg-pink-600 blur-[100px] opacity-20"></div>
                                <Lock size={180} className="text-pink-500 animate-pulse mb-12 relative z-10" />
                            </div>
                            <h2 className="text-8xl font-black text-white italic tracking-tighter mb-6 relative z-10">يـرجى تـقـفـيـل الـشـاشـة!</h2>
                            <div className="flex items-center gap-4 px-10 py-4 bg-white/5 border border-white/10 rounded-full backdrop-blur-xl relative z-10">
                                <Loader2 className="animate-spin text-pink-500" />
                                <p className="text-3xl text-gray-400 font-bold italic">المذيع يقوم باختيار الكلمة السرية حالياً...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-6xl font-black text-white mb-12 italic tracking-tighter">اخـتر كـلـمة لتـرسـمـها</h2>
                            <div className="flex gap-8">
                                {suggestedWords.map(word => (
                                    <button
                                        key={word}
                                        onClick={() => selectWord(word)}
                                        className="px-16 py-10 bg-white/5 hover:bg-pink-600 rounded-[3rem] border-2 border-white/10 hover:border-white text-4xl font-black text-white transition-all hover:scale-110 shadow-2xl"
                                    >
                                        {word}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {(phase === 'DRAWING' || (phase === 'SELECT_WORD' && isOBS)) && (
                <div className="w-full h-full flex flex-col items-center justify-start p-6 relative">
                    <div className="w-full flex justify-between items-center mb-6">
                        <div className="flex gap-4">
                            <div className="glass-card px-8 py-3 rounded-2xl border border-white/10 flex items-center gap-4 bg-black/60 backdrop-blur-xl">
                                <Clock className={timer < 10 ? 'text-red-500 animate-pulse' : 'text-cyan-400'} size={24} />
                                <span className={`text-3xl font-black font-mono ${timer < 10 ? 'text-red-500' : 'text-white'}`}>{timer}s</span>
                            </div>
                            {!isOBS && (
                                <div className="glass-card px-10 py-3 rounded-2xl border border-pink-500/30 bg-pink-500/10 backdrop-blur-xl flex items-center">
                                    <span className="text-2xl font-black text-white italic tracking-tighter">ارسم: <span className="text-pink-500 text-3xl mx-2">{targetWord}</span></span>
                                </div>
                            )}
                        </div>

                        <div className="glass-card px-8 py-3 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl flex items-center gap-3">
                            <Users size={20} className="text-gray-500" />
                            <span className="text-xl font-black text-white tracking-widest">{participants.length} لاعب</span>
                        </div>
                    </div>

                    <div className="relative w-full max-w-[1240px] aspect-[12/7] bg-white rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] border-8 border-zinc-900 overflow-hidden cursor-crosshair group">
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className="w-full h-full block bg-white"
                        />

                        {/* Streamer Controls Overlay */}
                        {!isOBS && phase === 'DRAWING' && (
                            <div className="absolute top-6 bottom-6 right-6 flex flex-col gap-4 p-4 bg-black/80 backdrop-blur-2xl rounded-[3rem] border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity w-24 overflow-y-auto no-scrollbar">
                                <div className="flex flex-col gap-2 bg-white/5 p-2 rounded-3xl border border-white/10">
                                    <button onClick={() => setTool('PEN')} className={`p-4 rounded-2xl transition-all ${tool === 'PEN' ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'text-gray-400 hover:text-white'}`}><Palette size={24} /></button>
                                    <button onClick={() => setTool('ERASER')} className={`p-4 rounded-2xl transition-all ${tool === 'ERASER' ? 'bg-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.5)]' : 'text-gray-400 hover:text-white'}`}><Eraser size={24} /></button>
                                </div>

                                <div className="flex flex-col gap-2 bg-white/5 p-2 rounded-3xl border border-white/10">
                                    <button onClick={() => setTool('LINE')} className={`p-4 rounded-2xl transition-all ${tool === 'LINE' ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'text-gray-400 hover:text-white'}`}><Move size={24} /></button>
                                    <button onClick={() => setTool('SQUARE')} className={`p-4 rounded-2xl transition-all ${tool === 'SQUARE' ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'text-gray-400 hover:text-white'}`}><Square size={24} /></button>
                                    <button onClick={() => setTool('CIRCLE')} className={`p-4 rounded-2xl transition-all ${tool === 'CIRCLE' ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'text-gray-400 hover:text-white'}`}><Circle size={24} /></button>
                                </div>

                                <div className="flex flex-col gap-2 bg-white/5 p-2 rounded-3xl border border-white/10">
                                    <button onClick={undo} className="p-4 text-orange-400 hover:bg-orange-400/10 rounded-2xl transition-all"><Undo size={24} /></button>
                                    <button onClick={clearCanvas} className="p-4 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"><Trash2 size={24} /></button>
                                </div>

                                <div className="flex flex-col gap-2">
                                    {['#FFFFFF', '#000000', '#FF3B30', '#4CD964', '#007AFF', '#FFCC00', '#FF9500', '#5856D6', '#FF2D55', '#AF52DE'].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => { setBrushColor(c); setTool('PEN'); }}
                                            className={`w-12 h-12 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0 ${brushColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {!isOBS && phase === 'DRAWING' && (
                            <div className="absolute bottom-6 left-6 p-6 bg-black/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-6">
                                <div className="flex flex-col gap-2 min-w-[200px]">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">حجم الفرشاة</span>
                                        <span className="text-sm font-bold text-white font-mono">{brushSize}px</span>
                                    </div>
                                    <input
                                        type="range" min="1" max="100"
                                        value={brushSize}
                                        onChange={e => setBrushSize(+e.target.value)}
                                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Chat feedback area */}
                    {isOBS && (
                        <div className="mt-8 text-center bg-black/40 backdrop-blur-xl px-12 py-4 rounded-[2rem] border border-white/5 border-b-4 border-b-cyan-500">
                            <h3 className="text-3xl font-black text-white italic tracking-tighter">خمّـن الرسمة في الشات!</h3>
                        </div>
                    )}
                </div>
            )}

            {phase === 'RESULTS' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in zoom-in duration-500">
                    {winner ? (
                        <div className="text-center">
                            <div className="mb-10 relative inline-block">
                                <div className="absolute inset-0 bg-cyan-500 blur-[100px] opacity-30 animate-pulse rounded-full"></div>
                                <Trophy size={120} className="text-yellow-400 mx-auto relative z-10 animate-bounce" />
                            </div>
                            <h1 className="text-8xl font-black text-white italic tracking-tighter mb-4">تـخمـين صحـيـح!</h1>
                            <div className="flex flex-col items-center gap-6 mt-12 bg-white/5 p-12 rounded-[4rem] border border-white/10 backdrop-blur-xl">
                                <div className="w-40 h-40 rounded-[3rem] overflow-hidden border-8 border-cyan-500 shadow-2xl bg-zinc-900 flex items-center justify-center">
                                    {winner.avatar ? (
                                        <img src={winner.avatar} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <User className="text-white/20" size={80} />
                                    )}
                                </div>
                                <div className="text-center">
                                    <div className="text-6xl font-black text-white mb-2 italic tracking-tighter">{winner.username}</div>
                                    <div className="text-2xl font-bold text-cyan-400">عرف الرسمة: <span className="text-white mx-3 text-4xl">{targetWord}</span></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <h1 className="text-8xl font-black text-white italic tracking-tighter mb-8 opacity-50">انـتهى الـوقت!</h1>
                            <p className="text-4xl text-gray-400 font-bold">لـم يـعرف أحد الرسمة: <span className="text-pink-500 text-6xl mx-4">{targetWord}</span></p>
                        </div>
                    )}

                    {!config.autoProgress && (
                        <button
                            onClick={() => { setRound(r => r + 1); prepareNextRound(); }}
                            className="mt-20 px-24 py-6 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black rounded-3xl text-3xl hover:scale-105 transition-all shadow-2xl"
                        >
                            الـجولـة الـتـالـيـة
                        </button>
                    )}
                </div>
            )}

            {phase === 'FINALE' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in fade-in duration-1000">
                    {/* Finale view similar to WordRound but adapted for Drawing */}
                </div>
            )}
        </div>
    );
};
