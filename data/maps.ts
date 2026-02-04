
export interface ArenaMap {
  id: string;
  name: string;
  icon: string;
  shape: 'circle' | 'square' | 'hexagon' | 'triangle' | 'star';
  borderColor: string;
  glowColor: string;
  accentColor: string;
  secondaryColor: string;
  description: string;
}

export const ARENA_MAPS: ArenaMap[] = [
  {
    id: 'cyber',
    name: 'حلقة النيون',
    icon: '⚡',
    shape: 'circle',
    borderColor: '#00f2ff',
    glowColor: 'rgba(0, 242, 255, 0.6)',
    accentColor: '#00f2ff',
    secondaryColor: '#ff0055',
    description: 'دائرة نيون مستقبلية متوهجة'
  },
  {
    id: 'royal',
    name: 'الساحة الملكية',
    icon: '👑',
    shape: 'square',
    borderColor: '#ffd700',
    glowColor: 'rgba(255, 215, 0, 0.4)',
    accentColor: '#ffd700',
    secondaryColor: '#ffffff',
    description: 'ميدان مربع من الذهب الخالص'
  },
  {
    id: 'void',
    name: 'البوابة السداسية',
    icon: '🌌',
    shape: 'hexagon',
    borderColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    accentColor: '#a855f7',
    secondaryColor: '#ec4899',
    description: 'تحدي الفضاء في حلبة سداسية'
  },
  {
    id: 'frost',
    name: 'مثلث الانجماد',
    icon: '❄️',
    shape: 'triangle',
    borderColor: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    accentColor: '#60a5fa',
    secondaryColor: '#e0f2fe',
    description: 'حلبة مثلثية حادة وباردة'
  },
  {
    id: 'inferno',
    name: 'نجمة الجحيم',
    icon: '🌋',
    shape: 'star',
    borderColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.6)',
    accentColor: '#f97316',
    secondaryColor: '#fde047',
    description: 'حلبة بركانية على شكل نجمة مشتعلة'
  }
];
