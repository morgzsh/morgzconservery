alter table public.movements drop constraint if exists movements_type_check;
alter table public.movements add constraint movements_type_check check (type in ('apport','retrait','versement_gains','gain_plus','gain_moins'));
