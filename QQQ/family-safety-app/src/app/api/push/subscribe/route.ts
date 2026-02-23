import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        const { subscription, settings, userId } = payload;

        if (!subscription || !subscription.endpoint) {
            return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl!, supabaseKey!);

        // UPSERT the subscription mapping
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: userId || null, // Optional
                endpoint: subscription.endpoint,
                auth: subscription.keys.auth,
                p256dh: subscription.keys.p256dh,
                earthquake: settings?.earthquake ?? true,
                regional_warning: settings?.regionalWarning ?? true,
                heavy_rain: settings?.heavyRain ?? true,
                weather: settings?.weather ?? true,
                major_tsunami: settings?.majorTsunami ?? true,
                tsunami: settings?.tsunami ?? true,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'endpoint'
            });

        if (error) {
            console.error('Database Error:', error);
            return NextResponse.json({ error: 'Failed to save subscription details' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Subscription saved' }, { status: 200 });

    } catch (err) {
        console.error('Subscribe API Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
