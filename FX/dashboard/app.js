let bot_state_limits = null;
let isAutoTrade = true;
let isDryRun = true;

// ====== CHART.JS Setup (資産推移グラフ) ======
let equityChart = null;
let ctx = null;

// ====== FRONTEND ERROR LOGGER ======
function sendErrorToBackend(msg, source, lineno, colno, error) {
    try {
        const errorData = {
            message: msg || "",
            source: source || "",
            lineno: lineno || 0,
            colno: colno || 0,
            stack: error ? error.stack : ""
        };
        fetch('/api/frontend_error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorData)
        }).catch(e => {});
        
        // エラーバナーに表示
        showFrontendErrorBanner(`[FRONTEND ERROR] ${msg}`);
    } catch(e){}
}

window.onerror = function(msg, source, lineno, colno, error) {
    sendErrorToBackend(msg, source, lineno, colno, error);
    return false;
};

window.addEventListener('unhandledrejection', function(event) {
    sendErrorToBackend(event.reason, 'unhandledrejection', 0, 0, event.reason);
});

const originalConsoleError = console.error;
console.error = function(...args) {
    originalConsoleError.apply(console, args);
    const msg = args.map(a => (a && a.message) ? a.message : String(a)).join(' ');
    sendErrorToBackend(msg, 'console.error');
};

function showFrontendErrorBanner(msg) {
    let banner = document.getElementById('frontend-debug-panel');
    if (banner) {
        banner.style.background = 'rgba(255, 0, 0, 0.2)';
        banner.style.border = '1px solid #f00';
        banner.style.color = '#f00';
        banner.innerHTML = `❌ フロントエンドエラー発生<br><span style="font-size:0.8rem">${msg}</span>`;
    }
}

