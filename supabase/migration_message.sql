-- Message personnel de Morgz affiché dans l'espace du partenaire
alter table public.profiles add column if not exists partner_message text;
alter table public.profiles add column if not exists partner_message_at timestamptz;
