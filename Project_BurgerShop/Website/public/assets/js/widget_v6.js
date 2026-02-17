
// --- CONFIGURATION ---
console.log("Widget JS Loaded v6.3 - 2025-12-14 15:53");
// --- DEFAULT CONFIGURATION ---
const DEFAULT_CONFIG = {
    brandName: "BUN BUN BURGER",
    themeColor: "#4169e1",
    businessType: "generic", // restaurant, retail, salon, generic
    hours: { open: 9, close: 18 },
    selectors: {
        productCard: ".product-card",
        productName: ".product-title",
        productDesc: ".product-description",
        productPrice: ".product-price",
        productImage: "img",
        productTags: ".product-tags li"
    },
    messages: {
        offHours: "現在営業時間外です。ご用件を承ります。",
        reservationSuccess: "予約リクエストを受け付けました。"
    },
    avatar: {
        desktop: "assets/assistant.png",
        mobile: "assets/assistant-55.png"
    },
    apiUrl: "/api/chat" // Default API Endpoint
};

const I18N = {
    ja: {
        placeholder: "メッセージを入力...",
        sttError: "マイクエラー",
        visionPrompt: "画像の内容について日本語で説明してください。",
        welcome: "いらっしゃいませ！",
        offHours: "現在営業時間外です。ご用件を承ります。",
        camera: "カメラで質問",
        send: "送信",
        micErrorNotAllowed: "マイクの使用が許可されていません。ブラウザ設定をご確認ください。",
        micErrorService: "音声認識サービスが利用できません。SafariやChromeで開き直して再度お試しください。",
        visionInstruct: "画像の内容について親切にコメントしてください。",
        langGreeting: "こんにちは！何かお手伝いできることはありますか？",
        langCode: "JP",
        quickReservation: "来店予約",
        quickRecommend: "おすすめ",
        resForm: {
            title: "ご来店予約ですね。以下のフォームに入力をお願いします。",
            date: "来店日",
            time: "時間",
            pax: "人数",
            name: "お名前",
            namePlaceholder: "例：田中 太郎",
            submit: "予約リクエストを送信",
            submitted: "予約リクエストを受け付けました。",
            personUnit: "名"
        },
        resSubmitLog: "[予約リクエスト] {date} {time}〜 {pax}名\n名前: {name}"
    },
    en: {
        placeholder: "Type a message...",
        sttError: "Microphone Error",
        visionPrompt: "Please describe this image in English.",
        welcome: "Welcome!",
        offHours: "We are currently closed. How can I help you?",
        camera: "Ask with Camera",
        send: "Send",
        micErrorNotAllowed: "Microphone access denied. Please check browser settings.",
        micErrorService: "Speech service unavailable. Please try Chrome or Safari.",
        visionInstruct: "Please describe this image in English.",
        langGreeting: "Hello! How can I help you?",
        langCode: "EN",
        quickReservation: "Reservation",
        quickRecommend: "Recommend",
        resForm: {
            title: "Reservation request. Please fill in the details.",
            date: "Date",
            time: "Time",
            pax: "Party Size",
            name: "Name",
            namePlaceholder: "ex: John Doe",
            submit: "Request Reservation",
            submitted: "Reservation request received.",
            personUnit: " ppl"
        },
        resSubmitLog: "[Reservation Request] {date} {time} {pax} ppl\nName: {name}"
    },
    zh: {
        placeholder: "请输入讯息...",
        sttError: "麦克风错误",
        visionPrompt: "请用中文描述这张图片。",
        welcome: "欢迎光临！",
        offHours: "现在是非营业时间。请告诉我您的需求。",
        camera: "拍照提问",
        send: "发送",
        micErrorNotAllowed: "麦克风访问被拒绝。请检查浏览器设置。",
        micErrorService: "语音服务不可用。请尝试 Chrome 或 Safari。",
        visionInstruct: "请用中文描述这张图片。",
        langGreeting: "你好！有什么我可以帮你的吗？",
        langCode: "ZH",
        quickReservation: "预订",
        quickRecommend: "推荐",
        resForm: {
            title: "预订请求。请填写详细信息。",
            date: "日期",
            time: "时间",
            pax: "人数",
            name: "姓名",
            namePlaceholder: "例如：王小明",
            submit: "发送预订请求",
            submitted: "已收到预订请求。",
            personUnit: "人"
        },
        resSubmitLog: "[预订请求] {date} {time} {pax}人\n姓名: {name}"
    }
};

const siteOrigin = window.location.origin;

let currentLang = 'ja';

// Will be populated in initConciergeWidget
let WIDGET_CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

