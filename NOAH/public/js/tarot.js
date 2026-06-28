document.addEventListener('DOMContentLoaded', () => {
    const cardDeck = document.getElementById('card-deck');
    const resultContainer = document.getElementById('result-container');
    const resultCard = document.getElementById('result-card');
    // const retryBtn = document.getElementById('retry-btn'); // Removed

    // Elements to populate
    const cardNumber = document.getElementById('card-number');
    const cardName = document.getElementById('card-name');
    const cardNameJs = document.getElementById('card-name-ja'); // New element
    const cardSymbol = document.querySelector('.card-symbol');
    const resultKeyword = document.getElementById('result-keyword');
    const resultMessage = document.getElementById('result-message');
    const luckyItem = document.getElementById('result-lucky');

    let isAnimating = false;
    // --- Sound effects ---
    const drawWaitAudio = new Audio('/audio/draw_wait.mp3.mp3');
    const drawNormalAudio = new Audio('/audio/draw_normal.mp3');
    const drawSpAudio = new Audio('/audio/draw_sp.mp3');
    
    // 音量調整（必要に応じて）
    drawWaitAudio.volume = 0.6;
    drawNormalAudio.volume = 0.8;
    drawSpAudio.volume = 0.9;
    const instruction = document.querySelector('.instruction');

    // Check for existing result on load
    const savedResult = getStoredDailyResult();
    if (savedResult !== null) {
        // コレクションに追加（すでに引いている今日のカードが未登録なら登録）
        saveToCollection(savedResult);
        // すでに占っている場合は、即座に結果を表示する
        cardDeck.style.display = 'none';
        resultContainer.classList.remove('hidden');
        showResult(savedResult);
        
        // ブラウザ次第で許可されればSEを鳴らす
        playRevealSound(savedResult);
    } else {
        // Wait for user interaction
        cardDeck.addEventListener('click', () => {
            if (isAnimating) return;
            playMagicSound();
            startDivination();
        });
    }

    function playMagicSound() {
        try {
            drawWaitAudio.currentTime = 0;
            drawWaitAudio.play().catch(e => console.log('Audio error:', e));
        } catch(e) {
            console.error('Audio play failed', e);
        }
    }

    // カードがめくれた瞬間のSE（SPと通常で分岐）
    function playRevealSound(cardIndex) {
        try {
            drawWaitAudio.pause();
            drawWaitAudio.currentTime = 0;

            const isSp = (cardIndex === 22 || cardIndex === 23);
            const audio = isSp ? drawSpAudio : drawNormalAudio;
            audio.currentTime = 0;
            audio.play().catch(e => console.log('Audio error:', e));
        } catch(e) {
            console.error('Audio play failed', e);
        }
    }

    // retryBtn removed

    function startDivination() {
        isAnimating = true;

        // 1. Shuffle Animation
        cardDeck.classList.add('shuffling');

        // Simulate shuffle time
        setTimeout(() => {
            cardDeck.classList.remove('shuffling');
            drawCard();
        }, 1500);
    }

    function getStoredDailyResult() {
        const STORAGE_KEY = 'noa_tarot_v1';
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`; // YYYY-M-D

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (data.date === todayStr) {
                    return data.cardIndex;
                }
            } catch (e) {
                console.error(e);
            }
        }
        return null;
    }

    function getOrGenerateDailyResult() {
        const existing = getStoredDailyResult();
        if (existing !== null) {
            saveToCollection(existing);
            return existing;
        }

        const STORAGE_KEY = 'noa_tarot_v1';
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`; // YYYY-M-D

        // --- SP Card & Guardian Deity Probability Logic ---
        // Currently 24 cards in deck (0-21: standard, 22: Guardian(SP), 23: Sanctuary(SP)).
        // Standard count is 22 (draws 0 to 21).
        const standardCardCount = 22; 
        
        let resCount = parseInt(localStorage.getItem('noa_reservation_count') || '0', 10);
        let spProbability = 0.002; // Base 0.2%
        spProbability += (resCount * 0.001); // +0.1% per reservation
        if (spProbability > 0.03) spProbability = 0.03; // Max 3%

        // 初回起動かどうかの判定 (コレクションが空なら初回)
        let isFirstTime = false;
        try {
            const storedCollection = localStorage.getItem('noa_tarot_collection');
            if (!storedCollection) {
                isFirstTime = true;
            } else {
                const collection = JSON.parse(storedCollection);
                if (Array.isArray(collection) && collection.length === 0) {
                    isFirstTime = true;
                }
            }
        } catch(e) {
            isFirstTime = true;
        }

        const excludedIndexes = [12, 13, 15, 16, 18]; // 吊るされた男(12), 死神(13), 悪魔(15), 塔(16), 月(18)

        let newIndex;
        let rand = Math.random();

        if (tarotDeck.length > 23 && rand < spProbability) {
            // Draw THE SANCTUARY (SP)
            newIndex = 23;
        } else if (tarotDeck.length > 22 && rand < (spProbability * 2)) {
            // Draw GUARDIAN DEITY (SP)
            newIndex = 22;
        } else {
            // Draw standard card (0 to 21)
            newIndex = Math.floor(Math.random() * standardCardCount);
            
            // 初回の場合、除外カードを引いたら引き直す
            if (isFirstTime) {
                while (excludedIndexes.includes(newIndex)) {
                    newIndex = Math.floor(Math.random() * standardCardCount);
                }
            }
        }

        const newData = {
            date: todayStr,
            cardIndex: newIndex
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
        
        // --- コレクションに追加 ---
        saveToCollection(newIndex);
        
        return newIndex;
    }

    // コレクション保存ロジック
    function saveToCollection(cardIndex) {
        const COLLECTION_KEY = 'noa_tarot_collection';
        const STATS_KEY = 'noa_tarot_stats';

        let collection = [];
        try {
            const stored = localStorage.getItem(COLLECTION_KEY);
            if (stored) {
                collection = JSON.parse(stored);
            }
        } catch(e) {}

        let stats = {};
        try {
            const storedStats = localStorage.getItem(STATS_KEY);
            if (storedStats) stats = JSON.parse(storedStats);
        } catch(e) {}

        // 統計情報の更新（1日1回だけカウントアップする）
        const now = new Date();
        const todayPrefix = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}`;
        const dateTimeStr = `${todayPrefix} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

        if (!stats[cardIndex]) {
            stats[cardIndex] = { count: 0, dates: [], firstDate: todayPrefix };
        } else if (!stats[cardIndex].firstDate && stats[cardIndex].dates.length > 0) {
            stats[cardIndex].firstDate = stats[cardIndex].dates[0].split(' ')[0];
        }

        const alreadyDrawnToday = stats[cardIndex].dates.some(d => d.startsWith(todayPrefix));
        if (!alreadyDrawnToday) {
            stats[cardIndex].count += 1;
            stats[cardIndex].dates.push(dateTimeStr);
            // 履歴が増えすぎないように直近20回までに制限（必要に応じて）
            if (stats[cardIndex].dates.length > 20) {
                stats[cardIndex].dates.shift();
            }
            localStorage.setItem(STATS_KEY, JSON.stringify(stats));
        }

        // コレクションのアンロック処理
        if (!collection.includes(cardIndex)) {
            collection.push(cardIndex);
            // 昇順にソートしておく
            collection.sort((a, b) => a - b);
            localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
            
            // コンプリート判定 (全24枚予定)
            if (collection.length === 24) {
                triggerCompletionEffect();
            }
        }
    }

    function triggerCompletionEffect() {
        // マスターフラグを保存
        localStorage.setItem('noa_tarot_master', 'true');

        setTimeout(() => {
            // モーダルを表示
            const completeModal = document.getElementById('complete-modal');
            if (completeModal) {
                completeModal.classList.remove('hidden');
            }

            // SEを再生
            try {
                const completeAudio = new Audio('/audio/complete.mp3');
                completeAudio.volume = 1.0;
                completeAudio.play().catch(e => console.log('Audio play failed', e));
            } catch(e) {
                console.error(e);
            }

            // オーブエフェクト
            const canvas = document.getElementById('orb-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                
                let particles = [];
                const particleCount = 150;
                
                for (let i = 0; i < particleCount; i++) {
                    particles.push({
                        x: Math.random() * canvas.width,
                        y: canvas.height + Math.random() * 300,
                        radius: Math.random() * 3 + 1,
                        speed: Math.random() * 1.5 + 0.5,
                        opacity: Math.random(),
                        drift: Math.random() * 1 - 0.5
                    });
                }
                
                let animationFrameId;
                
                function drawOrbs() {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    particles.forEach(p => {
                        p.y -= p.speed;
                        p.x += Math.sin(p.y * 0.02) * p.drift;
                        
                        p.opacity += (Math.random() - 0.5) * 0.05;
                        if (p.opacity > 1) p.opacity = 1;
                        if (p.opacity < 0.1) p.opacity = 0.1;
                        
                        if (p.y < -20) {
                            p.y = canvas.height + 20;
                            p.x = Math.random() * canvas.width;
                        }
                        
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                        // ゴールドと白が入り混じる
                        const isWhite = Math.random() > 0.8;
                        ctx.fillStyle = isWhite ? `rgba(255, 255, 255, ${p.opacity})` : `rgba(255, 223, 128, ${p.opacity})`;
                        ctx.shadowBlur = 15;
                        ctx.shadowColor = isWhite ? '#ffffff' : '#c5a059';
                        ctx.fill();
                    });
                    
                    animationFrameId = requestAnimationFrame(drawOrbs);
                }
                
                drawOrbs();
                window.currentOrbAnimation = animationFrameId;
            }
        }, 1500);
    }

    // モーダルを閉じる関数をグローバルに登録
    window.closeCompleteModal = function() {
        const completeModal = document.getElementById('complete-modal');
        if (completeModal) {
            completeModal.classList.add('hidden');
        }
        if (window.currentOrbAnimation) {
            cancelAnimationFrame(window.currentOrbAnimation);
        }
    };

    // テスト用にコンプリート演出をグローバルから呼び出せるようにする
    window.testCompletionEffect = triggerCompletionEffect;

    function drawCard() {
        // 2. Select Card (Daily Persistence)
        const cardIndex = getOrGenerateDailyResult();

        // 3. Show Result
        showResult(cardIndex);

        // 4. Transition to Result
        // Hide deck, Show result (with animation)
        cardDeck.style.opacity = '0';
        setTimeout(() => {
            cardDeck.style.display = 'none';
            resultContainer.classList.remove('hidden');
            
            // アニメーションして表示されたタイミングでめくり音を再生
            playRevealSound(cardIndex);
        }, 500);

        isAnimating = false;
    }

    function showResult(cardIndex) {
        const card = tarotDeck[cardIndex];

        cardNumber.textContent = card.number;
        const cardName = document.getElementById('card-name');
        const cardNameJs = document.getElementById('card-name-js');
        if (cardName) cardName.textContent = card.name;
        if (cardNameJs) cardNameJs.textContent = card.nameJs;
        // cardSymbol.textContent = '★'; 
        cardSymbol.textContent = card.number;

        // Inject Image and Logo
        const cardInner = document.querySelector('.card-inner');

        // Clear old injection
        const oldWrapper = cardInner.querySelector('.card-image-wrapper');
        if (oldWrapper) oldWrapper.remove();
        const oldLogo = cardInner.querySelector('.card-logo-overlay');
        if (oldLogo) oldLogo.remove();

        // Dynamically load image
        // File format: lower_case_snake_case (e.g. "the_fool.png", "death.png")
        const imgName = card.name.toLowerCase().replace(/\s+/g, '_') + '.png';
        const imgPath = `/images/${imgName}`;

        const STATS_KEY = 'noa_tarot_stats';
        let stats = {};
        try {
            const storedStats = localStorage.getItem(STATS_KEY);
            if (storedStats) stats = JSON.parse(storedStats);
        } catch(e) {}
        const cardStats = stats[cardIndex] || { count: 1 };
        
        let glowClass = '';
        if (cardStats.count >= 20) glowClass = 'glow-rainbow';
        else if (cardStats.count >= 10) glowClass = 'glow-gold';
        else if (cardStats.count >= 7) glowClass = 'glow-strong';
        else if (cardStats.count >= 5) glowClass = 'glow-weak';

        const wrapper = document.createElement('div');
        wrapper.className = 'card-image-wrapper ' + glowClass;
        wrapper.style.position = 'absolute';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.top = '0';
        wrapper.style.left = '0';
        wrapper.style.borderRadius = '16px'; // カードの角丸に合わせる
        wrapper.style.zIndex = '0';

        const img = document.createElement('img');
        img.src = imgPath;
        img.className = 'card-image-bg';

        // Error handling: if image not found, do nothing (keep CSS background)
        img.onerror = function () {
            console.log('Image not found, using CSS background:', imgPath);
            wrapper.remove();
        };

        // Success: insert image
        // Must insert before card-front content to be background
        img.onload = function () {
            wrapper.appendChild(img);
            cardInner.insertBefore(wrapper, cardInner.firstChild);
        };

        // Add Logo
        const logo = document.createElement('img');
        logo.src = '/images/logo_final.png';
        logo.className = 'card-logo-overlay';


        resultKeyword.textContent = `${card.nameJs} - ${card.keyword}`;
        resultMessage.textContent = card.message;
        luckyItem.textContent = card.luckyAction;
    }
});
