import { listEvents, createEvent, updateEvent, deleteEvent, handleAuthClick } from './calendar.js';
import { enableSwipe } from './swipe.js';
import { parseInput } from './parser.js';
import { injectMeta, extractMeta, getTemplates, saveTemplates, getVoiceMode, saveVoiceMode } from './storage.js';
import { detectConflicts, generateSolutions, findFreeSlots, lastDebugLog } from './conflict.js';
import { playClick, playNav, playSuccess, playError } from './audio.js';

let currentEvents = [];
let currentDraft = null;
let countdownInterval = null;

// Views
const VIEWS = ['today', 'add', 'conflicts', 'people', 'week', 'settings'];

export function renderUI() {
    setupNav();
    showView('today');
    loadToday();

    // Init theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀' : '🌙';
}

function setupNav() {
    const app = document.getElementById('app');
    // Basic Layout with Bottom Sheet
    app.innerHTML = `
      <header id="app-header">
        <h1 class="app-title">よていまもり<span id="header-subtitle" style="font-size: 0.7em; margin-left: 10px; opacity: 0.8; font-weight: normal;"></span></h1>
        <div class="header-actions"></div> <!-- Empty now -->
      </header>
      <div id="notification-center"></div>
      <div id="view-container"></div>
      
      <!-- Bottom Sheet for Calendar Views -->
      <div id="view-selector-sheet" class="bottom-sheet">
        <button data-view="today">日 (Today)</button>
        <button data-view="week">週 (Week)</button>
        <button data-view="month">月 (Month)</button>
      </div>
      <div id="sheet-overlay" class="sheet-overlay"></div>

      <nav id="bottom-nav" class="slide-in">
        <button id="btn-view-menu" class="nav-btn">📅</button>
        <button data-view="people" class="nav-btn">人</button>
        <button data-view="add" class="fab">+</button>
        <button id="btn-settings-nav" class="nav-btn">⚙</button>
        <button id="btn-theme-nav" class="nav-btn">🌙</button>
        <button data-view="conflicts" style="display:none;" id="btn-conflicts-nav">⚠</button>
      </nav>
    `;

    // Menu Sheet Toggle
    const sheet = document.getElementById('view-selector-sheet');
    const overlay = document.getElementById('sheet-overlay');
    const toggleSheet = () => {
        sheet.classList.toggle('active');
        overlay.classList.toggle('active');
    };

    document.getElementById('btn-view-menu').addEventListener('click', () => {
        playNav();
        toggleSheet();
    });

    overlay.addEventListener('click', toggleSheet);

    // Sheet Selection
    sheet.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            playNav();
            showView(btn.dataset.view);
            toggleSheet();
        });
    });

    // Main Nav Data-Buttons (People, Add, Conflicts)
    document.querySelectorAll('#bottom-nav button[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            playNav();
            showView(btn.dataset.view);
        });
    });

    // Settings
    document.getElementById('btn-settings-nav').addEventListener('click', () => {
        playNav();
        showView('settings');
    });

    // Theme
    document.getElementById('btn-theme-nav').addEventListener('click', () => {
        playClick();
        toggleTheme();
        const icon = document.body.getAttribute('data-theme') === 'dark' ? '🌙' : '☀';
        document.getElementById('btn-theme-nav').textContent = icon;
    });
}

function showView(viewName, data = null) {
    const container = document.getElementById('view-container');
    container.innerHTML = ''; // Clear

    switch (viewName) {
        case 'today': renderToday(container, data); break; // data can be a target Date object
        case 'add': renderAdd(container, data); break;
        case 'conflicts': renderConflicts(container); break;
        case 'people': renderPeople(container); break;
        case 'week': renderWeek(container); break;
        case 'month': renderMonth(container); break;
        case 'settings': renderSettings(container); break;
    }
}

// Module-level state for calendar navigation
let calendarViewDate = new Date();

