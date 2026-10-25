-- morgzconservery. partner — Frais perso (sans partenaire) pour « Mes comptes »
alter table public.expenses alter column investor_id drop not null;
-- Mouvements de Morgz sur ses fonds propres (sans partenaire)
alter table public.movements alter column investor_id drop not null;
