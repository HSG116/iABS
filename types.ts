
export interface ChatUser {
  id: string;
  username: string;
  color?: string;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  user: ChatUser;
  content: string;
  role: 'owner' | 'moderator' | 'vip' | 'user';
  timestamp: number;
  deleted?: boolean;
}

export type Language = 'ar' | 'en';

export type ViewState =
  | 'HOME'
  | 'FAWAZIR_SELECT'
  | 'FAWAZIR_GAME'
  | 'MUSICAL_CHAIRS'
  | 'MASAQIL_WAR'
  | 'LEADERBOARD'
  | 'BLUR_GUESS'
  | 'SPIN_WHEEL'
  | 'RAFFLE'
  | 'FLAG_QUIZ'
  | 'TEAM_BATTLE'
  | 'TYPING_RACE'
  | 'GRID_HUNT'
  | 'CUP_SHUFFLE'
  | 'TERRITORY_WAR'
  | 'TRUTH_OR_LIE'
  | 'DRAWING_CHALLENGE'
  | 'FRUIT_WAR'
  | 'LOGO_ROUND'
  | 'FORBIDDEN_WORDS'
  | 'VOTING_GAME'
  | 'BOSS_RAID'
  | 'RUSSIAN_ROULETTE'
  | 'ZOMBIE_ESCAPE'
  | 'GLASS_BRIDGE'
  | 'SECRET_AUCTION'
  | 'WORD_BOMB';

// Added GameType to fix import error in TournamentManager.tsx
export type GameType = 'TRIVIA' | 'BLUR' | 'FLAGS' | 'TYPING' | 'CUPS' | 'GRID' | 'WHEEL' | 'PAINT' | 'BATTLE' | 'BOMB' | 'VOTE' | 'DRAW' | 'FRUIT' | 'LOGO' | 'FORBIDDEN' | 'BOSS' | 'ROULETTE' | 'ZOMBIE' | 'BRIDGE' | 'AUCTION';

export interface Question {
  id: number;
  category: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  image: string | string[];
}

export interface Song {
  id: string;
  title: string;
  url: string;
}