async function renderMonth(container) {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth(); // 0-indexed

    // Calculate Grid Range
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Update Header
    const headerSub = document.getElementById('header-subtitle');
    if (headerSub) headerSub.textContent = "今月の予定";

    // Start from the previous Sunday
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());

    // End at the next Saturday (allow for 6 rows max = 42 days)
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 41);
    // Wait, let's just do standard 6 weeks to be safe, or calculated?
    // 6*7 = 42 days cover any month.

    container.innerHTML = `
        <div class="calendar-header">
            <button id="btn-prev-month" class="icon-btn">◀</button>
            <h2>${year}年 ${month + 1}月</h2>
            <button id="btn-next-month" class="icon-btn">▶</button>
        </div>
        <div class="calendar-grid-header">
            <div>日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div>土</div>
        </div>
        <div id="calendar-grid" class="calendar-grid">Loading...</div>
    `;

    // Bind Nav Buttons
    document.getElementById('btn-prev-month').addEventListener('click', () => {
        calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
        renderMonth(container);
    });
    document.getElementById('btn-next-month').addEventListener('click', () => {
        calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
        renderMonth(container);
    });

    try {
        const events = await listEvents(startDate.toISOString(), endDate.toISOString());

        // Map events to date strings "YYYY-MM-DD"
        const eventsMap = {};
        events.forEach(ev => {
            const startStr = ev.start.dateTime || ev.start.date;
            const d = new Date(startStr);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!eventsMap[key]) eventsMap[key] = [];
            eventsMap[key].push(ev);
        });

        // Generate Grid HTML
        let html = '';
        let currentDay = new Date(startDate);
        const todayStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');

        for (let i = 0; i < 42; i++) {
            const y = currentDay.getFullYear();
            const m = String(currentDay.getMonth() + 1).padStart(2, '0');
            const d = String(currentDay.getDate()).padStart(2, '0');
            const dateKey = `${y}-${m}-${d}`;

            const isToday = (dateKey === todayStr);
            const isCurrentMonth = (currentDay.getMonth() === month);
            const dayEvents = eventsMap[dateKey] || [];

            // Event Bars Logic
            const eventsHtml = dayEvents.slice(0, 5).map(ev => {
                const colorClass = ev.colorId ? `g-color-${ev.colorId}` : '';
                const displaySummary = ev.summary.replace(/^\(仮\)\s*/, '');
                const isTentative = (ev.status === 'tentative') || (ev.summary.startsWith('(仮)'));

                return `<div class="month-event-bar ${colorClass} ${isTentative ? 'tentative' : ''}">
                    ${displaySummary}
                </div>`;
            }).join('');

            html += `
                <div class="day-cell ${isCurrentMonth ? '' : 'outside'} ${isToday ? 'today' : ''}" data-date="${dateKey}">
                    <span class="day-number">${currentDay.getDate()}</span>
                    <div class="month-events-container">${eventsHtml}</div>
                </div>
            `;

            currentDay.setDate(currentDay.getDate() + 1);
        }

        const gridEl = document.getElementById('calendar-grid');
        if (gridEl) {
            gridEl.innerHTML = html;

            // Click -> Go to Today view for that date
            gridEl.querySelectorAll('.day-cell').forEach(cell => {
                cell.addEventListener('click', () => {
                    const dateStr = cell.dataset.date; // "YYYY-MM-DD"
                    // We need to support 'renderToday' taking a date.
                    // For now, let's just navigate to Today view.
                    // Ideally pass the date.
                    const target = new Date(dateStr);
                    showView('today', target);
                });
            });
        }

    } catch (e) {
        console.error(e);
        const gridEl = document.getElementById('calendar-grid');
        if (gridEl) gridEl.innerHTML = `<div style="padding:20px; color:red;">読み込み失敗</div>`;
        notify("カレンダー読み込み失敗: " + e.message, "error");
    }
}
async function loadToday(targetDate = null) {
    const now = targetDate instanceof Date ? targetDate : new Date();
    // Update Header if we have a container for it (optional tweak)
    // For now just valid date logic
    const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString();

    try {
        currentEvents = await listEvents(startOfDay, endOfDay);
        const container = document.getElementById('today-list');
        if (container) {
            container.innerHTML = currentEvents.map((ev, index) => {
                let timeStr = '';
                if (ev.start.dateTime) {
                    const d = new Date(ev.start.dateTime);
                    const e = new Date(ev.end.dateTime);
                    const startFmt = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
                    const endFmt = `${e.getHours()}:${String(e.getMinutes()).padStart(2, '0')}`;
                    timeStr = `${startFmt}-${endFmt}`;
                } else if (ev.start.date) {
                    timeStr = '終日';
                }

                const meta = extractMeta(ev.description);
                console.log("Event:", ev.summary, "Status:", ev.status, "Meta:", meta);

                const isTentative = (meta.importance === 'tentative') || (ev.status === 'tentative') || (ev.summary.startsWith('(仮)'));
                const isUndecided = (meta.timeStatus === 'undecided');

                let cardClass = 'card event-card';
                if (isTentative) cardClass += ' tentative';
                if (isUndecided) {
                    cardClass += ' undecided';
                    timeStr = '時間未定'; // Override time string
                }

                const statusLabel = isTentative ? '<span class="badge tentative">(仮)</span> ' : '';
                const displaySummary = ev.summary.replace(/^\(仮\)\s*/, '');

                const colorId = ev.colorId;
                const colorClass = colorId ? `g-color-${colorId}` : '';
                const colorAttr = colorId ? 'data-color="true"' : '';

                return `
                <div class="swipe-wrapper slide-in" style="animation-delay: ${index * 0.05}s">
                    <div class="swipe-bg" id="delete-bg-${index}" data-id="${ev.id}">
                        <span class="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></span>
                    </div>
                    <div class="${cardClass} ${colorClass}" id="card-${index}" ${colorAttr}>
                        <div class="time">${timeStr}</div>
                        <div class="summary">${statusLabel}${displaySummary}</div>
                    </div>
                </div>
            `;
            }).join('');

            // Post-render: Attach Swipe & Click Listeners
            currentEvents.forEach((ev, index) => {
                const card = document.getElementById(`card-${index}`);
                const bg = document.getElementById(`delete-bg-${index}`);
                const wrapper = card ? card.parentElement : null;

                if (card && wrapper && bg) {
                    enableSwipe(card, wrapper);

                    // Click on background (delete button)
                    bg.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (confirm(`「${ev.summary}」を削除しますか？`)) {
                            try {
                                await deleteEvent(ev.id);
                                notify("削除しました");
                                loadToday();
                            } catch (err) {
                                notify("削除失敗: " + err.message, "error");
                            }
                        } else {
                            card.style.transform = 'translateX(0)';
                            wrapper.classList.remove('swiped-open');
                        }
                    });

                    // Click on card (Edit)
                    card.addEventListener('click', (e) => {
                        // Ignore if swiped open
                        if (wrapper.classList.contains('swiped-open')) return;
                        showView('add', ev); // Pass event to add view
                    });
                }
            });

            // Update countdown
            updateCountdown(currentEvents);
        }
    } catch (e) {
        console.error(e);
        const container = document.getElementById('today-list');
        if (container) {
            container.innerHTML = `
                <div class="auth-container" style="text-align: center; padding: 20px;">
                    <p>Googleカレンダーと連携してください</p>
                    <button id="btn-login" style="padding: 10px 20px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Googleでログイン
                    </button>
                    <p style="color: red; font-size: 0.8em; margin-top: 10px;">${e.result?.error?.message || e.message}</p>
                </div>
            `;
            document.getElementById('btn-login').addEventListener('click', async () => {
                try {
                    await handleAuthClick();
                    loadToday(); // Retry after login
                } catch (authErr) {
                    notify("認証エラー: " + authErr.message, "error");
                }
            });
        }
        notify(`読み込み失敗: ${e.message} `, 'error');
    }
}

