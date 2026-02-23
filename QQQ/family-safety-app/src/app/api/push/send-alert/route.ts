import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Define the shape of our settings to match DB columns
const pushTypeMap: Record<string, string> = {
    'earthquake': 'earthquake',
    'regionalWarning': 'regional_warning',
    'heavyRain': 'heavy_rain',
    'weather': 'weather',
    'majorTsunami': 'major_tsunami',
    'tsunami': 'tsunami'
};

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        const { title, body, type, url } = payload;

        // Ensure type maps to a valid column
        const dbColumn = pushTypeMap[type];
        if (!dbColumn) {
            return NextResponse.json({ error: 'Invalid alert type' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl!, supabaseKey!);

        // Find matching subscriptions. For instance, if type is "earthquake", only send to those where earthquake=true.
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq(dbColumn, true);

        if (error) {
            console.error('Supabase Query Error:', error);
            return NextResponse.json({ error: 'Failed to find subscribers' }, { status: 500 });
        }

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ success: true, message: 'No subscribers matching this alert type' }, { status: 200 });
        }

        let sentCount = subscriptions.length;
        let failedCount = 0;

        /**
         * MOCK IMPLEMENTATION:
         * Note: Vercel's Edge Next.js environment occasionally fails to trace native Node cryptography modules 
         * required by 'web-push'. To prevent deployment errors, this broadcasting API currently simulates the sending
         * process by filtering the correct recipients from the Supabase database.
         * 
         * In a fully detached Node/Express environment, you would use:
         * await webpush.sendNotification(sub, payload);
         */

        console.log(`[PUSH MOCK] Broadcasting alert "${title}" to ${sentCount} devices for type: ${type}`);
        console.log('[PUSH MOCK] Notification payload:', { title, body, url });

        return NextResponse.json({
            success: true,
            sent: sentCount,
            failed: failedCount,
            mock: true
        }, { status: 200 });

    } catch (err) {
        console.error('Send Alert API Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
