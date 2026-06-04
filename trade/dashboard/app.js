// ====== CHART.JS Setup (資産推移グラフ) ======
let equityChart = null;

function initEquityChart() {
    const ctx = document.getElementById('equityChart').getContext('2d');
    
    let gradient = ctx.createLinearGradient(0, 0, 0, 160);
    gradient.addColorStop(0, 'rgba(0, 240, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

    equityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], 
            datasets: [
                {
                    label: '🔵 総資産(円)',
                    data: [],
                    borderColor: '#00f0ff',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: '🟢 現物評価額(Spot)',
                    data: [],
                    borderColor: '#00ff88',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: '🔴 FX損益(Margin)',
                    data: [],
                    borderColor: '#ff3366',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.4,
                    yAxisID: 'y2'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: true, labels: { color: "#fff", font: { size: 10 } } }, 
                tooltip: { mode: 'index', intersect: false } 
            },
            scales: {
                x: { display: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888', maxTicksLimit: 6 } },
                y: { 
                    display: true, 
                    position: 'left',
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#aaa', callback: function(value) { return '¥' + Math.floor(value).toLocaleString(); } }
                },
                y2: { 
                    display: true, 
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#ff3366', callback: function(value) { return '¥' + Math.floor(value).toLocaleString(); } }
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });
}
let currentTotalAssets = 0;

function updateDashboard() {
    fetch('/api/status')
        .then(response => response.json())
        .then(data => {
            document.getElementById('engine-status').innerText = 'システム正常稼働中';
            document.getElementById('engine-pulse').className = 'pulse active';
            
            const now = new Date();
            document.getElementById('last-update').innerText = `最終更新: ${now.toLocaleTimeString()}`;

            // 🟢 Update Spot Assets
            const spotJpy = data.balance.jpy;
            const spotJpyDisplay = data.balance.jpy_display !== undefined ? data.balance.jpy_display : spotJpy;
            const btcVal = data.balance.btc_value;
            document.getElementById('spot-jpy').innerText = Math.floor(spotJpyDisplay).toLocaleString();
            document.getElementById('spot-btc').innerText = data.balance.btc.toFixed(4);
            document.getElementById('spot-btc-value').innerText = Math.floor(btcVal).toLocaleString();
            
            // 🔴 Update Margin & Positions
            document.getElementById('margin-available').innerText = Math.floor(data.margin.available_amount).toLocaleString();
            const ratio = data.margin.margin_ratio;
            document.getElementById('margin-ratio').innerText = ratio >= 9999 ? "---" : Math.floor(ratio).toLocaleString();
            document.getElementById('pos-short').innerText = data.positions.short_size.toFixed(4);
            
            const pnl = data.margin.unrealized_pnl;
            const pnlEl = document.getElementById('unrealized-pnl');
            if (pnl > 0) {
                pnlEl.innerText = `+¥ ${Math.floor(pnl).toLocaleString()}`;
                pnlEl.style.color = "var(--profit-green)";
            } else if (pnl < 0) {
                pnlEl.innerText = `-¥ ${Math.abs(Math.floor(pnl)).toLocaleString()}`;
                pnlEl.style.color = "var(--loss-red)";
            } else {
                pnlEl.innerText = `¥ 0`;
                pnlEl.style.color = "#ffffff";
            }
            
            // 👑 Update Total Assets Hero
            const totalAssets = Math.floor(spotJpy + btcVal + pnl);
            currentTotalAssets = totalAssets;
            document.getElementById('total-assets').innerText = totalAssets.toLocaleString();
            
            document.getElementById('btc-price').innerText = Math.floor(data.market.btc_price).toLocaleString();
            
            // 24h Range Bar 更新
            if (data.market.high && data.market.low) {
                const high = data.market.high;
                const low = data.market.low;
                const current = data.market.btc_price;
                
                document.getElementById('btc-high').innerText = Math.floor(high).toLocaleString();
                document.getElementById('btc-low').innerText = Math.floor(low).toLocaleString();
                
                let range = high - low;
                if (range === 0) range = 1; // ゼロ除算防止
                let percent = ((current - low) / range) * 100;
                percent = Math.max(0, Math.min(100, percent));
                
                document.getElementById('price-marker').style.left = percent + '%';
                document.getElementById('price-range-fill').style.width = percent + '%';
                
                const posStr = (percent >= 80) ? "高値圏 (バブル警戒)" : (percent <= 20) ? "安値圏 (底値買い場)" : "中間圏";
                document.getElementById('price-position-percent').innerText = `${percent.toFixed(1)}% （${posStr}）`;
            }

            const rsi = data.indicators.rsi;
            let rsiText = '';
            if (rsi < 45) { rsiText = '（🟢買いの準備）'; }
            else if (rsi > 70) { rsiText = '（🔴売り警戒）'; }
            else if (rsi > 55) { rsiText = '（⚠️やや警戒）'; }
            else { rsiText = '（様子見）'; }
            document.getElementById('rsi-val').innerHTML = `${rsi.toFixed(1)} <span style="font-size:0.85em; font-weight:400; color:#ffdd57;">${rsiText}</span>`;
            document.getElementById('rsi-bar').style.width = rsi + '%';
            
            const macdHist = data.indicators.macd_hist;
            let macdText = '';
            if (macdHist > 500) { macdText = '（🟢強い上昇）'; }
            else if (macdHist > 0) { macdText = '（🟢買シグナル）'; }
            else if (macdHist < -500) { macdText = '（🔴強い下落）'; }
            else { macdText = '（🔴下落トレンド）'; }
            document.getElementById('macd-val').innerHTML = `${(macdHist > 0 ? '+' : '') + macdHist.toFixed(0)} <span style="font-size:0.85em; font-weight:400; color:#ffdd57;">${macdText}</span>`;
            let macdPercent = 50 + (macdHist / 2000) * 50; 
            macdPercent = Math.max(0, Math.min(100, macdPercent));
            document.getElementById('macd-bar').style.width = macdPercent + '%';
            
            const macroTrend = data.indicators.macro_trend;
            const macroBadge = document.getElementById('macro-trend-badge');
            if (macroBadge) {
                if (macroTrend === "UP") {
                    macroBadge.innerText = "📈 完全な上昇 (空売り停止)";
                    macroBadge.style.background = "rgba(0,255,170,0.2)";
                    macroBadge.style.color = "#00ffaa";
                } else if (macroTrend === "DOWN") {
                    macroBadge.innerText = "📉 完全な下落 (現物買い停止)";
                    macroBadge.style.background = "rgba(255,51,102,0.2)";
                    macroBadge.style.color = "#ff3366";
                } else {
                    macroBadge.innerText = "⚖️ レンジ相場 (フル稼働)";
                    macroBadge.style.background = "rgba(255,255,255,0.1)";
                    macroBadge.style.color = "#ffffff";
                }
            }

            const fng = data.indicators.fng || 50;
            let fngText = '';
            if (fng < 40) { fngText = '（🟢買いチャンス）'; }
            else if (fng > 75) { fngText = '（🔴暴落警戒！）'; }
            else if (fng > 60) { fngText = '（⚠️高値づかみ注意）'; }
            else { fngText = '（平常時）'; }
            document.getElementById('fng-val').innerHTML = `${fng} <span style="font-size:0.85em; font-weight:400; color:#ffdd57;">${fngText}</span>`;
            document.getElementById('fng-bar').style.width = fng + '%';

            const logContainer = document.getElementById('log-container');
            if (data.logs && data.logs.length > 0) {
                logContainer.innerHTML = '';
                data.logs.forEach(log => {
                    const div = document.createElement('div');
                    let logType = 'system';
                    if (log.includes('BUY') || log.includes('買い') || log.includes('🟢')) logType = 'buy';
                    if (log.includes('SELL') || log.includes('売り') || log.includes('🔴') || log.includes('ERROR') || log.includes('エラー')) logType = 'sell';
                    
                    div.className = `log-entry ${logType}`;
                    div.innerText = log;
                    logContainer.appendChild(div);
                });
                logContainer.scrollTop = logContainer.scrollHeight;
            }


        })
        .catch(error => {
            document.getElementById('engine-status').innerText = '通信エラー（再接続中...）';
            document.getElementById('engine-pulse').className = 'pulse';
        });
}

updateDashboard();
setInterval(updateDashboard, 5000);

// ==========================================
// 履歴データの取得とリサンプリング描画
// ==========================================
let fullHistoryData = [];
let currentHistoryTimeframe = '15m';

function fetchHistory() {
    fetch('/api/history')
        .then(res => res.json())
        .then(data => {
            fullHistoryData = data;
            renderHistoryChart();
        })
        .catch(err => console.log('History data fetch error', err));
}

function renderHistoryChart() {
    if (!fullHistoryData || fullHistoryData.length === 0) return;
    if (!equityChart) initEquityChart();
    
    let resampled = [];
    if (currentHistoryTimeframe === '15m') {
        resampled = fullHistoryData.slice(-96); // 直近24時間
    } else {
        let grouped = {};
        fullHistoryData.forEach(item => {
            let timeStr = item.time;
            if (timeStr.length <= 5) {
                const today = new Date();
                timeStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')} ${timeStr}`;
            }
            
            let key = "";
            let displayTime = "";
            
            if (currentHistoryTimeframe === '1h') {
                key = timeStr.substring(0, 13); // YYYY-MM-DD HH
                displayTime = key + ":00";
            } else if (currentHistoryTimeframe === '4h') {
                // timeStr format: YYYY-MM-DD HH:MM
                const hour = parseInt(timeStr.substring(11, 13));
                const block = Math.floor(hour / 4) * 4;
                key = timeStr.substring(0, 10) + " " + String(block).padStart(2,'0'); 
                displayTime = key + ":00";
            } else if (currentHistoryTimeframe === '1d') {
                key = timeStr.substring(0, 10); // YYYY-MM-DD
                displayTime = key;
            } else if (currentHistoryTimeframe === '1mo') {
                key = timeStr.substring(0, 7); // YYYY-MM
                displayTime = key;
            }
            
            // 上書きしていくことで、その時間枠の最後のデータ（終値）が残る
            grouped[key] = {
                time: displayTime,
                total: item.total || item.value || 0,
                spot: typeof item.spot !== 'undefined' ? item.spot : (item.value || 0),
                fx: item.fx || 0
            };
        });
        
        resampled = Object.values(grouped);
        // 上限100件程度で描画を軽くする
        if (currentHistoryTimeframe !== '1d' && currentHistoryTimeframe !== '1mo') resampled = resampled.slice(-96);
    }
    
    const labels = resampled.map(h => {
        if (currentHistoryTimeframe === '1mo') return h.time; // YYYY-MM
        if (currentHistoryTimeframe === '1d') return h.time.substring(5); // MM-DD
        return h.time.substring(11); // HH:MM
    });
    const valuesTotal = resampled.map(h => h.total);
    const valuesSpot = resampled.map(h => h.spot);
    const valuesFx = resampled.map(h => h.fx);

    equityChart.data.labels = labels;
    equityChart.data.datasets[0].data = valuesTotal;
    equityChart.data.datasets[1].data = valuesSpot;
    equityChart.data.datasets[2].data = valuesFx;
    
    const minVal = Math.min(...valuesTotal, ...valuesSpot);
    const maxVal = Math.max(...valuesTotal, ...valuesSpot);
    equityChart.options.scales.y.min = minVal - (minVal * 0.005);
    equityChart.options.scales.y.max = maxVal + (maxVal * 0.005);
    
    const minFx = Math.min(...valuesFx);
    const maxFx = Math.max(...valuesFx);
    const absMax = Math.max(Math.abs(minFx), Math.abs(maxFx), 1000); 
    equityChart.options.scales.y2.min = -absMax;
    equityChart.options.scales.y2.max = absMax;
    
    equityChart.update('none'); 
}

// 履歴フェッチループ（1分ごと）
fetchHistory();
setInterval(fetchHistory, 60000);

// トグルボタンのイベント
document.querySelectorAll('.btn-timeframe').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-timeframe').forEach(b => {
            b.classList.remove('active');
            b.style.background = 'rgba(255,255,255,0.05)';
            b.style.borderColor = 'rgba(255,255,255,0.1)';
        });
        
        btn.classList.add('active');
        btn.style.background = 'rgba(0,240,255,0.2)';
        btn.style.borderColor = 'var(--accent-color)';
        
        currentHistoryTimeframe = btn.dataset.tf;
        renderHistoryChart();
    });
});