function initEquityChart() {
    ctx = document.getElementById('equityChart').getContext('2d');
    
    // CSS変数の値を取得して初期化
    const rootStyles = getComputedStyle(document.documentElement);
    const accent = rootStyles.getPropertyValue('--accent-color').trim() || '#F8B4C4';
    const profit = rootStyles.getPropertyValue('--profit-green').trim() || '#34D399';
    const loss = rootStyles.getPropertyValue('--loss-red').trim() || '#F472B6';
    const accentRgb = rootStyles.getPropertyValue('--accent-rgb').trim() || '248, 180, 196';

    let gradient = ctx.createLinearGradient(0, 0, 0, 160);
    gradient.addColorStop(0, `rgba(${accentRgb}, 0.5)`);
    gradient.addColorStop(1, `rgba(${accentRgb}, 0.0)`);

    equityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], 
            datasets: [
                {
                    label: '🔵 総資産(円)',
                    data: [],
                    borderColor: accent,
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: '🟢 ロング評価損益(Long)',
                    data: [],
                    borderColor: profit,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: '🔴 ショート評価損益(Short)',
                    data: [],
                    borderColor: loss,
                    borderWidth: 2,
                    pointRadius: 0,
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

function updateDashboard() {
    fetch('/api/status')
        .then(response => response.json())
        .then(data => {
            // --- 共通ステータス ---
            try {
                document.getElementById('engine-status').innerText = 'システム正常稼働中';
                document.getElementById('engine-pulse').className = 'pulse active';
                const now = new Date();
                document.getElementById('last-update').innerText = `最終更新: ${now.toLocaleTimeString()}`;
                if(data.limits) bot_state_limits = data.limits;
            } catch(e) { console.error('[Header Update Error]', e); }
            
            // --- DRY RUN UI Update ---
            try {
                const dryRunBadge = document.getElementById('header-dry-run-badge');
                if (dryRunBadge) {
                    const isDry = data.settings ? data.settings.dry_run : (data.is_dry_run || false);
                    if (isDry) {
                        dryRunBadge.style.display = 'block';
                        if (!isDryRun) {
                            isDryRun = true;
                            if(typeof updateAutoTradeBtnUI === 'function') updateAutoTradeBtnUI();
                        }
                    } else {
                        dryRunBadge.style.display = 'none';
                        if (isDryRun) {
                            isDryRun = false;
                            if(typeof updateAutoTradeBtnUI === 'function') updateAutoTradeBtnUI();
                        }
                    }
                }
            } catch(e) { console.error('[DRY RUN Update Error]', e); }
            
            // --- 安全ステータスの更新 ---
            try {
                if (data.today_hist) {
                    const lsCount = data.today_hist.losing_streak || 0;
                    const pnl = data.today_hist.pnl || 0;
                    document.getElementById('status-losing-streak').innerText = `${lsCount} 連敗中`;
                    document.getElementById('status-daily-pnl').innerText = `¥ ${Math.floor(pnl).toLocaleString()}`;
                    
                    if (pnl < 0) document.getElementById('status-daily-pnl').style.color = "var(--loss-red)";
                    else if (pnl > 0) document.getElementById('status-daily-pnl').style.color = "var(--profit-green)";
                    else document.getElementById('status-daily-pnl').style.color = "var(--text-main)";
                }
                if (data.indicators && data.indicators.latest_skip_reason) {
                    document.getElementById('status-latest-skip').innerText = data.indicators.latest_skip_reason;
                }
            } catch(e) { console.error('[Safety Status Update Error]', e); }
            
            // --- 見送り理由ランキングの更新 ---
            try {
                if (data.skip_reasons) {
                    const container = document.getElementById('skip-reasons-container');
                    if (container) {
                        const reasons = Object.entries(data.skip_reasons).sort((a, b) => b[1] - a[1]);
                        if (reasons.length > 0) {
                            container.innerHTML = '';
                            reasons.forEach(([reason, count]) => {
                                const div = document.createElement('div');
                                div.style.padding = "8px 0";
                                div.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
                                div.style.display = "flex";
                                div.style.justifyContent = "space-between";
                                div.innerHTML = `<span style="color:#ddd; font-size:0.9rem;">${reason}</span> <span style="color:var(--accent-color); font-weight:bold;">${count} 回</span>`;
                                container.appendChild(div);
                            });
                        }
                    }
                }
            } catch(e) { console.error('[Skip Reasons Update Error]', e); }

            // --- System Warnings UI Update ---
            try {
                let warningsContainer = document.getElementById('system-warnings-container');
                if (!warningsContainer) {
                    warningsContainer = document.createElement('div');
                    warningsContainer.id = 'system-warnings-container';
                    warningsContainer.style.marginBottom = '20px';
                    const mainGrid = document.querySelector('main.grid');
                    if (mainGrid) mainGrid.insertBefore(warningsContainer, mainGrid.firstChild);
                }
                if (warningsContainer) {
                    if (data.system_warnings && data.system_warnings.length > 0) {
                        warningsContainer.innerHTML = '';
                        data.system_warnings.forEach(warn => {
                            const div = document.createElement('div');
                            div.style.padding = '12px 20px';
                            div.style.marginBottom = '10px';
                            div.style.background = 'rgba(var(--loss-rgb), 0.1)';
                            div.style.border = '1px solid var(--loss-red)';
                            div.style.borderRadius = '8px';
                            div.style.color = '#fff';
                            div.style.fontSize = '0.95rem';
                            div.innerHTML = `⚠️ <strong style="color:var(--loss-red);">警告:</strong> ${warn}`;
                            warningsContainer.appendChild(div);
                        });
                        warningsContainer.style.display = 'block';
                    } else {
                        warningsContainer.style.display = 'none';
                    }
                }
            } catch(e) { console.error('[Warnings Update Error]', e); }

            // --- Update Spot & Long Assets ---
            try {
                const spotJpy = data.balance ? data.balance.jpy : 0;
                const btcVal = data.balance ? data.balance.btc_value : 0;
                const balanceEl = document.getElementById('spot-jpy');
                if (balanceEl) balanceEl.innerText = Math.floor(spotJpy).toLocaleString();
                
                if (data.margin) {
                    const ratio = data.margin.margin_ratio || 9999;
                    const formattedRatio = ratio >= 9999 ? "---" : Math.floor(ratio).toLocaleString();
                    document.getElementById('long-margin-ratio').innerText = formattedRatio;
                    document.getElementById('margin-ratio').innerText = formattedRatio;
                    document.getElementById('margin-available').innerText = Math.floor(data.margin.available_amount || 0).toLocaleString();
                }
                
                if (data.positions) {
                    document.getElementById('pos-long').innerText = Math.floor(data.positions.long_size || 0).toLocaleString();
                    document.getElementById('pos-short').innerText = Math.floor(data.positions.short_size || 0).toLocaleString();
                    
                    const longPnl = data.positions.long_pnl || 0;
                    const longPnlEl = document.getElementById('long-unrealized-pnl');
                    if (longPnlEl) {
                        if (longPnl > 0) { longPnlEl.innerText = `+¥ ${Math.floor(longPnl).toLocaleString()}`; longPnlEl.style.color = "var(--profit-green)"; }
                        else if (longPnl < 0) { longPnlEl.innerText = `-¥ ${Math.abs(Math.floor(longPnl)).toLocaleString()}`; longPnlEl.style.color = "var(--loss-red)"; }
                        else { longPnlEl.innerText = `¥ 0`; longPnlEl.style.color = "#ffffff"; }
                    }
                    
                    const shortPnl = data.positions.short_pnl || 0;
                    const shortPnlEl = document.getElementById('short-unrealized-pnl');
                    if (shortPnlEl) {
                        if (shortPnl > 0) { shortPnlEl.innerText = `+¥ ${Math.floor(shortPnl).toLocaleString()}`; shortPnlEl.style.color = "var(--profit-green)"; }
                        else if (shortPnl < 0) { shortPnlEl.innerText = `-¥ ${Math.abs(Math.floor(shortPnl)).toLocaleString()}`; shortPnlEl.style.color = "var(--loss-red)"; }
                        else { shortPnlEl.innerText = `¥ 0`; shortPnlEl.style.color = "#ffffff"; }
                    }
                    
                    const btnCloseLong = document.getElementById('btn-close-long');
                    if (btnCloseLong) btnCloseLong.style.display = data.positions.long_size > 0 ? 'inline-block' : 'none';
                    const btnCloseShort = document.getElementById('btn-close-short');
                    if (btnCloseShort) btnCloseShort.style.display = data.positions.short_size > 0 ? 'inline-block' : 'none';
                }
            } catch(e) { console.error('[Assets/Positions Update Error]', e); }
            
            // --- Update Total Assets Hero ---
            try {
                let spotJpy = data.balance ? data.balance.jpy : 0;
                let btcVal = data.balance ? data.balance.btc_value : 0;
                let unrealized = data.margin ? (data.margin.unrealized_pnl || 0) : 0;
                const totalAssets = Math.floor(spotJpy + btcVal + unrealized);
                const taEl = document.getElementById('total-assets');
                if(taEl) taEl.innerText = totalAssets.toLocaleString();
                
                if (!window.simGlobalVars) window.simGlobalVars = {};
                window.simGlobalVars.accountBalance = totalAssets;
                window.simGlobalVars.rate = data.market ? (data.market.btc_price || 150.0) : 150.0;
                window.simGlobalVars.symbol = data.market ? (data.market.symbol || "USD_JPY") : "USD_JPY";
                if (typeof updateSimulator === 'function') updateSimulator();
            } catch(e) { console.error('[Total Assets Hero Error]', e); }
            
            // --- Market Rate Update ---
            try {
                function formatFxRate(rate) {
                    if (rate >= 100) return rate.toFixed(3);
                    else if (rate >= 10) return rate.toFixed(4);
                    else return rate.toFixed(5);
                }
                
                if (data.market) {
                    const bpEl = document.getElementById('btc-price');
                    if(bpEl) bpEl.innerText = data.market.btc_price > 0 ? formatFxRate(data.market.btc_price) : "レート取得不可";
                    
                    if (data.market.symbol) {
                        const fsEl = document.getElementById('current-focus-symbol');
                        if(fsEl) fsEl.innerText = `(${data.market.symbol})`;
                        const tvSymbol = "OANDA:" + data.market.symbol.replace("_", "");
                        if (window.currentChartSymbol !== tvSymbol && typeof createTradingViewWidget === 'function') {
                            window.currentChartSymbol = tvSymbol;
                            createTradingViewWidget(tvSymbol);
                        }
                    }
                    
                    if (data.market.high && data.market.low) {
                        const high = data.market.high;
                        const low = data.market.low;
                        const current = data.market.btc_price;
                        
                        const hEl = document.getElementById('btc-high');
                        const lEl = document.getElementById('btc-low');
                        if(hEl) hEl.innerText = formatFxRate(high);
                        if(lEl) lEl.innerText = formatFxRate(low);
                        
                        let range = high - low;
                        if (range === 0) range = 1;
                        let percent = ((current - low) / range) * 100;
                        percent = Math.max(0, Math.min(100, percent));
                        
                        const pm = document.getElementById('price-marker');
                        const pf = document.getElementById('price-range-fill');
                        const pp = document.getElementById('price-position-percent');
                        if(pm) pm.style.left = percent + '%';
                        if(pf) pf.style.width = percent + '%';
                        
                        const posStr = (percent >= 80) ? "高値圏 (バブル警戒)" : (percent <= 20) ? "安値圏 (底値買い場)" : "中間圏";
                        if(pp) pp.innerText = `${percent.toFixed(1)}% （${posStr}）`;
                    }
                }
            } catch(e) { console.error('[Market Rate Update Error]', e); }

            // --- Watch Symbols ---
            try {
                if (data.watch_symbols && JSON.stringify(data.watch_symbols) !== JSON.stringify(currentSettings.watch_symbols)) {
                    currentSettings.watch_symbols = data.watch_symbols;
                    if(typeof renderWatchSymbols === 'function') renderWatchSymbols(data.watch_symbols);
                }
            } catch(e) { console.error('[Watch Symbols Update Error]', e); }
            
            // --- AI Currency Scores ---
            try {
                if (data.currency_scores !== undefined) {
                    if (typeof renderCurrencyScores === 'function') {
                        renderCurrencyScores(data.currency_scores);
                    }
                } else {
                    const tbody = document.getElementById('currency-scores-tbody');
                    if (tbody) tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:15px; color:#ff3366;">APIレスポンスに currency_scores がありません</td></tr>';
                }
            } catch(e) { console.error('[Currency Scores Update Error]', e); }
            
            // --- Indicators Update ---
            try {
                if (data.indicators) {
                    const rsi = data.indicators.rsi;
                    let rsiText = '';
                    if (rsi < 45) { rsiText = '（🟢買いの準備）'; }
                    else if (rsi > 70) { rsiText = '（🔴売り警戒）'; }
                    else if (rsi > 55) { rsiText = '（⚠️やや警戒）'; }
                    else { rsiText = '（様子見）'; }
                    const rval = document.getElementById('rsi-val');
                    const rbar = document.getElementById('rsi-bar');
                    if(rval && rsi !== undefined) rval.innerHTML = `${rsi.toFixed(1)} <span style="font-size:0.85em; font-weight:400; color:#ffdd57;">${rsiText}</span>`;
                    if(rbar && rsi !== undefined) rbar.style.width = rsi + '%';
                    
                    const macdHist = data.indicators.macd_hist;
                    let macdText = '';
                    if (macdHist > 500) { macdText = '（🟢強い上昇）'; }
                    else if (macdHist > 0) { macdText = '（🟢買シグナル）'; }
                    else if (macdHist < -500) { macdText = '（🔴強い下落）'; }
                    else { macdText = '（🔴下落トレンド）'; }
                    const mval = document.getElementById('macd-val');
                    const mbar = document.getElementById('macd-bar');
                    if(mval && macdHist !== undefined) mval.innerHTML = `${(macdHist > 0 ? '+' : '') + macdHist.toFixed(0)} <span style="font-size:0.85em; font-weight:400; color:#ffdd57;">${macdText}</span>`;
                    if(mbar && macdHist !== undefined) {
                        let macdPercent = 50 + (macdHist / 2000) * 50; 
                        macdPercent = Math.max(0, Math.min(100, macdPercent));
                        mbar.style.width = macdPercent + '%';
                    }

                    const fng = data.indicators.fng || 50;
                    let fngText = '';
                    if (fng < 40) { fngText = '（🟢買いチャンス）'; }
                    else if (fng > 75) { fngText = '（🔴暴落警戒！）'; }
                    else if (fng > 60) { fngText = '（⚠️高値づかみ注意）'; }
                    else { fngText = '（平常時）'; }
                    const fval = document.getElementById('fng-val');
                    const fbar = document.getElementById('fng-bar');
                    if(fval) fval.innerHTML = `${fng} <span style="font-size:0.85em; font-weight:400; color:#ffdd57;">${fngText}</span>`;
                    if(fbar) fbar.style.width = fng + '%';
                }
            } catch(e) { console.error('[Indicators Update Error]', e); }

            // --- Logs Update ---
            try {
                const logContainer = document.getElementById('log-container');
                if (logContainer && data.logs && data.logs.length > 0) {
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
            } catch(e) { console.error('[Logs Update Error]', e); }

            // --- AUTO GEAR Badge update ---
            try {
                const gearBadge = document.getElementById('header-gear-badge');
                if (gearBadge && data.indicators) {
                    const status = data.indicators.auto_shift_status || 'NONE';
                    const level = data.indicators.shift_level || 0;
                    if (status !== 'NONE' && level > 0) {
                        gearBadge.style.display = 'inline-block';
                        let color = (status === 'UP') ? '#34D399' : '#F472B6';
                        let bg = (status === 'UP') ? 'rgba(52, 211, 153, 0.2)' : 'rgba(244, 114, 182, 0.2)';
                        gearBadge.innerText = `⚙️ AUTO GEAR: ${status} (Lv.${level})`;
                        gearBadge.style.color = color;
                        gearBadge.style.borderColor = color;
                        gearBadge.style.background = bg;
                    } else {
                        gearBadge.style.display = 'none';
                    }
                }
            } catch(e) { console.error('[Gear Badge Update Error]', e); }

            // --- Daily Stats Update ---
            try {
                if (data.daily_history) {
                    const nowJapan = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
                    const isBefore6AM = nowJapan.getHours() < 6;
                    const fxDateObj = new Date(nowJapan);
                    if (isBefore6AM) {
                        fxDateObj.setDate(fxDateObj.getDate() - 1);
                    }
                    const todayStr = fxDateObj.getFullYear() + '-' + String(fxDateObj.getMonth()+1).padStart(2,'0') + '-' + String(fxDateObj.getDate()).padStart(2,'0');
                    
                    const todayStats = data.daily_history[todayStr] || { pnl: 0, trades: 0 };
                    const pnlEl = document.getElementById('daily-pnl-val');
                    const dailyPnlDiv = document.getElementById('header-daily-pnl');
                    if (pnlEl && dailyPnlDiv) {
                        dailyPnlDiv.style.display = 'flex';
                        if (todayStats.pnl > 0) {
                            pnlEl.innerText = `+${Math.floor(todayStats.pnl).toLocaleString()}円`;
                            pnlEl.style.color = "var(--profit-green)";
                        } else if (todayStats.pnl < 0) {
                            pnlEl.innerText = `${Math.floor(todayStats.pnl).toLocaleString()}円`;
                            pnlEl.style.color = "var(--loss-red)";
                        } else {
                            pnlEl.innerText = `0円`;
                            pnlEl.style.color = "#fff";
                        }
                        const trEl = document.getElementById('daily-trades-val');
                        if(trEl) trEl.innerText = todayStats.trades;
                    }
                    
                    if (typeof renderDailyPnlChart === 'function') {
                        renderDailyPnlChart(data.daily_history);
                    }
                }
            } catch(e) { console.error('[Daily Stats Update Error]', e); }

            // --- 予算の自動追従 ---
            try {
                const bEl = document.getElementById('input-auto-budget');
                const budgetMode = bEl ? bEl.value : 'manual';
                if (budgetMode !== 'manual') {
                    fetch('/api/settings').then(res => res.json()).then(settings => {
                        const currentLimit = settings.margin_trade_amount_limit;
                        const slider = document.getElementById('input-margin-limit');
                        if (slider && slider.value != currentLimit) {
                            slider.value = currentLimit;
                            const vlEl = document.getElementById('val-margin-limit');
                            if(vlEl) vlEl.innerText = Number(currentLimit).toLocaleString();
                            if(typeof analyzeCurrentMode === 'function') analyzeCurrentMode();
                        }
                    }).catch(err => console.log('Settings sync error', err));
                }
            } catch(e) { console.error('[Auto Budget Update Error]', e); }

        })
        .catch(error => {
            console.error('[ステータス取得ERROR] fetch failed: /api/status ', error);
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

// テーマ切り替え機能
function switchTheme(theme, updateChart = true) {
    if (theme === 'sakura') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('kawaseTheme', theme);
    
    // ボタンのハイライト更新
    document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-theme-id="${theme}"]`);
    if(activeBtn) activeBtn.classList.add('active');

    if (updateChart && equityChart && ctx) {
        setTimeout(() => {
            const rootStyles = getComputedStyle(document.documentElement);
            const accent = rootStyles.getPropertyValue('--accent-color').trim() || '#F8B4C4';
            const profit = rootStyles.getPropertyValue('--profit-green').trim() || '#34D399';
            const loss = rootStyles.getPropertyValue('--loss-red').trim() || '#F472B6';
            const accentRgb = rootStyles.getPropertyValue('--accent-rgb').trim() || '248, 180, 196';

            let gradient = ctx.createLinearGradient(0, 0, 0, 160);
            gradient.addColorStop(0, `rgba(${accentRgb}, 0.5)`);
            gradient.addColorStop(1, `rgba(${accentRgb}, 0.0)`);
            
            equityChart.data.datasets[0].borderColor = accent;
            equityChart.data.datasets[0].backgroundColor = gradient;
            equityChart.data.datasets[1].borderColor = profit;
            equityChart.data.datasets[2].borderColor = loss;
            equityChart.update();
        }, 50);
    }
}

// 起動時のテーマ適用
const savedTheme = localStorage.getItem('kawaseTheme') || 'sakura';
switchTheme(savedTheme, false);

function fetchHistory() {
    fetch('/api/history')
        .then(res => res.json())
        .then(data => {
            fullHistoryData = data;
            renderHistoryChart();
        })
        .catch(err => console.error('[履歴データ取得ERROR] fetch failed: /api/history ', err));
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

let currentPnlTimeframe = '1w';
let fullDailyHistoryData = {};

let dailyPnlChart = null;
function renderDailyPnlChart(historyData) {
    if (historyData) {
        fullDailyHistoryData = historyData;
    } else {
        historyData = fullDailyHistoryData;
    }
    if (!historyData || Object.keys(historyData).length === 0) return;
    
    let maxDays = 7;
    if (currentPnlTimeframe === '1m') maxDays = 30;
    if (currentPnlTimeframe === '1y') maxDays = 365;
    
    // 実際にデータが存在する日付だけを抽出してソート
    const actualDates = Object.keys(historyData).sort();
    
    // 直近の maxDays 日分だけを取得 (スライディングウィンドウ)
    let displayDates = actualDates.slice(-maxDays);
    
    // 表示用のラベル配列とデータ配列
    let labels = [...displayDates];
    let pnls = displayDates.map(d => historyData[d].pnl);
    
    // データが maxDays に満たない場合は、右側に空の枠を追加して左寄せにする
    if (labels.length < maxDays) {
        const paddingCount = maxDays - labels.length;
        for (let i = 0; i < paddingCount; i++) {
            labels.push(""); // 空のラベル
            pnls.push(null); // データなし
        }
    }
    
    const bgColors = pnls.map(p => {
        if (p === null) return 'transparent';
        return p >= 0 ? 'rgba(52, 211, 153, 0.6)' : 'rgba(244, 114, 182, 0.6)';
    });
    const borderColors = pnls.map(p => {
        if (p === null) return 'transparent';
        return p >= 0 ? '#34D399' : '#F472B6';
    });
    
    if (!dailyPnlChart) {
        const ctxPnl = document.getElementById('dailyPnlChart');
        if (!ctxPnl) return;
        dailyPnlChart = new Chart(ctxPnl.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '日次確定収支(円)',
                    data: pnls,
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    borderRadius: 4,
                    maxBarThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#888', maxTicksLimit: 10 }, grid: { display: false } },
                    y: { ticks: { color: '#aaa', callback: function(value) { return '¥' + Math.floor(value).toLocaleString(); } }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    } else {
        dailyPnlChart.data.labels = labels;
        dailyPnlChart.data.datasets[0].data = pnls;
        dailyPnlChart.data.datasets[0].backgroundColor = bgColors;
        dailyPnlChart.data.datasets[0].borderColor = borderColors;
        dailyPnlChart.update('none');
    }
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

document.querySelectorAll('.btn-pnl-timeframe').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-pnl-timeframe').forEach(b => {
            b.classList.remove('active');
            b.style.background = 'rgba(255,255,255,0.05)';
            b.style.borderColor = 'rgba(255,255,255,0.1)';
        });
        
        btn.classList.add('active');
        btn.style.background = 'rgba(0,240,255,0.2)';
        btn.style.borderColor = 'var(--accent-color)';
        
        currentPnlTimeframe = btn.dataset.tf;
        renderDailyPnlChart();
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
    
    // 設定タブを開いた時、サーバー側の現在の設定を取得してUIをリセットする（未保存の変更を破棄する）
    if (activeTab === 'settings') {
        initSettings();
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

function renderWatchSymbols(symbols) {
    if (!symbols) symbols = ["USD_JPY", "EUR_JPY", "GBP_JPY", "AUD_JPY"];
    currentSettings.watch_symbols = symbols;
    const container = document.getElementById('watch-symbols-list');
    if (!container) return;
    
    container.innerHTML = '';
    symbols.forEach(sym => {
        const badge = document.createElement('div');
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.gap = '8px';
        badge.style.background = 'rgba(0, 0, 0, 0.4)';
        badge.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        badge.style.padding = '6px 12px';
        badge.style.borderRadius = '20px';
        
        const label = document.createElement('span');
        label.innerText = sym;
        label.style.fontWeight = 'bold';
        label.style.color = '#fff';
        
        const removeBtn = document.createElement('span');
        removeBtn.innerText = '×';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.color = '#ff3366';
        removeBtn.style.fontWeight = 'bold';
        removeBtn.style.fontSize = '1.1rem';
        removeBtn.onclick = () => removeWatchSymbol(sym);
        
        badge.appendChild(label);
        badge.appendChild(removeBtn);
        container.appendChild(badge);
    });
}

function addWatchSymbol() {
    const input = document.getElementById('new-symbol-input');
    const val = input.value.trim().toUpperCase();
    if (val && !currentSettings.watch_symbols.includes(val)) {
        currentSettings.watch_symbols.push(val);
        renderWatchSymbols(currentSettings.watch_symbols);
        input.value = '';
    }
}

function removeWatchSymbol(sym) {
    currentSettings.watch_symbols = currentSettings.watch_symbols.filter(s => s !== sym);
    renderWatchSymbols(currentSettings.watch_symbols);
}

function initSettings() {
    // 通貨ペア一覧の取得とプルダウンへの反映
    fetch('/api/instruments')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('new-symbol-input');
            if (select && data.instruments && data.instruments.length > 0) {
                select.innerHTML = '<option value="">▼ 追加する通貨ペアを選択してください</option>';
                data.instruments.forEach(sym => {
                    const opt = document.createElement('option');
                    opt.value = sym;
                    opt.innerText = sym.replace('_', '/') + " (" + sym + ")";
                    select.appendChild(opt);
                });
            } else if (select) {
                select.innerHTML = '<option value="">一覧の取得に失敗しました</option>';
            }
        });

    fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
            currentSettings = data;
            renderWatchSymbols(data.watch_symbols);
            
            document.getElementById('input-limit').value = data.trade_amount_limit;
            document.getElementById('input-margin-limit').value = data.margin_trade_amount_limit || 200000;
            document.getElementById('input-entry').value = data.entry_size_percent;
            document.getElementById('input-full').value = data.full_position_percent;
            document.getElementById('input-rsi-buy').value = data.rsi_buy_threshold;
            document.getElementById('input-rsi-sell').value = data.rsi_sell_threshold;
            document.getElementById('input-fng').value = data.fng_stopper;
            document.getElementById('input-loss-cut').value = data.loss_cut_percent || 2.0;
            document.getElementById('input-margin-rsi-short').value = data.margin_rsi_short || 60;
            document.getElementById('input-cooldown').value = data.cooldown_minutes || 60;
            document.getElementById('input-price-drop').value = data.price_drop_percent || 1.5;
            document.getElementById('input-trailing-stop').value = data.trailing_stop_percent || 1.0;
            document.getElementById('input-panic-buy').value = data.panic_buy_rsi || 20;
            document.getElementById('input-auto-budget').value = data.auto_budget_mode || 'manual';
            document.getElementById('input-max-nampin').value = data.max_nampin_count !== undefined ? data.max_nampin_count : 3;
            document.getElementById('input-daily-loss').value = data.daily_loss_limit !== undefined ? data.daily_loss_limit : 3.0;
            document.getElementById('input-losing-streak').value = data.losing_streak_limit !== undefined ? data.losing_streak_limit : 3;

            if (data.auto_trade_enabled !== undefined) {
                isAutoTrade = data.auto_trade_enabled;
                updateAutoTradeBtnUI();
            }
            if (data.auto_symbol_select_enabled !== undefined) {
                isAutoSymbolSelect = data.auto_symbol_select_enabled;
                updateAutoSymbolBtnUI();
            }
            if (data.auto_shift_enabled !== undefined) {
                isAutoShift = data.auto_shift_enabled;
                updateAutoShiftBtnUI();
            }
            
            ['limit', 'margin-limit', 'entry', 'full', 'rsi-buy', 'rsi-sell', 'margin-rsi-short', 'trailing-stop', 'cooldown', 'price-drop', 'fng', 'panic-buy', 'loss-cut', 'max-nampin', 'daily-loss', 'losing-streak'].forEach(k => {
                updateVal(k, document.getElementById('input-' + k).value);
            });
            
            if (typeof updateAutoBudget === 'function') updateAutoBudget();
            
            // 初回読み込み時にモードを判定表示する
            setTimeout(analyzeCurrentMode, 100);
        });
}

function updateVal(id, value) {
    let displayValue = value;
    if (id === 'limit' || id === 'margin-limit') displayValue = Number(value).toLocaleString();
    if (id === 'loss-cut' || id === 'daily-loss') displayValue = parseFloat(value).toFixed(1);
    if (id === 'max-nampin' || id === 'losing-streak') displayValue = parseInt(value);
    
    if (document.getElementById(`val-${id}`)) {
        document.getElementById(`val-${id}`).innerText = displayValue;
    }
    
    // スライダーが動くたびにリアルタイムでAIの思考モードを判定する
    analyzeCurrentMode();
    if (typeof updateSimulator === 'function') updateSimulator();
    
    // 手動で予算スライダーを動かした場合は、自動的にモードを「手動設定 (MANUAL)」に切り替える
    if (id === 'limit' || id === 'margin-limit') {
        const budgetSelect = document.getElementById('input-auto-budget');
        if (budgetSelect && budgetSelect.value !== 'manual') {
            budgetSelect.value = 'manual';
            if (typeof updateAutoBudget === 'function') updateAutoBudget();
        }
    }
}

function analyzeCurrentMode() {
    const entry = parseInt(document.getElementById('input-entry').value) || 20;
    const rbuy = parseInt(document.getElementById('input-rsi-buy').value) || 45;
    const fng = parseInt(document.getElementById('input-fng').value) || 75;
    
    let riskScore = 0;
    // 買いの予算割合によるリスク判定
    if (entry <= 12) riskScore += 1;
    else if (entry <= 20) riskScore += 2;
    else riskScore += 3;
    
    // RSI買い基準によるリスク判定
    if (rbuy <= 30) riskScore += 1;
    else if (rbuy <= 34) riskScore += 2;
    else riskScore += 3;
    
    // F&Gストッパーによるリスク判定
    if (fng <= 65) riskScore += 1;
    else if (fng <= 80) riskScore += 2;
    else riskScore += 3;
    
    const settingBadge = document.getElementById('current-mode-badge');
    const headerBadge = document.getElementById('header-mode-badge');
    
    let text = "⚖️ 標準 (ミドルリスク)";
    let color = "#ffdd57";
    let bg = "rgba(255, 221, 87, 0.1)";
    
    const cool = parseInt(document.getElementById('input-cooldown').value) || 60;
    
    // 合計スコアで現在のシステムモードをリアルタイム判定算出 (Min:3, Max:9)
    if (cool <= 5 && riskScore >= 7) {
        text = "⚡ 超短期スキャルピング (ハイリスク・高回転)";
        color = "#FFD700";
        bg = "rgba(255, 215, 0, 0.15)";
    } else if (riskScore <= 4) {
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

function applyPreset(type) {
    const presets = {
        'safe': { entry: 10, full: 40, rbuy: 30, rsell: 68, fng: 65, loss: 0.7, mar_rsi: 78, cool: 180, pdrop: 0.60, trailing: 0.20, panic: 15, max_nampin: 2, daily_loss: 2.0, auto: 'safe' },
        'normal': { entry: 15, full: 60, rbuy: 32, rsell: 70, fng: 75, loss: 1.0, mar_rsi: 75, cool: 60, pdrop: 0.40, trailing: 0.20, panic: 20, max_nampin: 3, daily_loss: 3.0, auto: 'normal' },
        'aggressive': { entry: 25, full: 80, rbuy: 35, rsell: 75, fng: 85, loss: 1.3, mar_rsi: 78, cool: 20, pdrop: 0.30, trailing: 0.15, panic: 25, max_nampin: 3, daily_loss: 4.0, auto: 'aggressive' },
        'scalping': { entry: 25, full: 40, rbuy: 28, rsell: 62, fng: 85, loss: 0.5, mar_rsi: 72, cool: 5, pdrop: 0.25, trailing: 0.05, panic: 20, max_nampin: 1, daily_loss: 2.0, auto: 'aggressive' }
    };
    
    let p = presets[type];
    
    document.getElementById('input-entry').value = p.entry;
    document.getElementById('input-full').value = p.full;
    document.getElementById('input-rsi-buy').value = p.rbuy;
    document.getElementById('input-rsi-sell').value = p.rsell;
    document.getElementById('input-fng').value = p.fng;
    document.getElementById('input-loss-cut').value = p.loss;
    document.getElementById('input-margin-rsi-short').value = p.mar_rsi;
    document.getElementById('input-cooldown').value = p.cool;
    document.getElementById('input-price-drop').value = p.pdrop;
    
    if(document.getElementById('input-auto-budget')) document.getElementById('input-auto-budget').value = p.auto;
    if(document.getElementById('input-trailing-stop')) document.getElementById('input-trailing-stop').value = p.trailing;
    if(document.getElementById('input-panic-buy')) document.getElementById('input-panic-buy').value = p.panic;
    if(document.getElementById('input-max-nampin')) document.getElementById('input-max-nampin').value = p.max_nampin;
    if(document.getElementById('input-daily-loss')) document.getElementById('input-daily-loss').value = p.daily_loss;
    if (typeof updateAutoBudget === 'function') updateAutoBudget();
    
    updateVal('entry', p.entry);
    updateVal('full', p.full);
    updateVal('rsi-buy', p.rbuy);
    updateVal('rsi-sell', p.rsell);
    updateVal('fng', p.fng);
    updateVal('loss-cut', p.loss);
    updateVal('margin-rsi-short', p.mar_rsi);
    updateVal('cooldown', p.cool);
    updateVal('price-drop', p.pdrop);
    updateVal('trailing-stop', p.trailing);
    updateVal('panic-buy', p.panic);
    if(document.getElementById('val-max-nampin')) updateVal('max-nampin', p.max_nampin);
    if(document.getElementById('val-daily-loss')) updateVal('daily-loss', p.daily_loss);
    
    if (typeof updateSimulator === 'function') updateSimulator();
    
    const toast = document.getElementById('save-toast');
    toast.innerText = "💡 数値がセットされました！下にスクロールして「保存」を押して適用してください";
    toast.style.color = '#ffdd57';
    toast.style.background = 'rgba(255, 221, 87, 0.1)';
    toast.style.display = 'block';
}

function updateAutoBudget() {
    const val = document.getElementById('input-auto-budget').value;
    const marginLimitInput = document.getElementById('input-margin-limit');
    if (marginLimitInput) {
        if (val !== 'manual') {
            marginLimitInput.disabled = true;
            marginLimitInput.style.opacity = 0.5;
        } else {
            marginLimitInput.disabled = false;
            marginLimitInput.style.opacity = 1;
        }
    }
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
        "loss_cut_percent": document.getElementById('input-loss-cut') ? parseFloat(document.getElementById('input-loss-cut').value) : 2.0,
        "margin_rsi_short": parseInt(document.getElementById('input-margin-rsi-short').value),
        "cooldown_minutes": parseInt(document.getElementById('input-cooldown').value),
        "price_drop_percent": parseFloat(document.getElementById('input-price-drop').value),
        "auto_budget_mode": document.getElementById('input-auto-budget') ? document.getElementById('input-auto-budget').value : 'manual',
        "trailing_stop_percent": document.getElementById('input-trailing-stop') ? parseFloat(document.getElementById('input-trailing-stop').value) : 1.0,
        "panic_buy_rsi": document.getElementById('input-panic-buy') ? parseInt(document.getElementById('input-panic-buy').value) : 20,
        "watch_symbols": currentSettings.watch_symbols || ["USD_JPY", "EUR_JPY", "GBP_JPY", "AUD_JPY"],
        "auto_trade_enabled": isAutoTrade,
        "auto_symbol_select_enabled": isAutoSymbolSelect,
        "auto_shift_enabled": isAutoShift
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
        toast.style.color = 'var(--profit-green)';
        toast.style.background = 'rgba(var(--profit-rgb), 0.1)';
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 5000);
    });
}

setTimeout(initSettings, 1000);

// isAutoTrade moved to top
let isAutoSymbolSelect = false;
let isAutoShift = false;

function toggleAutoShift() {
    isAutoShift = !isAutoShift;
    updateAutoShiftBtnUI();
    saveSettings();
}

window.forceClosePosition = function(side) {
    if (!confirm(`本当に現在のポジション(${side === 'LONG' ? 'ロング/買' : 'ショート/売'})を手動で決済しますか？\n※現在の含み損益で確定されます。`)) {
        return;
    }
    
    fetch('/api/force_close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side: side })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            const toast = document.getElementById('save-toast');
            if (toast) {
                toast.innerText = `✅ 手動決済完了！ (${side})`;
                toast.style.color = 'var(--profit-green)';
                toast.style.background = 'rgba(var(--profit-rgb), 0.1)';
                toast.style.display = 'block';
                setTimeout(() => { toast.style.display = 'none'; }, 5000);
            } else {
                alert('決済完了: ' + data.message);
            }
            updateDashboard();
        } else {
            alert('決済エラー: ' + data.message);
        }
    })
    .catch(err => {
        alert('通信エラーが発生しました: ' + err);
    });
};

function updateAutoShiftBtnUI() {
    const btn = document.getElementById('btn-auto-shift');
    if (!btn) return;
    
    if (isAutoShift) {
        btn.innerText = '🤖 オートシフト ON (AUTO GEAR)';
        btn.style.color = 'var(--accent-color)';
        btn.style.borderColor = 'var(--accent-color)';
        btn.style.background = 'rgba(var(--accent-rgb), 0.2)';
    } else {
        btn.innerText = '🤖 オートシフト OFF';
        btn.style.color = '#aaa';
        btn.style.borderColor = '#aaa';
        btn.style.background = 'rgba(255, 255, 255, 0.1)';
    }
}

function toggleAutoSymbolSelect() {
    isAutoSymbolSelect = !isAutoSymbolSelect;
    updateAutoSymbolBtnUI();
    saveSettings();
}

function updateAutoSymbolBtnUI() {
    const btn = document.getElementById('btn-auto-symbol');
    if (!btn) return;
    
    if (isAutoSymbolSelect) {
        btn.innerText = '🤖 AI自動選定 ON';
        btn.style.color = 'var(--accent-color)';
        btn.style.borderColor = 'var(--accent-color)';
        btn.style.background = 'rgba(var(--accent-rgb), 0.2)';
    } else {
        btn.innerText = '⚪ AI自動選定 OFF';
        btn.style.color = '#aaa';
        btn.style.borderColor = '#aaa';
        btn.style.background = 'rgba(255, 255, 255, 0.1)';
    }
}

// isDryRun moved to top

function updateAutoTradeBtnUI() {
    const btn = document.getElementById('btn-auto-trade');
    if (!btn) return;
    const pulse = document.getElementById('auto-trade-pulse');
    const text = document.getElementById('auto-trade-text');
    
    if (isAutoTrade) {
        text.innerText = isDryRun ? '自動売買 ON (DRY RUN)' : '自動売買 ON';
        pulse.style.background = 'var(--profit-green)';
        pulse.style.boxShadow = '0 0 5px var(--profit-green)';
        pulse.classList.add('active');
        btn.style.color = 'var(--profit-green)';
        btn.style.borderColor = 'var(--profit-green)';
        btn.style.background = 'rgba(var(--profit-rgb), 0.2)';
    } else {
        text.innerText = '自動売買 OFF';
        pulse.style.background = 'var(--loss-red)';
        pulse.style.boxShadow = 'none';
        pulse.classList.remove('active');
        btn.style.color = 'var(--loss-red)';
        btn.style.borderColor = 'var(--loss-red)';
        btn.style.background = 'rgba(var(--loss-rgb), 0.1)';
    }
}

function createTradingViewWidget(symbolName) {
    document.getElementById('tradingview_chart').innerHTML = '';
    if (typeof TradingView !== 'undefined') {
        new TradingView.widget({
            "autosize": true,
            "symbol": symbolName,
            "interval": "5",
            "timezone": "Asia/Tokyo",
            "theme": "dark",
            "style": "1",
            "locale": "ja",
            "enable_publishing": false,
            "backgroundColor": "rgba(0,0,0,0)",
            "gridColor": "rgba(255, 255, 255, 0.05)",
            "hide_top_toolbar": false,
            "hide_legend": false,
            "save_image": false,
            "container_id": "tradingview_chart"
        });
    }
}

function toggleAutoTrade() {
    if (!isAutoTrade) {
        if (!confirm("⚠️ 自動売買を開始します。\n現在の設定、発注予定Units、損切り想定額、1日最大損失ラインを確認しましたか？")) {
            return;
        }
    }
    isAutoTrade = !isAutoTrade;
    updateAutoTradeBtnUI();
    currentSettings.auto_trade_enabled = isAutoTrade;
    saveSettings();
}

// ==========================================
// 用語解説機能 (Glossary Modal)
// ==========================================
const glossaryData = {
    'rsi': {
        title: '📈 RSI (相対力指数)',
        main: '今の相場が「買われすぎ（過熱）」か「売られすぎ（冷え込み）」かを 0〜100 の数値で表したメーターです。一般的に30以下は底値（買い時）、70以上は天井（売り時）とされます。',
        analogy: '【例え】車のスピードメーターのようなものです。高すぎるとオーバーヒート（買われすぎ）で下がりやすく、低すぎるとエンスト寸前（売られすぎ）で反発しやすくなります。'
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
    'margin_rsi_short': {
        title: '🔴 FX空売り (ショート)',
        main: '手元に通貨が無くても、取引所から「借りて売る」ことで、相場が下がった時に利益を出せる仕組み（レバレッジ取引）です。現物買いの損失をカバーする強力な武器になります。',
        analogy: '【例え】ゲームのアイテムを友達から借りて高く売り、後で安くなった時に買い戻して友達に返すことで、差額を儲けるイメージです。'
    },
    'nanpin': {
        title: '🔄 ナンピン (連続エントリー)',
        main: '一度買った後にさらに価格が下がってしまった場合、安い価格で追加購入することで「平均購入単価」を下げるテクニックです。',
        analogy: '【例え】1個100円のチョコを買い、翌日50円に値下がりした時に追加でもう1個買うと、1個あたりの平均価格が75円に下がり、少しの回復で利益が出やすくなるのと同じです。'
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

// ==========================================
// スクリーンショット保存機能
// ==========================================
window.takeScreenshot = function() {
    const btn = document.getElementById('btn-screenshot');
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ 撮影中...';
    btn.style.opacity = '0.7';
    btn.disabled = true;
    
    // スクロールで隠れている部分も含めて全体のコンテンツを撮影する
    const targetElement = document.querySelector('.dashboard-container') || document.body;
    
    // html2canvas の呼び出し
    html2canvas(targetElement, {
        backgroundColor: '#0f172a', // デフォルトの暗い背景色に合わせる
        scrollY: -window.scrollY, // スクロールズレ防止
        useCORS: true, // 外部画像の読み込み許可
        ignoreElements: (element) => {
            return false;
        }
    }).then(canvas => {
        const base64Image = canvas.toDataURL('image/png');
        
        // サーバー（Python側）に画像を送信して保存させる
        fetch('/api/save_screenshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                btn.innerHTML = '✅ 保存完了！';
                btn.style.opacity = '1';
                btn.style.color = '#34D399';
                btn.style.borderColor = '#34D399';
                
                // どこに保存されたかユーザーに教える
                setTimeout(() => {
                    alert(`【保存成功】\nスクショ画像を以下の場所に保存しました！\n\n${data.path}`);
                    
                    btn.innerHTML = originalText;
                    btn.style.color = '#fff';
                    btn.style.borderColor = 'rgba(255,255,255,0.2)';
                    btn.disabled = false;
                }, 100);
            } else {
                throw new Error(data.message);
            }
        })
        .catch(err => {
            console.error('Screenshot save API failed:', err);
            btn.innerHTML = '❌ 保存エラー';
            btn.style.color = '#F472B6';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.color = '#fff';
                btn.disabled = false;
            }, 3000);
        });

    }).catch(err => {
        console.error('html2canvas failed:', err);
        btn.innerHTML = '❌ エラー発生';
        btn.style.color = '#F472B6';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.color = '#fff';
            btn.disabled = false;
        }, 3000);
    });
};

// ==========================================
// 発注シミュレーター
// ==========================================
function updateSimulator() {
    const balance = window.simGlobalVars ? window.simGlobalVars.accountBalance : 1000000;
    const rate = window.simGlobalVars ? window.simGlobalVars.rate : 150.0;
    const symbol = window.simGlobalVars ? window.simGlobalVars.symbol : "USD_JPY";
    
    const elBal = document.getElementById('sim-account-balance');
    if (elBal) elBal.innerText = balance.toLocaleString() + ' 円';
    
    const marginLimit = parseInt(document.getElementById('input-margin-limit').value) || 200000;
    const elMargin = document.getElementById('sim-margin-limit');
    if (elMargin) elMargin.innerText = marginLimit.toLocaleString() + ' 円';
    
    const entryPct = parseInt(document.getElementById('input-entry').value) || 15;
    const fullPct = parseInt(document.getElementById('input-full').value) || 60;
    
    const entryAmount = Math.floor(marginLimit * (entryPct / 100.0));
    const elEntryBud = document.getElementById('sim-entry-budget');
    if (elEntryBud) elEntryBud.innerText = `${entryAmount.toLocaleString()} 円 (${entryPct}%)`;
    
    const LEVERAGE = 25;
    
    // Parse currencies
    let baseCurrency = "USD";
    let quoteCurrency = "JPY";
    if (symbol.includes("_")) {
        baseCurrency = symbol.split('_')[0];
        quoteCurrency = symbol.split('_')[1];
    }
    
    // JPY rate approximations for simulator
    const jpyRates = {
        "USD": 150.0, "EUR": 170.0, "GBP": 200.0, 
        "AUD": 100.0, "NZD": 90.0, "CAD": 110.0, 
        "CHF": 170.0, "SGD": 116.0, "JPY": 1.0
    };
    
    let baseJpyRate = jpyRates[baseCurrency] || 150.0;
    let quoteJpyRate = jpyRates[quoteCurrency] || 150.0;
    
    if (quoteCurrency === "JPY") {
        baseJpyRate = rate;
        quoteJpyRate = 1.0;
    }
    
    const isJpy = quoteCurrency === "JPY";
    const pipSize = isJpy ? 0.01 : 0.0001;
    
    // 1. 1日の最大損失ライン
    const dailyLossPct = parseFloat(document.getElementById('input-daily-loss').value) || 3.0;
    const dailyLossAmt = Math.floor(marginLimit * (dailyLossPct / 100.0));
    
    // 損失許容額
    const entryRiskAllowance = dailyLossAmt * 0.5;
    const fullRiskAllowance = dailyLossAmt * 1.0;
    
    // 2. 証拠金ベースUnits計算
    const marginBaseEntryUnits = Math.floor((entryAmount * LEVERAGE) / baseJpyRate);
    const marginBaseMaxUnits = Math.floor((marginLimit * (fullPct / 100.0) * LEVERAGE) / baseJpyRate);
    
    // 安全上限の判定 (バックエンドの設定を優先)
    const mode = document.getElementById('input-auto-budget') ? document.getElementById('input-auto-budget').value : 'normal';
    let tradeUnitLimit = 25000;
    let fullPosLimit = 60000;
    if (bot_state_limits && bot_state_limits.trade_unit_map && bot_state_limits.full_pos_map) {
        tradeUnitLimit = bot_state_limits.trade_unit_map[mode] || bot_state_limits.trade_unit_map['normal'];
        fullPosLimit = bot_state_limits.full_pos_map[mode] || bot_state_limits.full_pos_map['normal'];
    }
    
    // 絶対防衛損切り
    const lossCutPct = parseFloat(document.getElementById('input-loss-cut').value) || 1.0;
    const lossCutPips = (rate * (lossCutPct / 100.0)) / pipSize;
    const pipValuePerUnit = pipSize * quoteJpyRate;
    
    // 3. リスク許容Units計算
    let riskAllowedEntryUnits = 0;
    let riskAllowedFullUnits = 0;
    if (pipValuePerUnit > 0 && lossCutPips > 0) {
        riskAllowedEntryUnits = Math.floor(entryRiskAllowance / (pipValuePerUnit * lossCutPips));
        riskAllowedFullUnits = Math.floor(fullRiskAllowance / (pipValuePerUnit * lossCutPips));
    }
    
    // 4. 最終Units計算
    const finalEntryUnits = Math.min(marginBaseEntryUnits, riskAllowedEntryUnits, tradeUnitLimit);
    const finalFullUnits = Math.min(marginBaseMaxUnits, riskAllowedFullUnits, fullPosLimit);
    
    // 理由判定
    let entryAdjReason = "調整なし";
    if (finalEntryUnits === riskAllowedEntryUnits && riskAllowedEntryUnits < marginBaseEntryUnits && riskAllowedEntryUnits <= tradeUnitLimit) {
        entryAdjReason = "損失許容額に合わせて自動縮小";
    } else if (finalEntryUnits === tradeUnitLimit && tradeUnitLimit < marginBaseEntryUnits) {
        entryAdjReason = "安全上限に合わせて自動縮小";
    }
    
    let fullAdjReason = "調整なし";
    if (finalFullUnits === riskAllowedFullUnits && riskAllowedFullUnits < marginBaseMaxUnits && riskAllowedFullUnits <= fullPosLimit) {
        fullAdjReason = "損失許容額に合わせて自動縮小";
    } else if (finalFullUnits === fullPosLimit && fullPosLimit < marginBaseMaxUnits) {
        fullAdjReason = "安全上限に合わせて自動縮小";
    }
    
    const lossCutAmtEntryPre = Math.floor(marginBaseEntryUnits * pipValuePerUnit * lossCutPips);
    const lossCutAmtEntryPost = Math.floor(finalEntryUnits * pipValuePerUnit * lossCutPips);
    const lossCutAmtMaxPre = Math.floor(marginBaseMaxUnits * pipValuePerUnit * lossCutPips);
    const lossCutAmtMaxPost = Math.floor(finalFullUnits * pipValuePerUnit * lossCutPips);
    
    const elEntryUnits = document.getElementById('sim-entry-units');
    if (elEntryUnits) {
        elEntryUnits.innerHTML = `
            <table style="width:100%; border-collapse:collapse; margin-top:5px;">
                <tr><td style="padding:4px; color:#aaa;">証拠金ベース:</td><td style="padding:4px; text-align:right;">${marginBaseEntryUnits.toLocaleString()} Units</td></tr>
                <tr><td style="padding:4px; color:#aaa;">リスク許容:</td><td style="padding:4px; text-align:right;">${riskAllowedEntryUnits.toLocaleString()} Units</td></tr>
                <tr><td style="padding:4px; color:#aaa;">安全上限:</td><td style="padding:4px; text-align:right;">${tradeUnitLimit.toLocaleString()} Units</td></tr>
                <tr style="border-top:1px dashed #555; background:rgba(255,221,87,0.1);">
                    <td style="padding:6px; color:#ffdd57; font-weight:bold;">最終発注予定:</td>
                    <td style="padding:6px; text-align:right; color:#ffdd57; font-weight:bold; font-size:1.1rem;">${finalEntryUnits.toLocaleString()} Units</td>
                </tr>
            </table>
            <div style="font-size:0.8rem; color:#aaa; margin-top:8px;">調整理由: <span style="color:#fff;">${entryAdjReason}</span></div>
        `;
    }
    
    const elMaxUnits = document.getElementById('sim-max-units');
    if (elMaxUnits) {
        elMaxUnits.innerHTML = `
            <table style="width:100%; border-collapse:collapse; margin-top:5px;">
                <tr><td style="padding:4px; color:#888;">証拠金ベース:</td><td style="padding:4px; text-align:right;">${marginBaseMaxUnits.toLocaleString()} Units</td></tr>
                <tr><td style="padding:4px; color:#888;">リスク許容:</td><td style="padding:4px; text-align:right;">${riskAllowedFullUnits.toLocaleString()} Units</td></tr>
                <tr><td style="padding:4px; color:#888;">安全上限:</td><td style="padding:4px; text-align:right;">${fullPosLimit.toLocaleString()} Units</td></tr>
                <tr style="border-top:1px dashed #555;">
                    <td style="padding:6px; font-weight:bold;">最終フルポジ:</td>
                    <td style="padding:6px; text-align:right; font-weight:bold; font-size:1.0rem;">${finalFullUnits.toLocaleString()} Units</td>
                </tr>
            </table>
            <div style="font-size:0.8rem; color:#aaa; margin-top:8px;">調整理由: <span style="color:#fff;">${fullAdjReason}</span></div>
        `;
    }
    
    const pipJpyEntry = finalEntryUnits * pipValuePerUnit;
    const pipJpyMax = finalFullUnits * pipValuePerUnit;
    
    const elPipVal = document.getElementById('sim-pip-value');
    if (elPipVal) elPipVal.innerHTML = `約 ${Math.floor(pipJpyEntry).toLocaleString()} 円 <br><span style="font-size:0.8rem; color:#aaa;">(計算レート: ${quoteCurrency}/JPY ${quoteJpyRate}円)</span>`;
    
    const trailingPct = parseFloat(document.getElementById('input-trailing-stop').value) || 0.2;
    const trailingPips = (rate * (trailingPct / 100.0)) / pipSize;
    const trailingProfitEntry = Math.floor(pipJpyEntry * trailingPips);
    const trailingProfitMax = Math.floor(pipJpyMax * trailingPips);
    
    const elTrail = document.getElementById('sim-trailing-profit');
    if (elTrail) {
        elTrail.innerHTML = `<span style="font-size:0.85rem; color:#00f0ff;">(想定: 約${trailingPips.toFixed(1)} pips)</span><br>(初回) 約 +${trailingProfitEntry.toLocaleString()} 円<br><span style="font-size:0.85rem; color:#aaa;">(フルポジ) 約 +${trailingProfitMax.toLocaleString()} 円</span>`;
    }
    
    const elLoss = document.getElementById('sim-loss-cut');
    if (elLoss) {
        elLoss.innerHTML = `
            <span style="font-size:0.85rem; color:#ff3366;">(想定: 約${lossCutPips.toFixed(1)} pips)</span>
            <table style="width:100%; border-collapse:collapse; margin-top:5px; font-size:0.85rem;">
                <tr><th style="padding:4px; text-align:left; color:#aaa;">種別</th><th style="padding:4px; text-align:right; color:#aaa;">調整前損失</th><th style="padding:4px; text-align:right; color:#aaa;">調整後損失</th><th style="padding:4px; text-align:right; color:#aaa;">許容額</th></tr>
                <tr>
                    <td style="padding:4px; color:#ffb3c6;">初回打診</td>
                    <td style="padding:4px; text-align:right; text-decoration:line-through; color:#aaa;">-${lossCutAmtEntryPre.toLocaleString()}円</td>
                    <td style="padding:4px; text-align:right; font-weight:bold; color:#ff3366;">-${lossCutAmtEntryPost.toLocaleString()}円</td>
                    <td style="padding:4px; text-align:right;">${entryRiskAllowance.toLocaleString()}円</td>
                </tr>
                <tr>
                    <td style="padding:4px; color:#aaa;">フルポジ</td>
                    <td style="padding:4px; text-align:right; text-decoration:line-through; color:#888;">-${lossCutAmtMaxPre.toLocaleString()}円</td>
                    <td style="padding:4px; text-align:right; color:#aaa;">-${lossCutAmtMaxPost.toLocaleString()}円</td>
                    <td style="padding:4px; text-align:right; color:#888;">${fullRiskAllowance.toLocaleString()}円</td>
                </tr>
            </table>
        `;
    }
    
    const elDaily = document.getElementById('sim-daily-loss');
    if (elDaily) elDaily.innerText = `約 -${dailyLossAmt.toLocaleString()} 円`;
}

// 初期描画
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof updateSimulator === 'function') updateSimulator();
    }, 1000);
    
    // 安全起動警告メッセージの表示
    if (!sessionStorage.getItem('startupWarningShown')) {
        sessionStorage.setItem('startupWarningShown', 'true');
        setTimeout(() => {
            const toast = document.getElementById('save-toast');
            if (toast) {
                toast.innerText = "🛡️ 安全のため、アプリ起動時は自動売買OFFで開始します。\n設定・保有ポジション・発注シミュレーターを確認してから手動でONにしてください。";
                toast.style.color = '#ffdd57';
                toast.style.background = 'rgba(255, 221, 87, 0.1)';
                toast.style.display = 'block';
                toast.style.padding = '15px';
                toast.style.lineHeight = '1.5';
                toast.style.fontSize = '0.9rem';
                setTimeout(() => { toast.style.display = 'none'; }, 10000);
            }
        }, 2000);
    }
});


function renderCurrencyScores(scores) {
    const tbody = document.getElementById('currency-scores-tbody');
    if (!tbody) return;
    
    if (!scores || scores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:15px; color:#aaa;">データがありません</td></tr>';
        return;
    }
    
    // ソート: OK優先、次にスコア降順
    scores.sort((a, b) => {
        if (a.status === 'OK' && b.status !== 'OK') return -1;
        if (a.status !== 'OK' && b.status === 'OK') return 1;
        return b.score - a.score;
    });
    
    let html = '';
    let bestSym = null;
    let bestReason = null;
    
    scores.forEach(s => {
        if (s.status === 'OK' && !bestSym) {
            bestSym = s.symbol;
            bestReason = s.selected_reason;
        }
        
        const isOk = s.status === 'OK';
        const statusColor = isOk ? 'var(--profit-green)' : 'var(--loss-red)';
        const statusText = isOk ? '✅ 候補' : '🚫 見送り';
        
        const baseRate = s.base_jpy ? s.base_jpy.toFixed(3) : '---';
        const quoteRate = s.quote_jpy ? s.quote_jpy.toFixed(3) : '---';
        
        const trStyle = isOk ? 'background: rgba(0,240,255,0.05);' : '';
        
        
        const mode = document.getElementById('input-auto-budget') ? document.getElementById('input-auto-budget').value : 'normal';
        let tLimit = 25000;
        let fLimit = 60000;
        if (bot_state_limits && bot_state_limits.trade_unit_map) {
            tLimit = bot_state_limits.trade_unit_map[mode] || 25000;
            fLimit = bot_state_limits.full_pos_map[mode] || 60000;
        }

        const tradeableStr = s.tradeable !== undefined ? (s.tradeable ? '<span style="color:var(--profit-green);">OK</span>' : '<span style="color:var(--loss-red);">NG</span>') : '---';
        const entryLimitColor = (s.entry_units && s.entry_units > tLimit) ? 'var(--loss-red)' : '#00f0ff';
        const fullLimitColor = (s.full_units && s.full_units > fLimit) ? 'var(--loss-red)' : '#00f0ff';
        
        const lossCutEntryLimit = s.loss_cut_entry_limit ? Math.floor(s.loss_cut_entry_limit).toLocaleString() : '---';
        const lossCutFullLimit = s.loss_cut_full_limit ? Math.floor(s.loss_cut_full_limit).toLocaleString() : '---';
        
        const entryLossColor = (s.loss_cut_entry && s.loss_cut_entry_limit && s.loss_cut_entry > s.loss_cut_entry_limit) ? 'var(--loss-red)' : '#aaa';
        const fullLossColor = (s.loss_cut_full && s.loss_cut_full_limit && s.loss_cut_full > s.loss_cut_full_limit) ? 'var(--loss-red)' : '#aaa';

        const margin_base_entry = s.margin_base_entry_units ? s.margin_base_entry_units.toLocaleString() : '---';
        const risk_base_entry = s.risk_base_entry_units ? s.risk_base_entry_units.toLocaleString() : '---';
        const margin_base_full = s.margin_base_full_units ? s.margin_base_full_units.toLocaleString() : '---';
        const risk_base_full = s.risk_base_full_units ? s.risk_base_full_units.toLocaleString() : '---';
        
        let reasonHtml = s.reason || '';
        if (s.adjustment_reason) {
            reasonHtml = `<span style="color:var(--profit-green); font-size:0.7rem; display:block; margin-bottom:4px;">${s.adjustment_reason}</span>` + reasonHtml;
        }

        html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.1); ${trStyle}">
            <td style="padding:8px; font-weight:bold; color:${isOk ? '#00f0ff' : '#ccc'};">${s.symbol}</td>
            <td style="padding:8px; font-weight:bold;">${tradeableStr}</td>
            <td style="padding:8px;">${s.rate ? s.rate.toFixed(4) : '---'}</td>
            <td style="padding:8px;">${s.spread_pips !== undefined ? s.spread_pips.toFixed(1) : '---'} pips</td>
            <td style="padding:8px; color:#aaa; font-size:0.8rem;">初: ${margin_base_entry}<br>フ: ${margin_base_full}</td>
            <td style="padding:8px; color:#aaa; font-size:0.8rem;">初: ${risk_base_entry}<br>フ: ${risk_base_full}</td>
            <td style="padding:8px; color:#aaa; font-size:0.8rem;">初: ${tLimit.toLocaleString()}<br>フ: ${fLimit.toLocaleString()}</td>
            <td style="padding:8px; color:${entryLimitColor}; font-weight:bold;">初: ${s.entry_units ? s.entry_units.toLocaleString() : '---'}<br><span style="color:${fullLimitColor}; font-weight:normal; font-size:0.8rem;">フ: ${s.full_units ? s.full_units.toLocaleString() : '---'}</span></td>
            <td style="padding:8px; color:var(--profit-green); font-size:0.8rem;">¥${s.trail_profit_entry ? s.trail_profit_entry.toLocaleString() : '---'} <br> ¥${s.trail_profit_full ? s.trail_profit_full.toLocaleString() : '---'}</td>
            <td style="padding:8px; color:var(--loss-red); font-size:0.8rem;">¥-${s.loss_cut_entry ? s.loss_cut_entry.toLocaleString() : '---'} <span style="font-size:0.7rem; color:${entryLossColor};">(許: ${lossCutEntryLimit})</span><br> ¥-${s.loss_cut_full ? s.loss_cut_full.toLocaleString() : '---'} <span style="font-size:0.7rem; color:${fullLossColor};">(許: ${lossCutFullLimit})</span></td>
            <td style="padding:8px; font-size:0.8rem;">R: ${s.rsi ? s.rsi.toFixed(1) : '---'}<br>M: ${s.macd ? s.macd.toFixed(4) : '---'}</td>
            <td style="padding:8px; color:${statusColor}; font-weight:bold;">${statusText}</td>
            <td style="padding:8px; color:#ffb3c6; font-size:0.8rem; white-space:normal; min-width:150px;">${reasonHtml}</td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
    
    const elDisplay = document.getElementById('best-sym-display');
    const elReason = document.getElementById('best-sym-reason');
    if (elDisplay && elReason) {
        if (bestSym) {
            elDisplay.innerText = bestSym;
            elReason.innerText = bestReason;
        } else {
            elDisplay.innerText = "条件を満たすペアなし";
            elReason.innerText = "全ペアが安全フィルターにより除外されました";
        }
    }
}

// ==========================================
// ログ履歴管理機能 (Decision Logs & Daily Summary)
// ==========================================
let allDecisionLogs = [];
let currentLogFilter = 'all';

function fetchDecisionLogs() {
    fetch('/api/decision_logs')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                allDecisionLogs = data.data;
                try {
                    renderDecisionLogs();
                } catch (e) {
                    console.error('[履歴ログ描画ERROR]', e);
                    const tbody = document.getElementById('decision-log-tbody');
                    if(tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:var(--loss-red);">描画エラー: ${e.message}</td></tr>`;
                }
            } else {
                throw new Error(data.message || 'API responded with error status');
            }
        })
        .catch(err => {
            console.error('[履歴ログ取得ERROR] fetch failed: /api/decision_logs ', err);
            const tbody = document.getElementById('decision-log-tbody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:var(--loss-red);">ログ取得に失敗しました: ${err.message}</td></tr>`;
            }
        });
        
    fetch('/api/daily_summary')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                try {
                    updateDailySummary(data.data);
                } catch (e) {
                    console.error('[日次サマリー描画ERROR]', e);
                    const container = document.getElementById('skip-reasons-container');
                    if(container) container.innerHTML = `<div style="color:var(--loss-red); font-size:0.9rem;">描画エラー: ${e.message}</div>`;
                }
            } else {
                throw new Error(data.message || 'API responded with error status');
            }
        })
        .catch(err => {
            console.error('[日次サマリー取得ERROR] fetch failed: /api/daily_summary ', err);
            const container = document.getElementById('skip-reasons-container');
            if (container) {
                container.innerHTML = `<div style="color:var(--loss-red); font-size:0.9rem;">集計データの取得に失敗しました: ${err.message}</div>`;
            }
        });
}

