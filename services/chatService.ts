
import Pusher from 'pusher-js';
import { ChatMessage } from '../types';

type MessageCallback = (message: ChatMessage) => void;
type StatusCallback = (isConnected: boolean, error?: boolean, details?: string) => void;

const getRoleFromIdentity = (identity: any): 'owner' | 'moderator' | 'vip' | 'user' => {
  if (!identity || !identity.badges) return 'user';
  const badges = identity.badges;
  if (badges.some((b: any) => b.type === 'broadcaster')) return 'owner';
  if (badges.some((b: any) => b.type === 'moderator')) return 'moderator';
  if (badges.some((b: any) => b.type === 'vip')) return 'vip';
  return 'user';
};

class ChatService {
  private isConnected: boolean = false;
  private listeners: MessageCallback[] = [];
  private deleteListeners: ((id: string) => void)[] = [];
  private statusListeners: StatusCallback[] = [];
  private pusher: any = null;
  private channel: any = null;

  private KNOWN_CHATROOM_IDS: Record<string, number> = {
    // We removed 'iabs' from here to force a fresh lookup from the API, 
    // ensuring we get the correct Chatroom ID every time.
    'xeid': 47582,
  };

  async getChatroomId(channelSlug: string): Promise<number | null> {
    const slug = channelSlug.toLowerCase().trim();

    if (this.KNOWN_CHATROOM_IDS[slug]) {
      console.log(`[ChatService] Using known ID for ${slug}: ${this.KNOWN_CHATROOM_IDS[slug]}`);
      return this.KNOWN_CHATROOM_IDS[slug];
    }

    // Try multiple proxy services since some might be blocked or rate-limited
    const proxies = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(`https://kick.com/api/v2/channels/${slug}`)}`,
      `https://corsproxy.io/?${encodeURIComponent(`https://kick.com/api/v2/channels/${slug}`)}`,
      `https://proxy.cors.sh/https://kick.com/api/v2/channels/${slug}` // Fallback
    ];

    for (const proxyUrl of proxies) {
      try {
        console.log(`[ChatService] Fetching ID from: ${proxyUrl}`);
        const response = await fetch(proxyUrl);
        if (!response.ok) continue;

        const rawData = await response.json();
        const data = proxyUrl.includes('allorigins') ? JSON.parse(rawData.contents) : rawData;

        // Handle different API response structures
        if (data?.chatroom?.id) {
          console.log(`[ChatService] ✅ Found Chatroom ID: ${data.chatroom.id}`);
          return data.chatroom.id;
        } else if (data?.id) {
          // Sometimes the channel object itself has the ID in v1 or other endpoints
          console.log(`[ChatService] ✅ Found Channel ID (using as chatroom): ${data.id}`);
          return data.id;
        }
      } catch (e) {
        console.warn(`[ChatService] Proxy failed: ${proxyUrl}`, e);
      }
    }

    return null;
  }

  async connect(channelSlug: string = 'iabs') {
    const slug = channelSlug.toLowerCase().trim();
    this.disconnect();
    this.notifyStatus(false, false, `جاري البحث عن قناة ${slug}...`);

    try {
      let chatroomId = await this.getChatroomId(slug);

      // If iabs look up fails, log it clearly but don't auto-switch to xeid unless user asked.
      // We will stick to the requested channel to avoid confusion.

      if (!chatroomId) {
        console.error(`[ChatService] Could not find ID for ${slug}.`);
        throw new Error(`لم يتم العثور على القناة: ${slug}`);
      }

      console.log(`[ChatService] Connecting to Chatroom: ${chatroomId}`);

      // Initialize Pusher with a fresh instance
      const PusherClient = (Pusher as any).default || Pusher;
      this.pusher = new PusherClient('32cbd69e4b950bf97679', {
        cluster: 'us2',
        forceTLS: true,
        enabledTransports: ['ws', 'wss']
      });

      this.channel = this.pusher.subscribe(`chatrooms.${chatroomId}.v2`);

      // DEBUG: Listen to ALL events to see if we are getting anything at all
      this.channel.bind_global((eventName: string, data: any) => {
        console.log(`[ChatService] GLOBAL EVENT: ${eventName}`, data);
      });

      this.channel.bind('App\\Events\\ChatMessageEvent', (data: any) => {
        const message: ChatMessage = {
          id: data.id || Math.random().toString(36).substr(2, 9),
          user: {
            id: data.sender?.id || '0',
            username: data.sender?.username || 'Unknown',
            color: data.sender?.identity?.color || '#31d6d6',
            avatar: data.sender?.profile_pic || '',
          },
          content: data.content || '',
          role: getRoleFromIdentity(data.sender?.identity),
          timestamp: Date.now()
        };

        // Safety: ensure one listener failure doesn't stop others
        this.listeners.forEach(cb => {
          try {
            cb(message);
          } catch (e) {
            console.error("[ChatService] Listener error:", e);
          }
        });
      });

      this.channel.bind('App\\Events\\MessageDeletedEvent', (data: any) => {
        console.log("[ChatService] Message Deleted Received:", data);
        const messageId = data.message?.id;
        if (messageId) {
          this.deleteListeners.forEach(cb => cb(messageId));
        }
      });

      this.pusher.connection.bind('connected', () => {
        console.log("[ChatService] WebSocket Connected!");
        this.isConnected = true;
        this.notifyStatus(true, false, `متصل (ID: ${chatroomId})`);
      });

      this.pusher.connection.bind('error', (err: any) => {
        console.error("[ChatService] Pusher Error:", err);
        this.notifyStatus(false, true, "خطأ في الاتصال بسيرفر الشات");
      });

      this.pusher.connection.bind('state_change', (states: any) => {
        console.log("[ChatService] Connection State:", states.current);
      });

    } catch (error: any) {
      console.error("[ChatService] Fatal Error:", error);
      this.notifyStatus(false, true, error.message);
    }
  }

  onMessage(callback: MessageCallback) {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(cb => cb !== callback); };
  }

  onDeleteMessage(callback: (id: string) => void) {
    this.deleteListeners.push(callback);
    return () => { this.deleteListeners = this.deleteListeners.filter(cb => cb !== callback); };
  }

  // Remove all listeners (useful when switching games)
  clearListeners() {
    this.listeners = [];
    this.deleteListeners = [];
  }

  onStatusChange(callback: StatusCallback) {
    this.statusListeners.push(callback);
    return () => { this.statusListeners = this.statusListeners.filter(cb => cb !== callback); };
  }

  private notifyStatus(connected: boolean, error: boolean, details: string) {
    this.statusListeners.forEach(cb => cb(connected, error, details));
  }

  disconnect() {
    if (this.channel) {
      this.channel.unbind_all();
      this.channel.unsubscribe();
      this.channel = null;
    }
    if (this.pusher) {
      this.pusher.unbind_all();
      this.pusher.disconnect();
      this.pusher = null;
    }
    this.isConnected = false;
  }
}

export const chatService = new ChatService();
