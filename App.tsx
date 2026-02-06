
import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { CategorySelect } from './components/CategorySelect';
import { FawazirGame } from './components/FawazirGame';
import { MusicalChairsGame } from './components/MusicalChairsGame';
import { MasaqilWar } from './components/MasaqilWar';
import { BlurGuess } from './components/BlurGuess';
import { SpinWheel } from './components/SpinWheel';
import { Raffle } from './components/Raffle';
import { FlagQuiz } from './components/FlagQuiz';
import { TeamBattle } from './components/TeamBattle';
import { TypingRace } from './components/TypingRace';
import { GridHunt } from './components/GridHunt';
import { CupShuffle } from './components/CupShuffle';
import { TerritoryWar } from './components/TerritoryWar';
import { AdminDashboard } from './components/AdminDashboard';
import { GlobalAnnouncement } from './components/GlobalAnnouncement';
import { ViewState } from './types';
import {
  Trophy, Play, Lock, User, Swords, Image as ImageIcon,
  RotateCw, Gift, Flag, Users2, Keyboard, Gem, Coffee,
  PaintBucket, Sparkles, ShieldCheck, Zap, Armchair,
  Maximize2, MonitorOff, CheckCircle2, AlertTriangle,
  Crown, Medal, Loader2, RefreshCw, ChevronRight
} from 'lucide-react';
import { supabase, leaderboardService } from './services/supabase';

