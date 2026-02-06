import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabase';

interface GlobalPasswordPageProps {
    onSuccess: () => void;
}

export const GlobalPasswordPage: React.FC<GlobalPasswordPageProps> = ({ onSuccess }) => {
    const [pin, setPin] = useState<string[]>([]);
    const [targetPin, setTargetPin] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);
    const [success, setSuccess] = useState(false);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const { data, error } = await supabase
                    .from('app_config')
                    .select('value')
                    .eq('key', 'admin_password')
                    .single();

                if (data && data.value) {
                    const pass = data.value;
                    setTargetPin(pass);
                    setPin(new Array(pass.length).fill(''));
                    // Initialize refs array based on length
                    inputs.current = inputs.current.slice(0, pass.length);
                } else {
                    // Fallback
                    console.warn("No admin_password found in app_config, using fallback");
                    const fallback = "123456";
                    setTargetPin(fallback);
                    setPin(new Array(fallback.length).fill(''));
                }
            } catch (e) {
                console.error("Failed to fetch password config:", e);
                const fallback = "123456";
                setTargetPin(fallback);
                setPin(new Array(fallback.length).fill(''));
            } finally {
                setIsLoading(false);
            }
        };
        fetchConfig();
    }, []);

    // Focus first input when loading is done
    useEffect(() => {
        if (!isLoading && inputs.current[0]) {
            // slight delay to ensure render
            setTimeout(() => inputs.current[0]?.focus(), 100);
        }
    }, [isLoading]);

    const handleInput = (index: number, value: string) => {
        // Allow alphanumeric, so no regex restriction unless we want only numbers
        // The user said "6 squares" which implies numbers usually, but admin_password is "admin123" by default.
        // So we must allow letters.

        // Take only the last character entered
        const char = value.slice(-1);

        const newPin = [...pin];
        newPin[index] = char;
        setPin(newPin);

        // Auto-advance
        if (char && index < pin.length - 1) {
            inputs.current[index + 1]?.focus();
        }

        // Check if complete
        if (newPin.every(d => d !== '') && index === pin.length - 1 && char && targetPin) {
            // Small delay to allow render of last char before verifying
            setTimeout(() => verifyPin(newPin.join('')), 50);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            // Move back on backspace if current is empty
            inputs.current[index - 1]?.focus();
        }
    };

    const verifyPin = (enteredPin: string) => {
        if (enteredPin === targetPin) {
            setSuccess(true);
            setTimeout(() => {
                localStorage.setItem('site_access_granted', 'true');
                onSuccess();
            }, 1000); // Wait for success animation
        } else {
            setError(true);
            setShake(true);
            setTimeout(() => {
                setShake(false);
                setPin(new Array(pin.length).fill('')); // Clear
                inputs.current[0]?.focus();
                setError(false);
            }, 600);
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-all duration-1000">
                <div className="text-center animate-in fade-in zoom-in duration-700">
                    <div className="relative mb-6 mx-auto w-32 h-32 flex items-center justify-center">
                        <div className="absolute inset-0 bg-green-500/30 blur-3xl rounded-full animate-pulse"></div>
                        <Unlock size={80} className="text-green-500 relative z-10 animate-bounce" />
                    </div>
                    <h2 className="text-4xl font-black text-white italic tracking-widest">ACCESS GRANTED</h2>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-[9999] bg-[#050505] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600"></div>
                    <div className="text-white/50 animate-pulse tracking-widest text-sm">SECURING CONNECTION...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center font-sans overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-iabs-red/10 blur-[150px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse delay-1000"></div>
            </div>

            <div className={`relative z-10 w-full max-w-4xl p-10 flex flex-col items-center transition-transform duration-300 ${shake ? 'translate-x-[10px] sm:translate-x-[-10px] animate-shake' : ''}`}>

                <div className="mb-10 relative group">
                    <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full group-hover:bg-white/10 transition-all duration-500"></div>
                    <Lock size={64} className={`relative z-10 transition-all duration-500 ${error ? 'text-red-500 scale-110 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'text-white/80 group-hover:text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]'}`} />
                </div>

                <h1 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter mb-2 text-center">
                    سري للغاية
                </h1>
                <p className="text-white/40 font-bold tracking-[0.2em] text-sm uppercase mb-12 text-center">
                    Security Access Protocol
                </p>

                {/* Dynamic Input Grid - Center it */}
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-12 direction-ltr max-w-full">
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
                w-10 h-14 md:w-14 md:h-16 lg:w-16 lg:h-20
                bg-white/5 border-2 rounded-2xl 
                text-center text-2xl md:text-3xl font-black text-white 
                focus:outline-none focus:scale-110 transition-all duration-300
                shadow-[0_4px_20px_rgba(0,0,0,0.5)]
                ${error
                                    ? 'border-red-500/50 bg-red-500/10 animate-pulse'
                                    : digit
                                        ? 'border-white/50 bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                                        : 'border-white/10 hover:border-white/30'
                                }
              `}
                        />
                    ))}
                </div>

                {error && (
                    <p className="absolute bottom-20 text-red-500 font-bold tracking-widest animate-bounce">
                        ACCESS DENIED
                    </p>
                )}

                <div className="absolute bottom-10 opacity-30 flex items-center gap-2">
                    <Sparkles size={16} className="text-white" />
                    <span className="text-xs text-white uppercase tracking-widest">Secured by iABS</span>
                </div>

            </div>

            <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .animate-in { animation-duration: 0.6s; animation-fill-mode: both; }
        .fade-in { animation-name: fadeIn; }
        .zoom-in { animation-name: zoomIn; }
      `}</style>
        </div>
    );
};
