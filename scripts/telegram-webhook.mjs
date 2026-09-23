#!/usr/bin/env node
/**
 * Podpięcie bota Telegrama pod stronę.
 *
 *   node scripts/telegram-webhook.mjs status    — co Telegram wie o webhooku
 *   node scripts/telegram-webhook.mjs ustaw     — podepnij pod /api/telegram
 *   node scripts/telegram-webhook.mjs usun      — odepnij bota
 *
 * Token i sekret bierze z .env.local albo ze zmiennych powłoki:
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, SITE_URL
 */
import { readFileSync } from 'fs';

const env = { ...process.env };
for (const plik of ['.env.local', '.env']) {
    try {
        for (const linia of readFileSync(plik, 'utf8').split('\n')) {
            const m = linia.match(/^([A-Z_0-9]+)=["']?([^"']*)["']?\s*$/);
            if (m && !env[m[1]]) env[m[1]] = m[2];
        }
    } catch {}
}

const TOKEN = env.TELEGRAM_BOT_TOKEN;
const SEKRET = env.TELEGRAM_WEBHOOK_SECRET;
const STRONA = env.SITE_URL || 'https://lux-meble.pl';
const polecenie = process.argv[2] || 'status';

if (!TOKEN) {
    console.error('Brak TELEGRAM_BOT_TOKEN. Token dostajesz od @BotFather po komendzie /newbot.');
    process.exit(1);
}

async function api(metoda, dane) {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${metoda}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dane || {}),
    });
    return res.json();
}

if (polecenie === 'status') {
    const bot = await api('getMe');
    if (!bot.ok) {
        console.error('Token nie działa:', bot.description);
        process.exit(1);
    }
    console.log(`Bot: ${bot.result.first_name} (@${bot.result.username})`);

    const hook = await api('getWebhookInfo');
    const i = hook.result;
    console.log(`Webhook: ${i.url || '(nie ustawiony)'}`);
    console.log(`Oczekujące aktualizacje: ${i.pending_update_count}`);
    if (i.last_error_message) {
        console.log(`Ostatni błąd: ${i.last_error_message} (${new Date(i.last_error_date * 1000).toLocaleString('pl-PL')})`);
    }
} else if (polecenie === 'ustaw') {
    if (!SEKRET) {
        console.error('Brak TELEGRAM_WEBHOOK_SECRET — bez niego webhook przyjmowałby żądania od kogokolwiek.');
        process.exit(1);
    }
    const adres = `${STRONA}/api/telegram`;
    const wynik = await api('setWebhook', {
        url: adres,
        secret_token: SEKRET,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
    });
    console.log(wynik.ok ? `Webhook ustawiony: ${adres}` : `Nie udało się: ${wynik.description}`);
    process.exit(wynik.ok ? 0 : 1);
} else if (polecenie === 'usun') {
    const wynik = await api('deleteWebhook', { drop_pending_updates: true });
    console.log(wynik.ok ? 'Webhook usunięty.' : `Nie udało się: ${wynik.description}`);
} else {
    console.error('Użycie: node scripts/telegram-webhook.mjs status | ustaw | usun');
    process.exit(1);
}