// ==========================================
// タブ切り替えロジック (スマホ & PC兼用)
// ==========================================
function applyTabVisibility() {
    const isMobile = window.innerWidth <= 768;
    const activeTabObj = document.querySelector('.tab-btn.active');
    const activeTab = activeTabObj ? activeTabObj.dataset.target : 'home';
    
    // PC用のメニュー制御
    if (!isMobile) {
        document.querySelector('.pc-tabs').style.display = 'flex';
        if (activeTab === 'settings') {
            document.querySelector('[data-target="settings"].glass').style.display = 'none';
            document.getElementById('btn-close-setting').style.display = 'block';
        } else {
            document.querySelector('[data-target="settings"].glass').style.display = 'block';
            document.getElementById('btn-close-setting').style.display = 'none';
        }
    } else {
        document.querySelector('.pc-tabs').style.display = 'none';
    }

    document.querySelectorAll('.tab-section').forEach(sec => {
        if (!isMobile) {
            // デスクトップ：初期のCSSグリッドを維持するが、「設定」を開いたときは設定だけ表示
            if (activeTab === 'settings') {
                sec.style.display = (sec.dataset.tab === 'settings') ? 'block' : 'none';
            } else {
                sec.style.display = (sec.dataset.tab === 'settings') ? 'none' : '';
            }
        } else {
            // スマホ：完全に1画面ずつ切り替え
            sec.style.display = (sec.dataset.tab === activeTab) ? 'block' : 'none';
        }
    });

    // 画面リサイズでチャート崩れを防ぐ
    if (activeTab === 'chart') {
        window.dispatchEvent(new Event('resize'));
    }
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyTabVisibility();
    });
});

