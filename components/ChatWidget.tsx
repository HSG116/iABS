
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { chatService } from '../services/chatService';
import { Language, ChatMessage } from '../types';
import { MessageSquare, Zap, Shield, Crown, Star, RefreshCw, AlertCircle, Ban, Clock, Ghost } from 'lucide-react';

interface ChatWidgetProps {
  lang: Language;
}

const OwnerBadge = () => (
  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-red-600 text-white shrink-0 shadow-[0_0_10px_rgba(255,0,0,0.5)] border border-white/20" title="Broadcaster">
    <Crown size={14} fill="currentColor" />
  </div>
);

const ModBadge = () => (
  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-green-500 text-black shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.4)] border border-white/20" title="Moderator">
    <Shield size={14} fill="currentColor" />
  </div>
);

const VipBadge = () => (
  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-pink-500 text-white shrink-0 shadow-[0_0_8px_rgba(236,72,153,0.4)] border border-white/20" title="VIP">
    <Star size={14} fill="currentColor" />
  </div>
);

export const ChatWidget: React.FC<ChatWidgetProps> = ({ lang }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState({ connected: false, error: false, details: '' });
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const connect = () => {
    chatService.connect('iabs');
  };

  useEffect(() => {
    connect();

    const unbindMsg = chatService.onMessage((msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        // Limit to 200 messages for better performance
        if (prev.length >= 200) {
          return [...prev.slice(-199), msg];
        }
        return [...prev, msg];
      });
    });

    const unbindDelete = chatService.onDeleteMessage((msgId) => {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, deleted: true } : m));
    });

    const unbindStatus = chatService.onStatusChange((connected, error, details) => {
      setStatus({ connected, error, details: details || '' });
    });

    return () => {
      unbindMsg();
      unbindDelete();
      unbindStatus();
      chatService.disconnect();
    };
  }, []);



  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: messages.length > 50 ? 'auto' : 'smooth' // performance optimization
      });
    }
  }, [messages]);

  const getBadge = (role: string) => {
    switch (role) {
      case 'owner': return <OwnerBadge />;
      case 'moderator': return <ModBadge />;
      case 'vip': return <VipBadge />;
      default: return null;
    }
  };

  const t = {
    title: lang === 'ar' ? 'ساحة الحوار' : 'Live Arena',
    connecting: lang === 'ar' ? 'جاري الاتصال...' : 'Connecting...',
    connected: lang === 'ar' ? 'الميدان نشط' : 'Arena Active',
    error: lang === 'ar' ? 'انقطع الاتصال' : 'Connection Lost',
    retry: lang === 'ar' ? 'إعادة المحاولة' : 'Retry',
    deleted: lang === 'ar' ? 'تم حذف هذه الرسالة بواسطة الإدارة' : 'This message was removed by moderator',
    placeholder: lang === 'ar' ? 'في انتظار أول تعليق...' : 'Waiting for first message...'
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#050505]/90 backdrop-blur-2xl relative border-l border-white/5">

      {/* Header */}
      <div className="h-16 shrink-0 bg-gradient-to-r from-red-600/10 to-transparent border-b border-white/5 flex items-center justify-between px-5 z-20">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500 shadow-lg ${status.connected ? 'bg-red-600' : 'bg-zinc-800'}`}>
            <MessageSquare size={16} className="text-white" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-white font-black text-xs uppercase tracking-tighter italic">{t.title}</h2>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${status.connected ? 'bg-red-500 animate-pulse shadow-[0_0_5px_red]' : 'bg-zinc-600'}`}></span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{status.connected ? t.connected : t.connecting}</span>
            </div>
          </div>
        </div>
        <button onClick={connect} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all">
          <RefreshCw size={14} className={!status.connected && !status.error ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Messages Container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 custom-scrollbar"
      >
        {messages.length === 0 && status.connected && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
            <Ghost size={40} className="mb-3 text-red-600" />
            <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">{t.placeholder}</p>
          </div>
        )}

        {status.error && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <AlertCircle size={32} className="text-red-500" />
            <p className="text-xs font-black text-white uppercase tracking-wider">{t.error}</p>
            <button onClick={connect} className="px-5 py-2.5 bg-red-600 text-[10px] font-black italic rounded-lg hover:bg-red-500 transition-all uppercase">{t.retry}</button>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="animate-in slide-in-from-right-4 duration-300 group">
            <div className="flex items-start gap-3">
              {/* Badge & Avatar logic simplified for performance */}
              <div className="shrink-0 mt-0.5">
                {msg.role !== 'user' ? getBadge(msg.role) : (
                  <div className="w-6 h-6 rounded bg-zinc-800 border border-white/5 flex items-center justify-center text-[10px] font-black text-gray-600 uppercase">
                    {msg.user.username.charAt(0)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="font-black text-[13px] italic tracking-tight truncate drop-shadow-sm"
                    style={{ color: msg.user.color || '#ff0000' }}
                  >
                    {msg.user.username}
                  </span>
                  <span className="text-[8px] text-gray-700 font-mono items-center gap-1 hidden group-hover:flex">
                    <Clock size={8} /> {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {msg.deleted ? (
                  <div className="flex items-center gap-2 text-zinc-600 italic bg-white/[0.02] p-2 rounded-lg border border-white/5">
                    <Ban size={10} />
                    <span className="text-[11px] font-bold">{t.deleted}</span>
                  </div>
                ) : (
                  <div className="text-[15px] text-gray-200 font-bold leading-tight break-words whitespace-pre-wrap -tracking-tight drop-shadow-sm">
                    {parseMessageContent(msg.content)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>



      {/* Bottom Glow */}
      <div className="h-8 bg-gradient-to-t from-black to-transparent shrink-0"></div>
    </div>
  );
};

const parseMessageContent = (content: string) => {
  const emoteRegex = /\[emote:(\d+):([\w\s\-]+)\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = emoteRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }

    const emoteId = match[1];
    const emoteName = match[2];
    parts.push(
      <img
        key={`${emoteId}-${match.index}`}
        src={`https://files.kick.com/emotes/${emoteId}/fullsize`}
        alt={emoteName}
        className="inline-block w-7 h-7 align-middle mx-1 hover:scale-110 transition-transform"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );

    lastIndex = emoteRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return parts.length > 0 ? parts : content;
};
