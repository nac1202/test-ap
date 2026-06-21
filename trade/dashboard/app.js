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
let hasUnsavedChanges = false;

function markUnsavedChanges() {
    hasUnsavedChanges = true;
    const warningEl = document.getElementById('unsaved-warning');
    if (warningEl) {
        warningEl.style.display = 'block';
    }
}

function updateDashboard() {
    fetch('/api/status')
        .then(response => response.json())
        .then(data => {
            document.getElementById('engine-status').innerText = 'システム正常稼働中';
            document.getElementById('engine-pulse').className = 'pulse active';
            
            const now = new Date();
            document.getElementById('last-update').innerText = `最終更新: ${now.toLocaleTimeString()}`;

            // 🧪 DRY RUN Badge
            const dryRunBadge = document.getElementById('status-dry-run');
            if (dryRunBadge && data.settings) {
                const isDryRun = data.settings.dry_run;
                const isLive = data.settings.live_trading_enabled;
                if (isDryRun || !isLive) {
                    dryRunBadge.style.display = 'block';
                    dryRunBadge.innerText = '🧪 DRY RUN中：実注文なし';
                    dryRunBadge.style.color = '#00ff88';
                    dryRunBadge.style.background = 'rgba(0,255,136,0.15)';
                    dryRunBadge.style.borderColor = 'rgba(0,255,136,0.5)';
                    dryRunBadge.style.boxShadow = '0 0 10px rgba(0,255,136,0.3)';
                } else {
                    dryRunBadge.style.display = 'block';
                    dryRunBadge.innerText = '⚠️ 本番売買ON：実注文あり';
                    dryRunBadge.style.color = '#ff3366';
                    dryRunBadge.style.background = 'rgba(255,51,102,0.15)';
                    dryRunBadge.style.borderColor = 'rgba(255,51,102,0.5)';
                    dryRunBadge.style.boxShadow = '0 0 10px rgba(255,51,102,0.5)';
                }
            }
            
            // 📋 Audit Stats
            if (data.audit_stats) {
                if(document.getElementById('stat-dry-count')) document.getElementById('stat-dry-count').innerText = `${data.audit_stats.today_dry_run_count} 回`;
                if(document.getElementById('stat-dry-time')) document.getElementById('stat-dry-time').innerText = data.audit_stats.last_dry_run_block;
                
                if(document.getElementById('stat-safety-count')) document.getElementById('stat-safety-count').innerText = `${data.audit_stats.today_safety_block_count} 回`;
                if(document.getElementById('stat-safety-time')) document.getElementById('stat-safety-time').innerText = data.audit_stats.last_safety_block;
                
                if(document.getElementById('stat-real-count')) document.getElementById('stat-real-count').innerText = `${data.audit_stats.today_possible_live_order_count} 回`;
            }

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
            
            const currentPrice = Math.floor(data.market.btc_price);
            if (currentPrice <= 0) {
                document.getElementById('btc-price').innerText = "API取得待機中...";
                document.getElementById('btc-price').style.fontSize = "0.5em";
            } else {
                document.getElementById('btc-price').innerText = currentPrice.toLocaleString();
                document.getElementById('btc-price').style.fontSize = "";
            }
            
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

            const autoShiftBadge = document.getElementById('auto-shift-badge');
            if (autoShiftBadge && data.indicators) {
                const shiftLevel = data.indicators.shift_level || 0;
                const shiftStatus = data.indicators.auto_shift_status || "NONE";
                
                if (shiftLevel > 0) {
                    autoShiftBadge.style.display = 'block';
                    autoShiftBadge.innerText = `🚀 AUTO GEAR: ギア${shiftLevel} (${shiftStatus === "UP" ? "現物買い攻勢" : "FX空売り攻勢"})`;
                    
                    if (shiftLevel === 3) {
                        autoShiftBadge.style.background = 'rgba(255,51,102,0.15)';
                        autoShiftBadge.style.borderColor = 'rgba(255,51,102,0.5)';
                        autoShiftBadge.style.color = '#ff3366';
                        autoShiftBadge.style.boxShadow = '0 0 15px rgba(255,51,102,0.5)';
                    } else if (shiftLevel === 2) {
                        autoShiftBadge.style.background = 'rgba(255,170,0,0.15)';
                        autoShiftBadge.style.borderColor = 'rgba(255,170,0,0.5)';
                        autoShiftBadge.style.color = '#ffaa00';
                        autoShiftBadge.style.boxShadow = '0 0 10px rgba(255,170,0,0.4)';
                    } else {
                        autoShiftBadge.style.background = 'rgba(255,221,87,0.1)';
                        autoShiftBadge.style.borderColor = 'rgba(255,221,87,0.4)';
                        autoShiftBadge.style.color = '#ffdd57';
                        autoShiftBadge.style.boxShadow = '0 0 5px rgba(255,221,87,0.2)';
                    }
                } else {
                    autoShiftBadge.style.display = 'none';
                }
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

function resetEquityHistory() {
    if (confirm("過去の評価額グラフ履歴をリセットします。\n現在の履歴はバックアップされます。\n実行してよろしいですか？")) {
        fetch('/api/reset_equity_history', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert("履歴のリセットが完了しました。グラフを再描画します。");
                    fetchHistory();
                } else {
                    alert("リセットに失敗しました: " + (data.message || ""));
                }
            })
            .catch(err => {
                console.error("リセット処理中にエラー:", err);
                alert("サーバーとの通信に失敗しました。");
            });
    }
}

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
        
        // 設定タブを開いた時、保存されていない変更を破棄して自動的に最新状態にリロードする
        if (btn.dataset.target === 'settings') {
            if (typeof forceReloadSettings === 'function') {
                forceReloadSettings(true); 
            }
        }
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
                updateVal('margin-limit', data.margin_trade_amount_limit || 200000, false);
            }
            if(document.getElementById('input-reserved-margin')) {
                document.getElementById('input-reserved-margin').value = data.reserved_margin_jpy !== undefined ? data.reserved_margin_jpy : 500000;
                updateVal('reserved-margin', data.reserved_margin_jpy !== undefined ? data.reserved_margin_jpy : 500000, false);
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
            
            updateVal('limit', data.trade_amount_limit, false);
            updateVal('entry', data.entry_size_percent, false);
            updateVal('full', data.full_position_percent, false);
            updateVal('rsi-buy', data.rsi_buy_threshold, false);
            updateVal('rsi-sell', data.rsi_sell_threshold, false);
            updateVal('fng', data.fng_stopper, false);
            updateVal('loss-cut', data.loss_cut_percent || 5, false);
            updateVal('margin-rsi-short', data.margin_rsi_short || 60, false);
            updateVal('cooldown', data.cooldown_minutes || 60, false);
            updateVal('fx-cooldown', data.fx_cooldown_minutes || 15, false);
            updateVal('price-drop', data.price_drop_percent || 1.5, false);
            updateVal('fx-price-drop', data.fx_price_drop_percent || 0.5, false);
            updateVal('panic-buy-rsi', data.panic_buy_rsi || 20, false);
            
            // AUTOモードの初期化
            currentAutoBudgetMode = data.auto_budget_mode || 'manual';
            updateAutoBudgetUI();
            
            // オートシフトの初期化
            currentAutoShiftEnabled = data.auto_shift_enabled || false;
            updateAutoShiftUI();

            currentFxShortEnabled = data.fx_short_enabled !== undefined ? data.fx_short_enabled : true;
            updateFxShortUI();
            
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
    markUnsavedChanges();
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
    
    const badgeAutoBudget = document.getElementById('status-auto-budget');
    if (badgeAutoBudget) {
        if (currentAutoBudgetMode !== 'manual') {
            badgeAutoBudget.innerText = '🔄 予算追従: ON';
            badgeAutoBudget.style.color = '#00f0ff';
            badgeAutoBudget.style.borderColor = '#00f0ff';
            badgeAutoBudget.style.background = 'rgba(0,240,255,0.1)';
        } else {
            badgeAutoBudget.innerText = '🔄 予算追従: OFF';
            badgeAutoBudget.style.color = '#aaa';
            badgeAutoBudget.style.borderColor = 'rgba(255,255,255,0.2)';
            badgeAutoBudget.style.background = 'rgba(0,0,0,0.5)';
        }
    }
}

let currentAutoShiftEnabled = false;

function setAutoShift(isOn) {
    currentAutoShiftEnabled = isOn;
    updateAutoShiftUI();
    markUnsavedChanges();
}

function updateAutoShiftUI() {
    const btnOn = document.getElementById('btn-auto-shift-on');
    const btnOff = document.getElementById('btn-auto-shift-off');
    
    if (btnOn && btnOff) {
        if (currentAutoShiftEnabled) {
            btnOn.style.background = 'rgba(255,170,0,0.2)';
            btnOn.style.borderColor = '#ffaa00';
            btnOn.style.color = '#ffdd57';
            
            btnOff.style.background = 'rgba(255,255,255,0.05)';
            btnOff.style.borderColor = 'rgba(255,255,255,0.2)';
            btnOff.style.color = '#aaa';
        } else {
            btnOn.style.background = 'rgba(255,255,255,0.05)';
            btnOn.style.borderColor = 'rgba(255,255,255,0.2)';
            btnOn.style.color = '#aaa';
            
            btnOff.style.background = 'rgba(255,255,255,0.05)';
            btnOff.style.borderColor = 'rgba(255,255,255,0.3)';
            btnOff.style.color = '#ccc';
        }
    }
    
    const badgeAutoShift = document.getElementById('status-auto-shift');
    if (badgeAutoShift) {
        if (currentAutoShiftEnabled) {
            badgeAutoShift.innerText = '🤖 オートシフト: ON';
            badgeAutoShift.style.color = '#ffdd57';
            badgeAutoShift.style.borderColor = '#ffaa00';
            badgeAutoShift.style.background = 'rgba(255,170,0,0.1)';
        } else {
            badgeAutoShift.innerText = '🤖 オートシフト: OFF';
            badgeAutoShift.style.color = '#aaa';
            badgeAutoShift.style.borderColor = 'rgba(255,255,255,0.2)';
            badgeAutoShift.style.background = 'rgba(0,0,0,0.5)';
        }
    }
}

let currentFxShortEnabled = true;

function setFxShortEnabled(isOn) {
    currentFxShortEnabled = isOn;
    updateFxShortUI();
    markUnsavedChanges();
}

function updateFxShortUI() {
    const btnOn = document.getElementById('btn-fx-short-on');
    const btnOff = document.getElementById('btn-fx-short-off');
    
    if (btnOn && btnOff) {
        if (currentFxShortEnabled) {
            btnOn.style.background = 'rgba(255,51,102,0.2)';
            btnOn.style.borderColor = '#ff3366';
            btnOn.style.color = '#ffb3c6';
            
            btnOff.style.background = 'rgba(255,255,255,0.05)';
            btnOff.style.borderColor = 'rgba(255,255,255,0.2)';
            btnOff.style.color = '#aaa';
        } else {
            btnOn.style.background = 'rgba(255,255,255,0.05)';
            btnOn.style.borderColor = 'rgba(255,255,255,0.2)';
            btnOn.style.color = '#aaa';
            
            btnOff.style.background = 'rgba(255,255,255,0.05)';
            btnOff.style.borderColor = 'rgba(255,255,255,0.3)';
            btnOff.style.color = '#ccc';
        }
    }
    
    // FX予算枠ラベルのステータスバッジ更新
    const statusReserved = document.getElementById('status-reserved-margin');
    const statusMargin = document.getElementById('status-margin-limit');
    
    if (statusReserved && statusMargin) {
        if (!currentFxShortEnabled) {
            statusReserved.style.display = 'inline-block';
            statusReserved.innerText = '停止中';
            statusReserved.style.background = 'rgba(255,255,255,0.2)';
            statusReserved.style.color = '#aaa';
            
            statusMargin.style.display = 'inline-block';
            statusMargin.innerText = '停止中 (実注文なし)';
            statusMargin.style.background = 'rgba(255,255,255,0.2)';
            statusMargin.style.color = '#aaa';
        } else {
            statusReserved.style.display = 'none';
            statusMargin.style.display = 'none';
        }
    }
}

// 予算スライダーが手動で動かされたらMANUALモードに切り替える
document.getElementById('input-limit').addEventListener('input', () => { if(currentAutoBudgetMode !== 'manual') setAutoBudget(false); });
document.getElementById('input-margin-limit').addEventListener('input', () => { if(currentAutoBudgetMode !== 'manual') setAutoBudget(false); });
document.getElementById('input-reserved-margin').addEventListener('input', () => { if(currentAutoBudgetMode !== 'manual') setAutoBudget(false); });


function updateVal(id, value, isUserInput = true) {
    let displayValue = value;
    if (id === 'limit' || id === 'reserved-margin' || id === 'margin-limit') displayValue = Number(value).toLocaleString();
    document.getElementById(`val-${id}`).innerText = displayValue;
    
    if (isUserInput) {
        markUnsavedChanges();
    }
    
    // スライダーが動くたびにリアルタイムでAIの思考モードを判定する
    analyzeCurrentMode();
}

function analyzeCurrentMode() {
    const entry = parseInt(document.getElementById('input-entry').value) || 20;
    const rbuy = parseInt(document.getElementById('input-rsi-buy').value) || 45;
    const fng = parseInt(document.getElementById('input-fng').value) || 75;
    
    let riskScore = 0;
    // 買いの予算割合によるリスク判定
    if (entry < 15) riskScore += 1;
    else if (entry <= 25) riskScore += 2;
    else riskScore += 3;
    
    // RSI買い基準によるリスク判定（数値が高いほどすぐ買う＝高頻度ハイリスク）
    if (rbuy < 40) riskScore += 1;
    else if (rbuy <= 49) riskScore += 2;
    else riskScore += 3;
    
    // F&Gストッパーによるリスク判定（数値が高いほどバブル相場でも買う＝ハイリスク）
    if (fng <= 69) riskScore += 1;
    else if (fng <= 84) riskScore += 2;
    else riskScore += 3;
    
    const settingBadge = document.getElementById('current-mode-badge');
    const headerBadge = document.getElementById('header-mode-badge');
    
    let text = "⚖️ バランス運用 (ミドルリスク)";
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
    if (hasUnsavedChanges) return;
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
                    
                    updateVal('limit', data.trade_amount_limit, false);
                    updateVal('margin-limit', data.margin_trade_amount_limit, false);
                    updateVal('reserved-margin', data.reserved_margin_jpy, false);
                }
            });
    }
}
// 10秒ごとにサーバーの設定を同期
setInterval(syncSettingsFromBackend, 10000);