function updateDailySummary(summary) {
    const elAi = document.getElementById('summary-ai-decisions');
    if(elAi) elAi.innerText = summary.ai_decisions;
    
    const elSkips = document.getElementById('summary-skips');
    if(elSkips) elSkips.innerText = summary.skips;
    
    const elDry = document.getElementById('summary-dry-runs');
    if(elDry) elDry.innerText = summary.dry_runs;
    
    const elReal = document.getElementById('summary-real-orders');
    if(elReal) elReal.innerText = summary.real_orders;
    
    const container = document.getElementById('skip-reasons-container');
    if (container && summary.skip_reasons) {
        const reasons = Object.entries(summary.skip_reasons).sort((a, b) => b[1] - a[1]);
        if (reasons.length > 0) {
            container.innerHTML = '';
            reasons.forEach(([reason, count]) => {
                const div = document.createElement('div');
                div.style.padding = "8px 0";
                div.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
                div.style.display = "flex";
                div.style.justifyContent = "space-between";
                div.innerHTML = `<span style="color:#ddd; font-size:0.9rem;">${reason}</span> <span style="color:var(--accent-color); font-weight:bold;">${count} 回</span>`;
                container.appendChild(div);
            });
        } else {
            container.innerHTML = '<div style="color:#aaa; font-size:0.9rem;">まだ見送り記録はありません。</div>';
        }
    }
}

