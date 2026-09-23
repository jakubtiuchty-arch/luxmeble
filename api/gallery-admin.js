/**
 * Dodawanie i usuwanie zdjęć z panelu.
 *
 * Panel nie pisze już do bazy wprost — klucz, którym to robił, jest widoczny
 * w przeglądarce, więc zapis wykonuje serwer po sprawdzeniu hasła.
 *
 * Zmienne środowiskowe:
 *   ADMIN_PASSWORD  hasło do panelu (do przeniesienia z admin.js)
 */
import { dodajZdjecie, usunZdjecie, KATEGORIE } from './_lib/galeria.js';

export const config = {
    api: {
        // Zdjęcie idzie w base64, panel zmniejsza je przed wysłaniem.
        bodyParser: { sizeLimit: '8mb' },
    },
};

function hasloPoprawne(req) {
    const oczekiwane = process.env.ADMIN_PASSWORD;
    if (!oczekiwane) return false;
    return req.headers['x-admin-password'] === oczekiwane;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!hasloPoprawne(req)) {
        return res.status(401).json({ error: 'Nieprawidłowe hasło' });
    }

    try {
        // Panel sprawdza tu hasło przy logowaniu — samo hasło zostaje na serwerze.
        if (req.method === 'GET') {
            return res.status(200).json({ ok: true });
        }

        if (req.method === 'POST') {
            const { plik, kategoria, tytul } = req.body || {};

            if (!plik) return res.status(400).json({ error: 'Brak pliku' });
            if (!KATEGORIE.includes(kategoria)) {
                return res.status(400).json({ error: 'Nieznana kategoria' });
            }

            const bufor = Buffer.from(String(plik).replace(/^data:image\/[a-z+]+;base64,/, ''), 'base64');
            if (!bufor.length) return res.status(400).json({ error: 'Pusty plik' });

            const wynik = await dodajZdjecie(bufor, { kategoria, tytul, zrodlo: 'panel' });
            return res.status(200).json(wynik);
        }

        if (req.method === 'DELETE') {
            const id = Number(req.query.id || (req.body || {}).id);
            if (!id) return res.status(400).json({ error: 'Brak identyfikatora' });

            await usunZdjecie(id);
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Panel galerii:', e);
        return res.status(500).json({ error: e.message });
    }
}
