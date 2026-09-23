/**
 * Zapis zdjęć do galerii — wspólny dla bota Telegrama i panelu.
 *
 * Wszystko, co trafia na stronę, przechodzi tędy: zdjęcie jest zmniejszane,
 * przepisywane na WebP i pozbawiane metadanych (aparat w telefonie zapisuje
 * współrzędne miejsca montażu), a dopiero potem ląduje w Storage.
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

export const KATEGORIE = ['kuchnie', 'szafy', 'garderoby', 'lazienki'];

export const NAZWY_KATEGORII = {
    kuchnie: 'Kuchnie',
    szafy: 'Szafy',
    garderoby: 'Garderoby',
    lazienki: 'Łazienki',
};

const BUCKET = 'gallery';
const SZEROKOSC = 1600;

export function polaczenie() {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

/**
 * Przygotowuje zdjęcie do publikacji. Zwraca bufor WebP bez metadanych.
 */
export async function przygotujZdjecie(bufor) {
    return sharp(bufor)
        .rotate()                                    // orientacja z EXIF, zanim go usuniemy
        .resize({ width: SZEROKOSC, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
}

/**
 * Wgrywa zdjęcie i zakłada wiersz w tabeli.
 *
 * @param {Buffer} bufor       oryginalne bajty zdjęcia
 * @param {object} opcje
 * @param {string} [opcje.kategoria]  jedna z KATEGORIE; brak = wpis czeka na wybór
 * @param {string} [opcje.tytul]      podpis pokazywany na kaflu
 * @param {string} [opcje.zrodlo]     'telegram' albo 'panel'
 * @returns {Promise<{id:number, url:string, storagePath:string}>}
 */
export async function dodajZdjecie(bufor, { kategoria = null, tytul = '', zrodlo = 'panel' } = {}) {
    if (kategoria && !KATEGORIE.includes(kategoria)) {
        throw new Error(`Nieznana kategoria: ${kategoria}`);
    }

    const sb = polaczenie();
    const webp = await przygotujZdjecie(bufor);

    const nazwa = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const sciezka = `realizacje/${new Date().getFullYear()}/${nazwa}`;

    const { error: bladPliku } = await sb.storage
        .from(BUCKET)
        .upload(sciezka, webp, { contentType: 'image/webp', upsert: false });
    if (bladPliku) throw new Error(`Zapis pliku: ${bladPliku.message}`);

    const { data: adres } = sb.storage.from(BUCKET).getPublicUrl(sciezka);

    const { data, error } = await sb
        .from('gallery')
        .insert({
            category: kategoria,
            filename: nazwa,
            title: (tytul || '').trim().slice(0, 120) || null,
            url: adres.publicUrl,
            storage_path: sciezka,
            status: kategoria ? 'published' : 'pending',
            source: zrodlo,
        })
        .select('id')
        .single();

    if (error) {
        // Bez wiersza w bazie plik byłby śmieciem, którego nikt już nie znajdzie.
        await sb.storage.from(BUCKET).remove([sciezka]);
        throw new Error(`Zapis wiersza: ${error.message}`);
    }

    return { id: data.id, url: adres.publicUrl, storagePath: sciezka };
}

/** Przypisuje kategorię i publikuje zdjęcie czekające na decyzję. */
export async function opublikuj(id, kategoria) {
    if (!KATEGORIE.includes(kategoria)) throw new Error(`Nieznana kategoria: ${kategoria}`);

    const { data, error } = await polaczenie()
        .from('gallery')
        .update({ category: kategoria, status: 'published' })
        .eq('id', id)
        .select('id, url')
        .single();

    if (error) throw new Error(`Publikacja: ${error.message}`);
    return data;
}

/** Usuwa zdjęcie razem z plikiem. */
export async function usunZdjecie(id) {
    const sb = polaczenie();

    const { data, error } = await sb
        .from('gallery')
        .select('storage_path')
        .eq('id', id)
        .single();
    if (error) throw new Error(`Odczyt przed usunięciem: ${error.message}`);

    // Zdjęcia z pierwszego zasiewu leżą w repozytorium, nie w Storage.
    if (data.storage_path && !data.storage_path.startsWith('repo/')) {
        await sb.storage.from(BUCKET).remove([data.storage_path]);
    }

    const { error: bladUsuwania } = await sb.from('gallery').delete().eq('id', id);
    if (bladUsuwania) throw new Error(`Usuwanie wiersza: ${bladUsuwania.message}`);
}