function applyPreset(type) {
    const behavior = {
        'safe': { entry: 10, full: 70, rbuy: 35, rsell: 65, fng: 60, loss: 4, mar_rsi: 70, cool: 180, pdrop: 3.0, fxcool: 60, fxpdrop: 1.5, tstop: 2.0, prsi: 15 },
        'normal': { entry: 15, full: 80, rbuy: 40, rsell: 70, fng: 75, loss: 5, mar_rsi: 65, cool: 60, pdrop: 2.0, fxcool: 30, fxpdrop: 1.0, tstop: 1.5, prsi: 20 },
        'aggressive': { entry: 30, full: 100, rbuy: 55, rsell: 85, fng: 85, loss: 7, mar_rsi: 60, cool: 30, pdrop: 1.0, fxcool: 15, fxpdrop: 0.5, tstop: 1.0, prsi: 25 },
        'scalp': { entry: 15, full: 90, rbuy: 55, rsell: 60, fng: 80, loss: 5, mar_rsi: 75, cool: 15, pdrop: 0.8, fxcool: 30, fxpdrop: 1.0, tstop: 0.5, prsi: 30 }
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
        p_limit = total * 0.50;
        p_mlimit = Math.max(minMarginLimit, total * 0.30);
        p_reserved = total * 0.20;
    } else if (type === 'aggressive') {
        p_limit = total * 0.80;
        p_mlimit = Math.max(minMarginLimit, total * 0.40);
        p_reserved = 0;
    } else if (type === 'scalp') {
        p_limit = total * 0.80;      // 現物に80%の資金を割り当て
        p_mlimit = minMarginLimit;    // FXは最低限の証拠金のみ
        p_reserved = total * 0.15;   // 現金は15%だけ持たせる
    }
    
    // 1万円単位で切り捨て
    p_limit = Math.floor(p_limit / 10000) * 10000;
    p_mlimit = Math.floor(p_mlimit / 10000) * 10000;
    p_reserved = Math.floor(p_reserved / 10000) * 10000;
    
    // 下限ガード（総資産が10万円等の少額の場合に10万円を超えないように上限クリップも入れる）
    p_limit = Math.max(10000, p_limit);
    if (p_limit > total) p_limit = total;
    
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
    
    markUnsavedChanges();
    
    const toast = document.getElementById('save-toast');
    toast.innerText = "⚠️ プリセットを適用しました。「保存・適用する」を押すまで反映されません。";
    toast.style.color = '#ffaa00';
    toast.style.background = 'rgba(255, 170, 0, 0.1)';
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 5000);
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
        "auto_budget_mode": currentAutoBudgetMode,
        "auto_shift_enabled": currentAutoShiftEnabled,
        "fx_short_enabled": currentFxShortEnabled
    };
    
    fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        hasUnsavedChanges = false;
        const warningEl = document.getElementById('unsaved-warning');
        if (warningEl) warningEl.style.display = 'none';
        
        const toast = document.getElementById('save-toast');
        toast.innerText = "✅ 保存完了！設定をシステムに反映しました";
        toast.style.color = '#00ff88';
        toast.style.background = 'rgba(0, 255, 136, 0.1)';
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 5000);
    });
}

