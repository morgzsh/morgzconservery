-- Espace clients : commandes sourcées pour un acheteur.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin','investor','client'));

create table if not exists public.client_orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, brand text, size text, reference text,
  photos text[] not null default '{}',
  status text not null default 'demande' check (status in ('demande','sourcing','trouvee','achetee','expediee','livree','annulee')),
  price numeric, deposit numeric not null default 0,
  eta date, progress int not null default 0,
  client_note text, delivered_at date,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.client_orders enable row level security;
drop policy if exists "orders read" on public.client_orders;
create policy "orders read" on public.client_orders for select using (client_id = auth.uid() or public.is_admin());
drop policy if exists "orders admin write" on public.client_orders;
create policy "orders admin write" on public.client_orders for all using (public.is_admin()) with check (public.is_admin());

-- Mes coûts : table séparée, lisible par l'admin uniquement.
create table if not exists public.client_order_costs (
  order_id uuid primary key references public.client_orders(id) on delete cascade,
  purchase_price numeric, fees numeric, internal_note text
);
alter table public.client_order_costs enable row level security;
drop policy if exists "order costs admin" on public.client_order_costs;
create policy "order costs admin" on public.client_order_costs for all using (public.is_admin()) with check (public.is_admin());