window.addEventListener('resize', applyTabVisibility);
applyTabVisibility();


// ==========================================
// パラメーター設定・保存（プリセット）ロジック
// ==========================================
let currentSettings = {};

function initSettings() {
    fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
            currentSettings = data;
            document.getElementById('input-limit').value = data.trade_amount_limit;
            if(document.getElementById('input-margin-limit')) {
                document.getElementById('input-margin-limit').value = data.margin_trade_amount_limit || 200000;
                updateVal('margin-limit', data.margin_trade_amount_limit || 200000);
            }
            if(document.getElementById('input-reserved-margin')) {
                document.getElementById('input-reserved-margin').value = data.reserved_margin_jpy !== undefined ? data.reserved_margin_jpy : 500000;
                updateVal('reserved-margin', data.reserved_margin_jpy !== undefined ? data.reserved_margin_jpy : 500000);
            }
            document.getElementById('input-entry').value = data.entry_size_percent;
            document.getElementById('input-full').value = data.full_position_percent;
            document.getElementById('input-rsi-buy').value = data.rsi_buy_threshold;
            document.getElementById('input-rsi-sell').value = data.rsi_sell_threshold;
            document.getElementById('input-fng').value = data.fng_stopper;
            document.getElementById('input-loss-cut').value = data.loss_cut_percent || 5;
            document.getElementById('input-margin-rsi-short').value = data.margin_rsi_short || 60;
            document.getElementById('input-cooldown').value = data.cooldown_minutes || 60;
            document.getElementById('input-fx-cooldown').value = data.fx_cooldown_minutes || 15;
            document.getElementById('input-price-drop').value = data.price_drop_percent || 1.5;
            document.getElementById('input-fx-price-drop').value = data.fx_price_drop_percent || 0.5;
            document.getElementById('input-trailing-stop').value = data.trailing_stop_percent || 1.0;
            document.getElementById('input-panic-buy-rsi').value = data.panic_buy_rsi || 20;
            
            updateVal('limit', data.trade_amount_limit);
            updateVal('entry', data.entry_size_percent);
            updateVal('full', data.full_position_percent);
            updateVal('rsi-buy', data.rsi_buy_threshold);
            updateVal('rsi-sell', data.rsi_sell_threshold);
            updateVal('fng', data.fng_stopper);
            updateVal('loss-cut', data.loss_cut_percent || 5);
            updateVal('margin-rsi-short', data.margin_rsi_short || 60);
            updateVal('cooldown', data.cooldown_minutes || 60);
            updateVal('fx-cooldown', data.fx_cooldown_minutes || 15);
            updateVal('price-drop', data.price_drop_percent || 1.5);
            updateVal('fx-price-drop', data.fx_price_drop_percent || 0.5);
            updateVal('panic-buy-rsi', data.panic_buy_rsi || 20);
            
            // AUTOモードの初期化
            currentAutoBudgetMode = data.auto_budget_mode || 'manual';
            updateAutoBudgetUI();
            
            // 初回読み込み時にモードを判定表示する
            setTimeout(analyzeCurrentMode, 100);
        });
}

