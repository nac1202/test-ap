/**
 * 守護トリオ（Top3カード）＆属性アドバイス描画ロジック ＆ インタラクティブ演出
 */

document.addEventListener('DOMContentLoaded', () => {
    initGuardianTrio();
});

function initGuardianTrio() {
    const container = document.getElementById('guardian-trio-section');
    if (!container) return;

    const STATS_KEY = 'noa_tarot_stats';
    const COLLECTION_KEY = 'noa_tarot_collection';

    let stats = {};
    let collection = [];

    try {
        const storedStats = localStorage.getItem(STATS_KEY);
        if (storedStats) stats = JSON.parse(storedStats);

        const storedCol = localStorage.getItem(COLLECTION_KEY);
        if (storedCol) collection = JSON.parse(storedCol);
    } catch(e) {
        console.error('Error loading tarot stats for guardian trio:', e);
    }

    // 獲得したカードの種類数
    const collectedCount = collection.length;

    // 3種類未満の場合はアンロックプレースホルダーを表示
    if (collectedCount < 3) {
        renderLockedState(container, collectedCount);
        return;
    }

    // 全24枚のタロットカードデータ（tarot-data.js から参照）
    if (typeof tarotDeck === 'undefined') {
        console.error('tarotDeck is not defined');
        return;
    }

    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    let cardStatsList = [];
    collection.forEach(cardIndex => {
        const stat = stats[cardIndex] || { count: 1, dates: [] };
        const cardData = tarotDeck[cardIndex];
        const elementInfo = CARD_ELEMENTS[cardIndex] || { type: 'FORTUNE', symbol: '💎', label: '引き寄せ' };

        let recentCount = 0;
        let lastDrawnDate = 0;
        if (stat.dates && Array.isArray(stat.dates)) {
            recentCount = stat.dates.filter(dateStr => {
                const d = new Date(dateStr);
                return !isNaN(d) && d >= twoWeeksAgo;
            }).length;
            
            if (stat.dates.length > 0) {
                const latest = new Date(stat.dates[stat.dates.length - 1]);
                if (!isNaN(latest)) {
                    lastDrawnDate = latest.getTime();
                }
            }
        }

        cardStatsList.push({
            index: cardIndex,
            name: cardData.name,
            nameJs: cardData.nameJs,
            number: cardData.number,
            keyword: cardData.keyword,
            message: cardData.message,
            luckyAction: cardData.luckyAction,
            count: stat.count || 1,
            recentCount: recentCount,
            lastDrawnDate: lastDrawnDate,
            type: elementInfo.type,
            symbol: elementInfo.symbol,
            label: elementInfo.label
        });
    });

    // 出現回数（count）の降順でソート
    // 同数の場合は過去2週間の出現回数（recentCount）が多い方を優先
    // それでも同じ場合は最後に出現した日付（lastDrawnDate）が新しい順
    cardStatsList.sort((a, b) => {
        if (b.count !== a.count) {
            return b.count - a.count;
        }
        if (b.recentCount !== a.recentCount) {
            return b.recentCount - a.recentCount;
        }
        return b.lastDrawnDate - a.lastDrawnDate;
    });

    // 上位3枚を取得
    const top3 = cardStatsList.slice(0, 3);

    // 3枚の属性キーをソートして作成
    const types = top3.map(c => c.type).sort();
    const patternKey = types.join('-');

    // アドバイスを取得（該当キーがない場合はデフォルトフォールバック）
    const advice = TRIO_ADVICE_PATTERNS[patternKey] || {
        title: "✨ 祝福された守護エネルギー",
        message: "あなたの守護カードたちが強力な幸運のオーラを放っています！直感を信じて進むことで素晴らしい引き寄せが起こります✨"
    };

    // 描画実行
    renderTrioSection(container, top3, advice);
}

