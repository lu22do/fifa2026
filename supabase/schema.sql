-- Supabase schema for FIFA 2026 predictor

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  total_points int not null default 0,
  role text not null default 'player' check (role in ('player','admin')),
  is_suspended boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code char(3) not null unique,
  flag_url text,
  group_name char(1)
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  home_team_id uuid not null references teams(id),
  away_team_id uuid not null references teams(id),
  stage text not null check (stage in ('group','round_of_16','quarter_final','semi_final','third_place','final')),
  kickoff_at timestamptz not null,
  venue text,
  status text not null default 'scheduled' check (status in ('scheduled','live','half_time','finished','postponed','abandoned')),
  score_home smallint,
  score_away smallint,
  first_goalscorer text,
  bet_lock_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists betting_category_points (
  id uuid primary key default gen_random_uuid(),
  betting_category text not null check (betting_category in ('match_result','btts','total_goals','correct_score','first_goalscorer')),
  stage text,
  points smallint not null check (points > 0),
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (betting_category, stage)
);

create table if not exists bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  match_id uuid not null references matches(id),
  betting_category text not null,
  selection text not null,
  points_locked smallint not null,
  points_awarded smallint,
  status text not null default 'active' check (status in ('active','locked','correct','incorrect','void')),
  change_count smallint not null default 0,
  placed_at timestamptz not null default now(),
  locked_at timestamptz,
  settled_at timestamptz,
  unique (user_id, match_id, betting_category)
);

create table if not exists bet_history (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references bets(id) on delete cascade,
  event_type text not null check (event_type in ('placed','modified','locked','settled','voided')),
  old_selection text,
  new_selection text,
  changed_at timestamptz not null default now()
);

drop view if exists leaderboard;
create view leaderboard as
  select u.id,
         u.display_name,
         u.total_points,
         coalesce(sum(case when b.status = 'correct' then 1 else 0 end), 0) as correct_predictions
  from users u
  left join bets b on b.user_id = u.id
  group by u.id, u.display_name, u.total_points;

insert into betting_category_points (betting_category, stage, points, is_active)
values
  ('match_result', null, 3, true),
  ('btts', null, 2, true),
  ('total_goals', null, 2, true),
  ('correct_score', null, 6, true),
  ('first_goalscorer', null, 5, true)
on conflict do nothing;
