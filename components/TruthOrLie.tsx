
import React, { useState, useEffect, useRef } from 'react';
import { chatService } from '../services/chatService';
import { leaderboardService, supabase } from '../services/supabase';
import {
    Timer, Eye, Shield, Sparkles, Trophy, RotateCw, Play, Home,
    CheckCircle, XCircle, Users, Volume2, VolumeX, Zap, Star,
    Crown, TrendingUp, AlertTriangle, CheckCircle2, Layout, BarChart3,
    Image as ImageIcon, Info, ExternalLink, ShieldCheck, Heart, Copy,
    BrainCircuit, MousePointer2, Settings, Lock
} from 'lucide-react';
import { pexelsService } from '../services/pexelsService';
import { SURREAL_CHALLENGES } from '../data/surrealChallenges';

interface TruthOrLieProps {
    onHome: () => void;
    isOBS?: boolean;
}

interface Vote {
    username: string;
    vote: 'truth' | 'lie';
    avatar_url?: string;
}

interface Content {
    type: 'image' | 'fact';
    content: string;
    description?: string;
    isTruth: boolean;
}

// Challenges are now imported from ../data/surrealChallenges

export const TruthOrLie: React.FC<TruthOrLieProps> = ({ onHome, isOBS = false }) => {
    const [gamePhase, setGamePhase] = useState<'idle' | 'voting' | 'results'>('idle');
    const [randomContent, setRandomContent] = useState<Content | null>(null);
    const [timerDuration, setTimerDuration] = useState(30);
    const [timeLeft, setTimeLeft] = useState(30);
    const [votes, setVotes] = useState<Vote[]>([]);
    const [actualAnswer, setActualAnswer] = useState<'truth' | 'lie' | null>(null);
    const [chatConnected, setChatConnected] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [showOBSLinks, setShowOBSLinks] = useState(false);
    const [isSyncReady, setIsSyncReady] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [idleImage, setIdleImage] = useState<string>('https://images.pexels.com/photos/3124111/pexels-photo-3124111.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1');

    const timerInterval = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const playSound = (type: 'start' | 'tick' | 'end' | 'success' | 'fail') => {
        if (!soundEnabled) return;
        const sounds = {
            start: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
            tick: 'https://assets.mixkit.co/active_storage/sfx/2044/2044-preview.mp3',
            end: 'https://assets.mixkit.co/active_storage/sfx/1070/1070-preview.mp3',
            success: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
            fail: 'https://assets.mixkit.co/active_storage/sfx/1033/1033-preview.mp3'
        };
        const audio = new Audio(sounds[type]);
        audio.volume = type === 'tick' ? 0.2 : 0.5;
        audio.play().catch(() => { });
    };

    useEffect(() => {
        const kickChannel = localStorage.getItem('kick_channel_name') || 'hsg116';
        chatService.connect(kickChannel);
        setChatConnected(true);

        // Real-time Sync for OBS
        const channel = supabase.channel('truth_or_lie_sync', {
            config: { broadcast: { self: true } }
        });

        channel
            .on('broadcast', { event: 'game_update' }, ({ payload }) => {
                if (isOBS) {
                    console.log('OBS Received Sync:', payload);
                    if (payload.phase) setGamePhase(payload.phase);
                    if (payload.content) setRandomContent(payload.content);
                    if (payload.timer) setTimerDuration(payload.timer);
                    if (payload.timeLeft !== undefined) setTimeLeft(payload.timeLeft);
                    if (payload.answer !== undefined) setActualAnswer(payload.answer);
                    if (payload.reset) {
                        setVotes([]);
                        setActualAnswer(null);
                    }
                }
            })
            .subscribe();

        const handleMessage = (msg: any) => {
            if (gamePhase !== 'voting') return;

            const text = msg.content?.toLowerCase() || '';
            const username = msg.user?.username || 'Unknown';
            let vote: 'truth' | 'lie' | null = null;

            // Robust keyword matching
            if (text.includes('!صادق') || text === 'صادق' || text.includes('!1') || text === '1' || text.includes('!truth') || text === 'truth') vote = 'truth';
            if (text.includes('!كذاب') || text === 'كذاب' || text.includes('!2') || text === '2' || text.includes('!lie') || text === 'lie') vote = 'lie';

            if (vote) {
                setVotes(prev => {
                    if (prev.find(v => v.username === username)) return prev;
                    return [...prev, {
                        username: username,
                        vote: vote!,
                        avatar_url: msg.user?.avatar
                    }];
                });
            }
        };

        const unsubscribe = chatService.onMessage(handleMessage);
        return () => {
            unsubscribe();
            supabase.removeChannel(channel);
        };
    }, [gamePhase, isOBS]);

    useEffect(() => {
        if (gamePhase === 'idle') {
            const challenge = SURREAL_CHALLENGES[Math.floor(Math.random() * SURREAL_CHALLENGES.length)];
            const [, englishKeyword] = challenge.split(' - ');
            pexelsService.fetchRandomImage(englishKeyword || "surreal").then(url => {
                if (url) setIdleImage(url);
            });
        }
    }, [gamePhase]);

    useEffect(() => {
        if (gamePhase === 'voting' && timeLeft > 0) {
            timerInterval.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 5 && prev > 0) playSound('tick');
                    if (prev <= 1) {
                        setGamePhase('results');
                        playSound('end');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerInterval.current) clearInterval(timerInterval.current);
        }
        return () => {
            if (timerInterval.current) clearInterval(timerInterval.current);
        };
    }, [gamePhase]);

    const fetchRandomContent = async () => {
        const challengeString = SURREAL_CHALLENGES[Math.floor(Math.random() * SURREAL_CHALLENGES.length)];
        const [arabicDesc, englishKeyword] = challengeString.split(' - ');
        const isTruth = Math.random() > 0.5;

        try {
            const imageUrl = await pexelsService.fetchRandomImage(englishKeyword || "surreal");
            setRandomContent({
                type: 'image',
                content: imageUrl || `https://images.pexels.com/photos/${Math.floor(Math.random() * 1000000)}/pexels-photo-${Math.floor(Math.random() * 1000000)}.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1`,
                description: arabicDesc,
                isTruth: isTruth
            });
        } catch (e) {
            setRandomContent({
                type: 'fact',
                content: arabicDesc,
                isTruth: isTruth
            });
        }
    };

    const handleStartRound = async () => {
        await fetchRandomContent();
        const content = randomContent; // Note: state update is async, might need to use local var
        // Since state update is async, let's fetch and then sync
    };

    // Re-implementing start round with sync
    const startNewRound = async () => {
        // 1. Pick a random surreal challenge
        const challengeString = SURREAL_CHALLENGES[Math.floor(Math.random() * SURREAL_CHALLENGES.length)];
        const [arabicDesc, englishKeyword] = challengeString.split(' - ');

        // 2. Fetch image from Pexels using the English keyword
        const imageUrl = await pexelsService.fetchRandomImage(englishKeyword || "surreal");
        const isTruth = Math.random() > 0.5;

        let newContent: Content;
        if (imageUrl) {
            newContent = {
                type: 'image',
                content: imageUrl,
                description: arabicDesc,
                isTruth: isTruth
            };
        } else {
            // Fallback to text if image fails
            newContent = {
                type: 'fact',
                content: arabicDesc,
                isTruth: isTruth
            };
        }

        // 2. Local Update
        setRandomContent(newContent);
        setVotes([]);
        setTimeLeft(timerDuration);
        setGamePhase('voting');
        setActualAnswer(null);
        playSound('start');

        // 3. Global Sync
        supabase.channel('truth_or_lie_sync').send({
            type: 'broadcast',
            event: 'game_update',
            payload: {
                phase: 'voting',
                content: newContent,
                timer: timerDuration,
                timeLeft: timerDuration,
                reset: true
            }
        });
    };

    const handleRevealAnswer = async () => {
        if (!randomContent) return;
        const answer = randomContent.isTruth ? 'truth' : 'lie';
        setActualAnswer(answer);
        playSound(answer === 'truth' ? 'success' : 'fail');

        // Global Sync
        supabase.channel('truth_or_lie_sync').send({
            type: 'broadcast',
            event: 'game_update',
            payload: {
                phase: 'results',
                answer: answer
            }
        });

        // Award points to winners
        const winners = votes.filter(v => v.vote === answer);
        for (const winner of winners) {
            await leaderboardService.recordWin(winner.username, winner.avatar_url || '', 10);
        }
    };

    const handleReset = () => {
        setGamePhase('idle');
        setRandomContent(null);
        setActualAnswer(null);
        setVotes([]);
        setTimeLeft(timerDuration);
        if (timerInterval.current) clearInterval(timerInterval.current);

        // Global Sync
        supabase.channel('truth_or_lie_sync').send({
            type: 'broadcast',
            event: 'game_update',
            payload: {
                phase: 'idle',
                reset: true
            }
        });
    };

    const truthVotes = votes.filter(v => v.vote === 'truth').length;
    const lieVotes = votes.filter(v => v.vote === 'lie').length;
    const totalVotes = votes.length;
    const truthPercentage = totalVotes > 0 ? (truthVotes / totalVotes) * 100 : 0;
    const liePercentage = totalVotes > 0 ? (lieVotes / totalVotes) * 100 : 0;

    // OBS Stats Display (للمذيع فقط) - إحصائيات مطابقة للصورة تماماً
    if (isOBS && window.location.search.includes('stats=true')) {
        return (
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-[#0b0b0e]/80 backdrop-blur-3xl rounded-[3rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-500">
                    {/* Background Decorative Trending Up Arrow */}
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                        <TrendingUp size={240} />
                    </div>

                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-12 relative z-10">
                        <div className="flex gap-10">
                            <div className="space-y-1">
                                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">مرحلة اللعبة</div>
                                <div className="text-3xl font-black text-purple-400 italic uppercase leading-none">{gamePhase === 'voting' ? 'تصـويت' : gamePhase === 'results' ? 'نتـائج' : 'إستعـداد'}</div>
                            </div>
                            <div className="w-px h-10 bg-white/10 mt-1"></div>
                            <div className="space-y-1">
                                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">الوقت المتبقي</div>
                                <div className="text-4xl font-black text-white italic uppercase leading-none font-mono">{timeLeft}s</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">بيانات الجلسة المباشرة</h3>
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg border border-white/20">
                                <Layout size={24} className="text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="space-y-10 relative z-10">
                        {/* Truth Row */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end px-2 text-right">
                                <div className="flex items-center gap-4 order-last">
                                    <span className="text-3xl font-black text-white italic uppercase tracking-tighter">صادق</span>
                                    <CheckCircle2 size={28} className="text-blue-500" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-black font-black text-xl shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                                        {truthVotes}
                                    </div>
                                    <div className="pb-1 border-b-2 border-blue-500/50">
                                        <span className="text-sm font-black text-white/40 uppercase tracking-[0.2em]">الأصوات</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden p-1 border border-white/5">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(59,130,246,0.3)] relative"
                                    style={{ width: `${Math.max(truthPercentage, 2)}%` }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        {/* Lie Row */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end px-2 text-right">
                                <div className="flex items-center gap-4 order-last">
                                    <span className="text-3xl font-black text-white italic uppercase tracking-tighter">كاذب</span>
                                    <XCircle size={28} className="text-red-500" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-black font-black text-xl shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                                        {lieVotes}
                                    </div>
                                    <div className="pb-1 border-b-2 border-red-500/50">
                                        <span className="text-sm font-black text-white/40 uppercase tracking-[0.2em]">الأصوات</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden p-1 border border-white/5">
                                <div
                                    className="h-full bg-red-500 rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(239,68,68,0.3)] relative"
                                    style={{ width: `${Math.max(liePercentage, 2)}%` }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // OBS Secret Content Display (للمذيع فقط) - Ultra Luxury View
    if (isOBS && window.location.search.includes('secret=true')) {
        return (
            <div className="fixed inset-0 bg-[#050507] flex items-center justify-center p-12 overflow-hidden font-sans">
                {/* Visual Atmosphere */}
                <div className="absolute inset-0">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_30%,#1e1b4b,transparent)] opacity-40"></div>
                    <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_70%,#312e81,transparent)] opacity-40"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                </div>

                {randomContent ? (
                    <div className="relative z-10 w-full max-w-6xl space-y-12 animate-in zoom-in-95 duration-700">
                        {/* Status Bar */}
                        <div className="flex justify-between items-center px-10 animate-in slide-in-from-top duration-700">
                            <div className="flex items-center gap-4 py-3 px-8 bg-white/5 border border-white/10 rounded-full backdrop-blur-2xl">
                                <span className="w-3 h-3 rounded-full bg-red-600 animate-ping"></span>
                                <span className="text-xl font-black text-white/60 tracking-widest uppercase">البث السري للمضيف</span>
                            </div>
                            <div className="flex items-center gap-4 py-3 px-8 bg-yellow-500/10 border border-yellow-500/30 rounded-full backdrop-blur-2xl">
                                <ShieldCheck className="text-yellow-500" size={28} />
                                <span className="text-2xl font-black text-yellow-500 italic">للمذيع فقط</span>
                            </div>
                        </div>

                        {/* Content Showcase */}
                        <div className="relative group">
                            {/* Neon Glow Frame */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 rounded-[4rem] blur-2xl opacity-30 group-hover:opacity-60 transition-all duration-1000 animate-pulse"></div>

                            <div className="relative bg-[#0a0a0c] rounded-[4rem] p-10 border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden">
                                {randomContent.type === 'image' ? (
                                    <div className="space-y-10">
                                        <div className="relative rounded-[3rem] overflow-hidden border-2 border-white/5 shadow-inner">
                                            <img
                                                src={randomContent.content}
                                                alt="Secret Feed"
                                                className="w-full h-[60vh] object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                                        </div>
                                        <div className="flex items-start gap-8 px-6">
                                            <div className="w-20 h-20 rounded-3xl bg-purple-600 flex items-center justify-center shadow-xl group-hover:rotate-12 transition-all duration-500 shrink-0">
                                                <ImageIcon className="text-white" size={45} />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <h4 className="text-2xl font-black text-purple-400 uppercase tracking-widest">توصيف الحقيقة</h4>
                                                <p className="text-6xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
                                                    {randomContent.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-20 px-10 min-h-[60vh] flex flex-col items-center justify-center text-center space-y-12">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-purple-500 blur-3xl opacity-20 animate-pulse"></div>
                                            <div className="w-32 h-32 rounded-full border-4 border-dashed border-purple-500/50 flex items-center justify-center animate-spin-slow">
                                                <Star className="text-purple-400" size={60} />
                                            </div>
                                        </div>
                                        <p className="text-7xl font-black text-white leading-[1.3] px-10 drop-shadow-2xl">
                                            {randomContent.content}
                                        </p>
                                        <div className="flex items-center gap-4 text-purple-400 font-black italic text-2xl uppercase tracking-[0.5em]">
                                            <div className="h-px w-20 bg-purple-500/30"></div>
                                            معلومات مصنفة وسرية
                                            <div className="h-px w-20 bg-purple-500/30"></div>
                                        </div>
                                    </div>
                                )}

                                {/* Bottom Secret Indicator */}
                                <div className="mt-10 pt-10 border-t border-white/5 flex justify-center gap-12 text-3xl font-black italic">
                                    <div className={`flex items-center gap-4 px-10 py-4 rounded-3xl border-2 transition-all duration-500 ${randomContent.isTruth
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.3)]'
                                        : 'bg-white/5 border-white/10 text-white/20'}`}>
                                        <CheckCircle2 size={40} />
                                        صـادق
                                    </div>
                                    <div className={`flex items-center gap-4 px-10 py-4 rounded-3xl border-2 transition-all duration-500 ${!randomContent.isTruth
                                        ? 'bg-red-600/20 border-red-500 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                                        : 'bg-white/5 border-white/10 text-white/20'}`}>
                                        <XCircle size={40} />
                                        كـاذب
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="relative text-center space-y-12 animate-in fade-in zoom-in duration-1000">
                        <div className="relative inline-block group">
                            <div className="absolute inset-0 bg-purple-600 blur-[120px] opacity-40 group-hover:opacity-60 transition-all animate-pulse"></div>
                            <div className="relative w-64 h-64 rounded-[4rem] bg-gradient-to-br from-white/10 to-transparent border border-white/20 flex items-center justify-center shadow-2xl backdrop-blur-3xl transform group-hover:scale-110 transition-transform duration-700">
                                <ShieldCheck size={160} className="text-white opacity-20" />
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h2 className="text-8xl font-black text-white italic tracking-tighter uppercase drop-shadow-[0_0_50px_rgba(255,255,255,0.4)]">
                                النظام مستعد
                            </h2>
                            <p className="text-3xl text-white/30 font-bold uppercase tracking-[0.4em]">بإنتظار بدء الجولة...</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (isOBS) {
        return (
            <div className="fixed inset-0 flex items-center justify-center animate-in fade-in duration-500 overflow-hidden font-sans">
                {gamePhase === 'voting' && (
                    <div className="relative w-full h-full flex items-center justify-center p-12 overflow-hidden animate-in zoom-in duration-700">
                        {/* Dynamic Background */}
                        <div className="absolute inset-0 z-0">
                            {randomContent?.type === 'image' && (
                                <img src={randomContent.content} className="w-full h-full object-cover blur-3xl opacity-20 scale-125 transition-all duration-1000" alt="bg" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-br from-black via-black/90 to-black/40"></div>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent"></div>
                        </div>

                        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center gap-12">

                            {/* EVIDENCE CARD - MOVED TO TOP & SMALLER */}
                            <div className="w-full flex flex-col items-center animate-in slide-in-from-top duration-1000">
                                <div className="relative group w-full max-w-lg">
                                    {/* Decorative Frame Elements */}
                                    <div className="absolute -inset-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-[3rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000"></div>
                                    <div className="absolute -top-6 -left-6 w-16 h-16 border-t-2 border-l-2 border-purple-500/30 rounded-tl-3xl animate-pulse"></div>
                                    <div className="absolute -bottom-6 -right-6 w-16 h-16 border-b-2 border-r-2 border-blue-500/30 rounded-br-3xl animate-pulse delay-700"></div>

                                    <div className="relative aspect-video rounded-[2.5rem] overflow-hidden border border-white/10 shadow-3xl bg-[#0b0b0e] transform group-hover:scale-[1.02] transition-transform duration-700">
                                        {randomContent?.type === 'image' ? (
                                            <>
                                                <img src={randomContent.content} className="w-full h-full object-cover grayscale-[0.1] contrast-110" alt="Challenge" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-40"></div>

                                                {/* Smaller Technical Overlays */}
                                                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                                    <span className="text-[10px] font-black text-white/80 uppercase tracking-widest italic">Asset #{(Math.random() * 9999).toFixed(0)}</span>
                                                </div>

                                                <div className="absolute bottom-4 left-4 right-4">
                                                    <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-purple-500/40 w-1/4 animate-shimmer"></div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full h-full bg-[#0b0b0e] flex flex-col items-center justify-center space-y-4 p-8 text-center">
                                                <BrainCircuit size={60} className="text-purple-500/40 animate-pulse" />
                                                <h2 className="text-2xl font-black text-white italic leading-tight max-w-xs">
                                                    {randomContent?.content || "Information encrypted..."}
                                                </h2>
                                            </div>
                                        )}
                                    </div>

                                    {/* Smaller Description Label */}
                                    {randomContent?.description && (
                                        <div className="mt-6 bg-white/5 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom duration-700 delay-300">
                                            <div className="flex items-start gap-4">
                                                <div className="mt-1 text-purple-400">
                                                    <Info size={18} />
                                                </div>
                                                <p className="text-xl text-white/90 font-black italic uppercase tracking-tight leading-snug">
                                                    {randomContent.description}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* VOTING PANEL - BELOW IMAGE */}
                            <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom duration-1000 delay-500">
                                <div className="bg-[#0b0b0e]/60 backdrop-blur-3xl rounded-[4rem] p-10 border border-white/5 shadow-4xl relative overflow-hidden">
                                    <div className="flex flex-col md:flex-row items-center gap-12">

                                        {/* Smaller Timer Column */}
                                        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                                                <circle cx="72" cy="72" r="60" fill="transparent" stroke="currentColor" strokeWidth="3" className="text-white/5" />
                                                <circle
                                                    cx="72" cy="72" r="60" fill="transparent" stroke="currentColor" strokeWidth="4"
                                                    strokeDasharray={2 * Math.PI * 60}
                                                    strokeDashoffset={2 * Math.PI * 60 * (1 - timeLeft / timerDuration)}
                                                    strokeLinecap="round"
                                                    className="text-purple-500 transition-all duration-1000"
                                                />
                                            </svg>
                                            <div className="text-center">
                                                <span className="text-5xl font-black text-white font-mono italic">{timeLeft}</span>
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="hidden md:block w-px h-24 bg-white/10"></div>

                                        {/* Stats Display - Horizontal Layout */}
                                        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-10">
                                            {/* Truth Stat */}
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-end">
                                                    <div className="flex items-center gap-3">
                                                        <CheckCircle2 className="text-blue-500" size={24} />
                                                        <span className="text-2xl font-black text-white italic tracking-tighter">صـادق</span>
                                                    </div>
                                                    <div className="text-4xl font-black text-blue-500 font-mono italic leading-none">{truthVotes}</div>
                                                </div>
                                                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-700 to-blue-400 rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                                                        style={{ width: `${Math.max(truthPercentage, 2)}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Lie Stat */}
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-end">
                                                    <div className="flex items-center gap-3">
                                                        <XCircle className="text-red-500" size={24} />
                                                        <span className="text-2xl font-black text-white italic tracking-tighter">كـاذب</span>
                                                    </div>
                                                    <div className="text-4xl font-black text-red-500 font-mono italic leading-none">{lieVotes}</div>
                                                </div>
                                                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-red-700 to-red-400 rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                                                        style={{ width: `${Math.max(liePercentage, 2)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex justify-center items-center gap-6">
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10"></div>
                                        <div className="flex items-center gap-3 px-6 py-2 bg-white/5 rounded-full border border-white/5">
                                            <Users className="text-purple-400" size={16} />
                                            <span className="text-white/30 font-black text-[10px] uppercase tracking-widest whitespace-nowrap">المشاركون الآن: {totalVotes} عضو</span>
                                        </div>
                                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {gamePhase === 'results' && actualAnswer && (
                    <div className={`fixed inset-0 flex items-center justify-center animate-in zoom-in duration-1000 ${actualAnswer === 'truth'
                        ? 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-600/40 via-blue-900/60 to-[#050507]'
                        : 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600/40 via-red-900/60 to-[#050507]'
                        }`}>

                        <div className="absolute inset-0 overflow-hidden">
                            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] rounded-full blur-[250px] opacity-20 animate-pulse ${actualAnswer === 'truth' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                        </div>

                        <div className="relative flex flex-col items-center gap-12 z-20">
                            {/* Evidence Mini-Archive */}
                            <div className="animate-in slide-in-from-top duration-1000">
                                <div className="p-3 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/20 shadow-2xl overflow-hidden group">
                                    <div className="relative w-72 aspect-video rounded-[1.8rem] overflow-hidden">
                                        {randomContent?.type === 'image' ? (
                                            <img src={randomContent.content} className="w-full h-full object-cover" alt="Archive" />
                                        ) : (
                                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                                <BrainCircuit className="text-white/20" size={40} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[10px] font-black text-white uppercase tracking-[0.5em] italic">Archive #{(Math.random() * 1000).toFixed(0)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center space-y-6">
                                {actualAnswer === 'truth' ? (
                                    <div className="relative inline-block">
                                        <div className="absolute inset-0 bg-blue-400 blur-[120px] opacity-40"></div>
                                        <CheckCircle2 className="relative mx-auto text-blue-400 animate-bounce" size={200} strokeWidth={2} />
                                    </div>
                                ) : (
                                    <div className="relative inline-block">
                                        <div className="absolute inset-0 bg-red-400 blur-[120px] opacity-40"></div>
                                        <XCircle className="relative mx-auto text-red-400 animate-bounce" size={200} strokeWidth={2} />
                                    </div>
                                )}
                                <h1 className="text-[14rem] font-black text-white italic tracking-tighter drop-shadow-[0_20px_60px_rgba(0,0,0,0.8)] leading-[0.7] animate-in slide-in-from-bottom duration-1000">
                                    {actualAnswer === 'truth' ? 'صـادق' : 'كـاذب'}
                                </h1>
                            </div>

                            <div className="bg-white/5 backdrop-blur-3xl rounded-[4rem] p-12 border border-white/10 shadow-3xl animate-in slide-in-from-bottom duration-1000 delay-500">
                                <div className="flex items-center gap-12 text-white">
                                    <div className="relative">
                                        <Trophy className="text-yellow-400 drop-shadow-[0_0_40px_rgba(253,224,71,0.6)]" size={100} />
                                        <div className="absolute -top-4 -right-4 bg-white/10 w-12 h-12 rounded-full backdrop-blur-xl border border-white/20 flex items-center justify-center font-black text-xs">WIN</div>
                                    </div>
                                    <div className="text-left space-y-3">
                                        <div className="flex items-baseline gap-4">
                                            <span className="text-9xl font-black drop-shadow-2xl font-mono italic leading-none">
                                                {actualAnswer === 'truth' ? truthVotes : lieVotes}
                                            </span>
                                            <span className="text-4xl font-black text-white/40 italic">إجابة صحيحة</span>
                                        </div>
                                        <div className="text-lg font-black text-white/20 uppercase tracking-[0.6em] italic">تم تحليل الذكاء بنجاح</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {gamePhase === 'idle' && (
                    <div className="fixed inset-0 flex items-center justify-center overflow-hidden animate-in fade-in duration-[1.5s]">
                        {/* Cinematic Ambient Image - Full Screen */}
                        <div className="absolute inset-0">
                            <img
                                src={idleImage}
                                className="w-full h-full object-cover scale-110 motion-safe:animate-pulse-slow blur-[1px] brightness-50 opacity-60"
                                alt="Ambient"
                            />
                            {/* Dynamic Glow Overlays */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/40 to-transparent"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-transparent to-red-900/10"></div>
                            <div className="absolute -top-1/4 -left-1/4 w-[100%] h-[100%] bg-purple-500/5 blur-[200px] animate-pulse"></div>
                        </div>

                        <div className="relative text-center space-y-20 z-20">
                            <div className="relative inline-block group">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 blur-[150px] opacity-30 animate-pulse duration-[5s]"></div>
                                <div className="relative w-80 h-80 rounded-[5rem] border-2 border-white/20 flex items-center justify-center shadow-[0_0_100px_rgba(0,0,0,0.5)] backdrop-blur-3xl overflow-hidden group-hover:scale-105 transition-transform duration-700">
                                    <div className="absolute inset-0 p-1">
                                        <img src={idleImage} className="w-full h-full object-cover rounded-[4.5rem] opacity-80" alt="Ready" />
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                        <BrainCircuit size={120} className="text-white opacity-40 animate-pulse" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="inline-block px-10 py-3 bg-white/5 border border-white/10 rounded-full backdrop-blur-xl mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.8)]"></div>
                                        <span className="text-xl font-black text-white/60 tracking-[0.5em] uppercase italic">النظام متزامن</span>
                                    </div>
                                </div>
                                <h1 className="text-[12rem] font-black text-white italic tracking-tighter uppercase drop-shadow-[0_20px_100px_rgba(0,0,0,0.9)] leading-[0.8]">
                                    صـادق <span className="text-purple-500 font-outline-2">أم</span> كـاذب
                                </h1>
                                <p className="text-4xl text-white/20 font-black uppercase tracking-[0.8em] italic mt-8 animate-pulse">
                                    جـاري التعـليق...
                                </p>
                            </div>

                            {/* Cosmetic Interactive Voting Bar */}
                            <div className="max-w-4xl mx-auto w-full pt-10 px-20">
                                <div className="flex justify-between items-end mb-6">
                                    <div className="text-left">
                                        <div className="text-blue-500 text-sm font-black tracking-[0.5em] uppercase mb-1">المسار أ</div>
                                        <div className="text-4xl font-black text-white italic tracking-tighter">صـادق</div>
                                    </div>
                                    <div className="px-8 py-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-3xl">
                                        <span className="text-xl font-black text-white/40 uppercase tracking-widest italic">وضع المعاينة المباشر</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-red-500 text-sm font-black tracking-[0.5em] uppercase mb-1">المسار ب</div>
                                        <div className="text-4xl font-black text-white italic tracking-tighter">كـاذب</div>
                                    </div>
                                </div>
                                <div className="relative h-6 w-full bg-white/5 rounded-full overflow-hidden p-1 border border-white/10 shadow-inner">
                                    <div className="absolute inset-0 flex">
                                        <div className="h-full bg-gradient-to-r from-blue-700 via-blue-500 to-indigo-600 w-1/2 border-r border-white/20 relative group overflow-hidden">
                                            <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                                        </div>
                                        <div className="h-full bg-gradient-to-r from-red-600 via-red-500 to-rose-600 w-1/2 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-white/20 animate-shimmer" style={{ animationDelay: '0.5s' }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-center gap-10">
                                    <div className="h-[2px] w-20 bg-gradient-to-r from-transparent to-white/20"></div>
                                    <p className="text-xs font-black text-white/20 uppercase tracking-[1em] italic leading-none whitespace-nowrap">جـاري تهيئة سـاحة المعـركة</p>
                                    <div className="h-[2px] w-20 bg-gradient-to-l from-transparent to-white/20"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Streamer Dashboard
    return (
        <div className="min-h-screen bg-[#050507] p-8 animate-in fade-in duration-500 relative overflow-x-hidden overflow-y-auto font-sans">
            {/* Visual Flair */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-purple-900/10 rounded-full blur-[150px] animate-pulse"></div>
                <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            </div>

            <div className="relative z-10 max-w-[1600px] mx-auto">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-12 animate-in slide-in-from-top duration-700">
                    <div className="flex items-center gap-8">
                        <button
                            onClick={onHome}
                            className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 flex items-center justify-center transition-all group shadow-xl"
                        >
                            <Home size={32} className="text-white group-hover:scale-115 transition-transform" />
                        </button>
                        <div className="space-y-1">
                            <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-none">
                                غرفة التحكم
                            </h1>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                                <span className="text-purple-400 font-bold text-sm tracking-widest uppercase italic">محرك صـادق أم كـاذب</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all shadow-lg ${soundEnabled
                                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                                }`}
                        >
                            {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                        </button>
                        <div className={`px-8 py-3 rounded-2xl border font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-lg ${chatConnected
                            ? 'bg-green-600/10 border-green-500/30 text-green-400'
                            : 'bg-red-600/10 border-red-500/30 text-red-400'
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${chatConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`}></div>
                            {chatConnected ? 'متصل الآن' : 'غير متصل'}
                        </div>
                    </div>
                </div>

                {/* Dashboard Grid - REORGANIZED: Preview Left, Controls Right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
                    {/* LIVE PREVIEW COLUMN (Left - 8 Cols) */}
                    <div className="lg:col-span-8 flex flex-col space-y-8 animate-in slide-in-from-left duration-700 delay-300">
                        {/* Master Preview Monitor */}
                        <div className="bg-[#0b0b0e] border border-white/5 rounded-[4rem] p-2 shadow-4xl relative overflow-hidden group h-full min-h-[700px]">
                            {/* Decorative Technical Label */}
                            <div className="absolute top-10 left-12 flex items-center gap-4 z-20">
                                <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-white uppercase tracking-[0.5em] italic leading-none">موجز التغذية الرئيسي</span>
                                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">القناة 01 • إخراج فائق الدقة</span>
                                </div>
                            </div>

                            <div className="absolute top-10 right-12 z-20">
                                <div className="px-4 py-2 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">إشارة مستقرة</span>
                                </div>
                            </div>

                            <div className="relative w-full h-full flex items-center justify-center p-6 lg:p-12">
                                {/* THE BIG IMAGE - 'الصورة هنا كبيرة' */}
                                <div className="relative w-full h-full min-h-[500px] rounded-[3rem] bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl group-hover:border-purple-500/30 transition-all duration-1000">
                                    {gamePhase === 'idle' ? (
                                        <>
                                            <img src={idleImage} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-[15s]" alt="Idle Ambient" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                                            <div className="relative z-10 text-center">
                                                <div className="w-32 h-32 rounded-[3rem] bg-white/5 backdrop-blur-3xl border border-white/10 flex items-center justify-center mx-auto mb-8 animate-bounce transition-all duration-700">
                                                    <ImageIcon size={64} className="text-white/40" />
                                                </div>
                                                <h3 className="text-6xl font-black text-white italic uppercase tracking-tighter leading-tight mb-4">
                                                    مستعد<br /><span className="text-purple-500">للمشاركة</span>
                                                </h3>
                                                <p className="text-xs text-white/30 font-black uppercase tracking-[0.8em] italic">في انتظار تفويض المضيف</p>
                                            </div>
                                        </>
                                    ) : (
                                        randomContent?.type === 'image' ? (
                                            <>
                                                <img src={randomContent.content} className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-1000" alt="Active Challenge" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                                <div className="absolute bottom-10 left-10 p-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl max-w-lg">
                                                    <div className="flex items-center gap-4 mb-3">
                                                        <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">وصف الملف الحالي</span>
                                                    </div>
                                                    <p className="text-2xl font-black text-white italic uppercase tracking-tight leading-tight">
                                                        {randomContent.description || "جاري تحليل المعلومات..."}
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full h-full bg-[#0b0b0e] flex flex-col items-center justify-center p-20 text-center">
                                                <BrainCircuit size={150} className="text-purple-500/20 mb-10 animate-pulse" />
                                                <h2 className="text-5xl font-black text-white italic leading-tight max-w-2xl">
                                                    {randomContent?.content || "البث مشفر"}
                                                </h2>
                                            </div>
                                        )
                                    )}

                                    {/* UI Accents */}
                                    <div className="absolute top-10 right-10 w-24 h-24 border-t-4 border-r-4 border-white/10 rounded-tr-[4rem]"></div>
                                    <div className="absolute bottom-10 left-10 w-24 h-24 border-b-4 border-l-4 border-white/10 rounded-bl-[4rem]"></div>

                                    {/* Scan Line Effect */}
                                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20"></div>
                                </div>
                            </div>

                            {/* Signal Strength Bar */}
                            <div className="absolute bottom-0 left-0 right-0 h-3 flex items-center justify-center gap-1">
                                {[...Array(20)].map((_, i) => (
                                    <div key={i} className={`h-1 w-full bg-white/5 rounded-full overflow-hidden`}>
                                        <div className="h-full bg-purple-500/40 w-full animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {gamePhase !== 'idle' && (
                            <div className="bg-[#0b0b0e] border border-white/10 rounded-[4rem] p-12 shadow-4xl overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-12 opacity-5">
                                    <TrendingUp size={200} />
                                </div>
                                <div className="flex items-center justify-between mb-12 relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 p-px">
                                            <div className="w-full h-full rounded-3xl bg-[#0b0b0e] flex items-center justify-center">
                                                <Layout size={40} className="text-purple-400" />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter">بيانات الجلسة المباشرة</h3>
                                            <p className="text-white/20 font-bold text-xs uppercase tracking-[0.3em] mt-1">مقاييس المشاركين في الوقت الفعلي</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-10">
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">الوقت المتبقي</div>
                                            <div className="text-5xl font-black text-white font-mono">{timeLeft}s</div>
                                        </div>
                                        <div className="w-px h-16 bg-white/10"></div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">مرحلة اللعبة</div>
                                            <div className="text-2xl font-black text-purple-400 uppercase tracking-tighter italic">{gamePhase === 'voting' ? 'تصويت' : gamePhase === 'results' ? 'نتائج' : 'إستعداد'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Bars */}
                                <div className="space-y-12 relative z-10">
                                    {/* Truth Bar */}
                                    <div className="space-y-5">
                                        <div className="flex justify-between items-end px-2">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                                    <CheckCircle2 size={24} className="text-blue-500" />
                                                </div>
                                                <span className="text-3xl font-black text-white uppercase italic">صادق</span>
                                            </div>
                                            <div className="flex items-baseline gap-3">
                                                <span className="text-6xl font-black text-blue-500 font-mono tracking-tighter">{truthVotes}</span>
                                                <span className="text-xl font-bold text-white/20 uppercase tracking-widest leading-none mb-2">وحدة</span>
                                            </div>
                                        </div>
                                        <div className="h-6 w-full bg-white/5 rounded-full overflow-hidden p-1.5 border border-white/10 shadow-inner">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 rounded-full transition-all duration-1000 shadow-[0_0_25px_rgba(59,130,246,0.4)] relative"
                                                style={{ width: `${Math.max(truthPercentage, 2)}%` }}
                                            >
                                                <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lie Bar */}
                                    <div className="space-y-5">
                                        <div className="flex justify-between items-end px-2">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                                                    <XCircle size={24} className="text-red-500" />
                                                </div>
                                                <span className="text-3xl font-black text-white uppercase italic">كاذب</span>
                                            </div>
                                            <div className="flex items-baseline gap-3">
                                                <span className="text-6xl font-black text-red-500 font-mono tracking-tighter">{lieVotes}</span>
                                                <span className="text-xl font-bold text-white/20 uppercase tracking-widest leading-none mb-2">وحدة</span>
                                            </div>
                                        </div>
                                        <div className="h-6 w-full bg-white/5 rounded-full overflow-hidden p-1.5 border border-white/10 shadow-inner">
                                            <div
                                                className="h-full bg-gradient-to-r from-red-700 via-red-500 to-red-400 rounded-full transition-all duration-1000 shadow-[0_0_25px_rgba(239,68,68,0.4)] relative"
                                                style={{ width: `${Math.max(liePercentage, 2)}%` }}
                                            >
                                                <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Reveal Section */}
                                {gamePhase === 'results' && !actualAnswer && (
                                    <div className="mt-16 p-12 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-[3.5rem] animate-in zoom-in duration-700 relative overflow-hidden group/reveal">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/reveal:translate-x-full transition-transform duration-1000"></div>
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                                            <div className="flex items-center gap-8">
                                                <div className="w-24 h-24 rounded-[2.5rem] bg-white text-black flex items-center justify-center shadow-2xl rotate-6 group-hover/reveal:rotate-0 transition-transform duration-500">
                                                    <Lock size={48} className="animate-pulse" />
                                                </div>
                                                <div>
                                                    <h4 className="text-4xl font-black text-white italic leading-none uppercase tracking-tighter">التقييم النهائي</h4>
                                                    <p className="text-purple-400 font-bold text-sm tracking-[0.4em] uppercase italic mt-2">بث النتيجة الرسمية للمتابعين</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleRevealAnswer}
                                                className="px-20 py-8 bg-white text-black rounded-3xl font-black text-3xl hover:bg-zinc-200 hover:scale-105 transition-all shadow-4xl active:scale-95 uppercase tracking-tighter border-b-[10px] border-zinc-400 relative overflow-hidden group/btn"
                                            >
                                                <span className="relative z-10">إظهار الحقيقة</span>
                                                <div className="absolute inset-0 bg-purple-600 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {actualAnswer && (
                                    <div className="mt-16 animate-in zoom-in duration-500">
                                        <div className={`relative p-16 rounded-[4.5rem] border-2 overflow-hidden flex items-center justify-center gap-16 shadow-4xl ${actualAnswer === 'truth'
                                            ? 'bg-blue-600/20 border-blue-500/50'
                                            : 'bg-red-600/20 border-red-500/50'
                                            }`}>
                                            <div className="absolute inset-0 bg-white/5 animate-pulse"></div>
                                            <div className="relative z-10 p-10 bg-white/10 rounded-[3rem] backdrop-blur-3xl border border-white/10">
                                                {actualAnswer === 'truth'
                                                    ? <CheckCircle2 size={160} className="text-blue-500 drop-shadow-[0_0_40px_rgba(59,130,246,0.6)]" />
                                                    : <XCircle size={160} className="text-red-500 drop-shadow-[0_0_40px_rgba(239,68,68,0.6)]" />
                                                }
                                            </div>
                                            <div className="relative z-10">
                                                <div className="text-sm font-black text-white/40 uppercase tracking-[0.6em] mb-3 italic">النتائج البروتوكولية المعتمدة</div>
                                                <div className={`text-[10rem] font-black italic tracking-tighther leading-none ${actualAnswer === 'truth' ? 'text-blue-500' : 'text-red-500'
                                                    }`}>
                                                    {actualAnswer === 'truth' ? 'صـادق' : 'كـاذب'}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleReset}
                                            className="mt-12 w-full text-white/20 hover:text-white/60 font-black text-[10px] uppercase tracking-[1em] transition-all hover:tracking-[1.2em] py-4"
                                        >
                                            تهيئة تسلسل النشر العصبي التالي
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* CONTROL COLUMN (Right - 4 Cols) */}
                    <div className="lg:col-span-4 space-y-8 animate-in slide-in-from-right duration-700 delay-200">
                        {/* Master Timer Control */}
                        <div className="bg-[#0b0b0e] border border-white/10 rounded-[4rem] p-12 shadow-4xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Timer size={120} />
                            </div>
                            <div className="relative z-10 space-y-10">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                                        <Timer className="text-purple-400" size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">إعدادات الجولة</h3>
                                        <p className="text-white/20 font-bold text-[10px] uppercase tracking-widest">تكوين النبض الزمني</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-black text-white/40 uppercase tracking-widest">مدة التصويت</span>
                                        <span className="text-3xl font-black text-white font-mono italic">{timerDuration}s</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="60"
                                        step="5"
                                        value={timerDuration}
                                        onChange={(e) => setTimerDuration(parseInt(e.target.value))}
                                        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-purple-500"
                                    />
                                    <div className="flex justify-between text-[10px] font-bold text-white/20 uppercase tracking-tighter">
                                        <span>10 ثواني</span>
                                        <span>60 ثانية</span>
                                    </div>
                                </div>

                                <button
                                    onClick={startNewRound}
                                    disabled={gamePhase !== 'idle'}
                                    className={`w-full py-6 rounded-3xl font-black text-xl uppercase tracking-widest transition-all flex items-center justify-center gap-4 border-b-4 active:border-b-0 active:translate-y-1 ${gamePhase === 'idle'
                                        ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white border-purple-900 shadow-xl'
                                        : 'bg-white/5 text-white/20 border-white/10 cursor-not-allowed'
                                        }`}
                                >
                                    <Play size={24} />
                                    بدء الجولة
                                </button>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="bg-[#0b0b0e] border border-white/10 rounded-[4rem] p-12 shadow-4xl relative overflow-hidden">
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-8 flex items-center gap-4">
                                <BarChart3 className="text-blue-400" size={24} />
                                لمحة إحصائية
                            </h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-2">
                                    <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">إجمالي الأصوات</div>
                                    <div className="text-3xl font-black text-white font-mono italic">{totalVotes}</div>
                                </div>
                                <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-2">
                                    <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">الدقة</div>
                                    <div className="text-3xl font-black text-blue-400 font-mono italic">
                                        {actualAnswer ? (actualAnswer === 'truth' ? truthPercentage : liePercentage).toFixed(0) : '0'}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Connection & Setup Safety */}
                        <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/10 rounded-[4rem] p-10 space-y-6">
                            <div className="flex items-center gap-4 text-white/40">
                                <ShieldCheck size={20} />
                                <span className="text-[10px] font-black uppercase tracking-widest">بروتوكول الأمان الفعال</span>
                            </div>
                            <p className="text-xs text-white/60 font-bold leading-relaxed">
                                تأكد من مزامنة روابط الأوبس قبل بدء البث المباشر لضمان وصول البيانات لجميع المتابعين في الوقت الفعلي.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Link / Info Card */}
                <div className="mt-12 bg-white/5 border border-white/5 rounded-[4rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-3xl animate-in slide-in-from-bottom duration-1000">
                    <div className="flex items-center gap-8">
                        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                            <Info size={28} className="text-white/20" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-white uppercase italic tracking-tight">معمارية البث التفاعلي</h4>
                            <p className="text-white/40 font-bold text-xs uppercase tracking-[0.4em] mt-1 italic">إصدار المحرك 2.4.0 • الأصول محملة</p>
                        </div>
                    </div>
                    <div className="flex gap-6">
                        <button
                            onClick={onHome}
                            className="bg-white/5 hover:bg-white/10 text-white/40 hover:text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest border border-white/10 transition-all active:scale-95"
                        >
                            العودة للرئيسية
                        </button>
                        <button
                            onClick={() => setShowOBSLinks(true)}
                            className="bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-4xl shadow-purple-900/40 transition-all flex items-center gap-4 border-b-4 border-black/40 active:scale-95 active:border-b-0 active:translate-y-1"
                        >
                            <Layout size={24} />
                            توزيع روابط الأوبس
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
