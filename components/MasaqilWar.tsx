
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { ChatUser } from '../types';
import { 
  Swords, RotateCcw, Crown, Users, LogOut, Map as MapIcon, 
  Zap, User, Clock, ToggleLeft, ToggleRight, Sparkle, 
  Package, ShieldAlert, HeartPulse, Flame, Gauge, PlayCircle, Skull, Trash2,
  Settings2, UserMinus, PlusSquare
} from 'lucide-react';

interface MasaqilWarProps {
  channelConnected: boolean;
  onHome: () => void;
}

type WeaponType = 'SAW' | 'HAMMER' | 'BAT' | 'AXE' | 'SWORD' | 'SPEAR';
type ItemType = 'HEALTH' | 'POWER' | 'SPEED' | 'HAZARD';

interface SupplyItem {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  radius: number;
  pulse: number;
}

interface Player {
  id: string;
  username: string;
  avatar: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  angle: number; 
  weaponType: WeaponType;
  isDead: boolean;
  kills: number;
  damageFlash: number;
  mass: number;
  clashCooldown: number;
  damageMultiplier: number;
  speedMultiplier: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

const WEAPON_MAP: Record<string, WeaponType> = {
  'سيف': 'SWORD', 'sword': 'SWORD',
  'منشار': 'SAW', 'saw': 'SAW',
  'مطرقة': 'HAMMER', 'hammer': 'HAMMER',
  'مضرب': 'BAT', 'bat': 'BAT',
  'فأس': 'AXE', 'axe': 'AXE',
  'رمح': 'SPEAR', 'spear': 'SPEAR'
};

const MAPS_CONFIG = {
  BATTLEFIELD: { id: 'BATTLEFIELD', name: 'الميدان النووي', bgColor: '#050507', accentColor: '#1a1a1f', borderColor: '#ff0044' },
  VOLCANO: { id: 'VOLCANO', name: 'فوهة الجحيم', bgColor: '#0f0202', accentColor: '#1f0505', borderColor: '#ff6600' },
  CYBER: { id: 'CYBER', name: 'مفاعل النيون', bgColor: '#010408', accentColor: '#05101a', borderColor: '#00f2ff' }
};

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = CANVAS_HEIGHT / 2;
const MAP_BOUNDARY_RADIUS = 550;

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  const el = document.getElementById('game-sidebar-portal');
  if (!mounted || !el) return null;
  return createPortal(children, el);
};

