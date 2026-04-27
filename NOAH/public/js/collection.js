function openCollectionModal() {
    const modal = document.getElementById('collection-modal');
    if (!modal) return;
    
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
            
            cardItem.innerHTML = `
                <div class="col-img-wrapper">
                    <img src="${imgPath}" alt="${cardData.name}" onerror="this.src='/images/logo.jpg'">
                </div>
                <div class="col-name">${cardData.number}<br>${cardData.nameJs}</div>
            `;
            // クリック時に詳細モーダルを表示
            cardItem.onclick = () => {
                document.getElementById('detail-card-name').textContent = `【${cardData.number}】${cardData.nameJs}`;
                document.getElementById('detail-card-img').src = imgPath;
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
    document.getElementById('fullscreen-img').src = src;
    document.getElementById('fullscreen-image-modal').classList.remove('hidden');
}

function closeFullscreenImage() {
    document.getElementById('fullscreen-image-modal').classList.add('hidden');
}