function renderDecisionLogs() {
    const tbody = document.getElementById('decision-log-tbody');
    if (!tbody) return;
    
    if (!allDecisionLogs || allDecisionLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#aaa;">ログデータがありません</td></tr>';
        return;
    }
    
    let filteredLogs = allDecisionLogs;
    if (currentLogFilter !== 'all') {
        filteredLogs = allDecisionLogs.filter(log => log.log_type === currentLogFilter);
    }
    
    if (filteredLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#aaa;">該当するログがありません</td></tr>';
        return;
    }
    
    let html = '';
    filteredLogs.forEach(log => {
        let rowClass = '';
        let badgeClass = '';
        if (log.log_type === 'DRY RUN') { rowClass = 'row-dry-run'; badgeClass = 'dry-run'; }
        else if (log.log_type === 'エラー') { rowClass = 'row-error'; badgeClass = 'error'; }
        else if (log.log_type === '発注') { rowClass = 'row-real-order'; badgeClass = 'order'; }
        else if (log.log_type === '見送り') badgeClass = 'skip';
        else if (log.log_type === '決済') badgeClass = 'close';
        else badgeClass = 'ai';
        
        let msgReason = '';
        if (log.log_type === 'エラー') {
            msgReason = log.real_order?.fail_reason || '';
        } else if (log.log_type === 'DRY RUN' || log.log_type === '発注') {
            msgReason = log.order?.message || '';
        } else if (log.log_type === '見送り') {
            msgReason = log.skip_reason || '';
        } else {
            msgReason = log.skip_reason || '';
        }
        
        const safetyHtml = log.safety ? (log.safety.is_safe ? '<span style="color:var(--profit-green);">OK</span>' : '<span style="color:var(--loss-red);">NG</span>') : '---';
        const unitsInfo = log.order ? `${Number(log.order.units).toLocaleString()}` : (log.safety ? `${Number(log.safety.final_units).toLocaleString()}` : '---');
        const lossInfo = log.order ? `(許容: ${Number(log.order.allowed_loss).toLocaleString()})` : (log.safety ? `(許容: ${Number(log.safety.allowed_loss).toLocaleString()})` : '');
        
        html += `<tr class="${rowClass}">
            <td>${log.timestamp || '---'}</td>
            <td><span class="badge ${badgeClass}">${log.log_type}</span></td>
            <td style="font-weight:bold; color:#00f0ff;">${log.symbol || '---'}</td>
            <td>${log.direction || '---'}</td>
            <td style="color:#aaa;">R: ${log.rsi?.toFixed(1) || '---'}<br>M: ${log.macd?.toFixed(4) || '---'}</td>
            <td style="font-weight:bold;">${log.final_decision || '---'}</td>
            <td style="font-weight:bold;">${safetyHtml}</td>
            <td>${unitsInfo}<br><span style="font-size:0.8rem; color:#aaa;">${lossInfo}</span></td>
            <td style="white-space:normal; min-width:200px; color:#ddd; font-size:0.8rem;">${msgReason}</td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
}

// フィルターボタンのイベント
document.addEventListener('DOMContentLoaded', () => {
    const filterBtns = document.querySelectorAll('.log-filters .filter-btn');
    if (filterBtns.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentLogFilter = btn.dataset.filter;
                renderDecisionLogs();
            });
        });
    }
});

// 定期フェッチ開始
fetchDecisionLogs();
setInterval(fetchDecisionLogs, 10000);