export const MasaqilWar: React.FC<MasaqilWarProps> = ({ channelConnected, onHome }) => {
  const [gameState, setGameState] = useState<'SETUP' | 'LOBBY' | 'BATTLE' | 'WINNER'>('SETUP');
  const [mapStyle, setMapStyle] = useState<keyof typeof MAPS_CONFIG>('BATTLEFIELD');
  const [maxPlayers, setMaxPlayers] = useState(200);
  const [startingHp, setStartingHp] = useState(100);
  const [roundDuration, setRoundDuration] = useState(180);
  const [joinKeyword, setJoinKeyword] = useState('!حرب');
  const [weaponMode, setWeaponMode] = useState<'RANDOM' | 'MANUAL'>('MANUAL');
  
  const [enableSupplies, setEnableSupplies] = useState(true);
  const [supplyRate, setSupplyRate] = useState(15); 
  const [enableHazards, setEnableHazards] = useState(true);

  const [queue, setQueue] = useState<(ChatUser & { chosenWeapon?: WeaponType })[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playersRef = useRef<Player[]>([]);
  const suppliesRef = useRef<SupplyItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const zoneRef = useRef({ radius: 1000, shrinkage: 0.1 });
  const frameIdRef = useRef<number>(0);
  const imagesCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const shakeRef = useRef(0);
  const lastSupplySpawnRef = useRef(0);

  const settingsRef = useRef({ enableSupplies, supplyRate, enableHazards, weaponMode });
  useEffect(() => {
    settingsRef.current = { enableSupplies, supplyRate, enableHazards, weaponMode };
  }, [enableSupplies, supplyRate, enableHazards, weaponMode]);

  const fetchKickAvatar = async (username: string) => {
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://kick.com/api/v2/channels/${username.toLowerCase()}`)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const data = await res.json();
        const content = JSON.parse(data.contents);
        return content.user?.profile_pic || null;
      }
    } catch (e) {}
    return null;
  };

  useEffect(() => {
    if (!channelConnected) return;
    const cleanup = chatService.onMessage(async (msg) => {
      if (gameState === 'LOBBY') {
        const content = msg.content.trim().toLowerCase();
        if (content.startsWith(joinKeyword.toLowerCase())) {
          if (!queue.find(p => p.username === msg.user.username) && queue.length < maxPlayers) {
            let chosenWeapon: WeaponType | undefined = undefined;
            if (weaponMode === 'MANUAL') {
              const parts = content.split(' ');
              if (parts.length > 1) {
                const weaponName = parts[1];
                chosenWeapon = WEAPON_MAP[weaponName];
              }
            }
            setQueue(prev => [...prev, { ...msg.user, chosenWeapon }]);
            const realAvatar = await fetchKickAvatar(msg.user.username);
            if (realAvatar) {
              setQueue(prev => prev.map(u => u.username === msg.user.username ? { ...u, avatar: realAvatar } : u));
              preloadImage(realAvatar, msg.user.username);
            } else if (msg.user.avatar) {
              preloadImage(msg.user.avatar, msg.user.username);
            }
          }
        }
      }
    });
    return cleanup;
  }, [channelConnected, gameState, joinKeyword, queue, maxPlayers, weaponMode]);

  const preloadImage = (url: string, key: string) => {
    if (!url || imagesCacheRef.current[key]) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => { imagesCacheRef.current[key] = img; };
  };

  const createParticles = (x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.5) * 18,
        life: 1.0,
        color,
        size: Math.random() * 6 + 2
      });
    }
  };

  const spawnSupply = (forcedType?: ItemType) => {
    const types: ItemType[] = ['HEALTH', 'POWER', 'SPEED'];
    if (settingsRef.current.enableHazards) types.push('HAZARD');
    
    const type = forcedType || types[Math.floor(Math.random() * types.length)];
    const currentRadius = zoneRef.current.radius * 0.8;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * currentRadius;

    suppliesRef.current.push({
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: CENTER_X + Math.cos(angle) * dist,
      y: CENTER_Y + Math.sin(angle) * dist,
      radius: 25,
      pulse: 0
    });
  };

  const initBattle = () => {
    if (queue.length < 2) return;
    const total = queue.length;
    const playerHealthMultiplier = Math.max(1, 12 / Math.sqrt(total));
    const balancedHp = startingHp * playerHealthMultiplier;
    const dynamicRadius = Math.max(16, Math.min(85, 550 / Math.sqrt(total)));
    const weaponPool: WeaponType[] = ['SAW', 'HAMMER', 'BAT', 'AXE', 'SWORD', 'SPEAR'];

    playersRef.current = queue.map(user => {
      const weapon = user.chosenWeapon || weaponPool[Math.floor(Math.random() * weaponPool.length)];
      return {
        id: user.username,
        username: user.username,
        avatar: user.avatar || '',
        color: user.color || '#ff0000',
        x: CENTER_X + (Math.random() - 0.5) * 800,
        y: CENTER_Y + (Math.random() - 0.5) * 500,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        hp: balancedHp,
        maxHp: balancedHp,
        radius: dynamicRadius,
        angle: Math.random() * Math.PI * 2,
        weaponType: weapon,
        isDead: false,
        kills: 0,
        damageFlash: 0,
        mass: 2.0 + (dynamicRadius / 20),
        clashCooldown: 0,
        damageMultiplier: 1.0,
        speedMultiplier: 1.0
      };
    });

    const totalFrames = roundDuration * 60;
    const shrinkagePerFrame = (1000 - 80) / totalFrames;
    zoneRef.current = { radius: 1100, shrinkage: shrinkagePerFrame };
    suppliesRef.current = [];
    lastSupplySpawnRef.current = Date.now();
    setGameState('BATTLE');
    if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    gameLoop();
  };

  const gameLoop = () => {
    updatePhysics();
    draw();
    const alive = playersRef.current.filter(p => !p.isDead);
    if (alive.length === 1 && playersRef.current.length > 1) {
      setWinner(alive[0]);
      setGameState('WINNER');
      return;
    } else if (alive.length === 0 && playersRef.current.length > 0) {
      setGameState('SETUP');
      return;
    }
    frameIdRef.current = requestAnimationFrame(gameLoop);
  };

  const updatePhysics = () => {
    const players = playersRef.current;
    const zone = zoneRef.current;
    if (zone.radius > 80) zone.radius -= zone.shrinkage;
    if (shakeRef.current > 0) shakeRef.current -= 0.6;

    if (settingsRef.current.enableSupplies && Date.now() - lastSupplySpawnRef.current > settingsRef.current.supplyRate * 1000) {
      spawnSupply();
      lastSupplySpawnRef.current = Date.now();
    }

    particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx; p.y += p.vy; p.life -= 0.025;
        return p.life > 0;
    });

    const currentEffectiveWall = Math.min(MAP_BOUNDARY_RADIUS, zone.radius);

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p.isDead) continue;

      p.x += p.vx * p.speedMultiplier;
      p.y += p.vy * p.speedMultiplier;
      p.angle += (p.weaponType === 'SAW' ? 0.5 : 0.25) * p.speedMultiplier;
      if (p.damageFlash > 0) p.damageFlash--;
      if (p.clashCooldown > 0) p.clashCooldown--;

      suppliesRef.current = suppliesRef.current.filter(item => {
        const dist = Math.hypot(p.x - item.x, p.y - item.y);
        if (dist < p.radius + item.radius) {
           applyItemEffect(p, item.type);
           createParticles(item.x, item.y, '#fff', 20);
           return false;
        }
        return true;
      });

      const distToCenter = Math.hypot(p.x - CENTER_X, p.y - CENTER_Y);
      if (distToCenter + p.radius > currentEffectiveWall) {
        const angle = Math.atan2(p.y - CENTER_Y, p.x - CENTER_X);
        p.x = CENTER_X + Math.cos(angle) * (currentEffectiveWall - p.radius);
        p.y = CENTER_Y + Math.sin(angle) * (currentEffectiveWall - p.radius);
        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        const dot = p.vx * normalX + p.vy * normalY;
        p.vx = (p.vx - 2 * dot * normalX) * 0.9;
        p.vy = (p.vy - 2 * dot * normalY) * 0.9;
        if (zone.radius <= MAP_BOUNDARY_RADIUS) {
            p.hp -= 0.8;
            shakeRef.current = Math.max(shakeRef.current, 4);
            createParticles(p.x, p.y, MAPS_CONFIG[mapStyle].borderColor, 4);
        }
        if (p.hp <= 0) p.isDead = true;
      }

      for (let j = i + 1; j < players.length; j++) {
        const p2 = players[j];
        if (p2.isDead) continue;

        const dx = p2.x - p.x;
        const dy = p2.y - p.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < p.radius + p2.radius) {
            const angle = Math.atan2(dy, dx);
            const overlap = (p.radius + p2.radius) - dist;
            const totalMass = p.mass + p2.mass;
            p.x -= Math.cos(angle) * overlap * (p2.mass / totalMass);
            p.y -= Math.sin(angle) * overlap * (p2.mass / totalMass);
            p2.x += Math.cos(angle) * overlap * (p.mass / totalMass);
            p2.y += Math.sin(angle) * overlap * (p.mass / totalMass);
            const nx = dx / dist;
            const ny = dy / dist;
            const pVal = (2 * (p.vx * nx + p.vy * ny - p2.vx * nx - p2.vy * ny)) / (p.mass + p2.mass);
            p.vx = p.vx - pVal * p2.mass * nx;
            p.vy = p.vy - pVal * p2.mass * ny;
            p2.vx = p2.vx + pVal * p.mass * nx;
            p2.vy = p2.vy + pVal * p.mass * ny;
        }

        const weaponReach = (p.radius + p2.radius) * 2.2;
        if (dist < weaponReach) {
           const angle = Math.atan2(dy, dx);
           
           if (Math.random() < 0.25 && p.clashCooldown === 0) {
              p.vx -= Math.cos(angle) * 15; p.vy -= Math.sin(angle) * 15;
              p2.vx += Math.cos(angle) * 15; p2.vy += Math.sin(angle) * 15;
              createParticles((p.x + p2.x)/2, (p.y + p2.y)/2, '#fff', 15);
              shakeRef.current = 12;
              p.clashCooldown = 15; p2.clashCooldown = 15;
           }

           if (Math.random() < 0.15) {
              const baseDmgScaling = Math.min(1.0, Math.sqrt(players.length) / 5);
              const d1 = getWeaponDmg(p.weaponType) * p.damageMultiplier * baseDmgScaling;
              const d2 = getWeaponDmg(p2.weaponType) * p2.damageMultiplier * baseDmgScaling;
              
              p2.hp -= d1; p2.damageFlash = 12;
              p2.vx += Math.cos(angle) * (d1 * 0.5); p2.vy += Math.sin(angle) * (d1 * 0.5);
              createParticles(p2.x, p2.y, p.color, 10);
              
              p.hp -= d2; p.damageFlash = 12;
              p.vx -= Math.cos(angle) * (d2 * 0.5); p.vy -= Math.sin(angle) * (d2 * 0.5);
              createParticles(p.x, p.y, p2.color, 10);

              shakeRef.current = 10;
              if (p2.hp <= 0 && !p2.isDead) { p2.isDead = true; p.kills++; p.hp = Math.min(p.maxHp, p.hp + (p.maxHp * 0.2)); }
              if (p.hp <= 0 && !p.isDead) { p.isDead = true; p2.kills++; p2.hp = Math.min(p2.maxHp, p2.hp + (p2.maxHp * 0.2)); }
           }
        }
      }
    }
  };

  const applyItemEffect = (p: Player, type: ItemType) => {
    switch(type) {
      case 'HEALTH': p.hp = Math.min(p.maxHp, p.hp + (p.maxHp * 0.5)); break;
      case 'POWER': p.damageMultiplier = 2.0; setTimeout(() => p.damageMultiplier = 1.0, 10000); break;
      case 'SPEED': p.speedMultiplier = 1.8; setTimeout(() => p.speedMultiplier = 1.0, 8000); break;
      case 'HAZARD': p.hp -= (p.maxHp * 0.3); p.speedMultiplier = 0.5; setTimeout(() => p.speedMultiplier = 1.0, 5000); break;
    }
  };

  const getWeaponDmg = (type: WeaponType) => {
    switch(type) {
      case 'HAMMER': return 40; case 'AXE': return 32; case 'SAW': return 12;
      case 'SWORD': return 28; case 'SPEAR': return 22; case 'BAT': return 18;
      default: return 20;
    }
  };

  const draw = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const configData = MAPS_CONFIG[mapStyle];
    ctx.save();
    if (shakeRef.current > 0) { ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current); }
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.save();
    ctx.beginPath(); ctx.arc(CENTER_X, CENTER_Y, MAP_BOUNDARY_RADIUS, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = configData.bgColor; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = '#ffffff08'; ctx.lineWidth = 1;
    for (let i = 0; i < CANVAS_WIDTH; i += 80) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke(); }
    for (let i = 0; i < CANVAS_HEIGHT; i += 80) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke(); }
    ctx.restore();

    ctx.strokeStyle = '#1a1d21'; ctx.lineWidth = 20;
    ctx.beginPath(); ctx.arc(CENTER_X, CENTER_Y, MAP_BOUNDARY_RADIUS, 0, Math.PI * 2); ctx.stroke();

    if (zoneRef.current.radius < MAP_BOUNDARY_RADIUS + 50) {
      ctx.save();
      ctx.strokeStyle = configData.borderColor; ctx.lineWidth = 15;
      ctx.shadowBlur = 40; ctx.shadowColor = configData.borderColor;
      ctx.setLineDash([40, 30]);
      ctx.beginPath(); ctx.arc(CENTER_X, CENTER_Y, zoneRef.current.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    suppliesRef.current.forEach(item => {
      item.pulse += 0.05;
      const s = 1 + Math.sin(item.pulse) * 0.2;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.scale(s, s);
      const color = item.type === 'HEALTH' ? '#2ecc71' : item.type === 'POWER' ? '#e74c3c' : item.type === 'SPEED' ? '#3498db' : '#9b59b6';
      ctx.fillStyle = color; ctx.shadowBlur = 20; ctx.shadowColor = color;
      ctx.beginPath(); ctx.arc(0, 0, item.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Tajawal'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(item.type === 'HEALTH' ? '✚' : item.type === 'POWER' ? '⚡' : item.type === 'SPEED' ? '▶' : '☠', 0, 0);
      ctx.restore();
    });

    particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.shadowBlur = 10; ctx.shadowColor = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1.0; ctx.shadowBlur = 0;

    const alive = playersRef.current.filter(p => !p.isDead).sort((a,b) => a.y - b.y);
    alive.forEach(p => {
       ctx.save();
       ctx.translate(p.x, p.y); ctx.rotate(p.angle);
       drawWeaponVisual(ctx, p.weaponType, p.radius, p.color, p.damageMultiplier > 1);
       ctx.restore();

       ctx.save();
       ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
       ctx.fillStyle = p.damageFlash > 0 ? '#fff' : '#0a0a0a'; ctx.fill();
       ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(5, p.radius / 3.5); ctx.stroke();
       ctx.clip();
       const img = imagesCacheRef.current[p.username];
       if (img) ctx.drawImage(img, p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
       else {
           ctx.fillStyle = '#fff'; ctx.font = `black ${p.radius}px Tajawal`;
           ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
           ctx.fillText(p.username.charAt(0).toUpperCase(), p.x, p.y);
       }
       ctx.restore();

       const hpW = p.radius * 3.5;
       ctx.fillStyle = '#000'; ctx.fillRect(p.x - hpW/2, p.y - p.radius - 22, hpW, 10);
       ctx.fillStyle = '#2ecc71'; ctx.fillRect(p.x - hpW/2, p.y - p.radius - 22, (p.hp/p.maxHp)*hpW, 10);
       ctx.fillStyle = '#fff'; ctx.font = `black ${Math.max(12, p.radius * 0.8)}px Tajawal`; ctx.textAlign = 'center';
       ctx.fillText(p.username, p.x, p.y - p.radius - 35);
    });
    ctx.restore();
  };

  const drawWeaponVisual = (ctx: CanvasRenderingContext2D, type: WeaponType, radius: number, color: string, isPowered: boolean) => {
    ctx.fillStyle = isPowered ? '#ffeb3b' : '#fff'; 
    ctx.strokeStyle = isPowered ? '#ffc107' : color;
    ctx.lineWidth = 5;
    ctx.shadowBlur = isPowered ? 40 : 25; ctx.shadowColor = isPowered ? '#ffc107' : color;
    switch(type) {
        case 'SAW':
            ctx.beginPath(); for(let i=0; i<16; i++) {
                const ang = (i/16) * Math.PI * 2; const r = i % 2 === 0 ? radius * 2.8 : radius * 2.1;
                ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
            }
            ctx.closePath(); ctx.fill(); ctx.stroke(); break;
        case 'HAMMER':
            ctx.fillRect(radius, -radius*1.0, radius * 3.0, radius * 2.1);
            ctx.strokeRect(radius, -radius*1.0, radius * 3.0, radius * 2.1); break;
        case 'AXE':
            ctx.beginPath(); ctx.moveTo(radius, 0); 
            ctx.quadraticCurveTo(radius * 4.0, radius * 3.0, radius * 4.5, 0);
            ctx.quadraticCurveTo(radius * 4.0, -radius * 3.0, radius, 0);
            ctx.fill(); ctx.stroke(); break;
        case 'SPEAR':
            ctx.beginPath(); ctx.moveTo(radius * 5.5, 0); ctx.lineTo(radius * 4.0, -18); ctx.lineTo(radius * 4.0, 18); ctx.closePath();
            ctx.fill(); ctx.stroke(); ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(radius*4.0, 0); ctx.stroke(); break;
        case 'BAT':
            ctx.beginPath(); ctx.ellipse(radius * 3.5, 0, radius * 2.5, radius/1.5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke(); break;
        case 'SWORD':
            ctx.beginPath(); ctx.moveTo(radius, -10); ctx.lineTo(radius * 5.2, 0); ctx.lineTo(radius, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    }
  };

  const reset = () => {
    if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    setGameState('SETUP'); setQueue([]); setWinner(null);
  };

  const rematch = () => {
    if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    setWinner(null);
    initBattle();
  };

  const kickPlayer = (username: string) => {
    playersRef.current = playersRef.current.map(p => {
      if (p.username === username && !p.isDead) {
        createParticles(p.x, p.y, '#ff0000', 30);
        shakeRef.current = 20;
        return { ...p, hp: 0, isDead: true };
      }
      return p;
    });
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-transparent relative overflow-hidden font-sans">
      <SidebarPortal>
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white/5 p-4 rounded-3xl border border-white/10 space-y-4">
             <div className="flex items-center gap-2 text-red-500 font-black text-[10px] uppercase tracking-widest mb-2">
                <Settings2 size={14} /> التحكم المتقدم
             </div>
             <div className="grid grid-cols-2 gap-2">
                <button onClick={reset} className="bg-white/5 hover:bg-white/10 text-white font-black py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border border-white/5 text-[10px]">
                  <RotateCcw size={14} className="text-gray-400" /> مسح الكل
                </button>
                <button onClick={onHome} className="bg-red-600/10 hover:bg-red-600/20 text-red-500 font-black py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border border-red-500/20 text-[10px]">
                  <LogOut size={14} /> خروج
                </button>
             </div>
             {gameState === 'BATTLE' && (
                <button onClick={rematch} className="w-full bg-white text-black font-black py-3 rounded-2xl flex items-center justify-center gap-2 hover:scale-105 transition-all text-xs border-2 border-white">
                   <RotateCcw size={16} /> إعادة الجولة
                </button>
             )}
          </div>

          {gameState === 'BATTLE' && (
            <div className="bg-black/40 p-4 rounded-3xl border border-white/5 space-y-5 shadow-inner">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Package size={14} className="text-yellow-500"/> نزول الإمدادات</span>
                  <button onClick={() => setEnableSupplies(!enableSupplies)} className={`w-10 h-5 rounded-full p-1 transition-all ${enableSupplies ? 'bg-green-600' : 'bg-zinc-700'}`}>
                     <div className={`w-3 h-3 bg-white rounded-full transition-all ${enableSupplies ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </button>
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-bold text-gray-500 uppercase"><span>سرعة النزول</span> <span className="text-yellow-500">{supplyRate}s</span></div>
                  <input type="range" min="5" max="60" step="5" value={supplyRate} onChange={e => setSupplyRate(Number(e.target.value))} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none accent-yellow-500 cursor-pointer"/>
               </div>
               <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-[9px] font-black text-gray-400 uppercase flex items-center gap-2"><ShieldAlert size={14} className="text-purple-500"/> الفخاخ (Hazards)</span>
                  <button onClick={() => setEnableHazards(!enableHazards)} className={`w-10 h-5 rounded-full p-1 transition-all ${enableHazards ? 'bg-purple-600' : 'bg-zinc-700'}`}>
                     <div className={`w-3 h-3 bg-white rounded-full transition-all ${enableHazards ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </button>
               </div>
               <div className="grid grid-cols-2 gap-2 mt-4">
                  <button onClick={() => spawnSupply('HEALTH')} className="flex items-center justify-center gap-2 p-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-xl text-[8px] text-green-500 font-black"><PlusSquare size={10}/> إسعاف</button>
                  <button onClick={() => spawnSupply('POWER')} className="flex items-center justify-center gap-2 p-2 bg-red-500/10 hover:bg-red-600/20 border border-red-500/30 rounded-xl text-[8px] text-red-500 font-black"><PlusSquare size={10}/> طاقة</button>
               </div>
            </div>
          )}

          {(gameState === 'BATTLE' || gameState === 'LOBBY') && (
            <div className="bg-black/40 rounded-3xl border border-white/5 overflow-hidden flex flex-col h-[280px]">
              <div className="p-3 border-b border-white/5 flex justify-between items-center bg-white/5">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Users size={12} className="text-blue-500"/> المحاربون في الميدان</span>
                <span className="text-red-500 font-mono text-[10px] font-bold">{gameState === 'BATTLE' ? playersRef.current.filter(p => !p.isDead).length : queue.length} حي</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                {(gameState === 'LOBBY' ? queue : playersRef.current).map((p, i) => {
                  const isDead = (p as Player).isDead;
                  return (
                    <div key={i} className={`flex justify-between items-center p-2 rounded-2xl text-[10px] font-bold transition-all border ${isDead ? 'opacity-20 grayscale bg-red-900/10 border-transparent' : 'bg-white/5 border-white/5 hover:border-white/10 group'}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-xl border border-white/10 overflow-hidden bg-zinc-900 shadow-sm">
                           {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : <User size={10} className="m-auto mt-1" />}
                        </div>
                        <span className="text-gray-300 truncate max-w-[90px]">{p.username}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {gameState === 'BATTLE' ? (
                          <>
                            <span className="text-red-500 font-black">{(p as Player).kills}☠️</span>
                            {!isDead && (
                              <button 
                                onClick={() => kickPlayer(p.username)}
                                className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                title="طرد من الميدان"
                              >
                                <UserMinus size={12} />
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-[8px] text-gray-600 font-black">{(p as any).chosenWeapon || 'RANDOM'}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SidebarPortal>

      <div className="w-full h-full flex flex-col items-center justify-center p-6 relative z-10 overflow-y-auto">
        {gameState === 'SETUP' && (
          <div className="w-full max-w-5xl bg-[#0a0a0c]/95 backdrop-blur-3xl border border-white/10 rounded-[4rem] p-10 shadow-2xl animate-in zoom-in duration-500">
             <div className="text-center mb-10">
                <Swords size={90} className="text-red-600 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-float" />
                <h1 className="text-7xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">ملحمة المصاقيل 2.0</h1>
                <p className="text-gray-500 font-black tracking-[0.6em] text-[11px] uppercase italic opacity-60">Professional Battle Engine & Real-time Admin</p>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><MapIcon size={14} className="text-red-500"/> اختيار البيئة</label>
                   {Object.values(MAPS_CONFIG).map(m => (
                      <button key={m.id} onClick={() => setMapStyle(m.id as any)} className={`w-full p-6 rounded-[2.5rem] border-2 transition-all text-right flex items-center justify-between group overflow-hidden ${mapStyle === m.id ? 'border-red-600 bg-red-600/10 shadow-[0_0_20px_rgba(255,0,0,0.2)]' : 'border-white/5 bg-black/40 hover:border-white/10'}`}>
                         <div><div className={`text-xl font-black ${mapStyle === m.id ? 'text-white' : 'text-gray-500'}`}>{m.name}</div><div className="text-[10px] text-gray-600 font-bold uppercase">Arena Mode</div></div>
                         {mapStyle === m.id && <Zap size={22} className="text-red-600 animate-pulse" />}
                      </button>
                   ))}
                </div>
                
                <div className="space-y-6 bg-black/40 p-8 rounded-[3.5rem] border border-white/5">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-[10px] font-black text-gray-400 mb-3 uppercase"><span>مدة الجولة</span> <span className="text-blue-500 font-mono">{roundDuration}s</span></div>
                        <input type="range" min="30" max="600" step="30" value={roundDuration} onChange={e => setRoundDuration(Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none accent-blue-600 cursor-pointer"/>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-black text-gray-400 mb-3 uppercase"><span>الصحة الأساسية</span> <span className="text-green-500 font-mono">{startingHp} HP</span></div>
                        <input type="range" min="50" max="500" step="50" value={startingHp} onChange={e => setStartingHp(Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none accent-green-600 cursor-pointer"/>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">نظام الأسلحة</label>
                      <div className="grid grid-cols-2 gap-2">
                         <button onClick={() => setWeaponMode('MANUAL')} className={`py-4 rounded-3xl text-xs font-black transition-all border-2 ${weaponMode === 'MANUAL' ? 'bg-red-600 text-white border-red-500 shadow-lg' : 'bg-white/5 border-transparent text-gray-500'}`}>مخصص من الشات</button>
                         <button onClick={() => setWeaponMode('RANDOM')} className={`py-4 rounded-3xl text-xs font-black transition-all border-2 ${weaponMode === 'RANDOM' ? 'bg-red-600 text-white border-red-500 shadow-lg' : 'bg-white/5 border-transparent text-gray-500'}`}>عشوائي للجميع</button>
                      </div>
                   </div>

                   <div className="relative">
                      <input type="text" value={joinKeyword} onChange={e => setJoinKeyword(e.target.value)} className="w-full bg-black border-2 border-white/5 rounded-3xl p-5 text-white font-black text-2xl text-center focus:border-red-600 transition-all outline-none shadow-2xl" placeholder="كلمة الدخول" />
                      <div className="absolute -top-3 left-6 bg-red-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase italic">Command</div>
                   </div>

                   <button onClick={() => setGameState('LOBBY')} className="w-full bg-red-600 text-white font-black py-6 rounded-[2.5rem] text-3xl shadow-[0_20px_50px_rgba(220,38,38,0.4)] hover:scale-[1.03] active:scale-95 transition-all italic border-t-2 border-white/20">فـتـح بـاب الـقـتـال</button>
                </div>
             </div>
          </div>
        )}

        {gameState === 'LOBBY' && (
           <div className="text-center animate-in fade-in duration-1000 w-full max-w-6xl py-10 px-4">
              <div className="relative inline-block mb-8">
                 <div className="absolute inset-0 bg-red-600/30 blur-[120px] rounded-full animate-pulse"></div>
                 <Users size={140} className="text-white relative drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" />
                 <div className="absolute -bottom-4 -right-4 bg-red-600 text-white font-black px-8 py-3 rounded-[2rem] border-[8px] border-[#050507] text-4xl shadow-2xl">{queue.length}</div>
              </div>
              
              <h1 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter mb-8 uppercase leading-none drop-shadow-[0_10px_40px_rgba(0,0,0,1)]">في انتظار المقاتلين...</h1>
              
              <div className="flex flex-col items-center bg-white/5 border border-white/10 backdrop-blur-3xl px-10 md:px-20 py-10 rounded-[4rem] shadow-2xl relative overflow-hidden mb-12">
                 <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>
                 
                 <div className="flex flex-col gap-6 items-center">
                    <p className="text-3xl md:text-4xl text-gray-400 font-bold uppercase tracking-widest">اكتب في الشات للانضمام:</p>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="bg-black/80 px-12 py-5 rounded-[2.5rem] border-2 border-red-600 shadow-[0_0_50px_rgba(255,0,0,0.4)] animate-glow">
                           <span className="text-5xl md:text-7xl font-black text-red-500 italic tracking-tighter font-mono">{joinKeyword}</span>
                        </div>
                        {weaponMode === 'MANUAL' && (
                           <div className="text-3xl md:text-5xl font-black text-gray-500 italic"> + [اسم السلاح]</div>
                        )}
                    </div>
                 </div>

                 {weaponMode === 'MANUAL' && (
                    <div className="mt-10 pt-8 border-t border-white/5 w-full">
                       <p className="text-xs font-black text-gray-500 uppercase tracking-[0.5em] mb-6">قائمة الأسلحة المتاحة</p>
                       <div className="flex flex-wrap justify-center gap-3">
                          {Object.keys(WEAPON_MAP).filter(k => k !== k.toUpperCase()).map(w => (
                             <span key={w} className="bg-red-600/10 px-6 py-2 rounded-2xl border border-red-600/30 text-red-500 font-black text-sm uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all cursor-default">{w}</span>
                          ))}
                       </div>
                    </div>
                 )}
              </div>

              <div className="flex gap-8 justify-center">
                 <button onClick={reset} className="px-16 py-6 bg-white/5 text-gray-500 font-black text-2xl rounded-[2.5rem] hover:bg-white/10 border border-white/10 transition-all italic">تراجع</button>
                 <button onClick={initBattle} disabled={queue.length < 2} className="px-28 py-7 bg-red-600 text-white font-black text-4xl md:text-5xl rounded-[3rem] shadow-[0_25px_60px_rgba(220,38,38,0.5)] hover:scale-105 active:scale-95 disabled:opacity-10 transition-all italic border-t-2 border-white/20 flex items-center gap-6"><PlayCircle size={48}/> بـدء الـمـعـركة</button>
              </div>
           </div>
        )}

        {(gameState === 'BATTLE' || gameState === 'WINNER') && (
           <div className="relative w-full h-full max-w-[1250px] max-h-[850px] aspect-[3/2] rounded-[4.5rem] overflow-hidden border-[20px] border-[#16161a] shadow-2xl bg-black animate-in zoom-in duration-500">
              <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full object-contain" />
              
              {gameState === 'WINNER' && winner && (
                <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center animate-in fade-in duration-1000 p-10">
                   <Crown size={180} className="text-[#FFD700] mb-8 animate-bounce drop-shadow-[0_0_60px_rgba(255,215,0,0.6)]" fill="currentColor" />
                   <h2 className="text-5xl font-black text-white uppercase tracking-[1.2em] mb-10 opacity-30 italic">Ultimate Champion</h2>
                   <div className="relative mb-16 group">
                      <div className="absolute inset-0 bg-white/20 blur-[120px] group-hover:bg-white/40 transition-all rounded-full scale-150 animate-pulse"></div>
                      <div className="w-80 h-80 rounded-[6rem] border-[15px] border-[#FFD700] overflow-hidden shadow-[0_0_80px_rgba(255,215,0,0.3)] relative bg-zinc-800 flex items-center justify-center transform hover:rotate-6 transition-all duration-700">
                         {imagesCacheRef.current[winner.username] ? <img src={winner.avatar} className="w-full h-full object-cover" /> : <div className="text-9xl font-black text-white">{winner.username.charAt(0)}</div>}
                         <div className="absolute bottom-0 w-full bg-[#FFD700] text-black font-black py-5 text-3xl italic tracking-widest text-center uppercase">Survivor</div>
                      </div>
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white font-black px-16 py-4 rounded-[2.5rem] border-4 border-black text-4xl shadow-2xl whitespace-nowrap z-50 animate-glow">{winner.kills} قتيل ☠️</div>
                   </div>
                   <h1 className="text-[140px] font-black text-white italic tracking-tighter mb-16 uppercase leading-none drop-shadow-[0_10px_60px_rgba(0,0,0,1)]">{winner.username}</h1>
                   
                   <div className="flex flex-col md:flex-row gap-8">
                      <button onClick={rematch} className="group relative px-20 py-8 bg-red-600 text-white font-black text-5xl rounded-[3.5rem] hover:scale-110 active:scale-95 transition-all shadow-[0_0_60px_rgba(220,38,38,0.5)] italic flex items-center gap-6 border-t-2 border-white/20">
                        <PlayCircle size={40} /> إعـادة الـتـحدي
                      </button>
                      <button onClick={reset} className="px-16 py-8 bg-white/10 hover:bg-white/20 text-white font-black text-3xl rounded-[3.5rem] transition-all italic border border-white/20 backdrop-blur-xl">جولة جديدة</button>
                   </div>
                </div>
              )}
           </div>
        )}
      </div>
    </div>
  );
};