let currentAutoBudgetMode = 'manual';

function setAutoBudget(isAuto) {
    if (isAuto) {
        // プリセットボタンを押さずにAUTOをオンにした場合は、とりあえずNormalモードとして扱う
        if (currentAutoBudgetMode === 'manual') currentAutoBudgetMode = 'normal';
    } else {
        currentAutoBudgetMode = 'manual';
    }
    updateAutoBudgetUI();
    saveSettings(); // AUTO/MANUAL切替を即時保存
}

function updateAutoBudgetUI() {
    const btnAuto = document.getElementById('btn-auto-budget');
    const btnManual = document.getElementById('btn-manual-budget');
    
    if (currentAutoBudgetMode !== 'manual') {
        btnAuto.style.background = 'rgba(0,240,255,0.2)';
        btnAuto.style.borderColor = '#00f0ff';
        btnAuto.style.color = '#00f0ff';
        
        btnManual.style.background = 'rgba(255,255,255,0.05)';
        btnManual.style.borderColor = 'rgba(255,255,255,0.2)';
        btnManual.style.color = '#aaa';
    } else {
        btnAuto.style.background = 'rgba(255,255,255,0.05)';
        btnAuto.style.borderColor = 'rgba(255,255,255,0.2)';
        btnAuto.style.color = '#aaa';
        
        btnManual.style.background = 'rgba(255,51,102,0.2)';
        btnManual.style.borderColor = '#ff3366';
        btnManual.style.color = '#ff3366';
    }
}

