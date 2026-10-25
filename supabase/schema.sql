-- morgzconservery. partner — schéma Supabase
-- À coller dans Supabase > SQL Editor > New query > Run

-- 1. Profils (un par compte)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'investor' check (role in ('admin','investor')),
  share_pct numeric not null default 60,
  created_at timestamptz not null default now()
);

-- 2. Pièces
create table if not exists public.pieces (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid references public.profiles(id) on delete set null,
  title text not null,
  brand text,
  size text,
  condition text,
  status text not null default 'sourcing' check (status in ('sourcing','achetee','en_vente','vendue')),
  purchase_price numeric not null default 0,
  target_price numeric not null default 0,
  sale_price numeric,
  fees numeric not null default 0,
  purchased_at date,
  target_days integer default 30,
  sold_at date,
  photos text[] not null default '{}',
  proofs jsonb not null default '[]',
  notes text,
  created_at timestamptz not null default now()
);

-- 3. Mouvements d'argent (apports, retraits, versements de gains)
create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('apport','retrait','versement_gains')),
  amount numeric not null check (amount >= 0),
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

-- 4. Fonction admin
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 5. Profil créé automatiquement à l'inscription
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6. Sécurité : chaque investisseur ne voit que ses données
alter table public.profiles enable row level security;
alter table public.pieces enable row level security;
alter table public.movements enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles admin write" on public.profiles;
create policy "profiles admin write" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pieces read" on public.pieces;
create policy "pieces read" on public.pieces for select using (investor_id = auth.uid() or public.is_admin());
drop policy if exists "pieces admin write" on public.pieces;
create policy "pieces admin write" on public.pieces for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "movements read" on public.movements;
create policy "movements read" on public.movements for select using (investor_id = auth.uid() or public.is_admin());
drop policy if exists "movements admin write" on public.movements;
create policy "movements admin write" on public.movements for all using (public.is_admin()) with check (public.is_admin());

-- 6 bis. Frais (déplacements…)
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

-- 7. Stockage des photos et preuves
insert into storage.buckets (id, name, public) values ('partner', 'partner', true)
  on conflict (id) do nothing;
drop policy if exists "partner read" on storage.objects;
create policy "partner read" on storage.objects for select using (bucket_id = 'partner');
drop policy if exists "partner admin write" on storage.objects;
create policy "partner admin write" on storage.objects for all
  using (bucket_id = 'partner' and public.is_admin())
  with check (bucket_id = 'partner' and public.is_admin());

-- 8. APRÈS avoir créé ton compte (Authentication > Users > Add user),
--    passe-le admin en remplaçant l'email ci-dessous :
-- update public.profiles set role = 'admin', full_name = 'Morgan Gati' where email = 'mrgzconservery@gmail.com';