function renderToday(container) {
    // Clear previous timer if any
    if (countdownInterval) clearInterval(countdownInterval);

    // Update Header
    const headerSub = document.getElementById('header-subtitle');
    if (headerSub) headerSub.textContent = "今日の予定";

    container.innerHTML = `
        <div id="countdown-area"></div>
        <div id="today-list">Loading...</div>
    `;
    loadToday();
}

function updateCountdown(events) {
    const area = document.getElementById('countdown-area');
    if (!area) return;

    // Find next event
    const now = new Date();
    // Filter events that haven't started yet (or strictly 'next'?)
    // Usually 'next' means start time > now.
    const nextEvent = events.find(ev => {
        if (!ev.start.dateTime) return false; // Skip all-day for hour countdown
        return new Date(ev.start.dateTime) > now;
    });

    if (!nextEvent) {
        area.innerHTML = '';
        return;
    }

    const start = new Date(nextEvent.start.dateTime);
    const summary = nextEvent.summary.replace(/^\(仮\)\s*/, '');

    const render = () => {
        const diff = start - new Date();

        if (diff <= 0) {
            // Event started!
            area.innerHTML = '';
            if (countdownInterval) clearInterval(countdownInterval);
            loadToday(); // Refresh list to update "current" status if we had that
            return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        // const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        let timerText = '';
        if (hours > 0) timerText += `${hours} <span class="timer-small">時間</span> `;
        timerText += `${minutes} <span class="timer-small">分</span>`;

        // If less than 1 min
        if (hours === 0 && minutes === 0) {
            timerText = 'まもなく';
        }

        // Only update if changed (innerHTML is cheap here but cleaner DOM)
        area.innerHTML = `
                <div class="countdown-banner scale-in" >
                <h3>Next Schedule</h3>
                <div class="target-title">${summary}</div>
                <div class="timer">あと ${timerText}</div>
            </div >
                `;
    };

    render();
    countdownInterval = setInterval(render, 30000); // Update every 30s is enough for minutes
}

function renderSettings(container) {
    try {
        let templates = getTemplates();
        let voiceMode = getVoiceMode();

        if (!Array.isArray(templates)) {
            console.warn("Templates is not an array, resetting to default.");
            templates = [];
        }

        container.innerHTML = `
            <h2>設定</h2>

            <div class="card">
                <h3>音声入力モード</h3>
                <div class="input-group" style="display:block; margin-bottom:10px;">
                    <label style="display:flex; align-items:center; margin-bottom:10px; cursor:pointer;">
                        <input type="radio" name="voice-mode" value="tap" ${voiceMode === 'tap' ? 'checked' : ''} style="margin-right:10px;">
                        <div>
                            <strong>タップで切り替え (標準)</strong><br>
                            <span style="font-size:0.8em; color:var(--text-sec);">マイクボタンをタップして開始、もう一度タップして停止</span>
                        </div>
                    </label>
                    <label style="display:flex; align-items:center; cursor:pointer;">
                        <input type="radio" name="voice-mode" value="hold" ${voiceMode === 'hold' ? 'checked' : ''} style="margin-right:10px;">
                         <div>
                            <strong>長押しで入力 (Hold)</strong><br>
                            <span style="font-size:0.8em; color:var(--text-sec);">押している間だけ音声を認識します</span>
                        </div>
                    </label>
                </div>
            </div>

            <div class="card">
                <h3>定型文（テンプレート）管理</h3>
                <div id="settings-template-list">
                    ${templates.map((t, i) => `
                        <div class="template-item-row">
                            <span>${t.icon} ${t.label}</span>
                            <button class="btn-delete-template" data-index="${i}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                        </div>
                    `).join('')}
                </div>

                <div class="template-add-form">
                    <h4>新規追加</h4>
                    <input type="text" id="new-template-label" placeholder="ラベル (例: 外出)" />
                    <input type="text" id="new-template-icon" placeholder="アイコン (例: 🏃)" style="width: 80px; margin-left: 5px;" />
                    <button id="btn-add-template" class="primary" style="margin-top: 10px;">追加</button>
                </div>
            </div>


        `;

        // Voice Mode Handler
        container.querySelectorAll('input[name="voice-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const newMode = e.target.value;
                saveVoiceMode(newMode);
                notify(`音声入力モードを「${newMode === 'tap' ? 'タップ' : '長押し'}」に変更しました`);
            });
        });

        // Delete handlers
        container.querySelectorAll('.btn-delete-template').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                const verified = confirm(`「${templates[index].label}」を削除しますか？`);
                if (verified) {
                    templates.splice(index, 1);
                    saveTemplates(templates);
                    renderSettings(container); // Re-render
                    notify("削除しました");
                }
            });
        });

        // Add handler
        const btnAdd = document.getElementById('btn-add-template');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                const labelIn = document.getElementById('new-template-label');
                const iconIn = document.getElementById('new-template-icon');
                const label = labelIn.value.trim();
                const icon = iconIn.value.trim() || '📝';

                if (!label) {
                    notify("ラベルを入力してください", "error");
                    return;
                }

                templates.push({ label, icon });
                saveTemplates(templates);
                renderSettings(container);
                notify("追加しました");
            });
        }
    } catch (e) {
        console.error("Render Settings Error:", e);
        container.innerHTML = `<div class="card error">
            <h3>エラー</h3>
            <p>設定画面の描画に失敗しました。</p>
            <p>${e.message}</p>
        </div>`;
    }
}

