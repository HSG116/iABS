
-- 1. جدول لوحة الصدارة (Leaderboard)
create table leaderboard (
  id uuid default gen_random_uuid() primary key,
  username text not null unique,
  avatar_url text,
  wins int default 0,
  score int default 0,
  last_win_at timestamptz default now()
);

-- 2. جدول إعدادات الأدمن (Admin Config)
create table app_config (
  key text primary key,
  value text not null
);

-- إدخال كلمة المرور الافتراضية (admin123) - يمكن تغييرها من لوحة التحكم لاحقاً
insert into app_config (key, value) values ('admin_password', 'admin123');

-- سياسات الأمان (اختياري - للسماح بالقراءة والكتابة العامة للتبسيط في هذا المشروع)
alter table leaderboard enable row level security;
create policy "Public Select" on leaderboard for select using (true);
create policy "Public Insert" on leaderboard for insert with check (true);
create policy "Public Update" on leaderboard for update using (true);

alter table app_config enable row level security;
create policy "Public Select Config" on app_config for select using (true);
create policy "Public Update Config" on app_config for update using (true);