// 🔒 3枚未満の場合の未解放表示
function renderLockedState(container, currentCount) {
    const needed = 3 - currentCount;
    container.innerHTML = `
        <div class="trio-card-box locked-box">
            <div class="trio-header">
                <h3 class="trio-title">✨ あなたの３大守護カード ✨</h3>
                <p class="trio-subtitle">占うほどに運命の守護トリオが明らかになります</p>
            </div>
            
            <div class="trio-locked-slots">
                <div class="locked-slot ${currentCount >= 1 ? 'unlocked' : ''}">
                    <span class="slot-rank">1st</span>
                    <span class="slot-icon">${currentCount >= 1 ? '🔮' : '🔒'}</span>
                </div>
                <div class="locked-slot ${currentCount >= 2 ? 'unlocked' : ''}">
                    <span class="slot-rank">2nd</span>
                    <span class="slot-icon">${currentCount >= 2 ? '🔮' : '🔒'}</span>
                </div>
                <div class="locked-slot">
                    <span class="slot-rank">3rd</span>
                    <span class="slot-icon">🔒</span>
                </div>
            </div>

            <div class="trio-locked-msg">
                あと <strong>${needed}枚</strong> 新しいカードを引くと<br>
                あなたの【守護トリオ＆総合メッセージ】が解放されます！
            </div>
        </div>
    `;
}