// 予算スライダーが手動で動かされたらMANUALモードに切り替える
document.getElementById('input-limit').addEventListener('input', () => { if(currentAutoBudgetMode !== 'manual') setAutoBudget(false); });
document.getElementById('input-margin-limit').addEventListener('input', () => { if(currentAutoBudgetMode !== 'manual') setAutoBudget(false); });
document.getElementById('input-reserved-margin').addEventListener('input', () => { if(currentAutoBudgetMode !== 'manual') setAutoBudget(false); });


function updateVal(id, value) {
    let displayValue = value;
    if (id === 'limit' || id === 'reserved-margin' || id === 'margin-limit') displayValue = Number(value).toLocaleString();
    document.getElementById(`val-${id}`).innerText = displayValue;
    
    // スライダーが動くたびにリアルタイムでAIの思考モードを判定する
    analyzeCurrentMode();
}

function analyzeCurrentMode() {
    const entry = parseInt(document.getElementById('input-entry').value) || 20;
    const rbuy = parseInt(document.getElementById('input-rsi-buy').value) || 45;
    const fng = parseInt(document.getElementById('input-fng').value) || 75;
    
    let riskScore = 0;
    // 買いの予算割合によるリスク判定
    if (entry <= 15) riskScore += 1;
    else if (entry <= 25) riskScore += 2;
    else riskScore += 3;
    
    // RSI買い基準によるリスク判定（数値が高いほどすぐ買う＝高頻度ハイリスク）
    if (rbuy <= 40) riskScore += 1;
    else if (rbuy <= 49) riskScore += 2;
    else riskScore += 3;
    
    // F&Gストッパーによるリスク判定（数値が高いほどバブル相場でも買う＝ハイリスク）
    if (fng <= 69) riskScore += 1;
    else if (fng <= 84) riskScore += 2;
    else riskScore += 3;
    
    const settingBadge = document.getElementById('current-mode-badge');
    const headerBadge = document.getElementById('header-mode-badge');
    
    let text = "⚖️ 標準 (ミドルリスク)";
    let color = "#ffdd57";
    let bg = "rgba(255, 221, 87, 0.1)";
    
    // 合計スコアで現在のシステムモードをリアルタイム判定算出 (Min:3, Max:9)
    if (riskScore <= 4) {
        text = "🛡️ 安全重視 (ローリスク)";
        color = "#00f0ff";
        bg = "rgba(0, 240, 255, 0.1)";
    } else if (riskScore >= 7) {
        text = "🔥 攻めの運用 (ハイリスク)";
        color = "#ff3366";
        bg = "rgba(255, 51, 102, 0.1)";
    }
    
    if (settingBadge) {
        settingBadge.innerText = text;
        settingBadge.style.color = color;
        settingBadge.style.background = bg;
        settingBadge.style.border = `1px solid ${color}`;
    }
    
    if (headerBadge) {
        headerBadge.innerText = text;
        headerBadge.style.color = color;
        headerBadge.style.background = bg;
        headerBadge.style.border = `1px solid ${color}`;
    }
}

