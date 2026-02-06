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
        <div className="fixed inset-0 z-[9999] bg-black text-white font-sans overflow-hidden flex flex-col items-center justify-center p-4">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-black to-black animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/5 rounded-full blur-[120px] animate-pulse-slow"></div>
                {/* Grid overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(20,0,0,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(20,0,0,0.3)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
            </div>

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-md flex flex-col items-center">

                {/* --- PASSWORD STEP --- */}
                {step === 'PASSWORD' && (
                    <div className={`w-full flex flex-col items-center animate-in fade-in zoom-in duration-500 ${shake ? 'animate-shake' : ''}`}>
                        <div className="mb-8 relative group">
                            <div className="absolute inset-0 bg-red-600/20 blur-xl rounded-full group-hover:bg-red-600/30 transition-all duration-500"></div>
                            <Lock size={64} className={`relative z-10 transition-all duration-300 ${error ? 'text-red-500 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]' : 'text-white/80'}`} />
                        </div>

                        <h2 className="text-4xl font-black italic tracking-tighter mb-2 text-center text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">
                            {userType === 'NEW' ? 'بروتوكول الأمان' : 'تسجيل الدخول'}
                        </h2>
                        <p className="text-red-500/80 font-bold tracking-[0.3em] text-xs uppercase mb-10 text-center">
                            RESTRICTED ACCESS AREA
                        </p>

                        <div style={{ direction: 'ltr' }} className="flex flex-wrap items-center justify-center gap-2 mb-8">
                            {pin.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={el => inputs.current[i] = el}
                                    type="text"
                                    inputMode="text"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleInput(i, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(i, e)}
                                    className={`
                        w-12 h-16 
                        bg-black/40 border-2 rounded-xl 
                        text-center text-2xl font-black text-white 
                        focus:outline-none focus:border-red-500 focus:shadow-[0_0_20px_rgba(220,38,38,0.4)]
                        transition-all duration-200
                        ${error ? 'border-red-600 text-red-500' : 'border-white/10'}
                        ${digit ? 'border-white/40 bg-white/5' : ''}
                      `}
                                />
                            ))}
                        </div>

                        {error && <div className="text-red-500 font-bold tracking-widest animate-bounce">ACCESS DENIED</div>}
                    </div>
                )}

                {/* --- FINGERPRINT / SCANNING STEP --- */}
                {(step === 'FINGERPRINT' || step === 'SCANNING') && (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700">
                        <div className="mb-6 text-center space-y-2">
                            <h2 className="text-3xl font-black italic tracking-tighter text-white">
                                {userType === 'NEW' ? 'إعداد البصمة البيومترية' : 'المصادقة البيومترية'}
                            </h2>
                            <p className="text-white/40 text-sm font-bold tracking-wider">
                                {step === 'SCANNING' ? 'SCANNING BIOMETRIC DATA...' : 'TOUCH TO AUTHENTICATE'}
                            </p>
                        </div>

                        <button
                            onClick={startScan}
                            disabled={step === 'SCANNING'}
                            className="relative group cursor-pointer active:scale-95 transition-transform duration-200 outline-none"
                        >
                            {/* Fingerprint Container */}
                            <div className={`w-40 h-40 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-center relative overflow-hidden transition-all duration-300 ${step === 'SCANNING' ? 'border-red-500/50 shadow-[0_0_40px_rgba(220,38,38,0.3)]' : 'hover:border-white/30 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]'}`}>

                                {/* Fingerprint Icon */}
                                <Fingerprint
                                    size={80}
                                    className={`relative z-10 transition-colors duration-300 ${step === 'SCANNING' ? 'text-red-500 animate-pulse' : 'text-white/20 group-hover:text-white/80'}`}
                                    strokeWidth={1}
                                />

                                {/* Scanning Line Animation */}
                                {step === 'SCANNING' && (
                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-red-500 shadow-[0_0_15px_#ef4444] z-20 animate-scan"></div>
                                )}
                            </div>
                        </button>
                    </div>
                )}

                {/* --- SUCCESS STEP --- */}
                {step === 'SUCCESS' && (
                    <div className="flex flex-col items-center animate-in zoom-in duration-500 text-center">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full animate-pulse"></div>
                            <Unlock size={80} className="text-green-500 relative z-10 drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]" />
                        </div>

                        <h2 className="text-4xl font-black italic text-white mb-2 tracking-tighter">
                            {userType === 'NEW' ? 'تم حفظ الهوية بنجاح' : 'مرحباً بك مجدداً'}
                        </h2>
                        <p className="text-green-500 font-bold tracking-[0.2em] text-sm uppercase">
                            ACCESS GRANTED
                        </p>
                    </div>
                )}

            </div>

            <div className="absolute bottom-8 opacity-30 flex items-center gap-2">
                <Sparkles size={14} className="text-white" />
                <span className="text-[10px] text-white uppercase tracking-[0.3em]">SECURED BY iABS</span>
            </div>

            <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 1.5s linear infinite;
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
