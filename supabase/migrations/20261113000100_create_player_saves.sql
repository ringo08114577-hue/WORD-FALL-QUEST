-- WORD FALL QUEST: one private cloud save per authenticated player.
-- Anonymous Supabase users also receive the authenticated database role.
create table if not exists public.player_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  save_version integer not null check (save_version > 0),
  save_data jsonb not null check (jsonb_typeof(save_data) = 'object'),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.player_saves is
  'One versioned WORD FALL QUEST save snapshot per Supabase user.';
comment on column public.player_saves.save_data is
  'Validated game snapshot. The browser keeps a local backup as well.';

alter table public.player_saves enable row level security;

revoke all on table public.player_saves from anon, public;
grant select, insert, update on table public.player_saves to authenticated;

drop policy if exists "Players can read their own save" on public.player_saves;
create policy "Players can read their own save"
  on public.player_saves
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Players can create their own save" on public.player_saves;
create policy "Players can create their own save"
  on public.player_saves
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Players can update their own save" on public.player_saves;
create policy "Players can update their own save"
  on public.player_saves
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.set_player_save_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_player_save_updated_at on public.player_saves;
create trigger set_player_save_updated_at
before update on public.player_saves
for each row execute function public.set_player_save_updated_at();
