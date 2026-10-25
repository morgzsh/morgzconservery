-- morgzconservery. partner — Frais (déplacements, train, Uber…)
-- À coller dans Supabase > SQL Editor > New query > Run (une seule fois)

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.profiles(id) on delete cascade,
  piece_id uuid references public.pieces(id) on delete set null,
  type text not null default 'deplacement' check (type in ('deplacement','train','uber','autre')),
  amount numeric not null check (amount >= 0),
  date date not null default current_date,
  label text,
  status text not null default 'prevu' check (status in ('prevu','regle')),
  proof jsonb,
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;
drop policy if exists "expenses read" on public.expenses;
create policy "expenses read" on public.expenses for select using (investor_id = auth.uid() or public.is_admin());
drop policy if exists "expenses admin write" on public.expenses;
create policy "expenses admin write" on public.expenses for all using (public.is_admin()) with check (public.is_admin());
