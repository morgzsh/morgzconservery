-- morgzconservery. partner — répartition des frais au choix, part partenaire forcée, mentions
alter table public.expenses add column if not exists investor_amount numeric;
alter table public.expenses add column if not exists note text;
alter table public.pieces add column if not exists investor_amount numeric;
