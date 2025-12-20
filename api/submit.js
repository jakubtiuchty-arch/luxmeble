import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { name, email, phone, message } = req.body;

        // Walidacja
        if (!name || !email) {
            return res.status(400).json({ error: 'Imię i email są wymagane' });
        }

        // Zapisz do Supabase
        const { data: submission, error: dbError } = await supabase
            .from('submissions')
            .insert([{
                name,
                email,
                phone: phone || '',
                message: message || '',
                contacted: false
            }])
            .select()
            .single();

        if (dbError) {
            console.error('Database error:', dbError);
            throw new Error('Błąd zapisu do bazy');
        }

        // Wyślij email powiadomienie do właściciela
        await resend.emails.send({
            from: 'Lux-Meble <kontakt@lux-meble.pl>',
            to: process.env.ADMIN_EMAIL,
            subject: `🏠 Nowe zapytanie od ${name}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0d0d0d; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0d0d0d; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 8px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #c9a87c 0%, #a08060 100%); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #0d0d0d; font-size: 28px; font-weight: 600; letter-spacing: 3px;">LUX-MEBLE</h1>
                            <p style="margin: 10px 0 0; color: #0d0d0d; font-size: 14px; opacity: 0.8;">Nowe zapytanie ze strony</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 30px; color: #c9a87c; font-size: 20px; font-weight: 500;">Dane klienta</h2>

                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding: 15px 0; border-bottom: 1px solid #333;">
                                        <span style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Imię i nazwisko</span>
                                        <p style="margin: 8px 0 0; color: #fff; font-size: 16px; font-weight: 500;">${name}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 0; border-bottom: 1px solid #333;">
                                        <span style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Email</span>
                                        <p style="margin: 8px 0 0;"><a href="mailto:${email}" style="color: #c9a87c; font-size: 16px; text-decoration: none;">${email}</a></p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 0; border-bottom: 1px solid #333;">
                                        <span style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Telefon</span>
                                        <p style="margin: 8px 0 0;"><a href="tel:${phone}" style="color: #c9a87c; font-size: 16px; text-decoration: none;">${phone || 'Nie podano'}</a></p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 0;">
                                        <span style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Wiadomość</span>
                                        <div style="margin: 12px 0 0; padding: 20px; background-color: #0d0d0d; border-radius: 6px; border-left: 3px solid #c9a87c;">
                                            <p style="margin: 0; color: #ccc; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${message || 'Brak wiadomości'}</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="tel:${phone}" style="display: inline-block; padding: 16px 40px; background-color: #c9a87c; color: #0d0d0d; text-decoration: none; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; border-radius: 4px;">
                                            📞 Zadzwoń teraz
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 25px 30px; background-color: #141414; text-align: center; border-top: 1px solid #333;">
                            <p style="margin: 0; color: #666; font-size: 12px;">
                                Zapytanie otrzymane: ${new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })}
                            </p>
                            <p style="margin: 10px 0 0; color: #666; font-size: 12px;">
                                <a href="${process.env.SITE_URL}/admin" style="color: #c9a87c; text-decoration: none;">Otwórz panel admin →</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `
        });

        // Wyślij potwierdzenie do klienta
        await resend.emails.send({
            from: 'Lux-Meble <kontakt@lux-meble.pl>',
            to: email,
            subject: 'Dziękujemy za kontakt - Lux-Meble',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0d0d0d; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0d0d0d; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 8px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #c9a87c 0%, #a08060 100%); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #0d0d0d; font-size: 28px; font-weight: 600; letter-spacing: 3px;">LUX-MEBLE</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px; text-align: center;">
                            <div style="width: 70px; height: 70px; margin: 0 auto 25px; background-color: rgba(201, 168, 124, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 32px;">✓</span>
                            </div>

                            <h2 style="margin: 0 0 15px; color: #fff; font-size: 24px; font-weight: 500;">Dziękujemy, ${name.split(' ')[0]}!</h2>

                            <p style="margin: 0 0 30px; color: #a0a0a0; font-size: 16px; line-height: 1.7;">
                                Otrzymaliśmy Twoje zapytanie i skontaktujemy się z Tobą najszybciej jak to możliwe - zazwyczaj w ciągu 24 godzin.
                            </p>

                            <div style="padding: 25px; background-color: #0d0d0d; border-radius: 8px; text-align: left;">
                                <p style="margin: 0 0 15px; color: #c9a87c; font-size: 14px; font-weight: 500;">Twoja wiadomość:</p>
                                <p style="margin: 0; color: #ccc; font-size: 14px; line-height: 1.6; font-style: italic;">"${message || 'Prośba o kontakt'}"</p>
                            </div>
                        </td>
                    </tr>

                    <!-- Contact Info -->
                    <tr>
                        <td style="padding: 30px; background-color: #141414; text-align: center; border-top: 1px solid #333;">
                            <p style="margin: 0 0 15px; color: #fff; font-size: 14px;">W pilnych sprawach zadzwoń:</p>
                            <p style="margin: 0;">
                                <a href="tel:+48502333012" style="color: #c9a87c; font-size: 18px; text-decoration: none; font-weight: 500;">+48 502 333 012</a>
                            </p>
                            <p style="margin: 20px 0 0; color: #666; font-size: 12px;">
                                Lux-Meble | Trzebnica<br>
                                Meble na wymiar z pasją
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `
        });

        return res.status(200).json({
            success: true,
            message: 'Wiadomość wysłana pomyślnie'
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            error: 'Wystąpił błąd podczas wysyłania wiadomości'
        });
    }
}