function renderAdd(container, editEvent = null) {
    const templates = getTemplates();
    const isEdit = !!editEvent;

    container.innerHTML = `
        <h2>${isEdit ? '予定を編集' : '予定を入力'}</h2>

        <div class="template-row">
            ${templates.map(t => `
                <button class="template-btn" data-text="${t.label}"><span>${t.icon}</span> ${t.label}</button>
            `).join('')}
        </div>

        <div class="input-group">
            <textarea id="input-text" placeholder="例: 明日15時に田中さんと会議（仮）" rows="3"></textarea>
            <button id="btn-mic" class="icon-btn" title="音声入力">🎤</button>
        </div>
        <div id="preview-area"></div>
        <div class="actions">
            <button id="btn-analyze">解析</button>
            ${isEdit ? '<button id="btn-cancel" style="background:#888;">キャンセル</button>' : ''}
        </div>
    `;

    const input = document.getElementById('input-text');

    // Pre-fill if editing
    if (isEdit) {
        let datePfx = '';
        if (editEvent.start.dateTime) {
            const start = new Date(editEvent.start.dateTime);
            const end = new Date(editEvent.end.dateTime);
            // Format: "M/D H:mm-H:mm"
            const dateStr = `${start.getMonth() + 1}/${start.getDate()}`;
            const startStr = `${start.getHours()}:${String(start.getMinutes()).padStart(2, '0')}`;
            const endStr = `${end.getHours()}:${String(end.getMinutes()).padStart(2, '0')}`;
            datePfx = `${dateStr} ${startStr}-${endStr} `;
        } else if (editEvent.start.date) {
            // All day
            const start = new Date(editEvent.start.date);
            datePfx = `${start.getMonth() + 1}/${start.getDate()} 終日 `;
        }

        // Clean summary (remove (仮) if it exists, as parser might re-add it or users edit it)
        const cleanSummary = editEvent.summary.replace(/^\(仮\)\s*/, '');

        input.value = datePfx + cleanSummary;

        // Also we need to store the event ID to know we are updating
        currentDraft = {
            id: editEvent.id, // Marker for update
            ...editEvent
        };

        // Auto-analyze to show preview immediately? 
        // Maybe better to wait for user to touch it, or force analysis so they see what it is.
        // Let's force analysis so the preview matches standard parsing immediately.
        setTimeout(() => document.getElementById('btn-analyze').click(), 100);
    }

    // Template click handler
    container.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const currentVal = input.value;
            const appendText = btn.dataset.text;

            if (currentVal && !currentVal.endsWith(' ')) {
                input.value = currentVal + ' ' + appendText;
            } else {
                input.value = currentVal + appendText;
            }
            input.focus();
            document.getElementById('btn-analyze').style.display = 'block';
            document.getElementById('preview-area').innerHTML = '';
        });
    });

    const btnAnalyze = document.getElementById('btn-analyze');

    input.addEventListener('input', () => {
        btnAnalyze.style.display = 'block';
        document.getElementById('preview-area').innerHTML = '';
    });

    document.getElementById('btn-analyze').addEventListener('click', () => {
        const text = input.value;
        if (!text) return;

        const newDraft = parseInput(text);
        // If updating, preserve the ID
        if (isEdit && currentDraft?.id) {
            newDraft.id = currentDraft.id;
            // If user didn't specify date in text, parser defaults to today/tomorrow.
            // Ideally we should keep original date if not specified?
            // That's complex logic. relying on user typing new date if changed.
        }
        currentDraft = newDraft;

        renderPreview(document.getElementById('preview-area'));
        btnAnalyze.style.display = 'none';
    });

    if (isEdit) {
        document.getElementById('btn-cancel').addEventListener('click', () => {
            showView('today');
            currentDraft = null;
        });
    }

    setupVoiceInput();
}

