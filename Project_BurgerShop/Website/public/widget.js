
// --- WIDGET LOADER with EMBEDDED CSS ---
(function () {
    // 1. Identify Base URL (where this script is loaded from)
    const scriptTag = document.currentScript;
    const scriptSrc = scriptTag.src;
    const baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/')) + '/';
    const siteOrigin = new URL(scriptSrc).origin; // Get the domain root
    console.log("AI Widget Base URL:", baseUrl);

    // 2. Inject CSS
    const cssContent = `
/* --- CONCIERGE WIDGET STYLES --- */
#ai-widget {
    position: fixed;
    right: 24px;
    bottom: 24px;
    display: flex;
    align-items: flex-end;
    gap: 0;
    z-index: 9999;
    pointer-events: none;
    transition: opacity 0.3s ease;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

#ai-widget.transparent-mode {
    opacity: 0.4;
}

.assistant-portrait {
    width: 170px;
    padding: 0;
    margin-right: -30px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    pointer-events: auto;
    background: transparent;
    border: none;
    box-shadow: none;
}

.assistant-portrait img {
    max-width: 100%;
    height: auto;
    display: block;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.chat-block {
    position: relative;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 16px;
}

#chat-window {
    width: 320px;
    height: 480px;
    background: transparent;
    border: none;
    box-shadow: none;
    border-radius: 0;
    display: none;
    position: relative;
    flex-direction: column;
    overflow: visible;
    margin-bottom: 0;
    transition: opacity 0.3s ease;
}

.chat-inner {
    width: 100%;
    height: 100%;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 22px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12), 0 3px 8px rgba(0, 0, 0, 0.06);
    position: relative;
    z-index: 10;
}

/* Triangle (Hidden for clean floating card look) */
#chat-window::before,
#chat-window::after {
    display: none;
}

.chat-header {
    height: 48px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--widget-theme-color), white 25%) 0%, var(--widget-theme-color) 100%);
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0 12px;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.15);
    position: relative;
    z-index: 20;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
}

.header-spacer {
    flex: 1;
    min-width: 8px;
}

.header-right {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    justify-content: flex-end;
    gap: 12px;
}

.header-title {
    color: var(--widget-header-text, rgba(255, 255, 255, 0.9));
    font-size: 15px;
    font-weight: 500;
    margin-left: 0;
    text-shadow: none;
    letter-spacing: 0.01em;
    user-select: none;
    line-height: 1;
}

.header-btn {
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: var(--widget-header-text, rgba(255, 255, 255, 0.9));
    font-size: 18px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.header-btn:hover {
    background-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
    color: white;
}

.header-btn:active {
    transform: translateY(0);
    background-color: rgba(255, 255, 255, 0.25);
}

#close-chat {
    margin-left: 0;
}

.header-icon-brand {
    width: 24px;
    height: 24px;
    margin-right: 0;
    cursor: default;
    user-select: none;
    color: var(--widget-header-text, rgba(255, 255, 255, 0.9));
    display: flex;
    align-items: center;
    justify-content: center;
}

.icon-line, .icon-brand {
    width: 24px;
    height: 24px;
    stroke: currentColor;
    stroke-width: 1.8;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.color-popup {
    position: absolute;
    top: 52px;
    right: 8px;
    width: 176px;
    background: white;
    padding: 12px;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    display: none;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    z-index: 100;
    border: 1px solid rgba(0, 0, 0, 0.05);
}

.color-popup.open {
    display: grid;
    animation: popIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.color-option {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.color-option:hover {
    transform: scale(1.15);
    z-index: 1;
}

@keyframes popIn {
    from { opacity: 0; transform: translateY(-10px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

#chat-messages {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    background: #fff;
    scroll-behavior: smooth;
}

#chat-messages::-webkit-scrollbar { width: 6px; }
#chat-messages::-webkit-scrollbar-track { background: transparent; }
#chat-messages::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.1); border-radius: 10px; }
#chat-messages::-webkit-scrollbar-thumb:hover { background-color: rgba(0, 0, 0, 0.2); }

.message-row {
    margin: 14px 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.message-bubble {
    max-width: 82%;
    padding: 14px 18px;
    border-radius: 18px;
    font-size: 14px;
    line-height: 1.64;
    word-wrap: break-word;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
    position: relative;
}

.user-msg { alignItems: flex-end; }
.user-msg .message-bubble {
    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
    color: #0d47a1;
    border-bottom-right-radius: 4px;
}

.bot-msg { alignItems: flex-start; }
.bot-msg .message-bubble {
    background-color: #f7f7f8;
    color: #1f2937;
    border-bottom-left-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.03);
}

.input-area {
    padding: 16px;
    background: white;
    border-top: none;
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
    z-index: 30;
    border-radius: 0 0 22px 22px;
}

.chat-input-container {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
}

#chat-input {
    width: 100%;
    padding: 10px 46px 10px 14px;
    border: 1px solid #E7E7E7;
    border-radius: 16px;
    outline: none;
    font-size: 15px;
    background: #ffffff;
    transition: all 0.2s ease;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
    line-height: 1.5;
}

#chat-input:focus {
    border-color: var(--widget-theme-color);
    background: white;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}

#chat-send {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 34px;
    height: 34px;
    padding: 0;
    background: linear-gradient(to bottom, #fff, #f2f2f2);
    color: var(--widget-theme-color);
    border: 1px solid rgba(0, 0, 0, 0.07);
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.7), 0 4px 10px rgba(0, 0, 0, 0.20);
    z-index: 2;
}

#chat-send:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
    transform: translateY(calc(-50% - 2px)) scale(1.05);
    filter: brightness(1.02);
}

#chat-send:active { transform: translateY(-50%) scale(0.95); }

#chat-send svg {
    width: 24px;
    height: 24px;
    stroke: currentColor;
    stroke-width: 1.8;
    fill: none;
    margin-left: 0;
}

#stt-btn {
    background: linear-gradient(to bottom, #ffffff, #f2f2f2);
    border: 1px solid rgba(0, 0, 0, 0.07);
    font-size: 18px;
    cursor: pointer;
    color: #555;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 1;
    box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.7), 0 4px 10px rgba(0, 0, 0, 0.20);
}

#stt-btn:hover {
    background-color: #fff;
    color: var(--widget-theme-color);
    border-color: transparent;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
}

#stt-btn:active { transform: translateY(0); }

#stt-btn.listening {
    background-color: #ffebee;
    color: #d32f2f;
    border-color: #ffcdd2;
    box-shadow: 0 2px 8px rgba(211, 47, 47, 0.2);
}

#stt-btn.listening::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 2px solid var(--widget-theme-color);
    z-index: -1;
    animation: mic-pulse 1.2s infinite ease-out;
    pointer-events: none;
}

@keyframes mic-pulse {
    0% { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(1.6); opacity: 0; }
}

.chat-product-card {
    width: 100%;
    border-radius: 14px;
    overflow: hidden;
    background: #ffffff;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
    margin: 8px 0;
    display: flex;
    gap: 10px;
    transition: transform 0.2s;
    border: 1px solid rgba(0, 0, 0, 0.02);
}

.chat-product-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08); }

.chat-product-card__img-wrapper {
    flex: 0 0 80px;
    max-width: 80px;
    border-radius: 12px;
    overflow: hidden;
    background: #f5f5f5;
}

.chat-product-card__img-wrapper img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.chat-product-card__body {
    flex: 1;
    padding: 8px 10px 10px 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.chat-product-card__title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #333;
    line-height: 1.3;
}

.chat-product-card__price {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e53935;
}

.chat-product-card__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 2px;
}

.chat-product-card__tag {
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 999px;
    background: #fff3cd;
    color: #a76a00;
}

.chat-product-card__button {
    margin-top: 4px;
    align-self: flex-start;
    font-size: 0.75rem;
    padding: 4px 10px;
    border-radius: 999px;
    border: none;
    background: #ff7043;
    color: #ffffff;
    cursor: pointer;
    transition: opacity 0.2s;
    box-shadow: 0 2px 5px rgba(255, 112, 67, 0.3);
}

.chat-product-card__button:hover { opacity: 0.9; transform: translateY(-1px); }

/* Quick Actions */
.quick-actions {
    padding: 10px 12px;
    background: #f9f9f9;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    display: flex;
    gap: 8px;
    overflow-x: auto;
    white-space: nowrap;
    scrollbar-width: none;
}
.quick-actions::-webkit-scrollbar { display: none; }

.action-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 20px;
    font-size: 13px;
    color: #444;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
}
.action-chip:hover {
    background: #f0f0f0;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06);
}
.action-chip svg {
    width: 16px;
    height: 16px;
    stroke-width: 2;
    stroke: currentColor;
    fill: none;
}

/* Reservation Form */
.reservation-form {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    margin-top: 8px;
    width: 100%;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}
.res-input-group { margin-bottom: 10px; }
.res-label { display: block; font-size: 11px; color: #666; margin-bottom: 4px; }
.res-input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
.res-submit {
    width: 100%;
    padding: 10px;
    background: var(--widget-theme-color);
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    margin-top: 5px;
}
.demo-badge { text-align: center; font-size: 10px; color: #999; margin-top: 8px; }

/* Mobile Overrides */
@media (max-width: 768px) {
    #ai-widget {
        right: 0; bottom: 0; width: auto; height: auto;
        flex-direction: column; align-items: flex-end; padding: 16px;
    }
    .assistant-portrait { width: 55px; margin-right: 0; margin-bottom: 0; }
    #chat-window {
        position: fixed !important; top: 0 !important; left: 0 !important;
        width: 100% !important; height: 100dvh !important;
        border-radius: 0 !important; margin: 0 !important; max-width: none !important;
        z-index: 20000; padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);
        background-color: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);
    }
    .chat-inner { border-radius: 0; border: none; box-shadow: none; }
}
    `;

    const style = document.createElement('style');
    style.textContent = cssContent;
    document.head.appendChild(style);

    // 3. Logic (Consolidated)
    console.log("Widget JS Logic Initializing...");

    const DEFAULT_CONFIG = {
        brandName: "AI Concierge",
        themeColor: "#4169e1",
        businessType: "generic",
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
        // Auto-configure API URL to be relative to the script host, not the page host
        apiUrl: baseUrl + "api/chat",
        instructions: "" // Custom instructions from client
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
            langCode: "JP"
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
            langCode: "EN"
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
            langCode: "ZH"
        }
    };

    let currentLang = 'ja';
    let WIDGET_CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

    // MAIN HTML STRUCTURE
    // Note: We use baseUrl for the image source
    const WIDGET_HTML = `
    <div class="assistant-portrait" id="assistant-avatar">
        <img src="${baseUrl}assistant.png" alt="AIコンシェルジュ"> 
    </div>
    <div class="chat-block">
        <div id="chat-window">
            <div class="chat-inner">
                <div class="chat-header">
                    <div class="header-left">
                        <span class="header-icon-brand">
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
                    <div class="color-popup" id="color-popup"></div>
                </div>
                
                <div class="quick-actions" id="quick-actions">
                    <span class="action-chip" onclick="window.triggerQuickAction('reservation')">
                        <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        来店予約
                    </span>
                    <span class="action-chip" onclick="window.triggerQuickAction('recommend')">
                        <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        おすすめ
                    </span>
                    <span class="action-chip" id="lang-toggle-chip">
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                        <span id="lang-code-text">JP</span>
                    </span>
                </div>

                <div id="chat-messages">
                    <div class="message-row bot-msg"></div>
                </div>
                
                <div class="input-area">
                    <button id="stt-btn" title="音声入力">
                        <svg class="icon-line" viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                    </button>
                    <button id="camera-btn" title="カメラで質問">
                        <svg class="icon-line" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
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

    // EXPOSE INIT FUNCTION
    window.initConciergeWidget = function (options) {
        if (options) {
            if (options.siteName) WIDGET_CONFIG.brandName = options.siteName;
            if (options.brandName) WIDGET_CONFIG.brandName = options.brandName;
            if (options.businessType) WIDGET_CONFIG.businessType = options.businessType;
            if (options.hours) WIDGET_CONFIG.hours = { ...WIDGET_CONFIG.hours, ...options.hours };

            // Allow manual API URL override (rare case)
            if (options.apiUrl) WIDGET_CONFIG.apiUrl = options.apiUrl;

            // Theme Color
            if (options.themeColor) WIDGET_CONFIG.themeColor = options.themeColor;

            // Custom Instructions
            if (options.instructions) WIDGET_CONFIG.instructions = options.instructions;
        }

        // Render Widget
        const widgetDiv = document.createElement('div');
        widgetDiv.id = 'ai-widget-container'; // Wrapper
        widgetDiv.innerHTML = WIDGET_HTML;
        document.body.appendChild(widgetDiv);

        // Core Elements
        const aiWidget = document.getElementById("ai-widget");
        const assistantAvatar = document.getElementById("assistant-avatar");
        const chatWindow = document.getElementById("chat-window");
        const closeBtn = document.getElementById("close-chat");
        const themeBtn = document.getElementById("theme-btn");
        const opacityToggle = document.getElementById("opacity-toggle");
        const avatarToggle = document.getElementById("avatar-toggle");
        const chatMessages = document.getElementById("chat-messages");
        const langBtn = document.getElementById("lang-toggle-chip");
        const chatInput = document.getElementById("chat-input");
        const chatSendBtn = document.getElementById("chat-send");
        const cameraBtn = document.getElementById("camera-btn");
        const ttsToggle = document.getElementById("tts-toggle");
        const colorPopup = document.getElementById("color-popup");

        // --- Logic Implementation (Simplified from v6) ---
        let isAvatarVisible = true;
        let isTransparent = false;
        let conversationHistory = [];

        // Apply Theme
        updateThemeProperties(WIDGET_CONFIG.themeColor);

        // Event Listeners
        assistantAvatar.addEventListener("click", () => {
            if (chatWindow.style.display === "flex") {
                chatWindow.style.display = "none";
            } else {
                chatWindow.style.display = "flex";
                chatInput.focus();
                // Initial Greeting if Empty
                if (chatMessages.children.length <= 1) { // 1 is logic wrapper
                    const msgs = document.querySelectorAll('.message-row');
                    if (msgs.length === 1 && msgs[0].innerHTML === "") { // Empty bot-msg
                        msgs[0].innerHTML = `<div class="message-bubble">${I18N[currentLang].welcome}</div>`;
                    }
                }
            }
        });

        closeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            chatWindow.style.display = "none";
            if (!isAvatarVisible) {
                isAvatarVisible = true;
                assistantAvatar.style.display = "flex";
                chatWindow.classList.remove("no-avatar");
            }
        });

        themeBtn.addEventListener("click", (e) => { e.stopPropagation(); colorPopup.classList.toggle("open"); });

        opacityToggle.addEventListener("click", () => {
            isTransparent = !isTransparent;
            if (isTransparent) { aiWidget.classList.add("transparent-mode"); opacityToggle.classList.add("active"); }
            else { aiWidget.classList.remove("transparent-mode"); opacityToggle.classList.remove("active"); }
        });

        avatarToggle.addEventListener("click", () => {
            isAvatarVisible = !isAvatarVisible;
            if (isAvatarVisible) assistantAvatar.style.display = "flex";
            else assistantAvatar.style.display = "none";
        });

        chatSendBtn.addEventListener("click", sendMessage);
        chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { if (e.isComposing) return; e.preventDefault(); sendMessage(); } });

        // --- Core Functions ---

        async function sendMessage() {
            const text = chatInput.value.trim();
            if (!text) return;

            // Add User Message
            addMessage(text, "user");
            chatInput.value = "";
            conversationHistory.push({ role: "user", parts: [{ text: text }] });

            // Loading
            const loadingRow = document.createElement("div");
            loadingRow.className = "message-row bot-msg";
            loadingRow.innerHTML = `<div class="message-bubble">...</div>`;
            chatMessages.appendChild(loadingRow);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            try {
                const rawReply = await callGeminiAPI(conversationHistory);
                chatMessages.removeChild(loadingRow);
                addMessage(rawReply, "bot");
                conversationHistory.push({ role: "model", parts: [{ text: rawReply }] });
            } catch (e) {
                chatMessages.removeChild(loadingRow);
                addMessage("エラーが発生しました。", "bot");
            }
        }

        function addMessage(text, role) {
            const row = document.createElement("div");
            row.className = `message-row ${role === 'user' ? 'user-msg' : 'bot-msg'}`;
            // Simple Render
            const bubble = document.createElement("div");
            bubble.className = "message-bubble";
            bubble.innerHTML = text.replace(/\\n/g, '<br>');
            row.appendChild(bubble);
            chatMessages.appendChild(row);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        async function callGeminiAPI(history) {
            let systemPrompt = `You are a helpful AI assistant for ${WIDGET_CONFIG.brandName}. Business Type: ${WIDGET_CONFIG.businessType}. Hours: ${WIDGET_CONFIG.hours.open}-${WIDGET_CONFIG.hours.close}. Current Time: ${new Date().toLocaleString('ja-JP')}. Respond in ${currentLang === 'en' ? 'English' : 'Japanese'}.
Website URL: ${siteOrigin}
(You are allowed to provide this URL when asked).`;

            if (WIDGET_CONFIG.instructions) {
                systemPrompt += `\n\n[IMPORTANT INSTRUCTIONS FROM OWNER]\n${WIDGET_CONFIG.instructions}`;
            }

            try {
                const response = await fetch(WIDGET_CONFIG.apiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        history: history,
                        systemPrompt: systemPrompt
                    })
                });
                const data = await response.json();
                return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
            } catch (e) {
                console.error(e);
                return "Server Connection Error";
            }
        }

        // --- Utility ---
        function updateThemeProperties(color) {
            document.documentElement.style.setProperty('--widget-theme-color', color);
            // Contrast calc simplified
            document.documentElement.style.setProperty('--widget-header-text', '#ffffff');
        }

        // Init Palette (Simplified Async)
        initColorPalette();

        async function initColorPalette() {
            // Populate Basic Colors
            const palette = [WIDGET_CONFIG.themeColor, "#EF5350", "#EC407A", "#AB47BC", "#7E57C2", "#5C6BC0", "#42A5F5", "#29B6F6", "#26C6DA", "#26A69A", "#66BB6A", "#9CCC65", "#D4E157", "#FFEE58", "#FFCA28", "#FFA726", "#FF7043", "#8D6E63", "#BDBDBD", "#78909C"];
            colorPopup.innerHTML = "";
            palette.forEach(color => {
                const div = document.createElement("div");
                div.className = "color-option";
                div.style.backgroundColor = color;
                div.onclick = () => {
                    updateThemeProperties(color);
                    colorPopup.classList.remove("open");
                };
                colorPopup.appendChild(div);
            });
        }

        // --- Mobile Enforce ---
        window.addEventListener("resize", enforceMobileAvatarSize);
        function enforceMobileAvatarSize() {
            const img = assistantAvatar.querySelector("img");
            if (!img) return;
            if (window.innerWidth <= 768) {
                // Check if -55 image exists by trial? No, just use what we have or try switch
                // Simplified: Just css resize
                img.style.width = "100px"; img.style.height = "100px";
            }
        }
        // --- STT Logic Restored ---
        let recognition;
        let isListening = false;
        const sttButton = document.getElementById("stt-btn");

        function cleanUserSpeech(text) {
            let cleaned = text.replace(/^(えー|あのー|えっと|あー|うーん|そのー)/g, "");
            cleaned = cleaned.replace(/ (えー|あのー|えっと) /g, "");
            return cleaned;
        }

        function startListening() {
            if (!recognition) {
                addMessage("音声認識機能が利用できません。", "bot");
                return;
            }
            try {
                recognition.start();
            } catch (e) {
                console.error("STT Error", e);
            }
        }
        function stopListening() {
            if (recognition) recognition.stop();
        }

        const SpeechResult = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechResult) {
            recognition = new SpeechResult();
            recognition.lang = 'ja-JP';
            recognition.interimResults = false;

            recognition.onstart = () => {
                isListening = true;
                if (sttButton) sttButton.classList.add("listening");
            };
            recognition.onend = () => {
                isListening = false;
                if (sttButton) sttButton.classList.remove("listening");
            };
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                chatInput.value = cleanUserSpeech(transcript);
                sendMessage();
            };
            recognition.onerror = (e) => {
                console.error("STT Error", e);
                isListening = false;
                if (sttButton) sttButton.classList.remove("listening");
            };

            if (sttButton) {
                // Remove any existing listeners by cloning
                const newSttBtn = sttButton.cloneNode(true);
                sttButton.parentNode.replaceChild(newSttBtn, sttButton);

                newSttBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isListening) stopListening();
                    else startListening();
                });
            }
        } else {
            console.warn("STT Not Supported");
            if (sttButton) sttButton.style.display = 'none';
        }

    };

    // Quick Actions Global
    window.triggerQuickAction = function (a) {
        alert("Demo Action: " + a);
    };
    window.submitReservation = function () {
        alert("予約デモ");
    };

})();
