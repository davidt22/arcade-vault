create table scores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  game_id     text not null,
  score       integer not null,
  level       integer not null default 1,
  created_at  timestamptz not null default now()
);

alter table scores enable row level security;

create policy "own scores" on scores
  for all using (auth.uid() = user_id);