function setupVoiceInput() {
    const btnMic = document.getElementById('btn-mic');
    const textArea = document.getElementById('input-text');
    const mode = getVoiceMode();

    // Browser support check
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        btnMic.style.display = 'none';
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let isRecording = false;

    const startRec = () => {
        if (isRecording) return;
        try {
            recognition.start();
            isRecording = true;
            btnMic.classList.add('recording');
            btnMic.textContent = '⏹️';
            notify(mode === 'hold' ? "聞いています... (離して終了)" : "聞いています...", "info");
        } catch (e) {
            console.error("Start error", e);
        }
    };

    const stopRec = () => {
        if (!isRecording) return;
        try {
            recognition.stop();
            // isRecording = false; // Will be set in onend
        } catch (e) {
            console.error("Stop error", e);
        }
    };

    // Remove old listeners? No, element is fresh from renderAdd.

    if (mode === 'hold') {
        // Mouse
        btnMic.addEventListener('mousedown', startRec);
        btnMic.addEventListener('mouseup', stopRec);
        btnMic.addEventListener('mouseleave', stopRec);
        // Touch
        btnMic.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent click simulation
            startRec();
        });
        btnMic.addEventListener('touchend', (e) => {
            e.preventDefault();
            stopRec();
        });
    } else {
        // Tap mode
        btnMic.addEventListener('click', () => {
            if (isRecording) {
                stopRec();
            } else {
                startRec();
            }
        });
    }

    recognition.onend = () => {
        isRecording = false;
        btnMic.classList.remove('recording');
        btnMic.textContent = '🎤';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        // Append to existing text with a space if needed
        const currentVal = textArea.value;
        textArea.value = currentVal + (currentVal ? ' ' : '') + transcript;
        notify("音声を認識しました", "success");

        // Auto-focus back to textarea
        textArea.focus();
    };

    recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
            notify("音声が検出されませんでした", "warning");
        } else {
            notify("音声認識エラー: " + event.error, "error");
        }
        isRecording = false;
        btnMic.classList.remove('recording');
        btnMic.textContent = '🎤';
    };
}

function renderPreview(container) {
    if (!currentDraft) return;

    let timeDisplay = '';
    let alertMsg = '';

    if (currentDraft.timeUndecided) {
        timeDisplay = '<span style="color:var(--accent-color); font-weight:bold;">時間未定</span>';
        alertMsg = '<p style="color:var(--accent-color);">⚠️ 「時間未定」として登録しますか？</p>';
    } else if (currentDraft.isAllDay) {
        timeDisplay = '終日';
        alertMsg = '<p style="color:var(--primary-color);">⌚ 時間指定がありません。<br>このまま終日予定として登録しますか？<br>（時間を指定する場合は入力欄に追加してください）</p>';
    } else {
        timeDisplay = currentDraft.start ? new Date(currentDraft.start).toLocaleString() : 'N/A';
    }

    container.innerHTML = `
        <div class="card preview-card">
            <div><strong>Summary:</strong> ${currentDraft.summary}</div>
            <div><strong>Time:</strong> ${timeDisplay}</div>
            <div><strong>Type:</strong> ${currentDraft.importance}</div>
            ${alertMsg}

            <div class="actions" style="display: flex; gap: 10px; margin-top: 16px;">
                <button id="btn-tentative" class="secondary" style="flex: 1;">仮で登録</button>
                <button id="btn-save" class="primary" style="flex: 1;">確定して登録</button>
            </div>
            ${currentDraft.isAllDay || currentDraft.timeUndecided ?
            '<div style="font-size:0.8em; color:#888; margin-top:5px; text-align:right;">※時間を入れる場合は上の入力欄に時間を追記して「解析」を押してください</div>' : ''
        }
        </div>
    `;

    document.getElementById('btn-save').onclick = () => saveEvent('must');
    document.getElementById('btn-tentative').onclick = () => saveEvent('tentative');
}