// サーバーで自動更新された予算設定をUIに同期する
function syncSettingsFromBackend() {
    if (currentAutoBudgetMode !== 'manual') {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if(data.auto_budget_mode !== 'manual') {
                    document.getElementById('input-limit').max = Math.max(500000, data.trade_amount_limit * 2);
                    document.getElementById('input-margin-limit').max = Math.max(1000000, data.margin_trade_amount_limit * 2);
                    
                    document.getElementById('input-limit').value = data.trade_amount_limit;
                    document.getElementById('input-margin-limit').value = data.margin_trade_amount_limit;
                    document.getElementById('input-reserved-margin').value = data.reserved_margin_jpy;
                    
                    updateVal('limit', data.trade_amount_limit);
                    updateVal('margin-limit', data.margin_trade_amount_limit);
                    updateVal('reserved-margin', data.reserved_margin_jpy);
                }
            });
    }
}
// 10秒ごとにサーバーの設定を同期
setInterval(syncSettingsFromBackend, 10000);

function applyPreset(type) {
    const behavior = {
        'safe': { entry: 10, full: 70, rbuy: 35, rsell: 65, fng: 60, loss: 4, mar_rsi: 70, cool: 180, pdrop: 3.0, fxcool: 60, fxpdrop: 1.5, tstop: 2.0, prsi: 15 },
        'normal': { entry: 20, full: 85, rbuy: 45, rsell: 70, fng: 75, loss: 5, mar_rsi: 65, cool: 60, pdrop: 1.5, fxcool: 30, fxpdrop: 1.0, tstop: 1.5, prsi: 20 },
        'aggressive': { entry: 30, full: 100, rbuy: 55, rsell: 85, fng: 85, loss: 7, mar_rsi: 60, cool: 30, pdrop: 1.0, fxcool: 15, fxpdrop: 0.5, tstop: 1.0, prsi: 25 }
    };
    
    // 現在の総資産を取得（不明な場合は安全に100万円とする）
    const total = (currentTotalAssets && currentTotalAssets > 0) ? currentTotalAssets : 1000000;
    const minMarginLimit = 150000; // GMO FX 最小注文目安
    
    let p_limit = 400000, p_mlimit = 200000, p_reserved = 500000;
    
    if (type === 'safe') {
        p_limit = total * 0.40;
        p_mlimit = Math.max(minMarginLimit, total * 0.15); 
        p_reserved = total * 0.45;
    } else if (type === 'normal') {
        p_limit = total * 0.60;
        p_mlimit = Math.max(minMarginLimit, total * 0.25);
        p_reserved = total * 0.15;
    } else if (type === 'aggressive') {
        p_limit = total * 0.85;
        p_mlimit = Math.max(minMarginLimit, total * 0.40);
        p_reserved = 0;
    }
    
    // 1万円単位で切り捨て
    p_limit = Math.floor(p_limit / 10000) * 10000;
    p_mlimit = Math.floor(p_mlimit / 10000) * 10000;
    p_reserved = Math.floor(p_reserved / 10000) * 10000;
    
    // 下限ガード
    p_limit = Math.max(10000, p_limit);
    
    // スライダーの最大値を、計算された金額に応じて動的に拡張（上限に張り付くのを防ぐ）
    const limitMax = Math.max(500000, p_limit * 2);
    const mlimitMax = Math.max(1000000, p_mlimit * 2);
    const reservedMax = Math.max(2000000, total);
    
    document.getElementById('input-limit').max = limitMax;
    document.getElementById('input-margin-limit').max = mlimitMax;
    document.getElementById('input-reserved-margin').max = reservedMax;

    // 金額をフォームにセット
    document.getElementById('input-limit').value = p_limit;
    document.getElementById('input-margin-limit').value = p_mlimit;
    document.getElementById('input-reserved-margin').value = p_reserved;
    
    // AI行動パラメーターのセット
    let p = behavior[type];
    document.getElementById('input-entry').value = p.entry;
    document.getElementById('input-full').value = p.full;
    document.getElementById('input-rsi-buy').value = p.rbuy;
    document.getElementById('input-rsi-sell').value = p.rsell;
    document.getElementById('input-fng').value = p.fng;
    document.getElementById('input-loss-cut').value = p.loss;
    document.getElementById('input-margin-rsi-short').value = p.mar_rsi;
    document.getElementById('input-cooldown').value = p.cool;
    document.getElementById('input-fx-cooldown').value = p.fxcool;
    document.getElementById('input-price-drop').value = p.pdrop;
    document.getElementById('input-fx-price-drop').value = p.fxpdrop;
    document.getElementById('input-trailing-stop').value = p.tstop;
    document.getElementById('input-panic-buy-rsi').value = p.prsi;
    
    // 画面表示（テキスト）の更新
    updateVal('limit', p_limit);
    updateVal('margin-limit', p_mlimit);
    updateVal('reserved-margin', p_reserved);
    updateVal('entry', p.entry);
    updateVal('full', p.full);
    updateVal('rsi-buy', p.rbuy);
    updateVal('rsi-sell', p.rsell);
    updateVal('fng', p.fng);
    updateVal('loss-cut', p.loss);
    updateVal('margin-rsi-short', p.mar_rsi);
    updateVal('cooldown', p.cool);
    updateVal('fx-cooldown', p.fxcool);
    updateVal('price-drop', p.pdrop);
    updateVal('fx-price-drop', p.fxpdrop);
    updateVal('trailing-stop', p.tstop);
    updateVal('panic-buy-rsi', p.prsi);
    
    // プリセット適用時は自動的にAUTOモードにする
    currentAutoBudgetMode = type;
    updateAutoBudgetUI();
    
    const toast = document.getElementById('save-toast');
    toast.innerText = "💡 現在の資産額に合わせて予算と設定がセットされました！下にスクロールして「保存」を押して適用してください";
    toast.style.color = '#ffdd57';
    toast.style.background = 'rgba(255, 221, 87, 0.1)';
    toast.style.display = 'block';
}

