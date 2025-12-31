
export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: { message: 'Method Not Allowed' } }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { text } = await req.json();

        if (!text) {
            return new Response(JSON.stringify({ error: { message: 'Text is required' } }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Text Normalization for better Japanese pronunciation
        let cleanText = text;

        console.log("Original Text:", text); // Debug log

        // Fix time format: 20:00 -> 20時, 9:00 -> 9時
        cleanText = cleanText.replace(/(\d{1,2}):(\d{2})/g, (match, hour, minute) => {
            // Simple check to ensure reasonable time range
            const h = parseInt(hour, 10);
            const m = parseInt(minute, 10);
            if (h >= 0 && h <= 24 && m >= 0 && m <= 59) {
                if (minute === '00') return `${hour}時`;
                return `${hour}時${minute}分`;
            }
            return match; // Return original if not a valid time
        });

        // Fix date format: 12/31 -> 12月31日
        // Be careful not to break URLs, so look for boundaries or surrounding text context if possible. 
        // For now, simple slash pattern often used in chat.
        cleanText = cleanText.replace(/(\d{1,2})\/(\d{1,2})/g, (match, month, day) => {
            const m = parseInt(month, 10);
            const d = parseInt(day, 10);
            if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                return `${month}月${day}日`;
            }
            return match;
        });

        // Common Kanji Fixes (Custom Dictionary)
        const commonFixes = {
            '明日': 'あした',
            '今日': 'きょう',
            '昨日': 'きのう',
            // Add more here based on user feedback
        };

        for (const [key, value] of Object.entries(commonFixes)) {
            // specific simple replace
            cleanText = cleanText.split(key).join(value);
        }

        console.log("Normalized Text:", cleanText); // Debug log

        // --- CHECK CONFIG ---
        // Priority 1: Azure (New Request)
        const azureKey = process.env.AZURE_SPEECH_KEY;
        const azureRegion = process.env.AZURE_SPEECH_REGION || 'japaneast';

        // Priority 2: ElevenLabs
        const elApiKey = process.env.ELEVENLABS_API_KEY;

        // Priority 3: OpenAI
        const openaiApiKey = process.env.OPENAI_API_KEY;

        if (azureKey) {
            // === Azure TTS Implementation ===
            // Docs: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech
            const endpoint = `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;

            const ssml = `
<speak version='1.0' xml:lang='ja-JP'>
    <voice xml:lang='ja-JP' xml:gender='Female' name='ja-JP-NanamiNeural'>
        ${cleanText}
    </voice>
</speak>`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': azureKey,
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
                    'User-Agent': 'DemoSalonTTS'
                },
                body: ssml
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Azure TTS Error:', errorText);
                throw new Error(`Azure TTS Error: ${response.status} ${response.statusText}`);
            }

            return new Response(response.body, {
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Cache-Control': 'no-cache',
                },
            });

        } else if (elApiKey) {
            // === ElevenLabs Implementation ===
            const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
            const modelId = 'eleven_multilingual_v2';

            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'xi-api-key': elApiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: cleanText,
                    model_id: modelId,
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.detail?.message || JSON.stringify(errorData) || response.statusText;
                console.error('ElevenLabs API Error:', errorMessage);
                throw new Error('ElevenLabs Error: ' + errorMessage);
            }

            return new Response(response.body, {
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Cache-Control': 'no-cache',
                },
            });

        } else if (openaiApiKey) {
            // === OpenAI Implementation (Fallback) ===
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openaiApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'tts-1-hd',
                    input: cleanText,
                    voice: 'nova',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error('OpenAI Error: ' + (errorData.error?.message || response.statusText));
            }

            return new Response(response.body, {
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Cache-Control': 'no-cache',
                },
            });

        } else {
            throw new Error('Server Configuration Error: No TTS API Key found (Azure, ElevenLabs, or OpenAI)');
        }

    } catch (error) {
        console.error('TTS Error:', error);
        return new Response(JSON.stringify({ error: { message: error.message } }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