async function saveEvent(importance) {
    if (!currentDraft || !currentDraft.start) {
        notify("日時が解析できませんでした", "error");
        return;
    }

    // Prepare Event Resource
    const eventResource = {
        summary: (importance === 'tentative' ? '(仮) ' : '') + currentDraft.summary,
        // start/end might be ISO string OR {date: 'YYYY-MM-DD'} object from parser
        start: typeof currentDraft.start === 'string' ? { dateTime: currentDraft.start } : currentDraft.start,
        end: typeof currentDraft.end === 'string' ? { dateTime: currentDraft.end } : currentDraft.end,
        status: importance === 'tentative' ? 'tentative' : 'confirmed',
        description: injectMeta(currentDraft.notes, {
            type: currentDraft.type,
            importance: importance,
            people: currentDraft.people,
            timeStatus: currentDraft.timeUndecided ? 'undecided' : (currentDraft.isAllDay ? 'allday' : 'specified')
        })
    };

    // Conflict Check (Only for specific time events for now to avoid noise?)
    // Or check all-day conflicts? Let's skip conflict check for Undecided/AllDay for MVP simplicity unless critical.
    if (!currentDraft.timeUndecided && !currentDraft.isAllDay) {
        const draftStart = new Date(currentDraft.start);
        const checkStart = new Date(draftStart.setHours(0, 0, 0, 0)).toISOString();
        const checkEnd = new Date(draftStart.setHours(23, 59, 59, 999)).toISOString();

        let targetEvents = [];
        try {
            targetEvents = await listEvents(checkStart, checkEnd);
        } catch (e) {
            console.error("Failed to fetch target events for conflict check", e);
        }

        const conflicts = detectConflicts(currentDraft, targetEvents);

        if (conflicts.length > 0) {
            notify(`競合が ${conflicts.length} 件あります`, "warning");
            let solutions = [];
            try {
                solutions = generateSolutions(conflicts, currentDraft, targetEvents);
            } catch (err) {
                console.error("Solution Generation Error:", err);
            }
            window.tempConflictContext = { draft: currentDraft, conflicts, solutions, importance };
            showView('conflicts');
            return;
        }
    }



    console.log("Saving Event Resource:", JSON.stringify(eventResource, null, 2));

    try {
        if (currentDraft.id) {
            // Update existing
            await updateEvent(currentDraft.id, eventResource);
            notify("予定を更新しました", "success");
        } else {
            // Create new
            await createEvent(eventResource);
            notify("予定を登録しました", "success");
        }

        playSuccess();
        // Reset
        currentDraft = null;
        document.getElementById('input-text').value = '';
        document.getElementById('preview-area').innerHTML = '';
        showView('today');

    } catch (e) {
        playError();
        console.error("Save Event Error:", e);
        const errorMsg = e.result?.error?.message || e.message || JSON.stringify(e);
        notify("登録失敗: " + errorMsg, "error");
    }
}

