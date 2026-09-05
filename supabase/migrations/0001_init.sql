-- EXTRA TIME — Phase 3 schema
-- بيانات المستخدم والتفضيلات فقط. البيانات الرياضية مصدرها API-Football
-- دائماً، لا تُخزَّن هنا.

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles are editable by owner" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles are insertable by owner" on public.profiles
  for insert with check (auth.uid() = id);

-- ينشئ صف profile تلقائياً عند تسجيل مستخدم جديد
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- favorite_teams / favorite_competitions / favorite_matches
-- team_id / competition_id / match_id تطابق المعرّفات القادمة من
-- FootballProvider (نصية دائماً) — لا مفتاح خارجي إلى جدول محلي، لأن
-- البيانات الرياضية نفسها ليست مخزَّنة في القاعدة.
-- ---------------------------------------------------------------------

create table if not exists public.favorite_teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  team_id text not null,
  team_name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, team_id)
);

create table if not exists public.favorite_competitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competition_id text not null,
  competition_name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, competition_id)
);

create table if not exists public.favorite_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  match_id text not null,
  match_label text not null,
  created_at timestamptz not null default now(),
  unique (user_id, match_id)
);

alter table public.favorite_teams enable row level security;
alter table public.favorite_competitions enable row level security;
alter table public.favorite_matches enable row level security;

-- نفس سياسة RLS الأربعة (قراءة/إضافة/حذف الخاص بالمستخدم فقط) على الجداول الثلاثة
do $$
declare
  t text;
begin
  foreach t in array array['favorite_teams', 'favorite_competitions', 'favorite_matches']
  loop
    execute format('create policy "select own rows" on public.%I for select using (auth.uid() = user_id)', t);
    execute format('create policy "insert own rows" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "delete own rows" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;
