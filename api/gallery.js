import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Kategorie odpowiadają zakładkom w panelu i filtrom w sekcji „Realizacje".
const KATEGORIE = ['kuchnie', 'szafy', 'garderoby', 'lazienki'];

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { data, error } = await supabase
            .from('gallery')
            .select('id, category, filename, title, url, created_at')
            // Zdjęcie przysłane botem czeka na wybór kategorii i do tego czasu
            // nie ma go na stronie.
            .eq('status', 'published')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const items = (data || [])
            .filter(row => row.url && KATEGORIE.includes(row.category))
            .map(row => ({
                id: row.id,
                category: row.category,
                url: row.url,
                // Podpis wpisuje bot Telegrama z opisu zdjęcia. Bez niego kafel sam
                // dobiera tytuł z kategorii — nazwa pliku to znacznik czasu, nie opis.
                title: (row.title || '').trim() || null,
                createdAt: row.created_at,
            }));

        // Świeże zdjęcie pojawia się na stronie najpóźniej po minucie, a przez ten
        // czas odwiedziny nie uderzają w bazę.
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
        return res.status(200).json({ items });
    } catch (error) {
        console.error('Błąd odczytu galerii:', error);
        // Strona ma wtedy zostać przy zdjęciach wpisanych w HTML, nie pokazywać pustki.
        return res.status(200).json({ items: [], error: 'unavailable' });
    }
}