function renderConflicts(container) {
    try {
        if (!window.tempConflictContext) {
            container.innerHTML = "<div>競合はありません</div>";
            return;
        }

        const { draft, conflicts, solutions: storedSolutions, importance } = window.tempConflictContext;
        // Use stored solutions calculated in saveEvent
        const solutions = storedSolutions || [];

        // Debug
        console.log("[RenderConflicts] Using stored solutions:", solutions);


        container.innerHTML = `
            <h2>Conflicts Resolution</h2>
            <div class="card warn">
                <p>新規予定「${draft ? draft.summary : '???'}」が ${conflicts ? conflicts.length : 0} 件の予定と競合しています。</p>
            </div>
            <h3>解決案</h3>
            <div class="solution-list">
                ${solutions && solutions.length > 0 ? solutions.map((sol, idx) => `
                    <button class="solution-btn" data-idx="${idx}">
                        ${sol.label}
                    </button>
                `).join('') : `<p>解決案なし</p><div style="font-size:10px; color:#999; max-height:100px; overflow:auto; background:#eee; padding:5px;">${lastDebugLog ? lastDebugLog.join('<br>') : 'No logs'}</div>`}
            </div>
            
            <button id="force-save">構わず登録</button>
            <button id="btn-conflict-cancel" style="background-color: #777; margin-top: 10px;">キャンセル</button>
            `;

        // Cancel Listener
        document.getElementById('btn-conflict-cancel').addEventListener('click', () => {
            window.tempConflictContext = null;
            // Go back to Add view to let user fix it manually? Or Today?
            // Usually cancel means "stop this whole thing". 
            // But maybe they want to edit the input?
            // Let's go back to 'add' with the current draft? 
            // "Cancel" usually implies aborting the resolution. 
            // If we go to Add, we should restore state. 
            // Simple cancel: Go to Add with current input preserved if possible?
            // Actually, the `renderAdd` inputs are gone when we switched view.
            // But `currentDraft` (or tempConflictContext.draft) exists.
            // Let's rerender 'add' with the draft pre-filled? 
            // YES.
            const draftToRestore = window.tempConflictContext?.draft || currentDraft;
            showView('add', draftToRestore);
            window.tempConflictContext = null;
        });

        // Add logic for solution buttons
        document.querySelectorAll('.solution-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const idx = btn.dataset.idx;
                const sol = solutions[idx];

                try {
                    if (sol.type === 'move_tentative') {
                        // Logic: "Swap to Reschedule"
                        // 1. Delete the conflicting tentative event
                        const targetId = sol.targetEventId;
                        const targetConflict = conflicts.find(c => c.event.id === targetId);
                        const targetSummary = targetConflict ? targetConflict.event.summary : "（不明な予定）";

                        try {
                            await deleteEvent(targetId);
                            // Update cache locally to prevent phantom conflicts
                            currentEvents = currentEvents.filter(ev => ev.id !== targetId);

                            notify(`仮予定「${targetSummary}」を削除しました`, "info");

                            // 2. Force save the NEW event
                            const targetImportance = importance || 'must';
                            await createEvent({
                                summary: (targetImportance === 'tentative' ? '(仮) ' : '') + draft.summary,
                                start: { dateTime: draft.start },
                                end: { dateTime: draft.end },
                                status: targetImportance === 'tentative' ? 'tentative' : 'confirmed',
                                description: injectMeta(draft.notes, {
                                    type: draft.type,
                                    importance: targetImportance,
                                    people: draft.people
                                })
                            });

                            // 3. Put the deleted event back into input for rescheduling
                            const cleanSummary = targetSummary.replace(/^\(仮\)\s*/, '');

                            window.tempConflictContext = null;
                            showView('add'); // Go back to Add view FIRST to create the element

                            // Now set the value
                            setTimeout(() => {
                                const inputEl = document.getElementById('input-text');
                                if (inputEl) {
                                    inputEl.value = `${cleanSummary} `;
                                    // 4. Suggest Free Slots logic (omitted for brevity in fix, assumed working or caught)
                                    notify(`「${draft.summary}」を登録しました。\n「${cleanSummary}」を再調整してください。`, "success");
                                }
                            }, 100);

                        } catch (err) {
                            console.error("Move Tentative Error:", err);
                            const msg = err.result?.error?.message || err.message || JSON.stringify(err);
                            notify("処理に失敗しました: " + msg, "error");
                        }
                        return;
                    }

                    if (sol.action === 'slide') {
                        const start = new Date(draft.start);
                        const end = new Date(draft.end);
                        start.setMinutes(start.getMinutes() + sol.minutes);
                        end.setMinutes(end.getMinutes() + sol.minutes);
                        draft.start = start.toISOString();
                        draft.end = end.toISOString();
                    } else if (sol.action === 'shorten') {
                        const start = new Date(draft.start);
                        const end = new Date(start.getTime() + sol.duration * 60000);
                        draft.end = end.toISOString();
                    }

                    // Retry save with updated draft
                    await saveEvent(importance || 'must');
                    window.tempConflictContext = null;

                } catch (e) {
                    notify("解決案の適用に失敗: " + e.message, "error");
                }
            });
        });

        document.getElementById('force-save').addEventListener('click', async () => {
            // Force save...
            // (Keeping logic simple)
            const targetImportance = importance || 'must';
            const eventResource = {
                summary: (targetImportance === 'tentative' ? '(仮) ' : '') + draft.summary,
                start: { dateTime: draft.start },
                end: { dateTime: draft.end },
                status: targetImportance === 'tentative' ? 'tentative' : 'confirmed',
                description: injectMeta(draft.notes, {
                    type: draft.type,
                    importance: targetImportance,
                    people: draft.people
                })
            };
            try {
                await createEvent(eventResource);
                notify("強制登録しました");
                window.tempConflictContext = null;
                showView('today');
            } catch (e) {
                notify("強制登録失敗: " + e.message, "error");
            }
        });

    } catch (e) {
        console.error("Render Conflict Error:", e);
        container.innerHTML = `<div class="card error">
            <h3>描画エラー</h3>
            <p>${e.message}</p>
            <pre>${e.stack}</pre>
        </div>`;
    }
}

