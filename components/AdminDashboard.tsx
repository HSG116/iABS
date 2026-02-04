
import React, { useState } from 'react';
import { Shield, Trash2, Key, Database, Save, AlertTriangle, UserPlus, UserMinus, Search, Star } from 'lucide-react';
import { leaderboardService } from '../services/supabase';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [targetUser, setTargetUser] = useState('');
  const [pointDelta, setPointDelta] = useState(100);
  const [statusMsg, setStatusMsg] = useState('');
  const [isError, setIsError] = useState(false);

  const showStatus = (msg: string, err = false) => {
    setStatusMsg(msg);
    setIsError(err);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleAdjustStats = async (isAdding: boolean) => {
    if (!targetUser) return showStatus('يرجى إدخال اسم المستخدم', true);
    
    const scoreChange = isAdding ? pointDelta : -pointDelta;
    const winChange = isAdding ? 1 : -1;

    const { error } = await leaderboardService.adjustPlayerStats(targetUser, scoreChange, winChange);
    
    if (error) {
      showStatus('حدث خطأ في تحديث البيانات', true);
    } else {
      showStatus(`تم ${isAdding ? 'إضافة' : 'تنقيص'} ${pointDelta} نقطة للمستخدم ${targetUser}`);
      setTargetUser('');
    }
  };

  return (
    <div className="w-full h-full bg-black/95 text-white flex flex-col animate-in fade-in duration-300 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="h-20 shrink-0 border-b border-red-900/30 flex items-center justify-between px-8 bg-red-950/10">
        <div className="flex items-center gap-4">
          <Shield size={32} className="text-red-500 shadow-[0_0_15px_red]" />
          <div>
            <h1 className="text-2xl font-black tracking-widest italic">C O N T R O L _ P A N E L</h1>
            <p className="text-[10px] text-red-500 font-mono font-black uppercase">iABS Admin Engine v3.0</p>
          </div>
        </div>
        <button onClick={onLogout} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs shadow-lg transition-all active:scale-95 border-t border-white/20 uppercase">خروج الإدارة</button>
      </div>

      <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
        {statusMsg && (
          <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-10 py-4 rounded-full font-black shadow-2xl z-[100] animate-in slide-in-from-top-4 ${isError ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
            {statusMsg}
          </div>
        )}

        {/* --- MAIN ADMIN TOOL: PLAYER STATS ADJUSTER --- */}
        <div className="glass-card p-10 rounded-[3rem] border-2 border-white/5 relative overflow-hidden group shadow-2xl">
           <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-blue-600 to-transparent"></div>
           <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-[0_0_15px_rgba(37,99,235,0.5)]"><Star size={24} className="text-white"/></div>
              <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">تعديل رصيد اللاعبين</h2>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Search size={14}/> ابحث عن اسم اللاعب (كما في الشات)</label>
                    <input 
                      type="text" 
                      value={targetUser}
                      onChange={(e) => setTargetUser(e.target.value)}
                      placeholder="مثال: PlayerKick_123" 
                      className="w-full bg-black border-2 border-white/10 rounded-2xl p-4 text-white font-black text-xl focus:border-blue-600 outline-none transition-all shadow-inner"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest">كمية النقاط (Score)</label>
                    <div className="flex items-center gap-4">
                       {[50, 100, 500, 1000].map(val => (
                          <button key={val} onClick={() => setPointDelta(val)} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${pointDelta === val ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10'}`}>{val}</button>
                       ))}
                       <input type="number" value={pointDelta} onChange={e => setPointDelta(Number(e.target.value))} className="w-24 bg-zinc-900 border border-white/10 rounded-xl p-2 text-center font-bold text-blue-500" />
                    </div>
                 </div>
              </div>

              <div className="flex flex-col justify-end gap-4">
                 <button 
                   onClick={() => handleAdjustStats(true)}
                   className="w-full py-6 bg-green-600 text-white font-black text-2xl rounded-3xl hover:bg-green-500 transition-all shadow-2xl flex items-center justify-center gap-4 active:scale-95 italic border-t-4 border-white/20"
                 >
                   <UserPlus size={32} /> إضافة الرصيد
                 </button>
                 <button 
                   onClick={() => handleAdjustStats(false)}
                   className="w-full py-4 bg-red-900/40 text-red-500 font-black text-lg rounded-2xl hover:bg-red-900/60 transition-all border border-red-500/20 flex items-center justify-center gap-4 active:scale-95 italic"
                 >
                   <UserMinus size={24} /> تنقيص الرصيد
                 </button>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* Reset Leaderboard */}
           <div className="bg-zinc-900/50 border border-red-500/20 p-8 rounded-[2.5rem] hover:border-red-500/40 transition-all relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 text-red-500/5 group-hover:text-red-500/10 transition-all transform group-hover:scale-110"><Trash2 size={200} /></div>
              <h3 className="text-xl font-black text-red-500 flex items-center gap-3 mb-4"><Database size={24}/> تصفير الميدان</h3>
              <p className="text-sm text-gray-500 mb-8 font-bold leading-relaxed">سيتم حذف جميع سجلات اللاعبين من قاعدة البيانات نهائياً. لا يمكنك استعادة البيانات بعد التصفير.</p>
              <button 
                onClick={async () => { if(confirm('تصفير الكل؟')){ await leaderboardService.resetLeaderboard(); showStatus('تم التصفير'); }}}
                className="w-full py-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/40 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-xl"
              >
                <AlertTriangle size={18} /> تصفير قاعدة البيانات
              </button>
           </div>

           {/* Security */}
           <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem] hover:border-white/10 transition-all">
              <h3 className="text-xl font-black text-white flex items-center gap-3 mb-6"><Key size={24} className="text-gray-400"/> تأمين الوصول</h3>
              <div className="space-y-4">
                 <input type="password" placeholder="كلمة مرور إدارة جديدة" className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" />
                 <button className="w-full py-4 bg-white text-black font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2">
                    <Save size={18} /> تحديث كود الدخول
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
