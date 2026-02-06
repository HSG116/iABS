import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Fingerprint, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabase';

interface GlobalPasswordPageProps {
    onSuccess: () => void;
}

type AuthStep = 'LOADING' | 'PASSWORD' | 'FINGERPRINT' | 'SCANNING' | 'SUCCESS' | 'WELCOME';

export const GlobalPasswordPage: React.FC<GlobalPasswordPageProps> = ({ onSuccess }) => {
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
            const hasAccess = localStorage.getItem('site_access_granted');
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
                    .eq('key', 'admin_password')
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

        // Simulate 3s scan
        setTimeout(() => {
            finishScan();
        }, 2500);
    };

    const finishScan = () => {
        if (successSound.current) {
            successSound.current.play().catch(() => { });
        }
        setStep('SUCCESS');

        // Save persistence now
        localStorage.setItem('site_access_granted', 'true');

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
                            {userType === 'NEW' ? 'بروتوكول الأمان' : 'تسجيل الدخول'}
                        </h2>
                        <p className="text-red-500 font-bold tracking-[0.5em] text-sm md:text-base uppercase mb-16 text-center drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">
                            RESTRICTED ACCESS AREA
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
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-1000">
                        <div className="mb-12 text-center space-y-4">
                            <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                                {userType === 'NEW' ? 'تأكيد الهوية' : 'المصادقة البيومترية'}
                            </h2>
                            <p className="text-white/50 text-base md:text-lg font-bold tracking-[0.3em] uppercase">
                                {step === 'SCANNING' ? 'SCANNING BIOMETRIC DATA...' : 'TOUCH SENSOR TO PROCEED'}
                            </p>
                        </div>

                        <button
                            onClick={startScan}
                            disabled={step === 'SCANNING'}
                            className="relative group cursor-pointer active:scale-95 transition-transform duration-200 outline-none"
                        >
                            {/* Glow Effect */}
                            <div className={`absolute inset-0 bg-red-600/30 blur-[60px] rounded-full transition-all duration-500 ${step === 'SCANNING' ? 'scale-150 opacity-100' : 'scale-100 opacity-50 group-hover:scale-125 group-hover:opacity-80'}`}></div>

                            {/* Fingerprint Icon - No Container, Just Icon */}
                            <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
                                <Fingerprint
                                    size={180}
                                    className={`relative z-10 transition-all duration-500 ${step === 'SCANNING' ? 'text-red-500 drop-shadow-[0_0_30px_rgba(255,0,0,0.8)]' : 'text-white/30 group-hover:text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]'}`}
                                    strokeWidth={0.5}
                                />

                                {/* Modern Scanning Grid */}
                                {step === 'SCANNING' && (
                                    <>
                                        <div className="absolute inset-0 z-20 bg-[linear-gradient(transparent_50%,rgba(255,0,0,0.2)_50%)] bg-[size:100%_4px] animate-scan-grid pointer-events-none"></div>
                                        <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500 shadow-[0_0_25px_#ef4444] z-30 animate-scan"></div>
                                    </>
                                )}
                            </div>
                        </button>
                    </div>
                )}

                {/* --- SUCCESS STEP --- */}
                {step === 'SUCCESS' && (
                    <div className="flex flex-col items-center animate-in zoom-in duration-700 text-center">
                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-green-500/30 blur-[80px] rounded-full animate-pulse"></div>
                            <Unlock size={100} className="text-green-500 relative z-10 drop-shadow-[0_0_40px_rgba(34,197,94,0.8)] animate-bounce" />
                        </div>

                        <h2 className="text-5xl md:text-7xl font-black italic text-white mb-4 tracking-tighter drop-shadow-2xl">
                            {userType === 'NEW' ? 'تم حفظ الهوية' : 'مرحباً بك مجدداً'}
                        </h2>
                        <p className="text-green-500 font-bold tracking-[0.5em] text-xl uppercase drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]">
                            ACCESS GRANTED
                        </p>
                    </div>
                )}

            </div>

            <div className="absolute bottom-10 opacity-40 flex items-center gap-3 animate-pulse">
                <Sparkles size={18} className="text-white" />
                <span className="text-xs text-white uppercase tracking-[0.5em] font-bold">SECURED BY iABS</span>
            </div>

            <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes scan-grid {
            0% { background-position: 0 0; }
            100% { background-position: 0 100%; }
        }
        .animate-scan {
          animation: scan 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .animate-scan-grid {
            animation: scan-grid 1s linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
        </div>
    );
};
