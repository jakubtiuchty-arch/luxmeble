-- Galeria realizacji — krok 2
-- Do wklejenia w SQL Editor. Można uruchomić ponownie, nic się nie zdubluje.

-- ── Podpis pod zdjęciem ──────────────────────────────────────────────────────
-- Panel i bot Telegrama wpisują tu opis realizacji („Kuchnia w Trzebnicy").
alter table public.gallery add column if not exists title text;

-- ── Zdjęcia, które są dziś na stronie ────────────────────────────────────────
-- Pliki zostają w repozytorium, baza je tylko indeksuje, żeby po dodaniu
-- pierwszego zdjęcia przez klienta dotychczasowe realizacje nie zniknęły.
insert into public.gallery (category, filename, title, url, storage_path, created_at)
select nowe.* from (values
    ('kuchnie', 'kuchania-1.jpg', 'Nowoczesna kuchnia', '/images/kuchania-1.jpg', 'repo/kuchania-1.jpg', '2024-12-01 12:00:00+00'::timestamptz),
    ('kuchnie', 'kuchania-2.jpg', 'Kuchnia na wymiar', '/images/kuchania-2.jpg', 'repo/kuchania-2.jpg', '2024-12-01 11:00:00+00'::timestamptz),
    ('kuchnie', 'kuchania-3.jpg', 'Elegancka kuchnia', '/images/kuchania-3.jpg', 'repo/kuchania-3.jpg', '2024-12-01 10:00:00+00'::timestamptz),
    ('kuchnie', 'kuchania-4.jpg', 'Kuchnia z wyspą', '/images/kuchania-4.jpg', 'repo/kuchania-4.jpg', '2024-12-01 09:00:00+00'::timestamptz),
    ('lazienki', 'lazienka-1.jpg', 'Nowoczesna łazienka', '/images/lazienka-1.jpg', 'repo/lazienka-1.jpg', '2024-12-01 08:00:00+00'::timestamptz),
    ('lazienki', 'lazienka-2.jpg', 'Elegancka łazienka', '/images/lazienka-2.jpg', 'repo/lazienka-2.jpg', '2024-12-01 07:00:00+00'::timestamptz),
    ('lazienki', 'lazienka-3.jpg', 'Łazienka na wymiar', '/images/lazienka-3.jpg', 'repo/lazienka-3.jpg', '2024-12-01 06:00:00+00'::timestamptz),
    ('lazienki', 'lazienka-4.jpg', 'Minimalistyczna łazienka', '/images/lazienka-4.jpg', 'repo/lazienka-4.jpg', '2024-12-01 05:00:00+00'::timestamptz),
    ('szafy', 'szafa-1.jpg', 'Szafa wnękowa', '/images/szafa-1.jpg', 'repo/szafa-1.jpg', '2024-12-01 04:00:00+00'::timestamptz),
    ('szafy', 'szafa-2.jpg', 'Szafa z drzwiami przesuwnymi', '/images/szafa-2.jpg', 'repo/szafa-2.jpg', '2024-12-01 03:00:00+00'::timestamptz),
    ('szafy', 'szafa-3.jpg', 'Szafa na wymiar', '/images/szafa-3.jpg', 'repo/szafa-3.jpg', '2024-12-01 02:00:00+00'::timestamptz)
) as nowe(category, filename, title, url, storage_path, created_at)
where not exists (
    select 1 from public.gallery g where g.storage_path = nowe.storage_path
);

-- ── Zamknięcie zapisu dla klucza publicznego ─────────────────────────────────
-- Klucz z admin.js widać w przeglądarce, więc dopóki istnieje polityka zapisu,
-- każdy może dopisać wiersz z dowolnym adresem obrazka i podmienić zawartość
-- sekcji „Realizacje". Zapis zostaje wyłącznie przy funkcjach serwerowych.
do $$
declare
    polityka record;
begin
    for polityka in
        select policyname
        from pg_policies
        where schemaname = 'public' and tablename = 'gallery' and cmd <> 'SELECT'
    loop
        execute format('drop policy %I on public.gallery', polityka.policyname);
    end loop;
end $$;

-- Kontrola: zostaje sam odczyt i 11 wierszy.
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'gallery';
select count(*) as zdjec from public.gallery;
