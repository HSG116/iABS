
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lsxonvauhnvjxfhjcqpf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GnX7FkHNeoab8tW_XfvgKg_ok8igMnp'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const leaderboardService = {
  // جلب المتصدرين
  async getTopPlayers(limit = 20) {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('score', { ascending: false })
      .limit(limit);
    
    if (error) return [];
    return data || [];
  },

  // تسجيل فوز تلقائي من الألعاب
  async recordWin(username: string, avatarUrl: string, points: number = 10) {
    if (!username || username === 'Unknown') return;

    const { data: existing } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('leaderboard')
        .update({
          wins: (existing.wins || 0) + 1,
          score: (existing.score || 0) + points,
          avatar_url: avatarUrl || existing.avatar_url,
          last_win_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('leaderboard')
        .insert([{
          username,
          avatar_url: avatarUrl || '',
          wins: 1,
          score: points
        }]);
    }
  },

  // وظائف الإدارة: إضافة/تنقيص يدوي
  async adjustPlayerStats(username: string, scoreDelta: number, winsDelta: number) {
    const { data: existing } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (existing) {
      return await supabase
        .from('leaderboard')
        .update({
          score: Math.max(0, (existing.score || 0) + scoreDelta),
          wins: Math.max(0, (existing.wins || 0) + winsDelta)
        })
        .eq('id', existing.id);
    } else {
      // إذا لم يكن موجوداً، نقوم بإنشائه بالقيم المطلوبة
      return await supabase
        .from('leaderboard')
        .insert([{
          username,
          score: Math.max(0, scoreDelta),
          wins: Math.max(0, winsDelta)
        }]);
    }
  },

  async verifyAdminPassword(inputPassword: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'admin_password')
      .single();
    if (error || !data) return false;
    return data.value === inputPassword;
  },

  async resetLeaderboard() {
    return await supabase.from('leaderboard').delete().neq('username', 'SYSTEM_ADMIN');
  }
};
