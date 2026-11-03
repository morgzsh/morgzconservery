-- Propositions de sourcing, 2 partenaires sur une pièce.
alter table public.pieces add column if not exists investor2_id uuid references public.profiles(id) on delete set null;
alter table public.pieces add column if not exists investor2_contribution numeric;
alter table public.pieces add column if not exists investor2_amount numeric;

drop policy if exists "pieces read" on public.pieces;
create policy "pieces read" on public.pieces for select
  using (investor_id = auth.uid() or investor2_id = auth.uid() or public.is_admin());

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, brand text, size text,
  photos text[] not null default '{}',
  purchase_price numeric not null default 0,
  target_price numeric not null default 0,
  contribution numeric, note text,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.proposals enable row level security;
drop policy if exists "proposals read" on public.proposals;
create policy "proposals read" on public.proposals for select using (investor_id = auth.uid() or public.is_admin());
drop policy if exists "proposals admin write" on public.proposals;
create policy "proposals admin write" on public.proposals for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.respond_proposal(pid uuid, accept boolean) returns void
language sql security definer set search_path = public as $$
  update public.proposals set status = case when accept then 'accepted' else 'declined' end, responded_at = now()
  where id = pid and investor_id = auth.uid() and status = 'pending';
$$;
grant execute on function public.respond_proposal(uuid, boolean) to authenticated;
