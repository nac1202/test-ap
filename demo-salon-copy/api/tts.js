
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

        // Fix time format: 20:00 -> 20時
        // Matches HH:MM pattern (00-23):(00-59)
        cleanText = cleanText.replace(/(\d{1,2}):(\d{2})/g, (match, hour, minute) => {
            if (minute === '00') return `${hour}時`;
            return `${hour}時${minute}分`;
        });

        // Additional fixes can be added here

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
