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
    
    // ランクに応じてオーブの数を増やす
    let particleCount = 100;
    if (rank >= 5) particleCount = 150;
    if (rank >= 10) particleCount = 200;
    if (rank >= 20) particleCount = 300;
    
    // 色のバリエーション（金、白、薄紫、薄青）
    const colors = [
        {r: 255, g: 223, b: 128}, // ゴールド
        {r: 255, g: 255, b: 255}, // 白
        {r: 224, g: 176, b: 255}, // 薄紫
        {r: 176, g: 224, b: 255}  // 薄青
    ];
    
    for (let i = 0; i < particleCount; i++) {
        const colorBase = colors[Math.floor(Math.random() * colors.length)];
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height, // 最初から画面全体に散らす
            radius: Math.random() * 2.5 + 0.5,
            speed: Math.random() * 1.0 + 0.2, // 少しゆっくり
            opacity: Math.random(),
            drift: Math.random() * 1 - 0.5,
            colorBase: colorBase
        });
    }
    
    function drawOrbs() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            p.y -= p.speed;
            p.x += Math.sin(p.y * 0.01) * p.drift;
            
            p.opacity += (Math.random() - 0.5) * 0.05;
            if (p.opacity > 0.8) p.opacity = 0.8;
            if (p.opacity < 0.1) p.opacity = 0.1;
            
            if (p.y < -20) {
                p.y = canvas.height + 20;
                p.x = Math.random() * canvas.width;
            }
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.colorBase.r}, ${p.colorBase.g}, ${p.colorBase.b}, ${p.opacity})`;
            ctx.shadowBlur = 10;
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
    
    // マスター判定とUI変更
    let rank = getMasterRank();
    const hasMasterFlag = localStorage.getItem('noa_tarot_master') === 'true';
    
    // 【重要】テスト中、および過去にコンプリートしたユーザーの互換性のため
    // コンプリートフラグが立っているのにカード引取回数が記録上で足りていない場合は、
    // 最低限「ランク1（MASTER）」として扱います。
    if (hasMasterFlag && rank === 0) {
        rank = 1;
    }
    
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
            borderColor = '#ff4d4d';
            boxShad = '0 0 30px rgba(255, 77, 77, 0.6)';
            descText = 'すべてのカードを黄金に輝かせた<br>栄光なる真理の探求者。<br>王者の到達 (全カード10回以上達成)';
            textColor = '#ff9999';
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