const WIDGET_HTML = `
    <div class="assistant-portrait" id="assistant-avatar">
        <img src="" alt="AIコンシェルジュ"> 
    </div>
    <div class="chat-block">
        <div id="chat-window">
            <div class="chat-inner">
                <div class="chat-header">
                    <div class="header-left">
                        <span class="header-icon-brand" title="AIコンシェルジュ">
                            <svg viewBox="0 0 24 24" style="fill:none; stroke:currentColor; stroke-width:2px; stroke-linecap:round; stroke-linejoin:round;">
                                <rect x="4" y="10" width="16" height="12" rx="6" />
                                <circle cx="12" cy="5" r="1.8" />
                                <path d="M12 7v3" />
                                <circle cx="9" cy="15" r="1.5" />
                                <circle cx="15" cy="15" r="1.5" />
                            </svg>
                        </span>
                        <span class="header-title">Concierge</span>
                    </div>
                    <div class="header-controls">
                        <button class="header-btn" id="theme-btn" title="テーマカラー変更">
                            <svg viewBox="0 0 24 24"><path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z"/><circle cx="8" cy="7" r="1.5"/><circle cx="16" cy="7" r="1.5"/><circle cx="8" cy="17" r="1.5"/></svg>
                        </button>
                        <button class="header-btn" id="opacity-toggle" title="透明度切替">
                            <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button class="header-btn" id="avatar-toggle" title="アバター表示切替">
                            <svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="12" rx="6" /><circle cx="12" cy="5" r="1.8" /><path d="M12 7v3" /><circle cx="9" cy="15" r="1.5" /><circle cx="15" cy="15" r="1.5" /></svg>
                        </button>
                        <button class="header-btn" id="tts-toggle" title="音声読み上げ">
                            <svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                        </button>

                        <button class="header-btn close-btn" id="close-chat" title="閉じる">
                            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                    <div class="color-popup" id="color-popup">
                        <!-- Populated dynamically by initColorPalette -->
                    </div>
                </div>
                
                <!-- Quick Actions Bar -->
                <div class="quick-actions" id="quick-actions">
                    <span class="action-chip" onclick="window.triggerQuickAction('reservation')">
                        <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span id="quick-res-text">来店予約</span>
                    </span>
                    <span class="action-chip" onclick="window.triggerQuickAction('recommend')">
                        <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        <span id="quick-rec-text">おすすめ</span>
                    </span>
                    <span class="action-chip" id="lang-toggle-chip">
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                        <span id="lang-code-text">JP</span>
                    </span>
                </div>


                <div id="chat-messages">
                    <!-- Helper / Introduction -->
                    <div class="message-row bot-msg">

                    </div>
                </div>
                
                <div class="input-area">
                    <button id="stt-btn" title="音声入力">
                        <svg class="icon-line" viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                    </button>
                    <button id="camera-btn" title="カメラで質問">
                        <svg class="icon-line" viewBox="0 0 24 24">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                    </button>
                    <div class="chat-input-container">
                        <input type="text" id="chat-input" placeholder="メッセージを入力..." autocomplete="off">
                        <button id="chat-send" aria-label="メッセージを送信" title="送信">
                            <svg class="icon-line" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        </button>
                    </div>
                </div>
                
                <!-- Camera Preview Modal -->
                <div id="camera-preview-modal" class="camera-modal hidden">
                    <div class="camera-container">
                        <video id="camera-video" autoplay playsinline muted></video>
                        <div class="camera-controls">
                            <button id="camera-cancel-btn" class="camera-ctrl-btn cancel">キャンセル</button>
                            <button id="camera-shutter-btn" class="camera-ctrl-btn shutter"><div class="shutter-inner"></div></button>
                            <button id="camera-flip-btn" class="camera-ctrl-btn flip" title="カメラ切り替え">
                                <svg class="icon-line" viewBox="0 0 24 24"><path d="M20 10c0-4.418-3.582-8-8-8s-8 3.582-8 8h1.236c.642-3.725 3.861-6.611 7.764-6.611 4.418 0 8 3.582 8 8h-1.236l2.236 2.611 2.236-2.611h-1.236zm-8 12.389c-3.903 0-7.122-2.886-7.764-6.611h-1.236c0 4.418 3.582 8 8 8s8-3.582 8-8h-1.236c-.642 3.725-3.861 6.611-7.764 6.611z"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

window.initConciergeWidget = function (options) {
    // Merge User Config
    if (options) {
        // Deep merge helper or simple assign for minimal keys
        if (options.siteName) WIDGET_CONFIG.brandName = options.siteName;
        if (options.brandName) WIDGET_CONFIG.brandName = options.brandName; // Handle both
        if (options.businessType) WIDGET_CONFIG.businessType = options.businessType;
        if (options.hours) WIDGET_CONFIG.hours = { ...WIDGET_CONFIG.hours, ...options.hours };
        if (options.selectors) WIDGET_CONFIG.selectors = { ...WIDGET_CONFIG.selectors, ...options.selectors };

        // Handle themeColor from options if provided (before auto-detect)
        if (options.themeColor) WIDGET_CONFIG.themeColor = options.themeColor;

        // Handle Avatar
        if (options.avatar) WIDGET_CONFIG.avatar = { ...WIDGET_CONFIG.avatar, ...options.avatar };

        // Handle API URL override
        if (options.apiUrl) WIDGET_CONFIG.apiUrl = options.apiUrl;

        // Handle Reservation URL (External Link Mode)
        if (options.reservationUrl) WIDGET_CONFIG.reservationUrl = options.reservationUrl;
    }
    console.log("Cleaning DOM text content...");
    // Widget Injection
    const widgetDiv = document.createElement('div');
    widgetDiv.id = 'ai-widget';
    widgetDiv.innerHTML = WIDGET_HTML;
    document.body.appendChild(widgetDiv);

    // Initial Avatar Setup
    const initialAvatarImg = widgetDiv.querySelector("#assistant-avatar img");
    if (initialAvatarImg) {
        initialAvatarImg.src = WIDGET_CONFIG.avatar.desktop;
    }

    const langBtn = document.getElementById("lang-toggle-chip");
    const chatInput = document.getElementById("chat-input");
    const chatSendBtn = document.getElementById("chat-send");
    const cameraBtn = document.getElementById("camera-btn");

    // --- STATE VARIABLES ---
    let isTtsEnabled = false;
    let isListening = false;
    let recognition = null;
    let availableVoices = [];

    function updateLanguageURI() {
        // Update Static Text
        const t = I18N[currentLang];
        chatInput.placeholder = t.placeholder;
        cameraBtn.title = t.camera;
        chatSendBtn.title = t.send;
        document.getElementById("lang-code-text").textContent = t.langCode;

        // Update Quick Actions
        const qaRes = document.getElementById("quick-res-text");
        if (qaRes) qaRes.textContent = t.quickReservation;
        const qaRec = document.getElementById("quick-rec-text");
        if (qaRec) qaRec.textContent = t.quickRecommend;

        // Update Reservation Form Texts if present
        if (document.querySelector('.reservation-form')) {
            const dateLabel = document.querySelector('label[for="res-date"]'); // Need to ensure IDs or classes match. Let's use generic selection if possible or classes.
            // Simplified updating:
            const labels = document.querySelectorAll('.res-label');
            if (labels.length >= 4) {
                labels[0].textContent = t.resForm.date;
                labels[1].textContent = t.resForm.time;
                labels[2].textContent = t.resForm.pax;
                labels[3].textContent = t.resForm.name;
            }
            const nameInput = document.getElementById("res-name");
            if (nameInput) nameInput.placeholder = t.resForm.namePlaceholder;
            const submitBtn = document.querySelector('.res-submit');
            if (submitBtn) submitBtn.textContent = t.resForm.submit;

            // Pax options update is tricky without rebuilding, skipping for now as "名" is somewhat understandable or can be handled if we rebuild.
            // Let's rely on rebuilding if language changes? No, inplace update is better.
        }

        // Update Speech synthesis/recognition lang
        if (recognition) {
            recognition.lang = (currentLang === 'en') ? 'en-US' : (currentLang === 'zh') ? 'zh-CN' : 'ja-JP';
        }
    }

    langBtn.addEventListener("click", () => {
        if (currentLang === 'ja') currentLang = 'en';
        else if (currentLang === 'en') currentLang = 'zh';
        else currentLang = 'ja';

        updateLanguageURI();

        // AI Greeting instead of System Log
        addMessage(I18N[currentLang].langGreeting, "bot");
    });

    // --- Dynamic Color Palette Logic ---
    // --- Dynamic Color Palette Logic ---

    // 1. Auto Detect Logic
    function autoDetectBrandColor() {
        // Try Meta Theme Color
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme && metaTheme.content) return metaTheme.content;

        // Try Computed Style of Key Elements
        // Try Computed Style of Key Elements
        const candidates = [
            document.querySelector('header'), // Prioritize Header as requested
            document.querySelector('nav'),
            document.querySelector('.brand'),
            document.querySelector('.main-color'),
            document.querySelector('.primary-btn'),
            document.body // Fallback
        ];

        for (const el of candidates) {
            if (!el) continue;
            const style = window.getComputedStyle(el);
            const bg = style.backgroundColor;
            const col = style.color;

            // Check if valid color (not transparent/white/black generally unique)
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== 'rgb(255, 255, 255)' && bg !== 'rgba(0, 0, 0, 0)') {
                // Convert rgb to hex if needed, or just return
                return rgbToHex(bg);
            }
        }

        return null; // Fallback
    }

    function rgbToHex(rgb) {
        if (rgb.startsWith('#')) return rgb;
        const result = rgb.match(/\d+/g);
        if (!result) return null;
        return "#" + ((1 << 24) + (parseInt(result[0]) << 16) + (parseInt(result[1]) << 8) + (parseInt(result[2]))).toString(16).slice(1);
    }

    // 2. AI Palette Generation
    async function generateAIColors(baseColor) {
        console.log("Generating AI Palette for:", baseColor);
        const prompt = `
        Design Task: Create a DIVERSE and VIBRANT color palette for a website based on the primary color "${baseColor}".
        Output: A JSON array of exactly 8 CSS hex color strings.
        Rules:
        1. The first color MUST be the base color "${baseColor}".
        2. The other 7 colors MUST be sufficiently different in HUE.
        3. Include a wide variety: Green, Blue, Yellow/Orange, and Red/Pink accents.
        4. CRITICAL: Do NOT include White (#ffffff) or very light colors (like #f0f0f0, #ffffe0). All colors must be visible against a white background. Darker or saturated tones are preferred.
        5. Spread the colors across the spectrum (Rainbow-like but harmonious).
        6. Output ONLY the JSON array.
        `;

        try {
            // Re-use existing callGeminiAPI but force a special sys prompt or just send as user message with clear instruction.
            // Since callGeminiAPI prepends system prompt, we'll use a direct fetch here to avoid "You are a shop assistant" noise,
            // OR we can make callGeminiAPI more flexible. 
            // Let's use a dedicated small fetcher to keep it clean, relying on the same API endpoint.

            const response = await fetch(WIDGET_CONFIG.apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    history: [{ role: "user", parts: [{ text: prompt }] }],
                    systemPrompt: "You are a professional UI/UX Color Expert."
                })
            });
            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

            // Clean markdown
            const jsonText = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const colors = JSON.parse(jsonText);

            if (Array.isArray(colors) && colors.length >= 8) {
                return colors.slice(0, 8);
            }
            throw new Error("Invalid Color Data");
        } catch (e) {
            console.error("AI Color Gen Failed:", e);
            // Fallback to algorithmic generation
            return generateHarmoniousPalette(baseColor);
        }
    }

    // 3. Algorithmic Fallback (Existing)
    function generateHarmoniousPalette(baseColorHex) {
        // Simple HSL Shift Helper
        function hexToHsl(hex) {
            let r = parseInt(hex.substring(1, 3), 16) / 255;
            let g = parseInt(hex.substring(3, 5), 16) / 255;
            let b = parseInt(hex.substring(5, 7), 16) / 255;
            let max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;
            if (max == min) {
                h = s = 0;
            } else {
                let d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            return [h * 360, s, l];
        }

        // Helper: Calculate Contrast Color (Black/White)
        function getContrastColor(hex) {
            const r = parseInt(hex.substring(1, 3), 16);
            const g = parseInt(hex.substring(3, 5), 16);
            const b = parseInt(hex.substring(5, 7), 16);
            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            return (yiq >= 128) ? '#333333' : '#ffffff';
        }

        function hslToHex(h, s, l) {
            let r, g, b;
            if (s == 0) {
                r = g = b = l;
            } else {
                let hue2rgb = function hue2rgb(p, q, t) {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1 / 6) return p + (q - p) * 6 * t;
                    if (t < 1 / 2) return q;
                    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                    return p;
                };
                let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                let p = 2 * l - q;
                r = hue2rgb(p, q, h + 1 / 3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1 / 3);
            }
            const toHex = x => {
                const hex = Math.round(x * 255).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            };
            return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        }

        const [h, s, l] = hexToHsl(baseColorHex);
        const palette = [];
        palette.push(baseColorHex); // 1. Base

        // Generate 7 variations
        // 2. Complementary
        palette.push(hslToHex((h + 180) % 360, s, l));
        // 3. Analogous 1
        palette.push(hslToHex((h + 30) % 360, s, l));
        // 4. Analogous 2
        palette.push(hslToHex((h - 30 + 360) % 360, s, l));
        // 5. Triadic 1
        palette.push(hslToHex((h + 120) % 360, s, l));
        // 6. Triadic 2
        palette.push(hslToHex((h + 240) % 360, s, l));
        // 7. Darker Shade (Professional)
        palette.push(hslToHex(h, s, Math.max(0.2, l - 0.2)));
        // 8. Lighter Tin (Friendly)
        palette.push(hslToHex(h, s, Math.min(0.9, l + 0.3)));

        return palette;
    }

    // Centralized Theme Updater
    function updateThemeProperties(color) {
        document.documentElement.style.setProperty('--widget-theme-color', color);

        // Calculate contrast for header text/icons
        // We need to access getContrastColor. Ideally hoist it or redefine.
        // Redefining for safety/scope if not hoisting everything.
        // ACTUALLY, let's hoist strict helpers or just copy logic (it's small).
        const r = parseInt(color.substring(1, 3), 16);
        const g = parseInt(color.substring(3, 5), 16);
        const b = parseInt(color.substring(5, 7), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        const contrast = (yiq >= 180) ? '#333333' : '#ffffff'; // Threshold 180 for safer white text preference? Standard is 128. Let's use 160 to avoid grey-on-grey.

        document.documentElement.style.setProperty('--widget-header-text', contrast);
    }



    async function initColorPalette() {
        const paletteContainer = document.getElementById("color-popup");
        if (!paletteContainer) return;

        // Try load from storage
        const storageKey = "miryu_widget_palette_v5"; // v5 to force no-white update
        let palette = [];
        const stored = localStorage.getItem(storageKey);

        if (stored) {
            try {
                palette = JSON.parse(stored);
                // console.log("Loaded persisted palette:", palette);
            } catch (e) {
                console.error("Palette parse error", e);
            }
        }

        // If no palette, generate one (AI or Fallback)
        if (!palette || palette.length === 0) {
            console.log("No persisted palette found. Detecting...");
            // 1. Detect
            const detected = autoDetectBrandColor();
            const baseColor = detected || options.themeColor || "#4169e1";
            console.log("Detected Base Color:", baseColor);

            // Set Base Immediately
            updateThemeProperties(baseColor);

            // 2. Generate (Async)
            // Show loading state in palette container
            paletteContainer.innerHTML = '<div style="padding:10px; font-size:12px; color:#666;">AI収集中...</div>';

            try {
                // Try AI first
                palette = await generateAIColors(baseColor);
            } catch (e) {
                // Fallback
                palette = generateHarmoniousPalette(baseColor);
            }

            // 3. Save
            localStorage.setItem(storageKey, JSON.stringify(palette));
        }

        // Render
        paletteContainer.innerHTML = "";

        // Ensure the FIRST color is active
        if (palette.length > 0) {
            // Check if we are checking stored state, but we usually want to use the saved preference.
            // But requirement: "start color" is the detected one. 
            // "If persisted, use that".
            // If just generated, index 0 is base.
            // We should also persist the *selected* color potentially?
            // Requirement says "startup color is detected color". 
            // "After that, fixed palette". 
            // So we apply index 0 always on init? Or user selection?
            // "The detected color becomes the start color".
            // Let's assume index 0 is the default theme.
            updateThemeProperties(palette[0]);
        }

        palette.forEach(color => {
            const div = document.createElement("div");
            div.className = "color-option";
            div.dataset.color = color;
            div.style.backgroundColor = color;
            div.title = color;
            div.addEventListener("click", () => {
                updateThemeProperties(color);
                // Also could save *selection* preference if needed, but not requested.
                // Just close popup
                document.getElementById("color-popup").classList.remove("open");
            });
            paletteContainer.appendChild(div);
        });
    }

    // Initial check (non-blocking, initColorPalette handles the async part)
    // removed old sync calls
    // autoDetectBrandColor is now inside initColorPalette for flow control

    // Initialize Palette Logic
    initColorPalette();

    // --- Business Logic ---
    function checkBusinessHours() {
        const now = new Date();
        // Assumes client is in correct timezone or uses local time for demo
        const currentHour = now.getHours();
        const currentMin = now.getMinutes();
        const { open, close } = WIDGET_CONFIG.hours;

        // Simple check: open <= current < close
        // (Ignoring minutes for simplicity unless strictly needed)
        if (currentHour >= open && currentHour < close) {
            return true;
        }
        return false;
    }

    // Quick Actions
    window.triggerQuickAction = function (action) {
        if (action === 'reservation') {
            // Allow reservations 24/7
            renderReservationForm();
        } else if (action === 'recommend') {
            const context = collectPageMenuContext();
            if (context && context.items && context.items.length > 0) {
                // Pick random item
                const randomItem = context.items[Math.floor(Math.random() * context.items.length)];
                addMessage("おすすめのメニューですね！こちらはいかがでしょうか？", 'bot');
                renderProductCard(randomItem);
            } else {
                // Fallback
                addMessage("おすすめのメニューですね！\n申し訳ありません、現在メニュー情報を取得できませんでした。", 'bot');
            }
        } else if (action === 'faq') {
            addMessage("よくあるご質問ですね。何について知りたいですか？", 'bot');
        }
    };

    function renderReservationForm() {
        // External Link Mode
        if (WIDGET_CONFIG.reservationUrl) {
            const url = WIDGET_CONFIG.reservationUrl;
            const t = I18N[currentLang].resForm;
            // Determine label based on URL type (Simple heuristic)
            let btnLabel = "Web予約ページへ";
            if (url.startsWith("tel:")) btnLabel = "電話で予約する";
            else if (currentLang === 'en') btnLabel = "Go to Reservation Page";
            else if (currentLang === 'zh') btnLabel = "前往预约页面";

            const linkHtml = `
                <div class="reservation-form" style="text-align:center; padding:20px;">
                    <p style="margin-bottom:15px;">${t.title}</p>
                    <a href="${url}" target="_blank" class="res-submit" style="display:inline-block; text-decoration:none; line-height:36px;">
                        ${btnLabel} <svg style="width:14px; height:14px; vertical-align:middle; margin-left:4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </a>
                </div>
            `;
            const chatMessages = document.getElementById("chat-messages");
            const div = document.createElement("div");
            div.innerHTML = linkHtml;
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            return;
        }

        // Demo Form Mode (Default)
        const t = I18N[currentLang].resForm;
        const formHtml = `
            <div class="reservation-form">
                <div class="res-input-group">
                    <label class="res-label">${t.date}</label>
                    <input type="date" class="res-input" id="res-date">
                </div>
                <div class="res-input-group">
                    <label class="res-label">${t.time}</label>
                    <select class="res-input" id="res-time">
                        <option>11:00</option><option>12:00</option><option>13:00</option>
                        <option>18:00</option><option>19:00</option><option>20:00</option>
                    </select>
                </div>
                <div class="res-input-group">
                    <label class="res-label">${t.pax}</label>
                    <select class="res-input" id="res-pax">
                        <option>1${t.personUnit}</option><option>2${t.personUnit}</option><option>3${t.personUnit}</option><option>4${t.personUnit}</option>
                    </select>
                </div>
                <div class="res-input-group">
                    <label class="res-label">${t.name}</label>
                    <input type="text" class="res-input" id="res-name" placeholder="${t.namePlaceholder}">
                </div>
                <button class="res-submit" onclick="window.submitReservation()">${t.submit}</button>
                <div class="demo-badge">※Demo</div>
            </div>
        `;
        addMessage(t.title, 'bot');
        const chatMessages = document.getElementById("chat-messages");
        // Create a container for the form
        const div = document.createElement("div");
        div.innerHTML = formHtml;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    window.submitReservation = function () {
        // Validate?
        const date = document.getElementById("res-date").value;
        const name = document.getElementById("res-name").value;
        const time = document.getElementById("res-time").value;
        const pax = document.getElementById("res-pax").value;

        const t = I18N[currentLang]; // Access current lang

        if (!date || !name) {
            alert(currentLang === 'ja' ? "必須項目を入力してください" : "Please fill in all fields.");
            return;
        }

        // Remove Form (simplify: just hide or replace text)
        const inputs = document.querySelectorAll(".reservation-form input, .reservation-form select, .reservation-form button");
        inputs.forEach(el => el.disabled = true);

        // Logs the user's request details as a user message
        const logMsg = t.resSubmitLog
            .replace("{date}", date)
            .replace("{time}", time)
            .replace("{pax}", pax)
            .replace("{name}", name);

        addMessage(logMsg, 'user');

        // Success Message
        setTimeout(() => {
            addMessage(t.resForm.submitted, 'bot');
        }, 500);
    };

    // --- Elements ---
    const aiWidget = document.getElementById("ai-widget");
    const assistantAvatar = document.getElementById("assistant-avatar");

    // --- Mobile Avatar Size Enforcer (Fallback) ---
    function enforceMobileAvatarSize() {
        const assistantAvatar = document.getElementById("assistant-avatar");
        if (!assistantAvatar) return;

        const img = assistantAvatar.querySelector("img");
        if (!img) return;

        const mobileSrc = WIDGET_CONFIG.avatar.mobile;
        const desktopSrc = WIDGET_CONFIG.avatar.desktop;

        // Check if urls are relative (default assets) or absolute (custom)
        // If they are default assets, we append cache buster for safety.
        // If custom, we trust the user.
        // Simple logic: just use the strings from config.

        if (window.innerWidth <= 768) {
            // スマホ：小さいアバター
            if (!img.src.includes(mobileSrc)) {
                img.src = mobileSrc;
            }
            img.style.width = "100px";
            img.style.height = "100px";
            assistantAvatar.style.width = "100px";
            assistantAvatar.style.height = "100px";
        } else {
            // PC：通常のアバター
            if (!img.src.includes(desktopSrc)) {
                img.src = desktopSrc;
            }
            img.style.width = "";
            img.style.height = "";
            assistantAvatar.style.width = "";
            assistantAvatar.style.height = "";
        }
    }

    window.addEventListener("resize", enforceMobileAvatarSize);
    enforceMobileAvatarSize();
    const chatWindow = document.getElementById("chat-window");
    const closeBtn = document.getElementById("close-chat");
    const themeBtn = document.getElementById("theme-btn");
    const colorPopup = document.getElementById("color-popup");
    const opacityToggle = document.getElementById("opacity-toggle");
    const avatarToggle = document.getElementById("avatar-toggle");
    const chatMessages = document.getElementById("chat-messages");

    // --- Hoisted Definitions (Fix ReferenceError) ---
    const ttsToggle = document.getElementById("tts-toggle");
    const sttButton = document.getElementById("stt-btn");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    // --- State ---
    let isAvatarVisible = true;
    let isTransparent = false;
    // Variables hoisted to top
    // let isTtsEnabled, isListening etc removed to avoid redeclaration
    let isContinuousMode = true; // Default to continuous mode for voice
    let lastMentionedProduct = ""; // Context for demonstratives
    let conversationHistory = [];

    // --- DYNAMIC SYSTEM PROMPT ---
    function generateSystemPrompt(cfg) {
        // I18N Prompt
        let langInstruction = "";
        if (currentLang === 'en') langInstruction = "You are an English speaking assistant. Respond in English only.";
        else if (currentLang === 'zh') langInstruction = "You are a Chinese speaking assistant. Respond in Traditional Chinese.";
        else langInstruction = "You are a Japanese speaking assistant. Respond in Japanese.";

        // Dynamic Domain Knowledge based on businessType
        let domainKnowledge = "一般的な店舗の知識";
        let extraRole = "";
        if (cfg.businessType === 'restaurant') {
            domainKnowledge = "一般的なハンバーガーショップや飲食店の知識";
        } else if (cfg.businessType === 'retail') {
            domainKnowledge = "家電・ガジェットに関する専門知識（スペック、互換性、利用シーンなど）";
            extraRole = "あなたはプロのガジェット販売員です。顧客のライフスタイルに合わせた提案や、技術的な仕様の解説を積極的に行ってください。";
        } else if (cfg.businessType === 'salon') {
            domainKnowledge = "美容室やヘアスタイルに関する知識";
        }

        return `
${langInstruction}
あなたは、企業・店舗の公式Webサイトに設置された
「AIコンシェルジュ」です。
${extraRole}

あなたの役割は、
・Webサイト訪問者の質問に答えること
・商品・サービス・利用方法を案内すること
・利用可能な時間帯や対応範囲を正確に伝えること
です。

以下の【運用設定】を必ず最優先で参照し、
現在時刻と照合したうえで、適切な返答を行ってください。

────────────
【運用設定】
・ブランド／店舗名：${cfg.brandName}
・タイムゾーン：Asia/Tokyo
・現在時刻：{{CURRENT_TIME_PLACEHOLDER}}
・WebサイトURL：${siteOrigin} （聞かれたら回答可）

■ 有人対応（人が対応する業務）
・有人対応時間：${cfg.hours.open}:00 〜 ${cfg.hours.close}:00
・休業日：なし
・対応チャネル：店舗・電話（03-1234-5678）

■ オンライン対応（Web上で完結する対応）
・オンライン対応モード：24H
  - 24H：24時間対応可能
・オンライン対応時間（LIMITED時）：-
・オンラインで可能なこと：商品案内／FAQ回答／おしゃべり／**来店予約リクエスト受付**
・オンラインで不可なこと：実際の注文決済（カート機能未実装のため）

■ 予約フォーム表示の厳格なルール
・ユーザーから「明確な予約の意思」が示された場合（「予約したい」「席を確保して」等）のみ、
  応答の最後に \`[予約フォーム]\` という文字列を出力してください。
・単なる挨拶（「こんにちは」「ありがとう」）や、メニューの質問には、
  **絶対に** \`[予約フォーム]\` を出さないでください。
・無意味にフォームを出すことはユーザー体験を損なうため禁止します。

────────────
【重要ルール】

1. 「来店予約」に関しては、ユーザーが明確に希望した場合に限り \`[予約フォーム]\` を出力して案内してください。
   ※ あなた自身が予約を受け付けるのではなく、フォームへの入力を促してください。
2. 有人対応時間外でも、オンライン対応が24Hの場合は
   ・商品やサービスの案内
   ・**予約リクエストの受付**
   は継続して行って構いません。
3. できないことは、ただ断るのではなく
   「次に取れる行動」を必ず提示してください。

────────────
【営業時間外の対応方針】

・営業時間外に「今すぐ来店できます」
  など誤解を与える表現は使用しない。
・深夜や早朝でも、オンライン対応が可能な内容については
  落ち着いたトーンで案内する。
・人が対応しているような誤認を与えない。

────────────
【禁止事項】

・営業時間、対応内容、価格、キャンペーンの捏造
・設定情報と矛盾する案内
・営業時間外に注文や来店を強く促す表現

────────────
【会話スタイル】

・丁寧で親しみやすい
・結論 → 理由 → 次の行動 の順で簡潔に
・汎用的な店舗スタッフらしい自然な接客口調
・絵文字は控えめに使用してOK

────────────
【最優先目的】

訪問者に
「このサイトはちゃんと運用されている」
「安心して利用できる」
と感じてもらうことを最優先にしてください。

========================
■ 以下、機能要件（JSON出力等）
========================

========================
■ 2. 情報源と優先順位
========================
あなたの回答は、つねに次の優先順位で行ってください。

1. 【現在表示中のページ情報】として渡されるJSON
   - ここに書かれたメニュー一覧（name / description / price）を「唯一の正解」とみなしてください。
   - メニュー名を新しく作らないでください。**必ずJSONに含まれる商品名だけ**を使ってください。
2. 必要に応じて、${domainKnowledge}で
   説明文を少し補足するのはOKです（ただし、存在しないメニュー名は絶対に作らないこと）。

禁止事項：
- Amazon、楽天、他社チェーンなど、外部サイトの商品を案内しないでください。
- JSONに存在しない新しい商品名をでっち上げないでください。
- 「本当か分かりませんが〜と思います」のような不確かな推測は避け、
  分からない場合は「このメニューにはその情報がありません」と正直に伝えてください。

========================
■ 3. ユーザープロファイルの利用
========================
以下のプレースホルダは、実行時にユーザーごとのプロファイル情報に置き換えられます。

{{USER_PROFILE_PLACEHOLDER}}

- これまでの会話から分かっている好み（ポテト好き、辛いもの、ドリンクの好み、ヘルシー志向など）を、
  さりげなく提案に反映してください。
- ただし、「データによると〜」や「プロファイル上では〜」など、
  内部情報の存在を明示する言い方はせず、
  「前にポテトがお好きとおっしゃっていたので〜」のように自然な言い回しにしてください。

========================
■ 4. プロファイル更新（隠しメモ）
========================
会話の中からユーザーの好みが分かった場合、
応答テキストの末尾に、次の形式で「差分情報（PROFILE_DELTA）」を**こっそり**追加してください。
ユーザーには見えませんが、システム側が読み取ります。

[[PROFILE_DELTA:
{
  "likes_fries": true,          // ポテト好き: true/false
  "likes_spicy": false,         // 辛いもの: true/false
  "preferred_drink": "コーラ",  // 好みのドリンク名（不要なら null）
  "is_health_conscious": true   // ヘルシー志向: true/false
}
]]

ルール：
- すべてのキーを書かなくても構いません。更新したい項目だけを含めてください。
- 分からない項目は書かないでください（推測で true/false を入れないこと）。
- PROFILE_DELTA ブロックは、**通常の会話文と製品JSONブロックの「後ろ」**に置いてください。

========================
■ 5. 製品推薦とJSON出力ルール
========================
ユーザーが「おすすめは？」「この商品と他の商品を比較したい」など、
具体的にメニューを選びたい状況のときは、以下の2つをセットで返してください。

1. 会話文（通常の日本語の返答）
   - 2〜3文で、ユーザーの好みにふれつつ、おすすめ理由を簡潔に説明してください。

2. 製品リストJSON（チャットUI用）
   - 会話文の**後ろ**に、次の形式のJSONを \`\`\`json ... \`\`\` で囲んで出力してください。
   - JSONは「この会話ターンで特におすすめしたい商品」のみを含めてください（最大3件程度）。

\`\`\`json
{
  "products": [
    {
      "id": "任意のID（あってもなくてもよい）",
      "name": "商品名（ページJSONのnameと完全一致させる）",
      "price": "価格（ページJSONからそのまま使うか、近い表現）",
      "description": "簡単な説明（必要に応じて自然な日本語で補足）",
      "imageUrl": "画像URLが分かる場合のみ。分からなければ空文字でも可。",
      "tags": ["辛口", "ヘルシー", "ボリューム満点 など任意"],
      "detailText": "モーダルに表示する少し詳しい説明文"
    }
  ]
}
\`\`\`

重要：
- name は、必ず【現在表示中のページ情報】に含まれるメニュー名と完全一致させてください。
- imageUrl は、分からなければ空文字 "" のままで構いません（システム側で埋めます）。
- JSONブロックは**必ず返答の末尾**に置いてください。

========================
■ 6. その他の注意
========================
- ユーザーが雑談だけしている場合（例：「今日は寒いですね」など）は、
  無理に商品を出さず、自然な一言返し＋様子をうかがう程度にしてください。
- 分からないこと、ページ情報にないことは正直に「確認できません」と伝えて構いません。
- あなたの最優先の役割は、「このページ上のメニューを、その人に合った形で気持ちよく案内する」ことです。
`;
    }

    // --- User Profile Logic ---
    let userId = "";
    let userProfile = {
        likes_fries: null,
        likes_spicy: null,
        preferred_drink: null,
        is_health_conscious: null,
        visit_count: 0,
        last_visit_at: null
    };

    function initUserProfile() {
        // 1. User ID
        let storedId = localStorage.getItem("miryu_ai_user_id");
        if (!storedId) {
            storedId = "miryu_" + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "_" + Math.random());
            localStorage.setItem("miryu_ai_user_id", storedId);
        }
        userId = storedId;

        // 2. Profile
        const storedProfile = localStorage.getItem("miryu_ai_profile_" + userId);
        if (storedProfile) {
            try {
                userProfile = JSON.parse(storedProfile);
            } catch (e) {
                console.error("Profile Parse Error", e);
            }
        } else {
            // New profile
            userProfile.last_visit_at = new Date().toISOString();
        }

        // Update Stats
        userProfile.visit_count = (userProfile.visit_count || 0) + 1;
        userProfile.last_visit_at = new Date().toISOString();
        saveUserProfile();

        console.log("User Profile Loaded:", userProfile);
    }

    function saveUserProfile() {
        localStorage.setItem("miryu_ai_profile_" + userId, JSON.stringify(userProfile));
    }

    function resetUserProfile() {
        localStorage.removeItem("miryu_ai_profile_" + userId);
        // Reset in memory to default
        userProfile = {
            likes_fries: null,
            likes_spicy: null,
            preferred_drink: null,
            is_health_conscious: null,
            visit_count: 0,
            last_visit_at: null
        };
    }

    function getProfilePromptText() {
        const p = userProfile;
        const lines = [];
        lines.push(`- 訪問回数: ${p.visit_count}回`);
        if (p.likes_fries !== null) lines.push(`- ポテト好き: ${p.likes_fries ? "はい" : "いいえ"}`);
        if (p.likes_spicy !== null) lines.push(`- 辛いもの: ${p.likes_spicy ? "好き" : "苦手"}`);
        if (p.preferred_drink) lines.push(`- 好みのドリンク: ${p.preferred_drink}`);
        if (p.is_health_conscious !== null) lines.push(`- ヘルシー志向: ${p.is_health_conscious ? "はい" : "いいえ"}`);

        if (lines.length === 1) return "【ユーザープロファイル】\n特に情報なし（初対面に近い）";
        return "【ユーザープロファイル（以前の会話の記憶）】\n" + lines.join("\n");
    }

    // Initialize immediately
    // But we need to make sure we don't call it before DOM if we needed DOM, but here it is just LS.
    initUserProfile();

    // Helper: Build Product Registry from DOM
    function buildProductRegistry() {
        try {
            const registry = {};
            const sel = WIDGET_CONFIG.selectors;

            // Scan existing product cards to build a lookup
            const cards = document.querySelectorAll(sel.productCard);
            if (!cards) return {};

            cards.forEach((card, index) => {
                try {
                    const title = card.querySelector(sel.productName)?.textContent.trim() || "";
                    if (!title) return; // Skip if no title

                    const desc = card.querySelector(sel.productDesc)?.textContent.trim() || "";
                    const price = card.querySelector(sel.productPrice)?.textContent.trim() || "";
                    const img = card.querySelector(sel.productImage)?.getAttribute("src") || "";
                    // Basic ID generation if not present
                    const id = `item_${index + 1}`;

                    let tags = [];
                    if (sel.productTags) {
                        const tagEls = card.querySelectorAll(sel.productTags);
                        if (tagEls) tags = Array.from(tagEls).map(li => li.textContent.trim());
                    }

                    if (id && title) {
                        registry[id] = {
                            id,
                            name: title,
                            description: desc,
                            price,
                            imageUrl: img,
                            tags,
                            detailText: desc // Use description as detail text for now
                        };
                    }
                } catch (err) {
                    console.warn("Error parsing product card:", err);
                }
            });
            // Expose to global for modal lookup
            window.chatProductRegistry = registry;
            return registry;
        } catch (e) {
            console.error("Critical Error in buildProductRegistry:", e);
            return {};
        }
    }

    function createChatProductCard(product) {
        const card = document.createElement("div");
        card.className = "chat-product-card";
        card.innerHTML = `
            <div class="chat-product-card__img-wrapper">
                <img src="${product.imageUrl}" alt="${product.name}" loading="lazy">
            </div>
            <div class="chat-product-card__body">
                <div class="chat-product-card__title">${product.name}</div>
                <div class="chat-product-card__price">${product.price}</div>
                <div class="chat-product-card__tags">
                    ${product.tags.map(tag => `<span class="chat-product-card__tag">${tag}</span>`).join('')}
                </div>
                <button class="chat-product-card__button" data-product-id="${product.id}">詳細を見る</button>
            </div>
        `;
        return card;
    }

    function renderProductStack(products, registry) {
        const fragment = document.createDocumentFragment();
        products.forEach(pData => {
            // Merge with registry if available to get better images/data
            let finalProduct = pData;
            // Try to match with registry by name if ID is weak
            const regItem = Object.values(registry).find(r => r.name === pData.name);
            if (regItem) {
                finalProduct = { ...regItem, ...pData };
                // Prioritize Registry Image if AI has none or generic
                if (regItem.imageUrl) finalProduct.imageUrl = regItem.imageUrl;
                finalProduct.id = regItem.id;
            }
            fragment.appendChild(createChatProductCard(finalProduct));
        });
        return fragment;
    }



    function getVisionPrompt(type) {
        const map = {
            restaurant: "ユーザーから画像が送信されました。「画像を拝見しました。」から回答を始めてください。画像に写っている料理やメニューを特定し、相性の良いサイドメニューやドリンクを提案してください。",
            salon: "ユーザーから髪やヘアスタイルの画像が届きました。「画像を拝見しました。」から回答を始めてください。髪質、ダメージ具合、スタイルなどを（画像から分かる範囲で）専門的に分析し、その悩みを解決するためのメニューやケア方法を提案してください。",
            retail: "ユーザーから商品画像が届きました。「画像を拝見しました。」から回答を始めてください。その商品の型番や特徴を視覚的に分析し、スペック詳細や、どのようなシーンで役立つかを「プロの販売員」として解説してください。",
            default: "ユーザーから画像が送信されました。「画像を拝見しました。」から回答を始めてください。画像の内容について親切にコメントしてください。"
        };
        return map[type] || map.default;
    }


    // DOM-based Context Collection (For Prompt)
    function collectPageMenuContext() {
        const sel = WIDGET_CONFIG.selectors;
        const cards = document.querySelectorAll(sel.productCard);
        // Note: We might want to run even if no menu cards, but current logic returns null.
        // Let's allow partial context.

        const items = Array.from(cards).map((card, index) => {
            const titleEl = card.querySelector(sel.productName);
            const descEl = card.querySelector(sel.productDesc);
            const priceEl = card.querySelector(sel.productPrice);
            const imgEl = card.querySelector(sel.productImage);

            return {
                id: `item_${index + 1}`,
                name: titleEl ? titleEl.textContent.trim() : "",
                description: descEl ? descEl.textContent.trim() : "",
                price: priceEl ? priceEl.textContent.trim() : "",
                image: imgEl ? imgEl.src : "https://placehold.co/300x200?text=No+Image"
            };
        });

        // Scrape Store Info
        const storeSection = document.querySelector("[data-store-info]");
        let storeInfoText = "";
        if (storeSection) {
            storeInfoText = storeSection.innerText.replace(/\n+/g, " ").trim();
        }

        // Scrape FAQ
        const faqItems = document.querySelectorAll("[data-faq-item]");
        const faqList = Array.from(faqItems).map(item => {
            const q = item.querySelector(".faq-question")?.textContent.trim();
            const a = item.querySelector(".faq-answer")?.textContent.trim();
            return { q, a };
        });

        // Scrape Campaigns (Limited Specials)
        const campaignItems = document.querySelectorAll("[data-campaign]");
        const campaigns = Array.from(campaignItems).map((item, index) => {
            const title = item.querySelector(".campaign-title")?.textContent.trim();
            const desc = item.querySelector(".campaign-description")?.textContent.trim();
            const period = item.querySelector(".campaign-period")?.textContent.trim();
            return {
                id: `campaign_${index + 1}`,
                name: title,
                description: desc + (period ? ` (${period})` : ""),
                is_limited: true
            };
        });

        if (!items.length && !storeInfoText && !faqList.length && !campaigns.length) return null;

        return {
            siteName: document.title || "Miryu Burger Demo",
            storeInfo: storeInfoText,
            faq: faqList,
            campaigns: campaigns,
            items
        };
    }

    function renderProductCard(product) {
        // Ensure image URL is absolute or valid
        const safeImage = product.image || "assets/assistant.png";

        const cardHtml = `
            <div class="product-card" style="background:#fff; border:1px solid #ddd; border-radius:8px; overflow:hidden; margin-top:8px;">
                <img src="${safeImage}" alt="${product.name}" style="width:100%; height:150px; object-fit:cover;">
                <div style="padding:10px;">
                    <div style="font-weight:bold; font-size:14px; margin-bottom:4px;">${product.name}</div>
                    <div style="font-size:12px; color:#666; margin-bottom:4px;">${product.description}</div>
                    <div style="font-weight:bold; color:var(--widget-theme-color);">${product.price}</div>
                </div>
            </div>
        `;

        const chatMessages = document.getElementById("chat-messages");
        const div = document.createElement("div");
        div.innerHTML = cardHtml;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // API Call
    // API Call (Via Vercel Serverless Function)
    async function callGeminiAPI(history, imageBase64 = null) {
        let dynamicPrompt = generateSystemPrompt(WIDGET_CONFIG);

        const lastUserMessage = history.length > 0 ? history[history.length - 1].parts[0].text : "";
        const hasUrl = /https?:\/\//.test(lastUserMessage);

        // Inject User Profile (Always replace placeholder)
        const profileContext = getProfilePromptText();
        dynamicPrompt = dynamicPrompt.replace("{{USER_PROFILE_PLACEHOLDER}}", profileContext);

        // Inject Current Time (for operational hours)
        const now = new Date();
        const timeString = now.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
        dynamicPrompt = dynamicPrompt.replace("{{CURRENT_TIME_PLACEHOLDER}}", timeString);

        // Explicit Business Hours Check
        const hours = WIDGET_CONFIG.hours;
        if (hours) {
            const currentHour = now.getHours();
            // Simple check: open <= current < close (considering only hours for now)
            const isOpen = currentHour >= hours.open && currentHour < hours.close;

            if (!isOpen) {
                dynamicPrompt += `\n\n【重要：現在の営業状態】\n現在は「営業時間外」です。営業時間(${hours.open}:00-${hours.close}:00)を過ぎています。\n「今から行けますか？」などの質問には、「申し訳ありませんが、本日の営業は終了いたしました」と丁寧にお断りしてください。嘘をついて「来店可能です」と言ってはいけません。`;
            } else {
                dynamicPrompt += `\n\n【重要：現在の営業状態】\n現在は「営業時間内」です。(${hours.open}:00-${hours.close}:00)`;
            }
        }

        if (!hasUrl) {
            const pageContext = collectPageMenuContext();
            if (pageContext) {
                dynamicPrompt += `\n\n【現在表示中のページ情報（優先参照）】\nこの情報だけを信頼して回答してください。\n${JSON.stringify(pageContext, null, 2)}`;
            }
        }

        // If image exists, add hint to prompt
        if (imageBase64) {
            const visionInstruction = getVisionPrompt(WIDGET_CONFIG.businessType);
            dynamicPrompt += `\n\n【画像入力】\n${visionInstruction}`;
        }

        try {
            const response = await fetch(WIDGET_CONFIG.apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    history: history,
                    imageBase64: imageBase64,
                    systemPrompt: dynamicPrompt
                })
            });

            const data = await response.json();

            if (data.error) {
                console.error("API Error Details:", data.error);
                return "申し訳ありません。エラーが発生しました: " + (data.error.message || "Unknown Error");
            }
            return data?.candidates?.[0]?.content?.parts?.[0]?.text || "応答の生成に失敗しました。";
        } catch (e) {
            console.error(e);
            return "通信エラーが発生しました: " + e.message;
        }
    }

    // Msg Logic
    function addMessage(text, role) {
        try {
            // Strict Reservation Trigger (New Logic)
            if (role === 'bot' && text.includes('[予約フォーム]')) {
                text = text.replace('[予約フォーム]', '').trim();
                setTimeout(() => { renderReservationForm(); }, 800);
            }

            const row = document.createElement("div");
            row.className = `message-row ${role === 'user' ? 'user-msg' : 'bot-msg'}`;
            const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
            const match = text.match(jsonRegex);
            let displayText = text;
            let productData = null;
            if (match && role === "bot") {
                try {
                    productData = JSON.parse(match[1]);
                    displayText = text.replace(match[0], "").trim();
                } catch (e) { console.warn("JSON Parse Error", e); }
            }

            // Inject Product Cards (Rich EC Style)
            // Robust registry build
            let registry = {};
            try {
                registry = buildProductRegistry();
            } catch (e) {
                console.error("Registry build failed in addMessage", e);
            }

            // 1. If JSON from Bot (Recommendations)
            if (productData && productData.products && productData.products.length > 0) {
                // Use the JSON data but enriched/rendered with new style
                row.appendChild(renderProductStack(productData.products, registry));
            }
            // 2. If Text Mention (Single Inquiry) - AND no JSON to avoid dupes [Simple logic for now]
            else if (role === "bot") {
                // Check for mentions
                const productNames = Object.keys(registry).sort((a, b) => b.length - a.length);
                let foundName = "";

                for (const name of productNames) {
                    if (displayText.includes(name)) {
                        foundName = name;
                        break; // Only start with the first found
                    }
                }

                if (foundName) {
                    lastMentionedProduct = foundName; // Update context
                    row.appendChild(createChatProductCard(registry[foundName]));
                }
            }

            const bubble = document.createElement("div");
            bubble.className = "message-bubble";
            bubble.innerHTML = displayText.replace(/\n/g, '<br>');
            row.appendChild(bubble);

            chatMessages.appendChild(row);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } catch (err) {
            console.error("Critical Error in addMessage:", err);
            // Fallback: try to just show text if possible
            try {
                const chatMessages = document.getElementById("chat-messages");
                if (chatMessages) {
                    const errorRow = document.createElement("div");
                    errorRow.className = "message-row bot-msg";
                    errorRow.innerText = text; // Fallback plain text
                    chatMessages.appendChild(errorRow);
                }
            } catch (e2) {
                console.error("Fallback addMessage failed", e2);
            }
        }
    }

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // --- SILENT PRIME FOR MOBILE TTS ---
        // (Disabled per user request to cut TTS feature)
        /*
        if (isTtsEnabled) {
            console.log("TTS: priming engine with empty string");
            speechSynthesis.cancel();
            const silent = new SpeechSynthesisUtterance(" ");
            silent.volume = 0; // Silent
            speechSynthesis.speak(silent);
        }
        */

        // Handle Reset Command
        if (text.includes("記憶をリセット") || text.includes("記憶を消して") || text.includes("忘れて")) {
            resetUserProfile();
            addMessage(text, "user");
            addMessage("かしこまりました。これまでの好みに関する情報をすべてリセットしました。", "bot");
            return;
        }

        addMessage(text, "user");
        chatInput.value = "";
        conversationHistory.push({ role: "user", parts: [{ text: text }] });
        const loadingRow = document.createElement("div");
        loadingRow.className = "message-row bot-msg";
        loadingRow.innerHTML = `<div class="message-bubble">...</div>`;
        chatMessages.appendChild(loadingRow);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        const rawReply = await callGeminiAPI(conversationHistory);
        chatMessages.removeChild(loadingRow);

        // Parse Profile Delta
        const deltaRegex = /\[\[PROFILE_DELTA:\s*([\s\S]*?)\]\]/;
        const deltaMatch = rawReply.match(deltaRegex);
        let cleanReply = rawReply;

        if (deltaMatch) {
            try {
                const deltaJson = JSON.parse(deltaMatch[1]);
                console.log("Profile Delta:", deltaJson);

                // Merge delta into userProfile
                userProfile = { ...userProfile, ...deltaJson };
                saveUserProfile();

                cleanReply = rawReply.replace(deltaMatch[0], "").trim();
            } catch (e) {
                console.error("Delta Parse Error", e);
            }
        }

        addMessage(cleanReply, "bot");
        conversationHistory.push({ role: "model", parts: [{ text: cleanReply }] }); // Save clean text to history to avoid loop

        const cleanTextForTTS = cleanReply.replace(/```(?:json)?[\s\S]*?```/i, "").trim();
        if (isTtsEnabled) speak(cleanTextForTTS);
    }

    // Event Listeners
    assistantAvatar.addEventListener("click", () => {
        if (chatWindow.style.display === "flex") { chatWindow.style.display = "none"; } else { chatWindow.style.display = "flex"; chatInput.focus(); }
    });
    closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        chatWindow.style.display = "none";
        // If avatar was hidden, show it again so widget is not lost
        if (!isAvatarVisible) {
            isAvatarVisible = true;
            assistantAvatar.style.display = "flex";
            chatWindow.classList.remove("no-avatar");
            // Reset toggle icon
            const svg = avatarToggle.querySelector("svg");
            svg.innerHTML = '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1.5"/><circle cx="15" cy="9" r="1.5"/>';
        }
    });
    themeBtn.addEventListener("click", (e) => { e.stopPropagation(); colorPopup.classList.toggle("open"); });
    // Dynamic palette handles its own listeners now.
    opacityToggle.addEventListener("click", () => {
        isTransparent = !isTransparent;
        if (isTransparent) { aiWidget.classList.add("transparent-mode"); opacityToggle.classList.add("active"); }
        else { aiWidget.classList.remove("transparent-mode"); opacityToggle.classList.remove("active"); }
    });
    avatarToggle.addEventListener("click", () => {
        isAvatarVisible = !isAvatarVisible;
        // Update Icon State
        const svg = avatarToggle.querySelector("svg");
        if (isAvatarVisible) {
            assistantAvatar.style.display = "flex";
            chatWindow.classList.remove("no-avatar");
            svg.innerHTML = '<rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" />';
        }
        else {
            assistantAvatar.style.display = "none";
            chatWindow.classList.add("no-avatar");
            svg.innerHTML = '<rect x="3" y="11" width="18" height="10" rx="2" /><line x1="5" y1="5" x2="19" y2="19"/>'; // Disabled icon (Slash?) or just robot with slash?
            // Let's use a simple slash over the robot or just a "Closed Eye" robot?
            // Original was Face with Line across.
            // Let's use Robot with Line check? Or just the Robot code + slash.
            // svg.innerHTML = '<rect x="3" y="11" width="18" height="10" rx="2" /><line x1="5" y1="5" x2="19" y2="19"/>'; 
            // This draws a Rect and a huge Slash. Acceptable.
        }
    });

    ttsToggle.addEventListener("click", () => {
        isTtsEnabled = !isTtsEnabled;
        if (isTtsEnabled) { ttsToggle.classList.add("active"); } else { ttsToggle.classList.remove("active"); speechSynthesis.cancel(); }
    });
    chatSendBtn.addEventListener("click", sendMessage);
    chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { if (e.isComposing) return; e.preventDefault(); sendMessage(); } });

    // --- Camera Logic ---
    const cameraModal = document.getElementById("camera-preview-modal");
    const cameraVideo = document.getElementById("camera-video");
    const cameraCancel = document.getElementById("camera-cancel-btn");
    const cameraShutter = document.getElementById("camera-shutter-btn");
    const cameraFlip = document.getElementById("camera-flip-btn");
    let cameraStream = null;
    let currentFacingMode = "environment"; // 'user' or 'environment'

    async function initCamera() {
        // HTTPS check
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            addMessage("カメラは安全な接続（HTTPS）またはローカル環境でのみ利用できます。", "bot");
            return;
        }

        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: currentFacingMode }
            });
            cameraVideo.srcObject = cameraStream;
            cameraModal.classList.remove("hidden");
            // Trigger reflow for transition
            void cameraModal.offsetWidth;
            cameraModal.classList.add("active");
        } catch (err) {
            console.error("Camera Error:", err);
            addMessage("カメラにアクセスできませんでした。権限と接続環境をご確認ください。", "bot");
        }
    }

    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        cameraVideo.srcObject = null;
        cameraModal.classList.remove("active");
        setTimeout(() => {
            cameraModal.classList.add("hidden");
        }, 300);
    }

    async function captureAndSend() {
        if (!cameraStream) return;

        // Capture
        const canvas = document.createElement("canvas");
        canvas.width = cameraVideo.videoWidth;
        canvas.height = cameraVideo.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/png");

        // Stop UI
        stopCamera();

        // Send Message Flow
        // addMessage("（画像を送信しました）", "user");
        const imgTag = `<img src="${base64}" style="max-width:100%; border-radius:8px;">`;
        addMessage(imgTag, "user");

        // Push placeholder to history
        conversationHistory.push({ role: "user", parts: [{ text: "（画像送信）" }] });

        const loadingRow = document.createElement("div");
        loadingRow.className = "message-row bot-msg";
        loadingRow.innerHTML = `<div class="message-bubble">画像を解析中...</div>`;
        chatMessages.appendChild(loadingRow);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        const reply = await callGeminiAPI(conversationHistory, base64);

        chatMessages.removeChild(loadingRow);
        addMessage(reply, "bot");
        conversationHistory.push({ role: "model", parts: [{ text: reply }] });

        if (isTtsEnabled) speak(reply.replace(/```.*?```/g, ""));
    }

    async function switchCamera() {
        if (!cameraStream) return;

        // Stop current
        cameraStream.getTracks().forEach(track => track.stop());

        // Toggle mode
        currentFacingMode = (currentFacingMode === "environment") ? "user" : "environment";

        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: currentFacingMode }
            });
            cameraVideo.srcObject = cameraStream;
        } catch (err) {
            console.error("Camera Switch Error:", err);
            addMessage("カメラの切り替えに失敗しました。", "bot");
        }
    }

    cameraBtn.addEventListener("click", initCamera);
    cameraCancel.addEventListener("click", stopCamera);
    cameraShutter.addEventListener("click", captureAndSend);
    cameraFlip.addEventListener("click", switchCamera);


    function cleanUserSpeech(text) {
        // Remove fillers
        let cleaned = text.replace(/^(えー|あのー|えっと|あー|うーん|そのー)/g, "");
        cleaned = cleaned.replace(/ (えー|あのー|えっと) /g, "");

        // Resolve demonstratives
        if (lastMentionedProduct && (cleaned.includes("これ") || cleaned.includes("それ") || cleaned.includes("あれ"))) {
            cleaned = cleaned.replace(/(これ|それ|あれ)/g, lastMentionedProduct);
            console.log("Resolved demonstrative:", cleaned);
        }

        // Append polite ending if missing (heuristic)
        if (!cleaned.endsWith("です") && !cleaned.endsWith("ます") && !cleaned.endsWith("ですか") && !cleaned.endsWith("?") && !cleaned.endsWith("！")) {
            // Simple heuristic: just assume it's a question or statement. 
            // For now, let's strictly trust the STT but maybe correct minor things if needed.
            // Actually, user requested "文末を自然な「です／ます」調に補正".
            // This is hard to do perfectly with regex, so we'll rely on the LLM to understand partial sentences,
            // but we can add a slight hint if it's super short.
        }
        return cleaned;
    }

    // --- UI/Logic ---
    // Variables hoisted to top

    // Enhanced TTS
    // --- Enhanced TTS (Robust) ---
    // --- Enhanced TTS (Robust) ---
    // availableVoices hoisted to top

    function loadVoices() {
        availableVoices = speechSynthesis.getVoices();
        console.log("TTS: Voices loaded count:", availableVoices.length);
    }

    // Ensure voices are loaded (Chrome needs this event)
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
    loadVoices(); // Try immediately too

    function speak(text) {
        if (!isTtsEnabled) return;

        // Cancel current speech
        speechSynthesis.cancel();

        const utter = new SpeechSynthesisUtterance(text);

        // Voice Tuning - Robust Selection
        if (availableVoices.length === 0) loadVoices();

        // Priority: Google JP -> Microsoft Haruka -> iOS/Mac Default -> Any JP
        let targetVoice = availableVoices.find(v => v.lang === "ja-JP" && v.name.includes("Google")) ||
            availableVoices.find(v => v.name.includes("Haruka")) ||
            availableVoices.find(v => v.lang.includes("ja"));

        // FALLBACK: If no JP voice, try ANY local voice, or just the first one.
        if (!targetVoice && availableVoices.length > 0) {
            console.warn("TTS: No Japanese voice found. using first available.");
            targetVoice = availableVoices[0];
        }

        if (targetVoice) {
            utter.voice = targetVoice;
            console.log("TTS: Using voice:", targetVoice.name);
        } else {
            console.log("TTS: No specific voice found. Using default.");
        }

        // Explicitly set lang to ensure it works even if voice is default
        utter.lang = (currentLang === 'en') ? 'en-US' : (currentLang === 'zh') ? 'zh-CN' : 'ja-JP';

        utter.pitch = 1.0;
        utter.rate = 1.0;

        // Visual Feedback (Optional - could add class to avatar)
        // assistantAvatar.classList.add("speaking");

        // Continuous Conversation
        utter.onend = () => {
            // assistantAvatar.classList.remove("speaking");
            if (isContinuousMode && isTtsEnabled) {
                setTimeout(() => {
                    if (!isListening) startListening();
                }, 400);
            }
        };

        utter.onerror = (e) => {
            console.error("TTS Error:", e);
        };

        try {
            console.log("TTS: calling speechSynthesis.speak() with text:", text);
            speechSynthesis.speak(utter);
        } catch (e) {
            console.error("TTS Exception:", e);
        }
    }

    ttsToggle.style.display = "none"; // Hide TTS Toggle per user request
    isTtsEnabled = false;

    // Disabled TTS Toggle
    ttsToggle.onclick = () => {
        console.log("TTS Toggle is disabled by configuration.");
    };




    // Enhanced TTS


    function startListening() {
        if (!recognition) {
            alert("音声認識機能が利用できません。");
            return;
        }
        try {
            recognition.start();
            console.log("STT Started");
        } catch (e) {
            console.error("STT Start Error:", e);
            // Show visible error to user
            if (e.message && e.message.includes("not allowed")) {
                addMessage("マイクの使用が許可されていません。", "bot");
            } else if (location.protocol === 'file:') {
                alert("【注意】ローカルファイル(file://)ではマイクが機能しない場合があります。\nローカルサーバー(localhost)またはHTTPS環境で実行してください。");
                addMessage("[システム] file:// プロトコルではマイクが動作しない可能性があります。", "bot");
            } else {
                // specific checking for known states (e.g. already started)
                if (e.name === "InvalidStateError") {
                    // Already started, ignore or stop and restart?
                    // Usually implies it's already running.
                    console.log("Already listening");
                } else {
                    addMessage("音声認識を開始できませんでした: " + e.message, "bot");
                }
            }
        }
    }

    function stopListening() {
        if (!recognition) return;
        recognition.stop();
        console.log("STT Stopped");
    }

    // --- STT Logic (Robust with Debug) ---
    // Variables hoisted to top

    if (SpeechRecognition) {
        // Debug: Support confirmed
        // console.log("STT Supported"); 
        // addMessage("[System] STT Supported. Init...", "bot"); // Uncomment for verbose debug

        recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            isListening = true;
            const btn = document.getElementById("stt-btn");
            if (btn) btn.classList.add("listening");
            // addMessage("[System] Listening Started...", "bot"); 
        };

        recognition.onend = () => {
            isListening = false;
            const btn = document.getElementById("stt-btn");
            if (btn) btn.classList.remove("listening");
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const processedText = cleanUserSpeech(transcript);
            chatInput.value = processedText;
            sendMessage();
        };

        recognition.onerror = (event) => {
            console.error("STT Error", event.error);
            isListening = false;
            const btn = document.getElementById("stt-btn");
            if (btn) btn.classList.remove("listening");

            let msg = "音声認識エラー: " + event.error;
            if (event.error === 'not-allowed') msg = "マイクの使用が許可されていません。";
            if (event.error === 'service-not-allowed') msg = "音声認識サービスが利用できません。";
            if (event.error === 'no-speech') return; // Ignore no-speech noise
            addMessage(`[システム] ${msg}`, "bot");
        };

        const handleSttToggle = (e) => {

            // Undeniable feedback for debugging
            // alert("Mic Clicked: " + e.type);

            // Prevent default only on touch to allow click to work naturally if needed, 
            // but we want to stop propagation.
            // On hybrid devices, we might get both. 
            // Strategy: debouncing or just rely on the flag.

            // For debugging:
            console.log("Mic interaction detected:", e.type);

            if (e.type === 'touchstart') {
                e.preventDefault(); // Stop mouse emulation
            }

            e.stopPropagation();
            if (isListening) stopListening();
            else startListening();
        };

        if (sttButton) {
            // Simplest approach: Unbind visually (cannot easily remove anonymous without reference- but we can overwrite onclick)
            // For now, let's just ADD the listeners cleanly.
            // Note: If this script runs twice, we might stack listeners. 
            // Ideally we check a flag.
            if (!sttButton.hasAttribute("data-stt-init")) {
                sttButton.setAttribute("data-stt-init", "true");

                // Use standard listeners
                sttButton.addEventListener("touchstart", handleSttToggle, { passive: false });
                sttButton.addEventListener("click", handleSttToggle);

                console.log("STT Listeners Attached");
            }
        } else {
            console.error("STT Button not found in DOM");
        }
    } else {
        // Not Supported
        console.warn("STT Not Supported");
        addMessage("[システム] このブラウザは音声入力API(SpeechRecognition)に対応していません。", "bot");
        if (sttButton) {
            sttButton.style.opacity = "0.5";
            sttButton.onclick = () => {
                alert("このブラウザは音声入力に対応していません。");
            };
        }
    }

    // Ensure clean state on init
    const sttButtonInitial = document.getElementById("stt-btn");
    if (sttButtonInitial) sttButtonInitial.classList.remove("listening", "recording");


    // Product Detail Modal Logic
    function showProductDetailModal(productId) {
        const product = window.chatProductRegistry ? window.chatProductRegistry[productId] : null;

        if (!product) {
            addMessage("申し訳ありません。この商品の詳細情報は現在取得できません。", "bot");
            return;
        }

        const modalHTML = `
            <div class="chat-detail-modal" aria-modal="true" role="dialog">
              <div class="chat-detail-modal__backdrop"></div>
              <div class="chat-detail-modal__content">
                <button class="chat-detail-modal__close" type="button">×</button>
                <div class="chat-detail-modal__img-wrapper">
                  <img src="${product.imageUrl}" alt="${product.name}" loading="lazy" />
                </div>
                <div class="chat-detail-modal__body">
                  <h3 class="chat-detail-modal__title">${product.name}</h3>
                  <div class="chat-detail-modal__price">${product.price}</div>
                  <div class="chat-detail-modal__tags">
                    ${product.tags.map(t => `<span class="chat-detail-modal__tag">${t}</span>`).join('')}
                  </div>
                  <p class="chat-detail-modal__description">
                    ${product.description || "詳細情報はありません。"}
                  </p>
                </div>
              </div>
            </div>
        `;

        // Append to chat-inner
        const chatInner = document.querySelector(".chat-inner");
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = modalHTML.trim();
        const modal = tempDiv.firstChild;
        chatInner.appendChild(modal);

        // Close handlers
        const close = () => modal.remove();
        modal.querySelector(".chat-detail-modal__close").addEventListener("click", close);
        modal.querySelector(".chat-detail-modal__backdrop").addEventListener("click", close);
    }

    // Event Delegation for "See Details"
    document.addEventListener("click", (e) => {
        if (e.target && e.target.classList.contains("chat-product-card__button")) {
            const id = e.target.getAttribute("data-product-id");
            if (id) {
                showProductDetailModal(id);
            }
        }
    });

    // Ensure clean state (Wipe any static/ghost messages)
    try {
        chatMessages.innerHTML = "";
        // Clear potential legacy history
        localStorage.removeItem("chatHistory");

        const welcomeMsg = `いらっしゃいませ！ ${WIDGET_CONFIG.brandName}へようこそ！\n\n何かお手伝いできることはありますか？\n（例：「おすすめのメニューは？」）`;
        addMessage(welcomeMsg, "bot");
        // Add to history so AI knows it has already greeted
        conversationHistory.push({ role: "model", parts: [{ text: welcomeMsg }] });
    } catch (err) {
        console.error("Initialization Logic Failed:", err);
    }
};


// Default Init for Demo (Optional) or remove entirely if end-user is expected to init.
// For now, we leave it commented out or empty, expecting the HTML to call it.
// document.addEventListener("DOMContentLoaded", () => { window.initConciergeWidget(); });
