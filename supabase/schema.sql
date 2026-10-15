-- =====================================================================
-- 1. TABLES
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  body_md text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  day_of_week smallint not null check (day_of_week between 1 and 7), -- 1 = lundi
  start_time time not null,
  end_time time not null,
  location text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('cours', 'texte', 'libre')),
  label text,
  target_slug text,                       -- texte/cours visé, si précis
  time_of_day time not null,              -- heure locale de l'utilisateur
  days_of_week smallint[] not null default '{1,2,3,4,5,6,7}',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists courses_user_id_idx on public.courses (user_id);
create index if not exists schedule_events_user_id_idx on public.schedule_events (user_id);
create index if not exists reminders_user_id_idx on public.reminders (user_id);

-- =====================================================================
-- 2. PROFIL CRÉÉ AUTOMATIQUEMENT À CHAQUE NOUVEAU COMPTE
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 3. SÉCURITÉ : RLS (chaque utilisateur ne voit que ses lignes)
-- =====================================================================
alter table public.profiles        enable row level security;
alter table public.courses         enable row level security;
alter table public.schedule_events enable row level security;
alter table public.reminders       enable row level security;

drop policy if exists "profiles : propriétaire" on public.profiles;
create policy "profiles : propriétaire" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "courses : propriétaire" on public.courses;
create policy "courses : propriétaire" on public.courses
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "schedule_events : propriétaire" on public.schedule_events;
create policy "schedule_events : propriétaire" on public.schedule_events
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "reminders : propriétaire" on public.reminders;
create policy "reminders : propriétaire" on public.reminders
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- =====================================================================
-- 4. DROITS D'ACCÈS À L'API (GRANT explicites)
-- =====================================================================
revoke all on public.profiles, public.courses,
              public.schedule_events, public.reminders from anon;

grant select, insert, update, delete
  on public.profiles, public.courses,
     public.schedule_events, public.reminders
  to authenticated;

-- =====================================================================
-- 5. (OPTIONNEL) TABLE "PING" POUR ÉVITER LA MISE EN PAUSE
-- =====================================================================
create table if not exists public.ping (id int primary key);
insert into public.ping (id) values (1) on conflict (id) do nothing;
alter table public.ping enable row level security;

drop policy if exists "ping : lecture publique" on public.ping;
create policy "ping : lecture publique" on public.ping
  for select to anon, authenticated using (true);

grant select on public.ping to anon, authenticated;

-- =====================================================================
-- 6. STOCKAGE SUPABASE STORAGE (Bucket course-files)
-- =====================================================================
-- Création du bucket privé pour stocker les fichiers de cours (PDF, Word, etc.)
insert into storage.buckets (id, name, public)
values ('course-files', 'course-files', false)
on conflict (id) do nothing;

-- RLS sur storage.objects : l'utilisateur authentifié gère uniquement son dossier personnel (${auth.uid()}/*)
drop policy if exists "course_files_select" on storage.objects;
create policy "course_files_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'course-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "course_files_insert" on storage.objects;
create policy "course_files_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'course-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "course_files_update" on storage.objects;
create policy "course_files_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'course-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'course-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "course_files_delete" on storage.objects;
create policy "course_files_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'course-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