function forceReloadSettings(silent = false) {
    initSettings(); // サーバーから再取得して画面を上書きする
    
    hasUnsavedChanges = false;
    const warningEl = document.getElementById('unsaved-warning');
    if (warningEl) {
        warningEl.style.display = 'none';
    }
    
    if (!silent) {
        const toast = document.getElementById('save-toast');
        toast.innerText = "🔄 変更を破棄し、保存済みの設定にリセットしました";
        toast.style.color = '#ccc';
        toast.style.background = 'rgba(255, 255, 255, 0.1)';
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 5000);
    }
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

    // すべての val-xx スパンをクリック可能にして手入力ダイアログを出す
    document.querySelectorAll('span[id^="val-"]').forEach(span => {
        // UIをクリッカブルっぽく装飾
        span.style.cursor = 'pointer';
        span.style.borderBottom = '1px dashed rgba(255,255,255,0.4)';
        span.title = 'クリックして数値を直接手入力';
        
        span.addEventListener('mouseenter', () => span.style.color = '#00f0ff');
        span.addEventListener('mouseleave', () => span.style.color = '');
        
        span.addEventListener('click', function() {
            const id = this.id.replace('val-', '');
            const slider = document.getElementById('input-' + id);
            if (!slider) return;
            
            // ラベルのテキストを取得してプロンプトに出す
            let labelText = this.parentElement.innerText.split(':')[0].trim();
            // 絵文字などを除外して綺麗にする処理
            labelText = labelText.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]/g, '').trim();
            
            const currentVal = slider.value;
            const newVal = prompt(labelText + " の数値を半角数字で手入力してください:", currentVal);
            
            if (newVal !== null && newVal.trim() !== "" && !isNaN(newVal)) {
                let numVal = Number(newVal);
                
                // 入力値がスライダーの最大・最小を超えていたらスライダー枠を拡張する
                if (numVal > Number(slider.max)) {
                    slider.max = numVal * 1.5;
                }
                if (numVal < Number(slider.min)) {
                    slider.min = 0;
                }
                
                slider.value = numVal;
                updateVal(id, numVal);
                
                // 手動変更扱いにするためAUTOモードをOFFにする
                if (typeof setAutoBudget === 'function') {
                    setAutoBudget(false);
                }
            }
        });
    });
});

// ==========================================
// スクリーンショット機能
// ==========================================
function takeScreenshot() {
    const btn = document.getElementById('btn-screenshot');
    if (!btn) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ 撮影中...';
    btn.disabled = true;

    html2canvas(document.querySelector('.dashboard-container') || document.body, {
        backgroundColor: '#050b14',
        scale: 2,
        useCORS: true
    }).then(canvas => {
        const base64image = canvas.toDataURL('image/png');
        
        fetch('/api/save_screenshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64image })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                btn.innerHTML = '✅ 撮影完了!';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }, 3000);
            } else {
                alert('スクショ保存に失敗しました: ' + data.message);
                btn.innerHTML = '❌ エラー';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }, 3000);
            }
        })
        .catch(err => {
            alert('通信エラーが発生しました');
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    }).catch(err => {
        alert('スクショの生成に失敗しました');
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}
