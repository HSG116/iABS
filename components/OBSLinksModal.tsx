
import React, { useState } from 'react';
import {
    X, Copy, Check, Sparkles, Armchair, Swords,
    Image as ImageIcon, Zap, Gift, Flag, Users2,
    Keyboard, Gem, Coffee, PaintBucket, ExternalLink
} from 'lucide-react';
import { ViewState } from '../types';

interface OBSLinksModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface GameLink {
    id: ViewState;
    label: string;
    icon: any;
}

const GAMES: GameLink[] = [
    { id: 'FAWAZIR_GAME', label: 'الفوازير', icon: Sparkles },
    { id: 'MUSICAL_CHAIRS', label: 'الكراسي الموسيقية', icon: Armchair },
    { id: 'MASAQIL_WAR', label: 'حرب المصاقيل', icon: Swords },
    { id: 'BLUR_GUESS', label: 'تخمين الصورة', icon: ImageIcon },
    { id: 'SPIN_WHEEL', label: 'عجلة الحظ', icon: Zap },
    { id: 'RAFFLE', label: 'سحب الجوائز', icon: Gift },
    { id: 'FLAG_QUIZ', label: 'تحدي الأعلام', icon: Flag },
    { id: 'TEAM_BATTLE', label: 'حرب الفرق', icon: Users2 },
    { id: 'TYPING_RACE', label: 'سباق الكتابة', icon: Keyboard },
    { id: 'GRID_HUNT', label: 'صائد الكنز', icon: Gem },
    { id: 'CUP_SHUFFLE', label: 'تحدي الأكواب', icon: Coffee },
    { id: 'TERRITORY_WAR', label: 'حرب الألوان', icon: PaintBucket },
];

export const OBSLinksModal: React.FC<OBSLinksModalProps> = ({ isOpen, onClose }) => {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    if (!isOpen) return null;

    const generateLink = (viewId: string) => {
        const baseUrl = window.location.origin;
        // Construct URL with query parameters for OBS mode
        return `${baseUrl}/?obs=true&view=${viewId}&transparent=true`;
    };

    const handleCopy = (id: string, viewId: string) => {
        const link = generateLink(viewId);
        navigator.clipboard.writeText(link);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            ></div>

            {/* Modal Container */}
            <div className="relative w-full max-w-4xl bg-[#090909] border border-purple-500/30 rounded-[2.5rem] shadow-[0_0_100px_rgba(147,51,234,0.3)] overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-8 border-b border-white/5 bg-gradient-to-r from-purple-900/20 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(147,51,234,0.5)]">
                            <ExternalLink className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">رابط البث (OBS)</h2>
                            <p className="text-purple-400 font-bold text-sm tracking-widest uppercase">Stream Source Generator</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-600/20 text-white/50 hover:text-red-500 flex items-center justify-center transition-all border border-white/5 hover:border-red-500/50"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {GAMES.map((game) => (
                            <div
                                key={game.id}
                                className="group relative bg-white/5 hover:bg-purple-900/10 border border-white/5 hover:border-purple-500/40 rounded-3xl p-5 flex items-center gap-5 transition-all duration-300 hover:scale-[1.01]"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center shadow-lg group-hover:border-purple-500/30 transition-colors">
                                    <game.icon size={28} className="text-gray-400 group-hover:text-purple-400 transition-colors" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-black text-white truncate">{game.label}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">OBS READY</span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">TRANSPARENT</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleCopy(game.id, game.id)}
                                        className={`
                            h-12 px-6 rounded-xl font-black text-sm transition-all flex items-center gap-2 border
                            ${copiedId === game.id
                                                ? 'bg-green-500 text-white border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                                                : 'bg-white/5 hover:bg-white/10 text-white border-white/10 hover:border-white/30'}
                        `}
                                    >
                                        {copiedId === game.id ? (
                                            <>
                                                <Check size={18} />
                                                نسخ
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={18} />
                                                نسخ الرابط
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => window.open(generateLink(game.id), '_blank')}
                                        className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 flex items-center justify-center text-white/50 hover:text-white transition-all"
                                        title="جرب الرابط"
                                    >
                                        <ExternalLink size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 p-6 rounded-3xl bg-purple-900/10 border border-purple-500/20 flex gap-6 items-start">
                        <div className="p-3 bg-purple-600 rounded-xl shadow-lg shrink-0">
                            <Sparkles className="text-white" size={24} />
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-white mb-2">تعليمات الاستخدام في OBS</h4>
                            <ul className="space-y-2 text-gray-400 text-sm font-bold list-disc list-inside">
                                <li>قم بإضافة مصدر جديد من نوع <span className="text-purple-400">Browser Source</span>.</li>
                                <li>الصق الرابط الذي قمت بنسخه في خانة URL.</li>
                                <li>اضبط العرض والارتفاع (Width/Height) حسب دقة البث لديك (مثلاً 1920x1080).</li>
                                <li>قم بتفعيل خيار <span className="text-white">Control Audio via OBS</span> إذا كنت تريد التحكم بالصوت.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
