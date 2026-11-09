-- Demandes de retrait des partenaires.
create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null check (amount > 0),
  note text,
  status text not null default 'pending' check (status in ('pending','paid','refused')),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.withdrawal_requests enable row level security;
drop policy if exists "wd read" on public.withdrawal_requests;
create policy "wd read" on public.withdrawal_requests for select using (investor_id = auth.uid() or public.is_admin());
drop policy if exists "wd ask" on public.withdrawal_requests;
create policy "wd ask" on public.withdrawal_requests for insert with check (investor_id = auth.uid() and status = 'pending');
drop policy if exists "wd admin" on public.withdrawal_requests;
create policy "wd admin" on public.withdrawal_requests for all using (public.is_admin()) with check (public.is_admin());
