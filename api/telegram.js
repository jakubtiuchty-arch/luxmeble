/**
 * Bot Telegrama — dodawanie realizacji zdjęciem z telefonu.
 *
 * Przepływ: zdjęcie → bot pyta o kategorię → po wyborze zdjęcie jest na stronie.
 * Do czasu wyboru wiersz ma status „pending" i galeria go nie pokazuje.
 *
 * Zmienne środowiskowe:
 *   TELEGRAM_BOT_TOKEN      token z @BotFather
 *   TELEGRAM_WEBHOOK_SECRET dowolny losowy ciąg, ten sam co przy setWebhook
 *   TELEGRAM_ALLOWED_CHATS  identyfikatory czatów po przecinku
 *   SITE_URL                adres strony, do linku w potwierdzeniu
 */
import { dodajZdjecie, opublikuj, usunZdjecie, KATEGORIE, NAZWY_KATEGORII } from './_lib/galeria.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

async function wyslij(metoda, dane) {
    const res = await fetch(`${API}/${metoda}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dane),
    });
    const wynik = await res.json();
    if (!wynik.ok) console.error(`Telegram ${metoda}:`, wynik.description);
    return wynik;
}

function klawiaturaKategorii(id) {
    // Układ 2×2, bo na telefonie cztery przyciski w rzędzie są za wąskie.
    const przyciski = KATEGORIE.map(k => ({
        text: NAZWY_KATEGORII[k],
        callback_data: `k:${id}:${k}`,
    }));
    return { inline_keyboard: [przyciski.slice(0, 2), przyciski.slice(2)] };
}

/** Największy z rozmiarów, jakie Telegram przysyła dla zdjęcia. */
function najlepszeZdjecie(wiadomosc) {
    if (Array.isArray(wiadomosc.photo) && wiadomosc.photo.length) {
        return wiadomosc.photo[wiadomosc.photo.length - 1].file_id;
    }
    // Zdjęcie wysłane „jako plik" zachowuje pełną rozdzielczość.
    if (wiadomosc.document && (wiadomosc.document.mime_type || '').startsWith('image/')) {
        return wiadomosc.document.file_id;
    }
    return null;
}

async function pobierzPlik(fileId) {
    const info = await wyslij('getFile', { file_id: fileId });
    if (!info.ok) throw new Error('Nie udało się pobrać pliku z Telegrama');

    const res = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${info.result.file_path}`);
    if (!res.ok) throw new Error(`Pobieranie pliku: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
}

function czatDozwolony(chatId) {
    const lista = (process.env.TELEGRAM_ALLOWED_CHATS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    // Pusta lista oznacza świeżo postawionego bota — wtedy tylko podpowiadamy
    // identyfikator, zamiast wpuszczać kogokolwiek.
    return lista.length > 0 && lista.includes(String(chatId));
}

async function obsluzWiadomosc(wiadomosc) {
    const chatId = wiadomosc.chat.id;

    if (!czatDozwolony(chatId)) {
        await wyslij('sendMessage', {
            chat_id: chatId,
            text: `Ten bot dodaje zdjęcia do galerii Lux-Meble i obsługuje tylko wskazane osoby.\n\nIdentyfikator tego czatu: ${chatId}`,
        });
        return;
    }

    const tekst = (wiadomosc.text || '').trim();
    if (tekst.startsWith('/start') || tekst.startsWith('/pomoc')) {
        await wyslij('sendMessage', {
            chat_id: chatId,
            text: 'Wyślij zdjęcie po skończonym montażu, a potem wybierz kategorię. '
                + 'Podpis dodany do zdjęcia trafi na stronę jako opis realizacji.\n\n'
                + 'Zdjęcie wysłane jako plik zachowuje pełną jakość.',
        });
        return;
    }

    const fileId = najlepszeZdjecie(wiadomosc);
    if (!fileId) {
        await wyslij('sendMessage', { chat_id: chatId, text: 'Wyślij zdjęcie, a dodam je do galerii.' });
        return;
    }

    const czekaj = await wyslij('sendMessage', { chat_id: chatId, text: 'Przygotowuję zdjęcie…' });

    try {
        const bufor = await pobierzPlik(fileId);
        const { id } = await dodajZdjecie(bufor, {
            tytul: wiadomosc.caption || '',
            zrodlo: 'telegram',
        });

        await wyslij('editMessageText', {
            chat_id: chatId,
            message_id: czekaj.result.message_id,
            text: wiadomosc.caption
                ? `Zdjęcie gotowe: „${wiadomosc.caption}". Do której kategorii?`
                : 'Zdjęcie gotowe. Do której kategorii?',
            reply_markup: klawiaturaKategorii(id),
        });
    } catch (e) {
        console.error('Dodawanie zdjęcia:', e);
        await wyslij('editMessageText', {
            chat_id: chatId,
            message_id: czekaj.result.message_id,
            text: 'Nie udało się dodać zdjęcia. Spróbuj jeszcze raz za chwilę.',
        });
    }
}

async function obsluzPrzycisk(zapytanie) {
    const chatId = zapytanie.message.chat.id;
    const dane = zapytanie.data || '';

    if (!czatDozwolony(chatId)) {
        await wyslij('answerCallbackQuery', { callback_query_id: zapytanie.id, text: 'Brak uprawnień' });
        return;
    }

    const [akcja, id, kategoria] = dane.split(':');

    try {
        if (akcja === 'k') {
            await opublikuj(Number(id), kategoria);
            await wyslij('answerCallbackQuery', { callback_query_id: zapytanie.id, text: 'Dodane' });
            await wyslij('editMessageText', {
                chat_id: chatId,
                message_id: zapytanie.message.message_id,
                text: `Zdjęcie jest w galerii — ${NAZWY_KATEGORII[kategoria]}.\n${process.env.SITE_URL || 'https://lux-meble.pl'}/#realizacje`,
                reply_markup: { inline_keyboard: [[{ text: 'Usuń ze strony', callback_data: `x:${id}` }]] },
            });
        } else if (akcja === 'x') {
            await usunZdjecie(Number(id));
            await wyslij('answerCallbackQuery', { callback_query_id: zapytanie.id, text: 'Usunięte' });
            await wyslij('editMessageText', {
                chat_id: chatId,
                message_id: zapytanie.message.message_id,
                text: 'Zdjęcie zostało usunięte ze strony.',
            });
        }
    } catch (e) {
        console.error('Obsługa przycisku:', e);
        await wyslij('answerCallbackQuery', { callback_query_id: zapytanie.id, text: 'Nie udało się' });
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Bez tego adres webhooka wystarczyłby, żeby sterować botem z zewnątrz.
    if (req.headers['x-telegram-bot-api-secret-token'] !== process.env.TELEGRAM_WEBHOOK_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const aktualizacja = req.body || {};

    try {
        if (aktualizacja.message) {
            await obsluzWiadomosc(aktualizacja.message);
        } else if (aktualizacja.callback_query) {
            await obsluzPrzycisk(aktualizacja.callback_query);
        }
    } catch (e) {
        console.error('Webhook Telegrama:', e);
    }

    // Telegram ponawia każdą aktualizację, na którą nie dostał 200.
    return res.status(200).json({ ok: true });
}
