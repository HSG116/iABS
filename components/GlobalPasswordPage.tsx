import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Sparkles } from 'lucide-react';

interface GlobalPasswordPageProps {
    onSuccess: () => void;
}

export const GlobalPasswordPage: React.FC<GlobalPasswordPageProps> = ({ onSuccess }) => {
    const [pin, setPin] = useState<string[]>(['', '', '', '', '', '']);
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);
    const [success, setSuccess] = useState(false);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    // correct pin
    const CORRECT_PIN = "123456";

    useEffect(() => {
        // Focus first input on mount
        inputs.current[0]?.focus();
    }, []);

    const handleInput = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only allow numbers

        const newPin = [...pin];
        newPin[index] = value.slice(-1); // Take only the last character entered
        setPin(newPin);

        // Auto-advance
        if (value && index < 5) {
            inputs.current[index + 1]?.focus();
        }

        // Check if complete
        if (newPin.every(d => d !== '') && index === 5 && value) {
            verifyPin(newPin.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            // Move back on backspace if current is empty
            inputs.current[index - 1]?.focus();
        }
    };

    const verifyPin = (enteredPin: string) => {
        if (enteredPin === CORRECT_PIN) {
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
                setPin(['', '', '', '', '', '']); // Clear
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

    return (
        <div className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center font-sans overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-iabs-red/10 blur-[150px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse delay-1000"></div>
            </div>

            <div className={`relative z-10 w-full max-w-lg p-10 flex flex-col items-center transition-transform duration-300 ${shake ? 'translate-x-[10px] sm:translate-x-[-10px] animate-shake' : ''}`}>

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

                <div className="flex gap-3 md:gap-4 mb-12 direction-ltr">
                    {pin.map((digit, i) => (
                        <input
                            key={i}
                            ref={el => inputs.current[i] = el}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleInput(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            className={`
                w-12 h-16 md:w-16 md:h-20 
                bg-white/5 border-2 rounded-2xl 
                text-center text-3xl font-black text-white 
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
                    <p className="absolute -bottom-12 text-red-500 font-bold tracking-widest animate-bounce">
                        INCORRECT PIN
                    </p>
                )}

                <div className="absolute bottom-10 opacity-30 flex items-center gap-2">
                    <Sparkles size={16} className="text-white" />
                    <span className="text-xs text-white uppercase tracking-widest">Secured by iABS</span>
                </div>

            </div>

            <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .animate-in { animation-duration: 0.6s; animation-fill-mode: both; }
        .fade-in { animation-name: fadeIn; }
        .zoom-in { animation-name: zoomIn; }
      `}</style>
        </div>
    );
};
