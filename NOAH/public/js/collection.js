// マスターランクの判定（全24カードの最小引取回数）
function getMasterRank() {
    let minCount = Infinity;
    for (let i = 0; i < 24; i++) {
        let count = 0;
        try {
            const statStr = localStorage.getItem(`tarot_card_${i}`);
            if (statStr) {
                const stat = JSON.parse(statStr);
                count = stat.count || 0;
            }
        } catch(e) {}
        if (count < minCount) minCount = count;
    }
    if (minCount === Infinity) minCount = 0;
    
    if (minCount >= 20) return 20; // PERFECT MASTER
    if (minCount >= 10) return 10; // ROYAL MASTER
    if (minCount >= 5) return 5;   // GRAND MASTER
    if (minCount >= 1) return 1;   // MASTER
    return 0;
}

// オーブアニメーションのID保持用
window.collectionOrbAnimationId = null;

function startCollectionOrbs(rank = 1) {
    const canvas = document.getElementById('collection-orb-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    let particles = [];
    
    // ランクに応じた設定
    let particleCount = 100;
    let speedMult = 1.0;
    let sizeMult = 1.0;
    let colors = [
        {r: 255, g: 223, b: 128}, // ゴールド
        {r: 255, g: 255, b: 255}  // 白
    ];

    if (rank >= 20) {
        // PERFECT MASTER: 虹色・超高速・大乱舞
        particleCount = 400;
        speedMult = 3.5;
        sizeMult = 1.8;
        colors = [
            {r: 255, g: 100, b: 100}, // 赤
            {r: 255, g: 200, b: 100}, // オレンジ
            {r: 255, g: 255, b: 100}, // 黄
            {r: 100, g: 255, b: 100}, // 緑
            {r: 100, g: 200, b: 255}, // 水色
            {r: 100, g: 100, b: 255}, // 青
            {r: 200, g: 100, b: 255}, // 紫
            {r: 255, g: 255, b: 255}  // 白
        ];
    } else if (rank >= 10) {
        // ROYAL MASTER: プラチナ＆ローズゴールド・高速・煌びやか
        particleCount = 250;
        speedMult = 2.0;
        sizeMult = 1.4;
        colors = [
            {r: 223, g: 197, b: 160}, // シャンパン
            {r: 255, g: 240, b: 245}, // ピンクがかった白
            {r: 255, g: 215, b: 0},   // 黄金
            {r: 255, g: 255, b: 255}  // 白
        ];
    } else if (rank >= 5) {
        // GRAND MASTER: 金と白と少しの紫・少し速い・リッチ
        particleCount = 150;
        speedMult = 1.3;
        sizeMult = 1.2;
        colors = [
            {r: 255, g: 223, b: 128}, // ゴールド
            {r: 255, g: 255, b: 255}, // 白
            {r: 224, g: 176, b: 255}  // 薄紫
        ];
    }
    
    for (let i = 0; i < particleCount; i++) {
        const colorBase = colors[Math.floor(Math.random() * colors.length)];
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: (Math.random() * 2.5 + 0.5) * sizeMult,
            speed: (Math.random() * 1.5 + 0.2) * speedMult,
            opacity: Math.random(),
            drift: (Math.random() * 2 - 1) * speedMult,
            colorBase: colorBase,
            blinkSpeed: Math.random() * 0.05 + 0.01 // 点滅速度
        });
    }
    
    function drawOrbs() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            p.y -= p.speed;
            p.x += Math.sin(p.y * 0.01) * p.drift;
            
            // 激しい瞬き
            p.opacity += (Math.random() - 0.5) * p.blinkSpeed * (rank >= 20 ? 3 : 1);
            if (p.opacity > 1.0) p.opacity = 1.0;
            if (p.opacity < 0.1) p.opacity = 0.1;
            
            if (p.y < -20) {
                p.y = canvas.height + 20;
                p.x = Math.random() * canvas.width;
            }
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.colorBase.r}, ${p.colorBase.g}, ${p.colorBase.b}, ${p.opacity})`;
            ctx.shadowBlur = 10 * sizeMult;
            ctx.shadowColor = `rgb(${p.colorBase.r}, ${p.colorBase.g}, ${p.colorBase.b})`;
            ctx.fill();
        });
        
        window.collectionOrbAnimationId = requestAnimationFrame(drawOrbs);
    }
    
    drawOrbs();
}

function stopCollectionOrbs() {
    if (window.collectionOrbAnimationId) {
        cancelAnimationFrame(window.collectionOrbAnimationId);
        window.collectionOrbAnimationId = null;
    }
}

function openCollectionModal() {
    const modal = document.getElementById('collection-modal');
    if (!modal) return;
    
    // マスター判定とUI変更（公開時の安全性を高めるため、実際のカード引取回数で厳密に判定）
    const rank = getMasterRank();
    const isMaster = rank >= 1;
    
    // 従来のマスターフラグも一応セットしておく
    if (isMaster) localStorage.setItem('noa_tarot_master', 'true');
    
    const badgeContainer = document.getElementById('master-badge-container');
    const badgeImg = document.getElementById('master-badge-img');
    const modalContent = document.querySelector('#collection-modal .modal-content');
    
    if (isMaster) {
        if (badgeContainer) badgeContainer.classList.remove('hidden');
        
        // TAROT COLLECTIONのタイトル画像を非表示にする
        const titleContainer = document.getElementById('tarot-collection-title-container');
        if (titleContainer) titleContainer.classList.add('hidden');
        
        let badgeSrc = '/images/badge_noa_master.png';
        let borderColor = '#ffdf80';
        let boxShad = '0 0 30px rgba(197, 160, 89, 0.4)';
        let descText = 'すべてのアルカナとSPカードを解き明かした<br>真理の到達者の証。<br>コンプリート達成 (全カード1回以上)';
        let textColor = '#c5a059';
        
        if (rank >= 20) {
            badgeSrc = '/images/badge_noa_perfect_master.png';
            borderColor = 'transparent';
            boxShad = '0 0 40px rgba(255, 255, 255, 0.8), inset 0 0 20px rgba(255,255,255,0.5)';
            descText = 'すべてのカードの究極の姿を現出させた<br>神々しき全知の覇者。<br>完璧なる到達 (全カード20回以上達成)';
            textColor = '#ffffff';
        } else if (rank >= 10) {
            badgeSrc = '/images/badge_noa_royal_master.png';
            borderColor = '#dfc5a0'; // シャンパンゴールド/パール系の色
            boxShad = '0 0 30px rgba(223, 197, 160, 0.6)';
            descText = 'すべてのカードを黄金に輝かせた<br>栄光なる真理の探求者。<br>王者の到達 (全カード10回以上達成)';
            textColor = '#f2e4cf'; // 薄いシャンパン色
        } else if (rank >= 5) {
            badgeSrc = '/images/badge_noa_grand_master.png';
            borderColor = '#e6e6e6';
            boxShad = '0 0 30px rgba(230, 230, 230, 0.5)';
            descText = 'さらに深くタロットの世界を旅した<br>偉大なる導き手。<br>偉業達成 (全カード5回以上達成)';
            textColor = '#e6e6e6';
        }

        if (badgeImg) badgeImg.src = badgeSrc;

        if (modalContent) {
            modalContent.style.border = `2px solid ${borderColor}`;
            if (rank >= 20) {
                // 虹色ボーダー
                modalContent.style.borderImage = 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3) 1';
                modalContent.style.borderWidth = '3px';
                modalContent.style.borderStyle = 'solid';
            } else {
                modalContent.style.borderImage = 'none';
            }
            modalContent.style.boxShadow = boxShad;
            modalContent.style.background = 'radial-gradient(circle at center, #1a160d 0%, #0a0a0f 80%)';
        }
        
        // メッセージの切り替え
        const descNormal = document.getElementById('collection-desc-normal');
        const descMaster = document.getElementById('collection-desc-master');
        if (descNormal) descNormal.classList.add('hidden');
        if (descMaster) {
            descMaster.classList.remove('hidden');
            descMaster.innerHTML = descText;
            descMaster.style.color = textColor;
            descMaster.style.textShadow = `0 0 5px ${textColor}`;
        }

        // オーブ開始
        stopCollectionOrbs(); // 念のため停止してから
        startCollectionOrbs(rank);
    }

    // Render grid
    renderCollectionGrid();
    
    // Show modal
    modal.classList.remove('hidden');
}

function closeCollectionModal() {
    const modal = document.getElementById('collection-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    // オーブ停止
    stopCollectionOrbs();
}

function renderCollectionGrid() {
    const grid = document.getElementById('collection-grid');
    const countSpan = document.getElementById('collection-count');
    if (!grid || !countSpan) return;

    grid.innerHTML = '';

    // Load collection
    const COLLECTION_KEY = 'noa_tarot_collection';
    let collection = [];
    try {
        const stored = localStorage.getItem(COLLECTION_KEY);
        if (stored) {
            collection = JSON.parse(stored);
        }
    } catch(e) {}

    // Load stats
    const STATS_KEY = 'noa_tarot_stats';
    let stats = {};
    try {
        const storedStats = localStorage.getItem(STATS_KEY);
        if (storedStats) {
            stats = JSON.parse(storedStats);
        }
    } catch(e) {}

    countSpan.textContent = collection.length;

    // tarotDeck comes from tarot-data.js
    for (let i = 0; i < tarotDeck.length; i++) { // Include all cards including SP
        const isCollected = collection.includes(i);
        const cardData = tarotDeck[i];
        
        const cardItem = document.createElement('div');
        cardItem.className = 'collection-item ' + (isCollected ? 'collected' : 'locked');
        
        const imgName = cardData.name.toLowerCase().replace(/\s+/g, '_') + '.png';
        const imgPath = `/images/${imgName}`;

        if (isCollected) {
            const cardStats = stats[i] || { count: 1, dates: [] }; // fallback for older saves
            
            let glowClass = '';
            if (cardStats.count >= 20) glowClass = 'glow-rainbow';
            else if (cardStats.count >= 10) glowClass = 'glow-gold';
            else if (cardStats.count >= 7) glowClass = 'glow-strong';
            else if (cardStats.count >= 5) glowClass = 'glow-weak';
            
            cardItem.innerHTML = `
                <div class="col-img-wrapper ${glowClass}">
                    <img src="${imgPath}" alt="${cardData.name}" onerror="this.src='/images/logo.jpg'">
                </div>
                <div class="col-name">${cardData.number}<br>${cardData.nameJs}</div>
            `;
            // クリック時に詳細モーダルを表示
            cardItem.onclick = () => {
                document.getElementById('detail-card-name').textContent = `【${cardData.number}】${cardData.nameJs}`;
                const detailImg = document.getElementById('detail-card-img');
                const detailWrapper = document.getElementById('detail-card-wrapper');
                detailImg.src = imgPath;
                detailWrapper.className = glowClass;
                document.getElementById('detail-card-count').textContent = cardStats.count;
                document.getElementById('detail-card-keyword').textContent = cardData.keyword;
                document.getElementById('detail-card-message').textContent = cardData.message;
                
                let totalDraws = 0;
                Object.values(stats).forEach(s => totalDraws += (s.count || 0));
                
                let firstDrawnDate = cardStats.firstDate;
                if (!firstDrawnDate && cardStats.dates && cardStats.dates.length > 0) {
                    // 古い記録がない場合は一番古い記録を表示
                    firstDrawnDate = cardStats.dates[0].split(' ')[0];
                }
                document.getElementById('detail-card-first').textContent = firstDrawnDate || '未記録';

                let rate = '0.0%';
                if (totalDraws > 0) {
                    rate = ((cardStats.count / totalDraws) * 100).toFixed(1) + '%';
                }
                document.getElementById('detail-card-rate').textContent = rate;
                
                const datesList = document.getElementById('detail-card-dates');
                datesList.innerHTML = '';
                if (cardStats.dates && cardStats.dates.length > 0) {
                    cardStats.dates.forEach(d => {
                        const li = document.createElement('li');
                        li.textContent = '・' + d;
                        li.style.marginBottom = '2px';
                        datesList.appendChild(li);
                    });
                } else {
                    const li = document.createElement('li');
                    li.textContent = '・記録がありません';
                    datesList.appendChild(li);
                }

                document.getElementById('card-detail-modal').classList.remove('hidden');
            };
        } else {
            const isSP = i >= 22; // Indices 22 and 23 are SP/Guardian cards
            cardItem.innerHTML = `
                <div class="col-img-wrapper locked-wrapper ${isSP ? 'sp-locked-wrapper' : ''}">
                    <div class="${isSP ? 'sp-locked-icon' : 'locked-icon'}">${isSP ? 'SP' : '?'}</div>
                </div>
                <div class="col-name ${isSP ? 'sp-locked-name' : 'locked-name'}">${isSP ? 'SECRET' : 'LOCKED'}</div>
            `;
        }

        grid.appendChild(cardItem);
    }
}

function closeCardDetailModal() {
    const modal = document.getElementById('card-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function openFullscreenImage(src) {
    const detailWrapper = document.getElementById('detail-card-wrapper');
    const fullscreenWrapper = document.getElementById('fullscreen-wrapper');
    
    if (detailWrapper && fullscreenWrapper) {
        const glowClasses = Array.from(detailWrapper.classList).filter(c => c.startsWith('glow-'));
        fullscreenWrapper.className = glowClasses.join(' ');
    }
    
    document.getElementById('fullscreen-img').src = src;
    document.getElementById('fullscreen-image-modal').classList.remove('hidden');
}

function closeFullscreenImage() {
    document.getElementById('fullscreen-image-modal').classList.add('hidden');
}