function saveSettings() {
    const payload = {
        "trade_amount_limit": parseInt(document.getElementById('input-limit').value),
        "margin_trade_amount_limit": parseInt(document.getElementById('input-margin-limit').value),
        "entry_size_percent": parseInt(document.getElementById('input-entry').value),
        "full_position_percent": parseInt(document.getElementById('input-full').value),
        "rsi_buy_threshold": parseInt(document.getElementById('input-rsi-buy').value),
        "rsi_sell_threshold": parseInt(document.getElementById('input-rsi-sell').value),
        "fng_stopper": parseInt(document.getElementById('input-fng').value),
        "loss_cut_percent": parseInt(document.getElementById('input-loss-cut').value),
        "margin_rsi_short": parseInt(document.getElementById('input-margin-rsi-short').value),
        "reserved_margin_jpy": parseInt(document.getElementById('input-reserved-margin').value),
        "cooldown_minutes": parseInt(document.getElementById('input-cooldown').value),
        "fx_cooldown_minutes": parseInt(document.getElementById('input-fx-cooldown').value),
        "price_drop_percent": parseFloat(document.getElementById('input-price-drop').value),
        "fx_price_drop_percent": parseFloat(document.getElementById('input-fx-price-drop').value),
        "trailing_stop_percent": parseFloat(document.getElementById('input-trailing-stop').value),
        "panic_buy_rsi": parseInt(document.getElementById('input-panic-buy-rsi').value),
        "auto_budget_mode": currentAutoBudgetMode
    };
    
    fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        const toast = document.getElementById('save-toast');
        toast.innerText = "✅ 保存完了！AIのロジックが即座に切り替わりました";
        toast.style.color = '#00ff88';
        toast.style.background = 'rgba(0, 255, 136, 0.1)';
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 5000);
    });
}

setTimeout(initSettings, 1000);