// 🔓 3枚以上ある場合の正規描画
function renderTrioSection(container, top3, advice) {
    const ranks = ['1st', '2nd', '3rd'];

    let cardsHtml = top3.map((card, idx) => {
        const imgName = card.name.toLowerCase().replace(/\s+/g, '_') + '.png';
        const imgPath = `/images/${imgName}`;
        
        return `
            <div class="trio-card-item rank-${idx + 1}" onclick="handleTrioCardClick(this, ${idx})" style="cursor: pointer;">
                <div class="trio-rank-badge">${ranks[idx]}</div>
                <div class="trio-img-wrapper">
                    <img src="${imgPath}" alt="${card.name}" onerror="this.src='/images/logo.jpg'">
                </div>
                <div class="trio-card-info">
                    <span class="trio-card-element">${card.symbol} ${card.label}</span>
                    <div class="trio-card-name">${card.nameJs}</div>
                    <div class="trio-card-count">${card.count}回出現</div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="trio-card-box">
            <div class="trio-header">
                <h3 class="trio-title">✨ あなたの３大守護カード ✨</h3>
                <p class="trio-subtitle">今日までの運気を象徴する最強のトリオ（タップで詳細）</p>
            </div>

            <div class="trio-cards-container">
                ${cardsHtml}
            </div>

            <div class="trio-advice-box">
                <div class="advice-header">
                    <div class="advice-icons-row">
                        <span class="advice-crystal">🔮</span>
                        <span class="advice-element-symbols">${top3.map(c => c.symbol).join('')}</span>
                    </div>
                    <h4 class="advice-title-text">${advice.title.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/u, '')}</h4>
                </div>
                <div class="advice-content">
                    ${advice.message}
                </div>
            </div>
        </div>
    `;

    // グローバル参照用に保存
    window.currentTrioTop3 = top3;
}

// 💥 カードタップ時のインタラクション処理
function handleTrioCardClick(element, index) {
    if (!window.currentTrioTop3 || !window.currentTrioTop3[index]) return;
    const card = window.currentTrioTop3[index];

    // 0. タップ時SE（効果音）の再生
    playTrioOpenSound();

    // 1. タップされたカード自体の軽量属性オーラ発光エフェクト
    triggerCardAuraPulse(element, card.type);

    // 2. 60fpsヌルヌル動作・超繊細キラメキ星屑スパーク生成
    spawnTrioSparkles(element, card.type);

    // 3. エフェクトを見せた後、450ms後にモーダルを開く
    setTimeout(() => {
        openTrioDetailModal(card, index);
    }, 450);
}

// 🎵 守護トリオカード選択SE再生
const trioOpenAudio = new Audio('/audio/trio_open.mp3');
trioOpenAudio.volume = 0.85;

function playTrioOpenSound() {
    try {
        trioOpenAudio.currentTime = 0;
        trioOpenAudio.play().catch(e => console.log('Trio SE autoplay prevented:', e));
    } catch(e) {
        console.error('Audio play error:', e);
    }
}

// 🌟 タップされたカード自体の属性オーラ波紋発光
function triggerCardAuraPulse(element, type) {
    element.classList.remove('trio-aura-pulse-passion', 'trio-aura-pulse-healing', 'trio-aura-pulse-fortune', 'trio-aura-pulse-miracle');
    void element.offsetWidth; // リフロー強制

    const auraClass = `trio-aura-pulse-${type.toLowerCase()}`;
    element.classList.add(auraClass);

    setTimeout(() => {
        element.classList.remove(auraClass);
    }, 1000);
}

// ✨ 超繊細＆60fps高速グラフィックパーティクル
function spawnTrioSparkles(container, type) {
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // 属性ごとの軽量カラーテーマ
    const themeMap = {
        'PASSION': { colors: ['#ff3333', '#ff9900', '#ffd700', '#ffffff'], sparkleClass: 'sparkle-passion' },
        'HEALING': { colors: ['#00e5ff', '#80d8ff', '#e0f7fa', '#ffffff'], sparkleClass: 'sparkle-healing' },
        'FORTUNE': { colors: ['#00ff87', '#ffd700', '#60efff', '#ffffff'], sparkleClass: 'sparkle-fortune' },
        'MIRACLE': { colors: ['#ff66cc', '#00ffff', '#ffeb3b', '#ffffff'], sparkleClass: 'sparkle-miracle' }
    };

    const theme = themeMap[type] || themeMap['FORTUNE'];
    // 描画負荷を抑えた極細18個の粒子
    const particleCount = 18;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        
        const particleType = i % 3;
        let typeClass = 'orb-star';
        if (particleType === 0) typeClass = 'cross-star';
        else if (particleType === 2) typeClass = 'tiny-star';

        particle.className = `trio-rich-sparkle ${typeClass}`;

        // 放射状にサラサラと広がる綺麗な軌道 (50px〜180px)
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() * 0.3 - 0.15);
        const distance = particleType === 2 ? (70 + Math.random() * 110) : (50 + Math.random() * 130);
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        const rot = Math.floor(Math.random() * 180);
        
        // スケール調整（極微小）
        let scale = 0.5 + Math.random() * 0.4;
        if (particleType === 2) scale = 0.3 + Math.random() * 0.3;

        const color = theme.colors[Math.floor(Math.random() * theme.colors.length)];

        particle.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            pointer-events: none;
            z-index: 6000;
            will-change: transform, opacity;
            --tx: ${tx.toFixed(1)}px;
            --ty: ${ty.toFixed(1)}px;
            --rot: ${rot}deg;
            --scale: ${scale.toFixed(2)};
            --color: ${color};
            animation: trioSmoothSparkleAnim 1.25s cubic-bezier(0.08, 0.85, 0.25, 1) forwards;
            animation-delay: ${(Math.random() * 0.08).toFixed(2)}s;
        `;

        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 1350);
    }
}

// 🔍 カード詳細モーダルの表示
function openTrioDetailModal(card, rankIndex) {
    const modal = document.getElementById('trio-detail-modal');
    if (!modal) return;

    const ranks = ['1st', '2nd', '3rd'];
    const roles = [
        '【主守護】あなたの本質・最大の強みを象徴するカード',
        '【サブ守護】主守護を引き立てる幸運のサポートカード',
        '【導き守護】未来の展開を好転させる開運メッセージ'
    ];

    const imgName = card.name.toLowerCase().replace(/\s+/g, '_') + '.png';
    const imgPath = `/images/${imgName}`;

    // 要素の更新
    const badgeEl = document.getElementById('trio-modal-rank-badge');
    if (badgeEl) badgeEl.textContent = ranks[rankIndex];

    const roleEl = document.getElementById('trio-modal-role');
    if (roleEl) roleEl.textContent = roles[rankIndex];

    const imgEl = document.getElementById('trio-modal-img');
    if (imgEl) imgEl.src = imgPath;

    const nameEl = document.getElementById('trio-modal-card-name');
    if (nameEl) nameEl.textContent = card.nameJs;

    const elemEl = document.getElementById('trio-modal-element-badge');
    if (elemEl) elemEl.textContent = `${card.symbol} ${card.label}属性`;

    const descEl = document.getElementById('trio-modal-desc');
    if (descEl) {
        descEl.innerHTML = `
            <div style="font-weight: bold; color: #ffd700; margin-bottom: 0.3rem;">キーワード: ${card.keyword}</div>
            <div>${card.message}</div>
            <div style="margin-top: 0.5rem; font-size: 0.75rem; color: #e8cca1;">✨ おすすめのラッキーアクション: ${card.luckyAction}</div>
        `;
    }

    const countEl = document.getElementById('trio-modal-count');
    if (countEl) countEl.textContent = card.count;

    // モーダルオープン
    modal.classList.remove('hidden');
}

// ❌ モーダルを閉じる
function closeTrioDetailModal() {
    const modal = document.getElementById('trio-detail-modal');
    if (modal) modal.classList.add('hidden');
}

// グローバル関数として登録
window.closeTrioDetailModal = closeTrioDetailModal;
