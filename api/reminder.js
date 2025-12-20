import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    // Weryfikacja że to Vercel Cron
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Znajdź zapytania starsze niż 24h bez oddzwonienia
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: overdueSubmissions, error } = await supabase
            .from('submissions')
            .select('*')
            .eq('contacted', false)
            .eq('reminder_sent', false)
            .lt('created_at', twentyFourHoursAgo);

        if (error) {
            console.error('Database error:', error);
            throw error;
        }

        if (!overdueSubmissions || overdueSubmissions.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Brak zapytań wymagających przypomnienia',
                count: 0
            });
        }

        // Wyślij przypomnienie dla każdego zaległego zapytania
        for (const submission of overdueSubmissions) {
            const hoursAgo = Math.round((Date.now() - new Date(submission.created_at).getTime()) / (1000 * 60 * 60));

            await resend.emails.send({
                from: 'Lux-Meble <kontakt@lux-meble.pl>',
                to: process.env.ADMIN_EMAIL,
                subject: `⚠️ PRZYPOMNIENIE: Oddzwoń do ${submission.name}!`,
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
                    <!-- Header - Warning Style -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #fff; font-size: 24px; font-weight: 600;">⚠️ PRZYPOMNIENIE</h1>
                            <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Klient czeka na kontakt już ${hoursAgo} godzin!</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <div style="display: inline-block; padding: 15px 30px; background-color: rgba(239, 68, 68, 0.15); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);">
                                    <p style="margin: 0; color: #ef4444; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                        Zapytanie oczekuje od ${hoursAgo}h
                                    </p>
                                </div>
                            </div>

                            <h2 style="margin: 0 0 25px; color: #c9a87c; font-size: 18px; font-weight: 500;">Dane klienta</h2>

                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #333;">
                                        <span style="color: #666; font-size: 12px; text-transform: uppercase;">Imię i nazwisko</span>
                                        <p style="margin: 5px 0 0; color: #fff; font-size: 16px; font-weight: 500;">${submission.name}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #333;">
                                        <span style="color: #666; font-size: 12px; text-transform: uppercase;">Telefon</span>
                                        <p style="margin: 5px 0 0;">
                                            <a href="tel:${submission.phone}" style="color: #c9a87c; font-size: 18px; text-decoration: none; font-weight: 600;">${submission.phone || 'Nie podano'}</a>
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #333;">
                                        <span style="color: #666; font-size: 12px; text-transform: uppercase;">Email</span>
                                        <p style="margin: 5px 0 0;">
                                            <a href="mailto:${submission.email}" style="color: #c9a87c; font-size: 16px; text-decoration: none;">${submission.email}</a>
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0;">
                                        <span style="color: #666; font-size: 12px; text-transform: uppercase;">Wiadomość</span>
                                        <div style="margin: 10px 0 0; padding: 15px; background-color: #0d0d0d; border-radius: 6px;">
                                            <p style="margin: 0; color: #ccc; font-size: 14px; line-height: 1.6;">${submission.message || 'Prośba o kontakt'}</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Buttons -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="tel:${submission.phone}" style="display: inline-block; padding: 16px 40px; background-color: #ef4444; color: #fff; text-decoration: none; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; border-radius: 4px; margin-right: 10px;">
                                            📞 Zadzwoń teraz
                                        </a>
                                        <a href="${process.env.SITE_URL}/admin" style="display: inline-block; padding: 16px 40px; background-color: #333; color: #fff; text-decoration: none; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; border-radius: 4px;">
                                            Panel Admin
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 30px; background-color: #141414; text-align: center; border-top: 1px solid #333;">
                            <p style="margin: 0; color: #666; font-size: 12px;">
                                Zapytanie otrzymane: ${new Date(submission.created_at).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })}
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

            // Oznacz że przypomnienie zostało wysłane
            await supabase
                .from('submissions')
                .update({ reminder_sent: true })
                .eq('id', submission.id);
        }

        return res.status(200).json({
            success: true,
            message: `Wysłano ${overdueSubmissions.length} przypomnień`,
            count: overdueSubmissions.length
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            error: 'Wystąpił błąd podczas wysyłania przypomnień'
        });
    }
}
