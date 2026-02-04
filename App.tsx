
import React, { useState, useEffect } from 'react';
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
import { ViewState } from './types';
import {
  Trophy, Play, Lock, User, Swords, Image as ImageIcon,
  RotateCw, Gift, Flag, Users2, Keyboard, Gem, Coffee,
  PaintBucket, Sparkles, ShieldCheck, Zap, Armchair,
  Maximize2, MonitorOff, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { leaderboardService } from './services/supabase';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState | 'ADMIN_LOGIN' | 'ADMIN_PANEL'>('HOME');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);

  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (currentView === 'LEADERBOARD') {
      setIsLoadingLeaderboard(true);
      leaderboardService.getTopPlayers(10).then(data => {
        setLeaderboardData(data);
        setIsLoadingLeaderboard(false);
      });
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
        <div className="animate-in fade-in zoom-in duration-500 max-w-4xl mx-auto w-full pt-8 text-right h-full flex flex-col">
          <h2 className="text-5xl font-black red-neon-text text-center mb-10 flex items-center justify-center gap-4">
            <Trophy size={48} className="text-yellow-500" /> أساطير الساحة
          </h2>
          <div className="glass-card rounded-[2.5rem] overflow-hidden red-neon-border shadow-2xl flex-1 relative bg-black/40 backdrop-blur-xl">
            {isLoadingLeaderboard ? (
              <div className="flex items-center justify-center h-64 text-xl text-gray-400 font-bold animate-pulse">جاري تحميل البيانات...</div>
            ) : (
              <div className="overflow-y-auto h-full custom-scrollbar">
                <table className="w-full text-right border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-iabs-red text-white font-black uppercase tracking-widest text-sm shadow-xl">
                      <th className="p-6 text-center w-24">#</th>
                      <th className="p-6">المتسابق</th>
                      <th className="p-6 text-center">مرات الفوز</th>
                      <th className="p-6 text-left">النقاط</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {leaderboardData.map((user, index) => (
                      <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                        <td className="p-4 text-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg mx-auto ${index === 0 ? 'bg-yellow-500 text-black shadow-[0_0_15px_gold]' : index === 1 ? 'bg-gray-400 text-black' : index === 2 ? 'bg-orange-700 text-white' : 'bg-white/5 text-gray-500'}`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/10 group-hover:border-iabs-red transition-colors relative">
                              {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><User size={24} className="text-white/20" /></div>}
                            </div>
                            <span className="font-black text-xl text-white group-hover:text-iabs-red transition-colors">{user.username}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center"><span className="bg-white/5 px-4 py-1 rounded-full font-mono font-bold text-gray-300">{user.wins}</span></td>
                        <td className="p-4 text-left font-black text-2xl text-kick-green font-mono tracking-widest drop-shadow-[0_0_10px_rgba(83,252,24,0.3)]">{user.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {leaderboardData.length === 0 && <div className="text-center py-20 text-gray-500 font-bold text-xl">لا يوجد متصدرين حتى الآن.. كن الأول!</div>}
              </div>
            )}
          </div>
          <div className="text-center mt-8 pb-8"><button onClick={handleGoHome} className="px-10 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white font-bold transition-all border border-white/10 hover:border-white/30">العودة للرئيسية</button></div>
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

  return (
    <Layout currentView={currentView as ViewState} onChangeView={(v) => setCurrentView(v)}>
      {showWelcome && <WelcomeGate />}
      {renderContent()}
    </Layout>
  );
};

export default App;
