-- Public Wall MVP schema (tables, views, basic RLS)
-- Tables
create table if not exists public.wall_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone default now()
);

create table if not exists public.wall_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_print_id uuid references public.card_prints(id) on delete set null,
  post_type text check (post_type in ('sale','trade','showcase')) not null,
  title text,
  description text,
  price_cents integer,
  qty integer default 1,
  condition_code text,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists public.wall_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.wall_posts(id) on delete cascade,
  storage_path text not null,
  sort integer default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.wall_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.wall_posts(id) on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (user_id, post_id)
);

create table if not exists public.wall_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (follower_id, followee_id)
);

-- View: public posts with profile and cover (first media)
create or replace view public.v_wall_posts_public as
  select p.*, pr.display_name, pr.avatar_url,
         (select m.storage_path from public.wall_media m where m.post_id = p.id order by m.sort asc, m.created_at asc limit 1) as cover_path
  from public.wall_posts p
  left join public.wall_profiles pr on pr.user_id = p.user_id
  where p.is_active is true;

-- RLS
alter table public.wall_profiles enable row level security;
alter table public.wall_posts enable row level security;
alter table public.wall_media enable row level security;
alter table public.wall_likes enable row level security;
alter table public.wall_follows enable row level security;

-- wall_profiles policies
create policy if not exists wall_profiles_select on public.wall_profiles for select using (true);
create policy if not exists wall_profiles_upsert on public.wall_profiles for insert with check (auth.uid() = user_id);
create policy if not exists wall_profiles_update on public.wall_profiles for update using (auth.uid() = user_id);

-- wall_posts policies
create policy if not exists wall_posts_select on public.wall_posts for select using (is_active is true);
create policy if not exists wall_posts_modify on public.wall_posts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- wall_media policies
create policy if not exists wall_media_select on public.wall_media for select using (exists(select 1 from public.wall_posts p where p.id = post_id and p.is_active is true));
create policy if not exists wall_media_modify on public.wall_media for all using (exists(select 1 from public.wall_posts p where p.id = post_id and p.user_id = auth.uid())) with check (exists(select 1 from public.wall_posts p where p.id = post_id and p.user_id = auth.uid()));

-- wall_likes policies
create policy if not exists wall_likes_select on public.wall_likes for select using (true);
create policy if not exists wall_likes_modify on public.wall_likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- wall_follows policies
create policy if not exists wall_follows_select on public.wall_follows for select using (true);
create policy if not exists wall_follows_modify on public.wall_follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

-- NOTE: Configure storage bucket `wall` separately (public read, auth write) with path checks.

