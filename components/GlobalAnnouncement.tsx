
import React, { useState, useEffect } from 'react';
import { Megaphone, X, Radio, ShieldAlert, Cpu } from 'lucide-react';

interface GlobalAnnouncementProps {
    message: string;
    onClose: () => void;
}

export const GlobalAnnouncement: React.FC<GlobalAnnouncementProps> = ({ message, onClose }) => {
    const [visible, setVisible] = useState(false);
    const [countdown, setCountdown] = useState(10);

    useEffect(() => {
        // Trigger animations
        const timer = setTimeout(() => setVisible(true), 100);

        // Countdown interval
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Close logic
        const closeTimer = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 1000);
        }, 10000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
            clearTimeout(closeTimer);
        };
    }, [onClose]);

    return (
        <div className={`fixed inset-0 z-[10000] flex items-center justify-center p-6 transition-all duration-700 ${visible ? 'bg-black/90 backdrop-blur-xl opacity-100' : 'bg-transparent backdrop-blur-0 opacity-0 pointer-events-none'}`}>

            {/* Dynamic Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-red-600/10 animate-pulse rounded-full blur-[200px]"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            </div>

            <div className={`relative max-w-5xl w-full transition-all duration-1000 transform ${visible ? 'scale-100 translate-y-0' : 'scale-75 translate-y-40 rotate-12'}`}>

                {/* Massive Neon Pulse Glow */}
                <div className="absolute -inset-4 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 rounded-[4rem] blur-3xl opacity-30 animate-pulse"></div>

                <div className="relative glass-card rounded-[4rem] border-4 border-red-600/40 bg-[#050505] overflow-hidden shadow-[0_0_150px_rgba(255,0,0,0.3)]">

                    {/* Top Decorative Scanning Line */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-red-600/50 shadow-[0_0_15px_red] animate-shimmer"></div>

                    <div className="p-20 flex flex-col items-center text-center">

                        {/* Authority Icon */}
                        <div className="mb-12 relative">
                            <div className="absolute inset-0 bg-red-600 blur-[60px] opacity-30 animate-ping"></div>
                            <div className="w-48 h-48 bg-red-600 rounded-[2.5rem] flex items-center justify-center relative z-10 shadow-[0_0_70px_rgba(255,0,0,0.7)] animate-float border-4 border-white/20">
                                <Radio size={90} className="text-white animate-pulse" />
                            </div>
                        </div>

                        <div className="space-y-6 mb-12">
                            <div className="flex items-center justify-center gap-4 text-red-500 font-black tracking-[1em] text-[10px] uppercase italic drop-shadow-[0_0_10px_red]">
                                <ShieldAlert size={14} /> iABS BROADCAST HQ <ShieldAlert size={14} />
                            </div>

                            <h2 className="text-7xl md:text-8xl font-black text-white italic leading-tight tracking-tighter drop-shadow-[0_10px_40px_rgba(255,0,0,0.6)] uppercase">
                                {message}
                            </h2>
                        </div>

                        <div className="max-w-xl mx-auto mb-14">
                            <p className="text-white/40 font-bold text-xl leading-relaxed italic">بث رسمي من مركز عمليات النظام. يرجى المتابعة والالتزام الفوري.</p>
                        </div>

                        {/* Countdown Badge - In your face! */}
                        <div className="flex items-center gap-10">
                            <div className="h-[2px] w-32 bg-gradient-to-l from-white/10 to-transparent"></div>
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-white/10 rounded-full blur-xl group-hover:bg-red-600/20 transition-all"></div>
                                <div className="relative bg-zinc-900 border-2 border-white/10 px-12 py-5 rounded-full flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center font-black text-3xl shadow-xl">
                                        {countdown}
                                    </div>
                                    <span className="text-sm font-black text-white/60 italic uppercase tracking-[0.3em]">System Syncing...</span>
                                </div>
                            </div>
                            <div className="h-[2px] w-32 bg-gradient-to-r from-white/10 to-transparent"></div>
                        </div>
                    </div>

                    {/* Bottom Security Overlay */}
                    <div className="absolute bottom-0 left-0 w-full h-2 bg-zinc-900 border-t border-white/5">
                        <div
                            className="h-full bg-red-600 shadow-[0_0_20px_red] transition-all duration-[10000ms] ease-linear"
                            style={{ width: visible ? '100%' : '0%' }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Floating Meta Info */}
            <div className="absolute bottom-10 left-10 flex items-center gap-4 opacity-20">
                <Cpu size={24} className="text-white animate-spin-slow" />
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-white uppercase tracking-widest">Protocol: BROADCAST_EVENT</span>
                    <span className="text-[8px] font-black text-white uppercase tracking-widest">Status: ENFORCED_VIEW</span>
                </div>
            </div>

            {/* Right Meta Info */}
            <div className="absolute bottom-10 right-10 flex flex-col items-end opacity-20">
                <span className="text-xs font-black text-white italic tracking-tighter uppercase">iABS System Access 2.0</span>
                <span className="text-[8px] font-black text-red-500 uppercase tracking-widest mt-1">iABS Operation</span>
            </div>
        </div>
    );
};