function renderPeople(container) {
    if (!currentEvents || currentEvents.length === 0) {
        container.innerHTML = "<div class='card'>今日の予定はありません</div>";
        return;
    }

    const peopleMap = {};

    currentEvents.forEach(ev => {
        const meta = extractMeta(ev.description);
        const people = meta.people || [];

        // Also simple heuristic if not in meta: check summary for "XXさん"
        if (people.length === 0) {
            const matches = ev.summary.match(/([^\s]+)さん/g);
            if (matches) {
                matches.forEach(m => people.push(m.replace('さん', '')));
            }
        }

        people.forEach(p => {
            if (!peopleMap[p]) peopleMap[p] = [];
            peopleMap[p].push(ev);
        });
    });

    const sortedPeople = Object.keys(peopleMap).sort();

    if (sortedPeople.length === 0) {
        container.innerHTML = "<div class='card warn'>人に関連付けられた予定が見つかりません</div>";
        return;
    }

    // Update Header
    const headerSub = document.getElementById('header-subtitle');
    if (headerSub) headerSub.textContent = "本日のゲスト";

    container.innerHTML = sortedPeople.map(person => `
        <div class="card person-card">
            <h3>${person} さん</h3>
            <ul>
                ${peopleMap[person].map(ev => {
        const time = ev.start.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '終日';
        return `<li><strong>${time}</strong>: ${ev.summary.replace(/^\(仮\)\s*/, '')}</li>`;
    }).join('')}
            </ul>
        </div>
    `).join('');
}
async function renderWeek(container) {
    const now = new Date();
    const startOfWeek = new Date(now.setHours(0, 0, 0, 0));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    // Update Header
    const headerSub = document.getElementById('header-subtitle');
    if (headerSub) headerSub.textContent = "今週の予定";

    container.innerHTML = `<div id="week-list">Loading...</div>`;

    try {
        const events = await listEvents(startOfWeek.toISOString(), endOfWeek.toISOString());

        if (!events || events.length === 0) {
            document.getElementById('week-list').innerHTML = "<div class='card'>週間予定はありません</div>";
            return;
        }

        // Group by Date
        const daysMap = {};
        // Initialize 7 days
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            const key = d.toDateString();
            daysMap[key] = { date: d, events: [] };
        }

        events.forEach(ev => {
            const evDate = new Date(ev.start.dateTime || ev.start.date);
            const key = new Date(evDate.setHours(0, 0, 0, 0)).toDateString();
            if (daysMap[key]) {
                daysMap[key].events.push(ev);
            }
        });

        // Render
        const html = Object.values(daysMap).map((day, index) => {
            const dateStr = day.date.toLocaleDateString('ja-JP', { weekday: 'short', day: 'numeric' });
            const isToday = day.date.toDateString() === new Date().toDateString();
            const dayClass = isToday ? 'day-group today' : 'day-group';

            // Stagger animation by day
            const delay = index * 0.1;

            return `
                <div class="${dayClass} slide-in" style="animation-delay: ${delay}s">
                    <div class="day-header">${dateStr}</div>
                    <div class="day-events">
                        ${day.events.length === 0 ? '<div class="no-event">- 予定なし -</div>' :
                    day.events.map(ev => {
                        const start = new Date(ev.start.dateTime);
                        const end = new Date(ev.end.dateTime);
                        const time = ev.start.dateTime
                            ? `${start.getHours()}:${String(start.getMinutes()).padStart(2, '0')}-${end.getHours()}:${String(end.getMinutes()).padStart(2, '0')}`
                            : '終日';
                        const meta = extractMeta(ev.description);
                        const isTentative = (meta.importance === 'tentative') || (ev.status === 'tentative') || (ev.summary.startsWith('(仮)'));
                        const badge = isTentative ? '<span class="badge tentative">(仮)</span>' : '';
                        const summary = ev.summary.replace(/^\(仮\)\s*/, '');

                        const colorId = ev.colorId;
                        const colorClass = colorId ? `g-color-${colorId}` : '';
                        const colorAttr = colorId ? 'data-color="true"' : '';

                        return `
                        <div class="swipe-wrapper">
                            <div class="swipe-bg" id="week-delete-bg-${ev.id}" data-id="${ev.id}">
                                <span class="icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></span>
                            </div>
                            <div class="mini-event ${isTentative ? 'tentative' : ''} ${colorClass}" ${colorAttr} id="week-card-${ev.id}" style="background:var(--card-bg); border-bottom:none;">
                                  <span class="time">${time}</span> ${badge}${summary}
                            </div>
                        </div>`;
                    }).join('')
                }
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('week-list').innerHTML = html;

        // Attach listeners
        events.forEach(ev => {
            const card = document.getElementById(`week-card-${ev.id}`);
            const bg = document.getElementById(`week-delete-bg-${ev.id}`);
            const wrapper = card ? card.parentElement : null;

            if (card && bg && wrapper) {
                enableSwipe(card, wrapper);

                // Delete
                bg.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm(`「${ev.summary}」を削除しますか？`)) {
                        try {
                            await deleteEvent(ev.id);
                            notify("削除しました");
                            renderWeek(container);
                        } catch (err) {
                            notify("削除失敗: " + err.message, "error");
                        }
                    } else {
                        card.style.transform = 'translateX(0)';
                        wrapper.classList.remove('swiped-open');
                    }
                });

                // Edit
                card.addEventListener('click', () => {
                    if (wrapper.classList.contains('swiped-open')) return;
                    showView('add', ev);
                });
            }
        });

    } catch (e) {
        console.error(e);
        notify("週間予定の取得に失敗しました: " + e.message, "error");
    }
}

function notify(msg, type = 'info') {
    const el = document.getElementById('notification-center');
    const note = document.createElement('div');
    note.className = `notification ${type} `;
    note.innerText = msg;
    el.appendChild(note);
    if (type === 'success') playSuccess();
    if (type === 'error') playError();

    setTimeout(() => note.remove(), 3000);
}
