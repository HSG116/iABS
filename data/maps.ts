
export interface ArenaMap {
  id: string;
  name: string;
  icon: string;
  shape: 'circle' | 'square' | 'hexagon' | 'triangle' | 'star' | 'octagon' | 'diamond' | 'spiral';
  borderColor: string;
  glowColor: string;
  accentColor: string;
  secondaryColor: string;
  description: string;
  particleColor?: string;
  pulseColor?: string;
  gridPattern?: boolean;
  classicStyle?: boolean;
}

export const ARENA_MAPS: ArenaMap[] = [
  {
    id: 'crystal-palace',
    name: '💎 قصر الكريستال الماسي',
    icon: '💎',
    shape: 'octagon',
    borderColor: '#00D9FF',
    glowColor: 'rgba(0, 217, 255, 0.8)',
    accentColor: '#00FFF0',
    secondaryColor: '#B4F8FF',
    particleColor: '#00D9FF',
    pulseColor: 'rgba(0, 255, 240, 0.5)',
    gridPattern: true,
    classicStyle: false,
    description: '✨ قصر ثماني فخم من الكريستال مع تأثيرات ضوئية ثلاثية الأبعاد'
  },
  {
    id: 'neon-metropolis',
    name: '🌃 مدينة النيون المستقبلية',
    icon: '⚡',
    shape: 'hexagon',
    borderColor: '#FF00FF',
    glowColor: 'rgba(255, 0, 255, 0.9)',
    accentColor: '#00FFFF',
    secondaryColor: '#FF0099',
    particleColor: '#00FFFF',
    pulseColor: 'rgba(255, 0, 255, 0.6)',
    gridPattern: true,
    classicStyle: false,
    description: '🎆 ساحة سداسية مستقبلية بنيون متحرك وأنيميشن ديناميكي'
  },
  {
    id: 'golden-kingdom',
    name: '👑 المملكة الذهبية الفخمة',
    icon: '👑',
    shape: 'star',
    borderColor: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 1)',
    accentColor: '#FFA500',
    secondaryColor: '#FFED4E',
    particleColor: '#FFD700',
    pulseColor: 'rgba(255, 165, 0, 0.7)',
    gridPattern: false,
    classicStyle: false,
    description: '⭐ نجمة ذهبية ملكية فاخرة مع جزيئات متلألئة'
  }
];