// Premium Avatar Component with Auto-Fix for Kick Images
const ProAvatar = ({ url, username, size = "w-14 h-14" }: { url?: string, username: string, size?: string }) => {
  const [src, setSrc] = React.useState(url);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Update src if url prop changes (e.g. when leaderboard reloads)
  React.useEffect(() => {
    setSrc(url);
  }, [url]);

  const handleFix = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // Use AllOrigins with a different approach to ensure it fetches JSON
      const targetUrl = `https://kick.com/api/v2/channels/${username.toLowerCase()}`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const raw = await res.json();
        const data = JSON.parse(raw.contents);
        if (data.user?.profile_pic) {
          setSrc(data.user.profile_pic);
          // Optional: Update in Supabase for next time
          await supabase.from('profiles').update({ avatar_url: data.user.profile_pic }).eq('username', username);
        }
      }
    } catch (e) {
      console.warn("Failed to fix avatar for", username);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className={`${size} rounded-2xl overflow-hidden border-2 border-white/10 group-hover:border-iabs-red transition-all relative flex-shrink-0 bg-zinc-900 shadow-lg`}>
      {src ? (
        <img
          src={src}
          className="w-full h-full object-cover"
          onError={handleFix}
          alt={username}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center opacity-20 bg-black/40">
          <User size={size.includes('w-2') || size.includes('w-3') ? 48 : 24} />
        </div>
      )}
      {isRefreshing && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
          <Loader2 className="animate-spin text-white" size={16} />
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<ViewState | 'ADMIN_LOGIN' | 'ADMIN_PANEL'>('HOME');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);

  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [globalPasswordInput, setGlobalPasswordInput] = useState('');
  const [globalLoginError, setGlobalLoginError] = useState('');
  const [isLoginSuccess, setIsLoginSuccess] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<string | null>(null);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const authStatus = sessionStorage.getItem('iabs_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setIsAuthenticating(false);
  }, []);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.6;
      audio.play().catch(e => console.warn("Sound play blocked:", e));
    } catch (e) {
      console.warn("Audio failed:", e);
    }
  };

  useEffect(() => {
    // Better Real-time listener
    const channel = supabase
      .channel('announcements_realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          console.log('SURPRISE! New announcement:', payload.new.content);
          setActiveAnnouncement(payload.new.content);
          playNotificationSound();
        }
      )
      .subscribe((status) => {
        console.log('Announcement subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadLeaderboard = () => {
    setIsLoadingLeaderboard(true);
    leaderboardService.getTopPlayers(10).then(data => {
      setLeaderboardData(data);
      setIsLoadingLeaderboard(false);
    });
  };

  useEffect(() => {
    if (currentView === 'LEADERBOARD') {
      loadLeaderboard();
    }
  }, [currentView]);

  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id);
    setCurrentView('FAWAZIR_GAME');
  };

  const handleAdminLogin = async () => {
    const isValid = await leaderboardService.verifyAdminPassword(adminPasswordInput);
    if (isValid) {
      setCurrentView('ADMIN_PANEL');
      setAdminPasswordInput('');
      setLoginError('');
    } else {
      setLoginError('كلمة المرور غير صحيحة');
    }
  };

  const handleGlobalLogin = async (providedPin?: string) => {
    const pinToVerify = providedPin || globalPasswordInput;
    if (pinToVerify.length !== 6) return;

    setIsAuthenticating(true); // Show a mini loader if needed, but we have isLoginSuccess
    const isValid = await leaderboardService.verifyAdminPassword(pinToVerify);

    if (isValid) {
      setIsLoginSuccess(true);

      // Premium success animation delay
      setTimeout(() => {
        setIsAuthenticated(true);
        sessionStorage.setItem('iabs_auth', 'true');
        setGlobalPasswordInput('');
        setGlobalLoginError('');
        setIsLoginSuccess(false);
        setIsAuthenticating(false);
      }, 2000);
    } else {
      setGlobalLoginError('تـصـريح غير صحيح - النظام مغلق');
      setGlobalPasswordInput('');
      setIsAuthenticating(false);
      // focus first input and clear it in the daughter component too
    }
  };

  const handleGoHome = () => setCurrentView('HOME');

  const PremiumGameButton = ({ title, icon: Icon, onClick, isPrimary = false }: any) => (
    <button
      onClick={onClick}
      className={`group relative flex items-center justify-center gap-4 md:gap-6 overflow-hidden border-2 border-white/10 transition-all duration-300 active:scale-95 bg-iabs-red text-white font-black italic
        ${isPrimary
          ? "px-10 py-5 text-2xl md:text-3xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(255,0,0,0.4)] hover:scale-105 w-full lg:max-w-md"
          : "px-4 py-4 text-lg md:text-xl rounded-[2rem] shadow-[0_15px_40px_rgba(255,0,0,0.3)] hover:scale-110 w-full"
        }`}
    >
      <div className="absolute inset-0 bg-white/30 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 skew-x-[-35deg] pointer-events-none z-20"></div>
      <div className="absolute top-0 left-0 w-full h-[45%] bg-gradient-to-b from-white/30 to-transparent pointer-events-none z-10"></div>

      <div className={`relative z-30 flex-shrink-0 transition-transform duration-500 transform group-hover:scale-115 group-hover:rotate-6 flex items-center justify-center ${isPrimary ? 'w-12 h-12' : 'w-10 h-10'}`}>
        <Icon size={isPrimary ? 40 : 28} color="#FFFFFF" strokeWidth={2.5} className="drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
      </div>

      <span className="relative z-30 drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)] tracking-tighter uppercase leading-tight" style={{ color: '#FFFFFF' }}>
        {title}
      </span>
    </button>
  );

  const GlobalLoginPage = () => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [pinValue, setPinValue] = useState('');

    const handleContainerClick = () => {
      inputRef.current?.focus();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
      setPinValue(val);
      setGlobalPasswordInput(val);

      if (val.length === 6) {
        handleGlobalLogin(val);
      }
    };

    // Auto focus on mount
    useEffect(() => {
      setTimeout(() => inputRef.current?.focus(), 800);
    }, []);

    // Clear PIN if error happens and user wants to retry
    useEffect(() => {
      if (globalLoginError) {
        setPinValue('');
        setGlobalPasswordInput('');
      }
    }, [globalLoginError]);

    const digits = [0, 1, 2, 3, 4, 5];

    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[#020202] overflow-hidden font-sans rtl" dir="rtl" onClick={handleContainerClick}>
        {/* Deep Space Background */}
        <div className="absolute inset-0">
          <div className={`absolute inset-0 transition-all duration-1000 ${isLoginSuccess ? 'bg-green-600/10' : 'bg-red-600/5'}`}></div>

          {/* Moving Star-field / Grid */}
          <div className="absolute inset-0 opacity-10 animate-[pulse_4s_infinite]"
            style={{
              backgroundImage: `linear-gradient(${isLoginSuccess ? '#22c55e' : '#dc2626'} 0.5px, transparent 0.5px), linear-gradient(90deg, ${isLoginSuccess ? '#22c55e' : '#dc2626'} 0.5px, transparent 0.5px)`,
              backgroundSize: '100px 100px',
              perspective: '1000px',
              transform: 'rotateX(60deg) translateY(-200px) scale(2)'
            }}></div>

          <div className="absolute h-full w-full bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#000_80%)]"></div>

          {/* Bio-Organic Glows */}
          <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full animate-pulse transition-colors duration-1000 ${isLoginSuccess ? 'bg-green-600/15' : 'bg-red-600/10'}`}></div>
          <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full animate-float transition-colors duration-1000 ${isLoginSuccess ? 'bg-green-900/15' : 'bg-red-900/10'}`}></div>
        </div>

        {/* Hidden Input for Real Functionality */}
        <input
          ref={inputRef}
          type="tel"
          pattern="[0-9]*"
          value={pinValue}
          onChange={handleInputChange}
          className="absolute opacity-0 pointer-events-none"
          autoFocus={true}
        />

        {/* Main Interface Content */}
        <div className="relative z-10 w-full max-w-4xl px-8" onClick={(e) => e.stopPropagation()}>
          <div className="relative animate-in zoom-in duration-1000">
            {/* Outer Protection Glow */}
            <div className={`absolute -inset-20 blur-[120px] rounded-[5rem] animate-pulse transition-all duration-1000 ${isLoginSuccess ? 'bg-green-500/20' : 'bg-red-600/10'}`}></div>

            <div className={`bg-black/90 border-t-2 border-x-2 rounded-[5rem] p-16 md:p-24 shadow-2xl backdrop-blur-2xl relative overflow-hidden group transition-all duration-700 ${isLoginSuccess ? 'border-green-500 shadow-green-500/30' : 'border-white/10 shadow-red-600/20'}`}>

              {/* Scanline Overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-40 bg-[length:100%_2px,3px_100%]"></div>

              {/* Success Overlay Layer */}
              {isLoginSuccess && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 animate-in fade-in duration-700">
                  <div className="relative mb-12">
                    <div className="absolute inset-0 bg-green-500 blur-[80px] animate-pulse opacity-60 scale-150"></div>
                    <div className="relative p-10 bg-green-500/10 rounded-full border-4 border-green-500/50 shadow-[0_0_80px_rgba(34,197,94,0.5)]">
                      <ShieldCheck size={160} className="text-green-400 animate-[success-pop_0.8s_cubic-bezier(0.34,1.56,0.64,1)_forwards]" />
                    </div>
                  </div>
                  <h2 className="text-9xl font-black text-white italic tracking-tighter mb-6 animate-in slide-in-from-bottom duration-700">تـم الـتـصـريح</h2>
                  <div className="flex items-center gap-6 text-green-400 font-black tracking-[1em] text-sm uppercase">
                    <div className="w-16 h-[2px] bg-green-500/40"></div>
                    Access Granted
                    <div className="w-16 h-[2px] bg-green-500/40"></div>
                  </div>
                  <div className="mt-20 w-96 h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <div className="h-full bg-gradient-to-r from-green-600 via-green-400 to-green-600 animate-[unlock-load_1.8s_ease-in-out_forwards]"></div>
                  </div>
                </div>
              )}

              {/* Technical HUD Overlay */}
              {!isLoginSuccess && (
                <div className="absolute top-10 left-10 right-10 flex justify-between opacity-20 font-mono text-[10px] text-red-600 tracking-widest hidden md:flex">
                  <div className="flex gap-10">
                    <div>[ SYSTEM CORE V4.2 ]</div>
                    <div>[ CRYPTO_SSL: ENABLED ]</div>
                  </div>
                  <div className="animate-pulse">AWAITING_INPUT_SIGNAL...</div>
                </div>
              )}

              {/* Header section with Floating Logo */}
              <div className="text-center mb-20 relative">
                <div className="relative inline-block mb-10 group/logo">
                  <div className={`absolute inset-0 blur-[60px] rounded-full scale-150 animate-pulse transition-colors duration-1000 ${isLoginSuccess ? 'bg-green-600/40' : 'bg-red-600/30'}`}></div>
                  <img
                    src="https://i.ibb.co/pvCN1NQP/95505180312.png"
                    className="h-44 mx-auto relative z-10 drop-shadow-[0_0_50px_rgba(220,38,38,0.7)] animate-float cursor-pointer hover:scale-110 transition-transform duration-500"
                    alt="Logo"
                    onClick={() => inputRef.current?.focus()}
                  />
                </div>

                <h1 className="text-8xl font-black text-white italic tracking-tighter uppercase mb-4 drop-shadow-[0_10px_40px_rgba(0,0,0,0.8)]">دخول النـظام</h1>
                <div className="flex items-center justify-center gap-8">
                  <div className="h-[2px] w-24 bg-gradient-to-l from-transparent via-red-600/40 to-transparent"></div>
                  <p className="text-red-500 font-black tracking-[0.8em] text-xs uppercase italic animate-pulse">Sovereign Protection Hub</p>
                  <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-red-600/40 to-transparent"></div>
                </div>
              </div>

              {/* PIN Box Display Group */}
              <div className="flex justify-center flex-wrap gap-4 md:gap-6 mb-16 direction-ltr cursor-pointer" onClick={handleContainerClick}>
                {digits.map((i) => {
                  const hasValue = pinValue.length > i;
                  const isCurrent = pinValue.length === i;
                  return (
                    <div key={i} className="relative group">
                      {/* Cyber Pulse Ring when current */}
                      {isCurrent && !isLoginSuccess && (
                        <div className="absolute inset-0 rounded-3xl border-2 border-red-600 animate-ping opacity-20"></div>
                      )}

                      <div className={`
                        w-16 h-24 md:w-28 md:h-36 rounded-3xl flex items-center justify-center transition-all duration-500
                        border-2 relative z-10 overflow-hidden shadow-2xl
                        ${isCurrent ? 'bg-red-600/10 border-red-500 scale-110 shadow-red-600/20' : hasValue ? 'bg-black/40 border-red-900/40' : 'bg-black/60 border-white/5'}
                        group-hover:border-red-600/30
                      `}>
                        {/* Digit or Hidden Disc */}
                        {hasValue ? (
                          <div className="w-6 h-6 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-in zoom-in duration-300"></div>
                        ) : isCurrent ? (
                          <div className="w-[4px] h-10 bg-red-600 animate-pulse rounded-full"></div>
                        ) : null}

                        {/* Technical lines inside box */}
                        <div className="absolute top-2 right-2 w-3 h-[1px] bg-red-600/20"></div>
                        <div className="absolute bottom-2 left-2 w-3 h-[1px] bg-red-600/20"></div>
                      </div>

                      {/* Box Glow underneath */}
                      <div className={`absolute -inset-2 rounded-3xl blur transition-opacity duration-500 
                        ${isCurrent ? 'opacity-100 bg-red-600/10' : 'opacity-0'}`}></div>
                    </div>
                  );
                })}
              </div>

              {/* Status & Errors */}
              <div className="min-h-[80px] flex flex-col items-center justify-center relative mb-8">
                {globalLoginError ? (
                  <div className="flex items-center gap-6 text-red-500 font-bold bg-red-950/20 px-12 py-6 rounded-full border border-red-600/30 animate-[shake_0.6s_ease-in-out]">
                    <AlertTriangle size={32} className="animate-pulse" />
                    <span className="text-3xl tracking-tighter italic uppercase">{globalLoginError}</span>
                  </div>
                ) : (
                  <div className="text-white/20 font-black text-xs uppercase tracking-[1em] animate-pulse flex items-center gap-3">
                    <ShieldCheck size={18} />
                    Securing Connection...
                  </div>
                )}
              </div>

              {/* Bottom Signal Pings */}
              <div className="flex gap-4 justify-center items-center opacity-40">
                <div className="h-[2px] w-20 bg-gradient-to-l from-transparent via-white/10 to-transparent"></div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping delay-200"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping delay-500"></div>
                </div>
                <div className="h-[2px] w-20 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes unlock-load { 0% { width: 0; } 100% { width: 100%; } }
          @keyframes success-pop {
            0% { transform: scale(0.5) rotate(-20deg); opacity: 0; }
            70% { transform: scale(1.1) rotate(5deg); opacity: 1; }
            100% { transform: scale(1) rotate(0); opacity: 1; }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-15px); }
            40%, 80% { transform: translateX(15px); }
          }
          .direction-ltr { direction: ltr; }
        `}</style>
      </div>
    );
  };

  const WelcomeGate = () => (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/98 backdrop-blur-3xl p-6 animate-in fade-in duration-1000">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600/15 via-transparent to-transparent"></div>

      <div className="max-w-2xl w-full bg-[#050505] border border-red-600/30 rounded-[4rem] p-12 relative overflow-hidden shadow-[0_0_150px_rgba(255,0,0,0.3)]">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>

        <div className="text-center mb-12">
          <img src="https://i.ibb.co/pvCN1NQP/95505180312.png" className="h-40 mx-auto mb-8 drop-shadow-[0_0_30px_rgba(255,0,0,0.6)] animate-float" alt="Logo" />
          <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase">بـوابـة الدخـول</h1>
          <p className="text-red-500 font-black tracking-[0.5em] text-xs uppercase mt-3">iABS System Access</p>
        </div>

        <div className="space-y-6 mb-12">
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex items-center gap-6 group hover:border-red-600/40 transition-all">
            <div className="w-20 h-20 bg-red-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,0,0,0.4)] shrink-0">
              <Maximize2 size={40} className="text-white" />
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-black text-white mb-1">أبعاد الشاشة (75%)</h3>
              <p className="text-gray-400 text-sm leading-relaxed font-bold">لضمان رؤية الميدان بالكامل، يرجى ضبط زووم المتصفح على <span className="text-red-500 underline decoration-2">75%</span> من إعدادات المتصفح.</p>
            </div>
          </div>

          <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex items-center gap-6 group hover:border-red-600/40 transition-all">
            <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center shadow-lg shrink-0 border border-red-600/20">
              <MonitorOff size={40} className="text-red-500" />
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-black text-white mb-1">تعطيل مانع الإعلانات</h3>
              <p className="text-gray-400 text-sm leading-relaxed font-bold">يمنع منعاً باتاً تشغيل AdBlock، الموقع يعتمد كلياً على الصور وبدونها ستواجه <span className="text-red-500">أخطاء برمجية</span> ولن تظهر الصور.</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowWelcome(false)}
          className="w-full bg-white text-black font-black py-7 rounded-[2rem] text-3xl hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-4 shadow-[0_20px_60px_rgba(255,255,255,0.1)] italic border-t-4 border-red-600/10 uppercase"
        >
          دخـول الـمـنـصـة <CheckCircle2 size={32} />
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'ADMIN_PANEL': return <AdminDashboard onLogout={handleGoHome} />;
      case 'ADMIN_LOGIN': return (
        <div className="flex-1 w-full flex flex-col items-center justify-center animate-in zoom-in">
          <div className="glass-card p-10 rounded-[2.5rem] border border-red-500/30 text-center w-full max-w-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
            <Lock size={48} className="mx-auto text-red-500 mb-6" />
            <h2 className="text-2xl font-black text-white mb-6">منطقة الإدارة المحظورة</h2>
            <input type="password" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} placeholder="أدخل كود التصريح..." className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-center text-white font-bold mb-4 focus:border-red-500 focus:outline-none" onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()} />
            {loginError && <p className="text-red-500 text-sm font-bold mb-4 animate-pulse">{loginError}</p>}
            <div className="flex gap-3">
              <button onClick={handleGoHome} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl font-bold">إلغاء</button>
              <button onClick={handleAdminLogin} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(220,38,38,0.4)]">دخول</button>
            </div>
          </div>
        </div>
      );
      case 'FAWAZIR_SELECT': return <CategorySelect onSelect={handleCategorySelect} onBack={handleGoHome} />;
      case 'FAWAZIR_GAME': return selectedCategory ? <FawazirGame category={selectedCategory} onFinish={() => setCurrentView('LEADERBOARD')} onHome={handleGoHome} /> : null;
      case 'MUSICAL_CHAIRS': return <MusicalChairsGame onHome={handleGoHome} />;
      case 'MASAQIL_WAR': return <MasaqilWar channelConnected={true} onHome={handleGoHome} />;
      case 'BLUR_GUESS': return <BlurGuess channelConnected={true} onHome={handleGoHome} />;
      case 'SPIN_WHEEL': return <SpinWheel channelConnected={true} onHome={handleGoHome} />;
      case 'RAFFLE': return <Raffle channelConnected={true} onHome={handleGoHome} />;
      case 'FLAG_QUIZ': return <FlagQuiz channelConnected={true} onHome={handleGoHome} />;
      case 'TEAM_BATTLE': return <TeamBattle channelConnected={true} onHome={handleGoHome} />;
      case 'TYPING_RACE': return <TypingRace channelConnected={true} onHome={handleGoHome} />;
      case 'GRID_HUNT': return <GridHunt channelConnected={true} onHome={handleGoHome} />;
      case 'CUP_SHUFFLE': return <CupShuffle channelConnected={true} onHome={handleGoHome} />;
      case 'TERRITORY_WAR': return <TerritoryWar channelConnected={true} onHome={handleGoHome} />;

      case 'LEADERBOARD': return (
        <div className="animate-in fade-in zoom-in duration-500 max-w-6xl mx-auto w-full pt-10 px-6 h-full flex flex-col items-center">
          <div className="text-center mb-12">
            <h2 className="text-7xl font-black italic red-neon-text tracking-tighter mb-4">أساطير الساحة</h2>
            <div className="flex items-center justify-center gap-4 text-white/40 uppercase tracking-[0.5em] text-xs font-bold">
              <div className="h-[1px] w-12 bg-white/20" />
              TOP SURVIVORS
              <div className="h-[1px] w-12 bg-white/20" />
            </div>
          </div>

          <div className="w-full space-y-12">
            {/* Top 3 Podium Cards */}
            {!isLoadingLeaderboard && leaderboardData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end mb-16">
                {/* 2nd Place */}
                {leaderboardData[1] && (
                  <div className="order-2 md:order-1 h-[280px] glass-card rounded-[3rem] p-8 border-2 border-slate-400/30 flex flex-col items-center justify-center relative hover:scale-105 transition-all group overflow-hidden bg-gradient-to-t from-slate-900/80 to-transparent">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Medal size={80} className="text-slate-400" />
                    </div>
                    <div className="mb-6 relative">
                      <ProAvatar url={leaderboardData[1].avatar_url} username={leaderboardData[1].username} size="w-24 h-24" />
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-slate-400 text-black flex items-center justify-center font-black text-xl border-4 border-black">2</div>
                    </div>
                    <div className="text-2xl font-black text-white mb-2">{leaderboardData[1].username}</div>
                    <div className="flex gap-4">
                      <span className="text-slate-400 font-bold">{leaderboardData[1].score} نقطة</span>
                      <span className="text-white/20">|</span>
                      <span className="text-slate-400 font-bold">{leaderboardData[1].wins} فوز</span>
                    </div>
                  </div>
                )}

                {/* 1st Place - Champion */}
                {leaderboardData[0] && (
                  <div className="order-1 md:order-2 h-[340px] glass-card rounded-[3.5rem] p-8 border-4 border-yellow-500/50 flex flex-col items-center justify-center relative hover:scale-110 transition-all group overflow-hidden bg-gradient-to-t from-yellow-900/40 via-yellow-950/20 to-transparent shadow-[0_0_80px_rgba(234,179,8,0.2)]">
                    <div className="absolute -top-10 animate-float opacity-30">
                      <Crown size={120} className="text-yellow-500 blur-sm" />
                    </div>
                    <div className="mb-8 relative z-10">
                      <div className="absolute -inset-4 bg-yellow-500/20 blur-2xl rounded-full animate-pulse" />
                      <ProAvatar url={leaderboardData[0].avatar_url} username={leaderboardData[0].username} size="w-32 h-32" />
                      <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-yellow-500 text-black flex items-center justify-center font-black text-2xl border-4 border-black animate-bounce">1</div>
                    </div>
                    <div className="text-4xl font-black text-white italic mb-3 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{leaderboardData[0].username}</div>
                    <div className="flex gap-6 relative z-10 bg-black/40 px-6 py-2 rounded-full border border-yellow-500/20">
                      <span className="text-yellow-500 font-black text-xl">{leaderboardData[0].score} PTS</span>
                      <span className="text-white/20">|</span>
                      <span className="text-yellow-500 font-black text-xl">{leaderboardData[0].wins} WINS</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {leaderboardData[2] && (
                  <div className="order-3 h-[240px] glass-card rounded-[3rem] p-8 border-2 border-orange-700/30 flex flex-col items-center justify-center relative hover:scale-105 transition-all group overflow-hidden bg-gradient-to-t from-orange-950/40 to-transparent">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Medal size={60} className="text-orange-700" />
                    </div>
                    <div className="mb-6 relative">
                      <ProAvatar url={leaderboardData[2].avatar_url} username={leaderboardData[2].username} size="w-20 h-20" />
                      <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-orange-700 text-white flex items-center justify-center font-black text-lg border-4 border-black">3</div>
                    </div>
                    <div className="text-xl font-black text-white mb-2">{leaderboardData[2].username}</div>
                    <div className="flex gap-4">
                      <span className="text-orange-700 font-bold">{leaderboardData[2].score} نقطة</span>
                      <span className="text-white/20">|</span>
                      <span className="text-orange-700 font-bold">{leaderboardData[2].wins} فوز</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Rest of the players table */}
            <div className="glass-card rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl bg-black/40 backdrop-blur-xl flex-1 mb-8">
              {isLoadingLeaderboard ? (
                <div className="flex flex-col items-center justify-center h-[300px] gap-6">
                  <Loader2 className="animate-spin text-iabs-red" size={60} />
                  <div className="text-xl text-gray-400 font-bold animate-pulse italic tracking-widest">GATHERING LEGENDS...</div>
                </div>
              ) : (
                <div className="overflow-x-auto h-full custom-scrollbar">
                  <table className="w-full text-right">
                    <thead className="bg-white/5 border-b border-white/5">
                      <tr className="text-gray-400 font-black uppercase text-[10px] tracking-[0.3em]">
                        <th className="p-8 text-center w-24">الرتبة</th>
                        <th className="p-8 text-right">المتسابق</th>
                        <th className="p-8 text-center">مرات الفوز</th>
                        <th className="p-8 text-left">مجموع النقاط</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {leaderboardData.slice(3).map((user, index) => (
                        <tr key={user.id} className="hover:bg-white/10 transition-all group animate-in slide-in-from-right duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                          <td className="p-6 text-center">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-gray-500 group-hover:text-white group-hover:bg-iabs-red/20 transition-all transition-colors border border-white/5">
                              {index + 4}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-6">
                              <ProAvatar url={user.avatar_url} username={user.username} />
                              <span className="font-black text-2xl text-white group-hover:text-iabs-red transition-all group-hover:translate-x-[-4px] tracking-tight">{user.username}</span>
                            </div>
                          </td>
                          <td className="p-6 text-center">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/5 border border-white/5 font-black text-xl text-gray-300 group-hover:text-white group-hover:border-white/20 transition-all font-mono">
                              {user.wins}
                            </div>
                          </td>
                          <td className="p-6 text-left">
                            <div className="font-black text-3xl text-kick-green font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(83,252,24,0.4)] group-hover:scale-110 transition-transform origin-left">
                              {user.score}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {leaderboardData.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 space-y-6 opacity-20">
                      <Trophy size={100} strokeWidth={1} />
                      <div className="text-2xl font-black italic">ARENA IS EMPTY</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 mt-10 mb-16">
            <button onClick={handleGoHome} className="group px-12 py-5 bg-white/5 hover:bg-white/10 rounded-[2rem] text-white font-black text-lg transition-all border border-white/10 hover:border-white/30 flex items-center gap-4">
              <ChevronRight className="group-hover:translate-x-2 transition-transform" /> العودة للرئيسية
            </button>
            <button onClick={loadLeaderboard} className="p-5 bg-iabs-red/10 text-iabs-red rounded-[2rem] border-2 border-iabs-red/20 hover:bg-iabs-red hover:text-white transition-all">
              <RefreshCw size={24} className={isLoadingLeaderboard ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      );

      case 'HOME':
      default:
        return (
          <div className="flex-1 flex flex-col items-center w-full max-w-7xl px-4 py-4 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="mb-14 relative flex flex-col items-center">
              <div className="absolute inset-0 bg-iabs-red/10 blur-[200px] rounded-full scale-150 animate-pulse"></div>
              <img src="https://i.ibb.co/pvCN1NQP/95505180312.png" className="h-44 mb-6 animate-float drop-shadow-[0_0_50px_rgba(255,0,0,0.5)]" alt="iABS Logo" />
              <div className="relative text-center">
                <h1 className="text-7xl md:text-[10rem] font-black red-neon-text leading-none italic tracking-tighter select-none drop-shadow-[0_20px_60px_rgba(255,0,0,0.6)]">
                  iABS ARENA
                </h1>
                <div className="mt-8 flex items-center justify-center gap-12">
                  <div className="h-[4px] w-64 bg-gradient-to-l from-transparent via-iabs-red to-transparent"></div>
                  <span className="text-sm font-black tracking-[2em] text-white/40 uppercase italic">Sovereign HUB</span>
                  <div className="h-[4px] w-64 bg-gradient-to-r from-transparent via-iabs-red to-transparent"></div>
                </div>
              </div>
            </div>

            <div className="w-full flex flex-col items-center mb-24 space-y-6 px-6">
              {/* Row 1: Primary Game - Centered and compact */}
              <div className="w-full flex justify-center max-w-4xl">
                <PremiumGameButton title="ابدأ الفوازير" icon={Sparkles} isPrimary onClick={() => setCurrentView('FAWAZIR_SELECT')} />
              </div>

              {/* Row 2: Two Columns - More compact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                <PremiumGameButton title="الكراسي الموسيقية" icon={Armchair} isPrimary onClick={() => setCurrentView('MUSICAL_CHAIRS')} />
                <PremiumGameButton title="حرب المصاقيل" icon={Swords} isPrimary onClick={() => setCurrentView('MASAQIL_WAR')} />
              </div>
            </div>

            <div className="w-full max-w-6xl space-y-14 mb-20">
              <div className="flex items-center gap-10 px-8 opacity-25">
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-white to-transparent"></div>
                <h2 className="text-white font-black text-sm uppercase tracking-[1.5em] italic">Secondary Units</h2>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white to-transparent"></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 px-6">
                <PremiumGameButton title="تخمين الصورة" icon={ImageIcon} onClick={() => setCurrentView('BLUR_GUESS')} />
                <PremiumGameButton title="عجلة الحظ" icon={Zap} onClick={() => setCurrentView('SPIN_WHEEL')} />
                <PremiumGameButton title="سحب الجوائز" icon={Gift} onClick={() => setCurrentView('RAFFLE')} />
                <PremiumGameButton title="تحدي الأعلام" icon={Flag} onClick={() => setCurrentView('FLAG_QUIZ')} />
                <PremiumGameButton title="حرب الفرق" icon={Users2} onClick={() => setCurrentView('TEAM_BATTLE')} />
                <PremiumGameButton title="سباق الكتابة" icon={Keyboard} onClick={() => setCurrentView('TYPING_RACE')} />
                <PremiumGameButton title="صائد الكنز" icon={Gem} onClick={() => setCurrentView('GRID_HUNT')} />
                <PremiumGameButton title="تحدي الأكواب" icon={Coffee} onClick={() => setCurrentView('CUP_SHUFFLE')} />
                <PremiumGameButton title="حرب الألوان" icon={PaintBucket} onClick={() => setCurrentView('TERRITORY_WAR')} />
              </div>
            </div>

            <div className="flex gap-20 mt-16 pb-28">
              <button onClick={() => setCurrentView('LEADERBOARD')} className="flex items-center gap-6 text-white/40 hover:text-iabs-red font-black text-3xl tracking-[0.2em] transition-all hover:scale-110 group italic">
                <Trophy size={32} className="group-hover:animate-bounce text-yellow-500 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
                لوحة الصدارة
              </button>
              <button onClick={() => setCurrentView('ADMIN_LOGIN')} className="flex items-center gap-6 text-white/10 hover:text-white/40 font-black text-3xl tracking-[0.2em] transition-all hover:scale-110 group border-l-4 border-white/5 pl-20 italic">
                <ShieldCheck size={32} className="group-hover:text-blue-500 transition-colors" />
                الإدارة
              </button>
            </div>
          </div>
        );
    }
  };

  if (isAuthenticating) return <div className="h-screen w-screen bg-black" />;
  if (!isAuthenticated) return <GlobalLoginPage />;

  return (
    <Layout currentView={currentView as ViewState} onChangeView={(v) => setCurrentView(v)}>
      {showWelcome && <WelcomeGate />}
      {renderContent()}

      {activeAnnouncement && (
        <GlobalAnnouncement
          message={activeAnnouncement}
          onClose={() => setActiveAnnouncement(null)}
        />
      )}
    </Layout>
  );
};

export default App;
