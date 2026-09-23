-- Galeria realizacji — krok 3 (bot Telegrama)
-- Do wklejenia w SQL Editor. Można uruchomić ponownie.

-- Zdjęcie przysłane botem czeka na wybór kategorii i dopiero potem trafia na
-- stronę. Dotychczasowe wiersze są od razu opublikowane.
alter table public.gallery add column if not exists status text not null default 'published';
alter table public.gallery add column if not exists source text;

alter table public.gallery
    drop constraint if exists gallery_status_check;
alter table public.gallery
    add constraint gallery_status_check
    check (status in ('pending', 'published'));

-- Kategoria jest nieznana do czasu wyboru w bocie, więc kolumna musi przyjąć null.
alter table public.gallery alter column category drop not null;

alter table public.gallery
    drop constraint if exists gallery_category_check;
alter table public.gallery
    add constraint gallery_category_check
    check (category is null or category in ('kuchnie', 'szafy', 'garderoby', 'lazienki'));

-- Opublikowane zdjęcie musi mieć kategorię — inaczej nie trafiłoby pod żaden filtr.
alter table public.gallery
    drop constraint if exists gallery_published_ma_kategorie;
alter table public.gallery
    add constraint gallery_published_ma_kategorie
    check (status <> 'published' or category is not null);

create index if not exists gallery_status_created_idx
    on public.gallery (status, created_at desc);

-- Kontrola.
select status, count(*) from public.gallery group by status;
