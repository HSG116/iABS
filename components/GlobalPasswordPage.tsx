import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Fingerprint, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabase';

interface GlobalPasswordPageProps {
    onSuccess: () => void;
    storageKey?: string;
    title?: string;
    subtitle?: string;
    newTitle?: string;
    returningTitle?: string;
    configKey?: string;
}

type AuthStep = 'LOADING' | 'PASSWORD' | 'FINGERPRINT' | 'SCANNING' | 'SUCCESS' | 'WELCOME';

export const GlobalPasswordPage: React.FC<GlobalPasswordPageProps> = ({
    onSuccess,
    storageKey = 'site_access_granted',
    title,
    subtitle = 'RESTRICTED ACCESS AREA',
    newTitle = 'بروتوكول الأمان',
    returningTitle = 'تسجيل الدخول',
    configKey = 'admin_password'
}) => {
    const [step, setStep] = useState<AuthStep>('LOADING');
    const [pin, setPin] = useState<string[]>([]);
    const [targetPin, setTargetPin] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);
    const [userType, setUserType] = useState<'NEW' | 'RETURNING'>('NEW');

    // Sound Refs
    const scanSound = useRef<HTMLAudioElement | null>(null);
    const successSound = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize Audio
        scanSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/228/228-preview.mp3');
        successSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1114/1114-preview.mp3');
    }, []);

    useEffect(() => {
        const initAuth = async () => {
            // 1. Check LocalStorage for existing access
            const hasAccess = localStorage.getItem(storageKey);
            if (hasAccess === 'true') {
                setUserType('RETURNING');
                setStep('FINGERPRINT'); // Skip password, go to fingerprint
            } else {
                setUserType('NEW');
                setStep('PASSWORD'); // Show password first
            }

            // 2. Fetch Password Config (needed for new users OR verification)
            try {
                const { data } = await supabase
                    .from('app_config')
                    .select('value')
                    .eq('key', configKey)
                    .single();

                if (data && data.value) {
                    setTargetPin(data.value);
                    setPin(new Array(data.value.length).fill(''));
                    inputs.current = inputs.current.slice(0, data.value.length);
                } else {
                    const fallback = "123456";
                    setTargetPin(fallback);
                    setPin(new Array(fallback.length).fill(''));
                }
            } catch (e) {
                console.error("Auth init error:", e);
                const fallback = "123456";
                setTargetPin(fallback);
                setPin(new Array(fallback.length).fill(''));
            }
        };

        initAuth();
    }, []);

    // Focus effect for password input
    useEffect(() => {
        if (step === 'PASSWORD' && inputs.current[0]) {
            setTimeout(() => inputs.current[0]?.focus(), 100);
        }
    }, [step]);

    const handleInput = (index: number, value: string) => {
        const char = value.slice(-1);
        const newPin = [...pin];
        newPin[index] = char;
        setPin(newPin);

        if (char && index < pin.length - 1) {
            inputs.current[index + 1]?.focus();
        }

        if (newPin.every(d => d !== '') && index === pin.length - 1 && char && targetPin) {
            verifyPin(newPin.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const verifyPin = (enteredPin: string) => {
        if (enteredPin === targetPin) {
            // Transition to Fingerprint setup
            setError(false);
            setStep('FINGERPRINT');
        } else {
            setError(true);
            setShake(true);
            setTimeout(() => {
                setShake(false);
                setPin(new Array(pin.length).fill(''));
                inputs.current[0]?.focus();
                setError(false);
            }, 600);
        }
    };

    const startScan = () => {
        if (step !== 'FINGERPRINT') return;

        setStep('SCANNING');
        if (scanSound.current) {
            scanSound.current.currentTime = 0;
            scanSound.current.play().catch(() => { });
        }

        // Simulate 5s scan
        setTimeout(() => {
            finishScan();
        }, 5000);
    };

    const finishScan = () => {
        if (successSound.current) {
            successSound.current.play().catch(() => { });
        }
        setStep('SUCCESS');

        // Save persistence now
        localStorage.setItem(storageKey, 'true');

        // Wait for "Access Granted" / "Welcome Back" message
        setTimeout(() => {
            onSuccess();
        }, 2000);
    };

    if (step === 'LOADING') {
        return <div className="fixed inset-0 bg-black z-[9999]" />;
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-black text-white font-sans overflow-hidden flex flex-col items-center justify-center p-0 m-0">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-black to-black animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vh] bg-red-600/5 rounded-full blur-[150px] animate-pulse-slow"></div>
                {/* Grid overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(30,0,0,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(30,0,0,0.2)_1px,transparent_1px)] bg-[size:60px_60px] opacity-10"></div>
            </div>

            {/* Content Container - Perfectly Centered */}
            <div className="relative z-10 w-full flex flex-col items-center justify-center min-h-screen">

                {/* --- PASSWORD STEP --- */}
                {step === 'PASSWORD' && (
                    <div className={`flex flex-col items-center animate-in fade-in zoom-in duration-700 ${shake ? 'animate-shake' : ''}`}>

                        <div className="mb-12 relative group">
                            <div className="absolute inset-0 bg-red-600/40 blur-[50px] rounded-full group-hover:bg-red-600/60 transition-all duration-500 animate-pulse"></div>
                            <Lock size={80} strokeWidth={1.5} className={`relative z-10 transition-all duration-300 ${error ? 'text-red-500 drop-shadow-[0_0_30px_rgba(255,0,0,1)]' : 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]'}`} />
                        </div>

                        <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4 text-center text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-500 drop-shadow-2xl">
                            {userType === 'NEW' ? (title || newTitle) : (title || returningTitle)}
                        </h2>

                        {/* Security Warning */}
                        <div className="mb-8 bg-red-900/40 border border-red-500/30 px-6 py-2 rounded-full animate-pulse flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                            <p className="text-red-200 font-bold text-sm tracking-wider">يرجى إخفاء الشاشة الآن</p>
                        </div>

                        <p className="text-red-500 font-bold tracking-[0.5em] text-sm md:text-base uppercase mb-16 text-center drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">
                            {subtitle}
                        </p>

                        <div style={{ direction: 'ltr' }} className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-12">
                            {pin.map((digit, i) => (
                                <div key={i} className="relative group">
                                    <div className={`pointer-events-none absolute inset-0 bg-red-600/20 blur-xl rounded-full transition-all duration-300 ${digit ? 'opacity-100 scale-150' : 'opacity-0'}`}></div>
                                    <input
                                        ref={el => inputs.current[i] = el}
                                        type="text"
                                        inputMode="text"
                                        autoComplete="off"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleInput(i, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(i, e)}
                                        className={`
                                            relative z-20
                                            w-14 h-20 md:w-20 md:h-28 
                                            bg-transparent border-b-4 
                                            text-center text-4xl md:text-6xl font-black text-white 
                                            focus:outline-none focus:border-red-500 focus:scale-110
                                            transition-all duration-300 placeholder-transparent
                                            ${error ? 'border-red-600 text-red-500 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]' : 'border-white/20'}
                                            ${digit ? 'border-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'hover:border-white/50'}
                                        `}
                                    />
                                </div>
                            ))}
                        </div>

                        {error && <div className="text-red-500 font-black tracking-[0.5em] animate-bounce text-lg drop-shadow-[0_0_10px_red]">ACCESS DENIED</div>}
                    </div>
                )}

                {/* --- FINGERPRINT / SCANNING STEP --- */}
                {(step === 'FINGERPRINT' || step === 'SCANNING') && (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-1000 w-full relative">

                        <div className="mb-20 text-center space-y-4 relative z-20">
                            <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-400 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                {userType === 'NEW' ? (title || newTitle) : (title || returningTitle)}
                            </h2>
                            <p className="text-white/60 text-lg md:text-xl font-bold tracking-[0.5em] uppercase animate-pulse">
                                {step === 'SCANNING' ? 'ANALYZING BIOMETRIC DATA...' : 'TOUCH SENSOR TO PROCEED'}
                            </p>
                        </div>

                        <button
                            onClick={startScan}
                            disabled={step === 'SCANNING'}
                            className="relative group cursor-pointer outline-none tap-highlight-transparent"
                        >
                            {/* Outer Rings & Effects */}
                            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-red-500/10 transition-all duration-1000 ${step === 'SCANNING' ? 'scale-100 opacity-100 animate-spin-slow' : 'scale-50 opacity-0'}`}></div>
                            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-red-500/20 border-dashed transition-all duration-1000 ${step === 'SCANNING' ? 'scale-100 opacity-100 animate-reverse-spin' : 'scale-50 opacity-0'}`}></div>

                            {/* Core Glow */}
                            <div className={`absolute inset-0 bg-red-600/20 blur-[100px] rounded-full transition-all duration-500 ${step === 'SCANNING' ? 'scale-150 opacity-100' : 'scale-75 opacity-30 group-hover:scale-100 group-hover:opacity-50'}`}></div>

                            {/* Fingerprint Icon - Massive & Detailed */}
                            <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center">
                                <Fingerprint
                                    size={350}
                                    className={`relative z-10 transition-all duration-700 ${step === 'SCANNING'
                                        ? 'text-red-500 drop-shadow-[0_0_50px_rgba(220,38,38,0.8)] scale-110'
                                        : 'text-white/20 group-hover:text-white/80 group-hover:scale-105 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                        }`}
                                    strokeWidth={0.5}
                                />

                                {/* Advanced Scanning Beam - Boundless */}
                                {step === 'SCANNING' && (
                                    <>
                                        {/* Main Laser Beam */}
                                        <div className="absolute top-0 left-[-50%] w-[200%] h-[10px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_50px_#ef4444] z-50 animate-scan-beam blur-sm"></div>
                                        <div className="absolute top-0 left-[-50%] w-[200%] h-[2px] bg-gradient-to-r from-transparent via-white to-transparent z-50 animate-scan-beam"></div>

                                        {/* Digital Grid Overlay - Moves with beam */}
                                        <div className="absolute inset-0 z-20 overflow-hidden rounded-full opacity-30">
                                            <div className="w-full h-full bg-[linear-gradient(transparent_2px,#ff0000_2px)] bg-[size:100%_40px] animate-scan-grid"></div>
                                        </div>

                                        {/* Random Data Particles */}
                                        <div className="absolute inset-0 z-30 flex items-center justify-center">
                                            <div className="w-full text-center text-red-500 font-mono text-xs opacity-60 animate-pulse tracking-widest">
                                                ID: {Math.random().toString(36).substring(7).toUpperCase()} <br />
                                                MATCHING... {(Math.random() * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </button>
                    </div>
                )}

                {/* --- SUCCESS STEP --- */}
                {step === 'SUCCESS' && (
                    <div className="flex flex-col items-center animate-in zoom-in duration-700 text-center relative z-20">
                        <div className="relative mb-10">
                            <div className="absolute inset-0 bg-green-500/30 blur-[100px] rounded-full animate-pulse"></div>
                            <div className="relative z-10 p-10 bg-green-500/10 rounded-full border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                                <Unlock size={120} className="text-green-500 drop-shadow-[0_0_30px_rgba(34,197,94,0.8)] animate-bounce" />
                            </div>
                        </div>

                        <h2 className="text-6xl md:text-8xl font-black italic text-white mb-6 tracking-tighter drop-shadow-2xl">
                            {userType === 'NEW' ? 'تمت المصادقة' : 'أهلاً بك'}
                        </h2>
                        <p className="text-green-500 font-bold tracking-[0.6em] text-2xl uppercase drop-shadow-[0_0_20px_rgba(34,197,94,0.6)] animate-pulse">
                            ACCESS AUTHORIZED
                        </p>
                    </div>
                )}

            </div>

            <div className="absolute bottom-10 opacity-30 flex items-center gap-3 animate-pulse pointer-events-none">
                <Sparkles size={20} className="text-white" />
                <span className="text-sm text-white uppercase tracking-[0.6em] font-bold">SECURED BY iABS SYSTEM</span>
            </div>

            <style>{`
        @keyframes scan-beam {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes scan-grid {
            0% { background-position: 0 0; }
            100% { background-position: 0 100%; }
        }
        .animate-scan-beam {
          animation: scan-beam 5s ease-in-out infinite; 
        }
        .animate-scan-grid {
            animation: scan-grid 5s linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .animate-spin-slow { animation: spin 10s linear infinite; }
        .animate-reverse-spin { animation: spin 15s linear infinite reverse; }
        @keyframes spin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
      `}</style>
        </div>
    );
};