// ==========================================
// 用語解説機能 (Glossary Modal)
// ==========================================
const glossaryData = {
    'spot': {
        title: '🟢 現物買い部隊 (Spot)',
        main: '実際にビットコイン(BTC)そのものを買ったり売ったりする仕組みです。手持ちの現金（日本円）の範囲内でしか買えないため、借金（追加の証拠金）を抱えるリスクがなく安全です。',
        analogy: '【例え】スーパーでリンゴを現金で買うのと同じです。リンゴの値段が下がっても、買ったリンゴ自体が無くなるわけではありません。'
    },
    'margin': {
        title: '🔴 FX空売り部隊 (Margin)',
        main: '手元にビットコインが無くても、取引所から「借りて売る」ことで、相場が下がった時に利益を出せる仕組み（レバレッジ取引）です。現物買いの損失をカバーする強力な武器になります。',
        analogy: '【例え】ゲームのアイテムを友達から借りて高く売り、後で安くなった時に買い戻して友達に返すことで、差額を儲けるイメージです。'
    },
    'rsi': {
        title: '📈 RSI (相対力指数)',
        main: '今の相場が「買われすぎ（過熱）」か「売られすぎ（冷え込み）」かを 0〜100 の数値で表したメーターです。一般的に30以下は底値（買い時）、70以上は天井（売り時）とされます。',
        analogy: '【例え】車のスピードメーターのようなものです。高すぎるとオーバーヒート（買われすぎ）で下がりやすく、低すぎるとエンスト寸前（売られすぎ）で反発しやすくなります。'
    },
    'macd': {
        title: '📊 MACD (マックディー)',
        main: '相場の「トレンド（流行の方向）」と「勢い」を同時に判断する指標です。このメーターが0より上で上向きなら強い上昇トレンド、0より下なら下落トレンドを示します。',
        analogy: '【例え】川の流れの強さと向きを測るセンサーです。プラスなら上流への強い波、マイナスなら下流への激しい滝のような状態です。'
    },
    'fng': {
        title: '😨 恐怖と強欲指数 (F&G)',
        main: '市場に参加している投資家たちの「心理状態（感情）」を数値化したものです。0に近いほどパニック（恐怖）、100に近いほどお祭り騒ぎ（強欲バブル）を表します。',
        analogy: '【例え】バーゲンセールの熱狂度合いです。みんなが「もっと儲かる！」と熱狂している時（強欲）は暴落の直前であることが多く、AIはそれを察知して警戒します。'
    },
    'trailing': {
        title: '🎣 トレイリングストップ',
        main: '利益が乗っている時に、相場の値上がりに追従して「利確ライン」を自動で上に引き上げていく機能です。早すぎる利確を防ぎ、利益を最大限に伸ばします。',
        analogy: '【例え】魚釣りの網を巻き上げるようなイメージです。魚（利益）が逃げないように、底を網で塞ぎながらどんどん高く持ち上げていきます。'
    },
    'panic_buy': {
        title: '⚡ セリクラ逆張り (大底拾い)',
        main: 'セリング・クライマックス（大暴落パニック）の瞬間を狙って、あえて危険を承知で全力で買いに向かう特攻機能です。通常は危険ですが、AIが極端な数値を検知した時のみ発動します。',
        analogy: '【例え】みんながパニックになってブランド品を投げ売りしている会場に突入し、超破格の値段で根こそぎ買い集めるような戦略です。'
    },
    'nanpin': {
        title: '🔄 ナンピン (連続エントリー)',
        main: '一度買った後にさらに価格が下がってしまった場合、安い価格で追加購入することで「平均購入単価」を下げるテクニックです。',
        analogy: '【例え】1個100円のチョコを買い、翌日50円に値下がりした時に追加でもう1個買うと、1個あたりの平均価格が75円に下がり、少しの回復で利益が出やすくなるのと同じです。'
    },
    'margin_ratio': {
        title: '🛡️ 維持率 / 建玉 (ポジション)',
        main: '建玉（たてぎょく）は現在持っているポジションの量です。維持率は、取引所の口座に預けている資金（証拠金）に対して、どれくらい安全な状態かを示すパーセンテージです。100%を下回ると強制決済（ロスカット）の危険があります。',
        analogy: '【例え】建玉は「レンタル中のDVDの数」で、維持率は「レンタルショップに預けている保証金にどれだけ余裕があるか」を示すメーターです。'
    }
};

function showGlossary(termKey) {
    const data = glossaryData[termKey];
    if (!data) return;
    
    document.getElementById('glossary-title').innerText = data.title;
    document.getElementById('glossary-main').innerText = data.main;
    document.getElementById('glossary-analogy').innerText = data.analogy;
    
    const overlay = document.getElementById('glossary-modal');
    overlay.style.display = 'flex';
    // slightly delay adding the 'show' class to trigger CSS transition
    setTimeout(() => { overlay.classList.add('show'); }, 10);
}

function closeGlossary() {
    const overlay = document.getElementById('glossary-modal');
    overlay.classList.remove('show');
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
}

// Ensure clicking outside the modal content closes it
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('glossary-modal');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeGlossary();
        });
    }
});
