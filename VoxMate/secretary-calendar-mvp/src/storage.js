const META_START = "---SECRETARY_META---";
const META_END = "---/SECRETARY_META---";

const STORAGE_KEY = 'calendar_events_cache';
const SYNC_TOKEN_KEY = 'calendar_sync_token';
// New key for templates
const TEMPLATES_KEY = 'secretary_templates';

const DEFAULT_TEMPLATES = [
    { label: '来客', icon: '👥' },
    { label: '訪問', icon: '🏢' },
    { label: '会議', icon: '📅' },
    { label: 'ランチ', icon: '🍽' },
    { label: 'ディナー', icon: '🍷' },
    { label: 'イベント', icon: '🎉' },
    { label: '交流会', icon: '🤝' }
];

export function getTemplates() {
    const json = localStorage.getItem(TEMPLATES_KEY);
    if (!json) return DEFAULT_TEMPLATES;
    try {
        return JSON.parse(json);
    } catch (e) {
        console.error("Failed to parse templates", e);
        return DEFAULT_TEMPLATES;
    }
}

export function saveTemplates(templates) {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

const VOICE_MODE_KEY = 'secretary_voice_mode';

export function getVoiceMode() {
    return localStorage.getItem(VOICE_MODE_KEY) || 'tap'; // 'tap' or 'hold'
}

export function saveVoiceMode(mode) {
    localStorage.setItem(VOICE_MODE_KEY, mode);
}

export function injectMeta(description, metaData) {
    const safeDesc = description || "";
    // Remove existing meta if any
    const cleanDesc = removeMeta(safeDesc);

    const metaString = [
        META_START,
        `type: ${metaData.type || "meeting"}`,
        `importance: ${metaData.importance || "normal"}`,
        `people: ${JSON.stringify(metaData.people || [])}`,
        META_END
    ].join('\n');

    return cleanDesc + "\n\n" + metaString;
}

export function extractMeta(description) {
    if (!description) return {};
    const startIndex = description.indexOf(META_START);
    if (startIndex === -1) return {};

    const block = description.substring(startIndex + META_START.length, description.indexOf(META_END));
    const lines = block.trim().split('\n');
    const result = {};

    lines.forEach(line => {
        const [key, ...valParts] = line.split(':');
        if (key && valParts.length > 0) {
            const val = valParts.join(':').trim();
            if (key.trim() === 'people') {
                try {
                    result.people = JSON.parse(val);
                } catch (e) { result.people = [] }
            } else {
                result[key.trim()] = val;
            }
        }
    });
    return result;
}

export function removeMeta(description) {
    if (!description) return "";
    const startIndex = description.indexOf(META_START);
    if (startIndex === -1) return description;
    return description.substring(0, startIndex).trim();
}
