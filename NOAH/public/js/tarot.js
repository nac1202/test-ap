document.addEventListener('DOMContentLoaded', () => {
    const cardDeck = document.getElementById('card-deck');
    const resultContainer = document.getElementById('result-container');
    const resultCard = document.getElementById('result-card');
    // const retryBtn = document.getElementById('retry-btn'); // Removed

    // --- Time Environment Setup ---
    setupTimeEnvironment();
    
    function setupTimeEnvironment() {
        const hour = new Date().getHours();
        const overlay = document.getElementById('time-overlay');
        let bgClass = '';
        let bgmFile = '';
        
        if (hour >= 5 && hour < 12) {
            bgClass = 'bg-morning';
            bgmFile = '/audio/bgm_morning.mp3';
        } else if (hour >= 12 && hour < 17) {
            bgClass = 'bg-day';
            bgmFile = '/audio/bgm_day.mp3';
        } else if (hour >= 17 && hour < 19) {
            bgClass = 'bg-evening';
            bgmFile = '/audio/bgm_evening.mp3';
        } else {
            bgClass = 'bg-night';
            bgmFile = '/audio/bgm_night.mp3';
        }
        
        if (overlay) overlay.classList.add(bgClass);
        
        // BGMは別画面(index.html)で鳴らすため、タロット画面では環境音BGMを再生しません
        // (背景色の時間連動のみ残しています)
    }

    // Elements to populate
    const cardNumber = document.getElementById('card-number');
    const cardName = document.getElementById('card-name');
    const cardNameJs = document.getElementById('card-name-ja'); // New element
    const cardSymbol = document.querySelector('.card-symbol');
    const resultKeyword = document.getElementById('result-keyword');
    const resultMessage = document.getElementById('result-message');
    const luckyItem = document.getElementById('result-lucky');

    let isAnimating = false;
    let magicParticleInterval = null;
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
            triggerMagicCircle();
        });
    }

    // ====================================================
    //  魔法陣 Canvas Particle Engine
    // ====================================================
    let magicCanvasAnim = null;

    function triggerMagicCircle() {
        isAnimating = true;

        // 魔法陣SE再生
        try {
            const magicAudio = new Audio('/audio/magic_circle.mp3');
            magicAudio.volume = 0.8;
            magicAudio.play().catch(e => console.log(e));
        } catch(e) {}

        // 魔法陣画像を表示
        const magicCircle = document.getElementById('magic-circle-container');
        if (magicCircle) {
            magicCircle.classList.add('magic-circle-active');
        }

        // Canvasパーティクルエンジン起動
        startMagicCanvasEffect();

        // 2秒待機後に占い开始
        setTimeout(() => {
            playMagicSound();
            startDivination();
        }, 2000);
    }

    function startMagicCanvasEffect() {
        const canvas = document.getElementById('magic-canvas');
        if (!canvas) return;

        // ── Adaptive Quality: デバイス性能に応じて品質を調整 ──
        // スマホ / 低スペックPC判定（CPU数4以下 or 画面幅480px以下）
        const isLowEnd = (navigator.hardwareConcurrency <= 4) || (window.innerWidth <= 480);
        const Q = isLowEnd ? {
            particleCount : 120,
            trailLen      : 6,
            shadowBlur    : false,
        } : {
            particleCount : 280,
            trailLen      : 14,
            shadowBlur    : true,
        };

        // Canvasリサイズ
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.opacity = '1';

        const ctx    = canvas.getContext('2d');
        const cx     = canvas.width  / 2;
        const cy     = canvas.height / 2;
        const startT = performance.now();
        const DURATION = 3200; // ms

        // --- パレット（ゴールド＆ホワイト系のみ）---
        const ALL = [
            '#ffffff',  // 純白
            '#fff8dc',  // クリーム白
            '#ffd700',  // ゴールド
            '#ffc432',  // ブライトゴールド
            '#ffb347',  // アンバーゴールド
            '#c5a059',  // ディープゴールド
            '#e8cca1',  // ライトゴールド
            '#fffacd',  // レモンシフォン（白に近い）
            '#ffeaa0',  // ペールゴールド
        ];

        // --- 1. パーティクル群 ---
        const particles = Array.from({length: Q.particleCount}, () => {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 10;
            const col   = ALL[Math.floor(Math.random() * ALL.length)];
            return {
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                r: 1.8 + Math.random() * 3.5,
                alpha: 1.0,
                col,
                decay: 0.003 + Math.random() * 0.004,
                trail: [],
                gravity: 0.015 + Math.random() * 0.015,
                friction: 0.992,
            };
        });

        // --- 2. リング波動 ---
        const rings = [
            { r: 0, maxR: Math.max(cx, cy) * 1.4, alpha: 0.9, width: 4, col: '#ffd700', delay: 0 },
            { r: 0, maxR: Math.max(cx, cy) * 1.2, alpha: 0.6, width: 2, col: '#ffffff', delay: 200 },
            { r: 0, maxR: Math.max(cx, cy) * 1.6, alpha: 0.4, width: 2, col: '#ffc432', delay: 400 },
        ];

        // --- 3. コアフラッシュ ---
        let coreAlpha = 0;

        function drawMagic(now) {
            const elapsed = now - startT;
            const progress = Math.min(elapsed / DURATION, 1);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'lighter';

            // ⑤ コアフラッシュ
            coreAlpha = progress < 0.15
                ? progress / 0.15
                : Math.max(0, 1 - (progress - 0.15) / 0.4);
            if (coreAlpha > 0) {
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120 * (1 + progress));
                grad.addColorStop(0,   `rgba(255,255,255,${coreAlpha})`);
                grad.addColorStop(0.3, `rgba(255,220,100,${coreAlpha * 0.8})`);
                grad.addColorStop(0.7, `rgba(0,255,255,${coreAlpha * 0.3})`);
                grad.addColorStop(1,   'rgba(0,0,0,0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // ① リング波動
            rings.forEach(ring => {
                if (elapsed < ring.delay) return;
                const t = (elapsed - ring.delay) / (DURATION * 0.9);
                ring.r = Math.min(ring.maxR * t * 2, ring.maxR);
                const fadeAlpha = ring.alpha * Math.max(0, 1 - ring.r / ring.maxR);
                if (fadeAlpha > 0.01) {
                    ctx.beginPath();
                    ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
                    ctx.strokeStyle = ring.col;
                    ctx.globalAlpha = fadeAlpha;
                    ctx.lineWidth   = ring.width;
                    ctx.shadowBlur  = 20;
                    ctx.shadowColor = ring.col;
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                    ctx.shadowBlur  = 0;
                }
            });

            // ③ パーティクル（ソフトグロウ版）
            particles.forEach(p => {
                if (p.alpha <= 0.01) return;

                // トレイル記録
                p.trail.push({ x: p.x, y: p.y });
                if (p.trail.length > Q.trailLen) p.trail.shift();

                // 移動
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.vx *= p.friction;
                p.vy *= p.friction;
                p.alpha = Math.max(0, p.alpha - p.decay);

                // ── トレイル：各点にソフトグロウ円を描く
                for (let i = 0; i < p.trail.length; i++) {
                    const ratio = i / p.trail.length;          // 古い点ほど0に近い
                    const ta    = ratio * p.alpha * 0.55;      // 先端に向かって明るく
                    if (ta < 0.005) continue;

                    const pt  = p.trail[i];
                    const gr  = p.r * (0.6 + ratio * 1.2);    // 先端ほど大きいグロウ
                    const rg  = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, gr);
                    rg.addColorStop(0,   `rgba(255,255,230,${ta})`);    // 白コア
                    rg.addColorStop(0.4, `rgba(255,210,80,${ta * 0.6})`); // ゴールド
                    rg.addColorStop(1,   'rgba(255,180,0,0)');           // 外側フェード
                    ctx.fillStyle = rg;
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, gr, 0, Math.PI * 2);
                    ctx.fill();
                }

                // ── パーティクル本体：大きなソフトグロウ
                const glowR = p.r * (3 + p.alpha * 3);        // ふわっと大きく
                const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
                rg.addColorStop(0,    `rgba(255,255,255,${p.alpha})`);         // 白コア
                rg.addColorStop(0.25, `rgba(255,240,160,${p.alpha * 0.85})`);  // ライトゴールド
                rg.addColorStop(0.6,  `rgba(255,200,50,${p.alpha * 0.4})`);   // ゴールド
                rg.addColorStop(1,    'rgba(220,160,0,0)');                    // 外側フェード
                ctx.fillStyle = rg;
                ctx.beginPath();
                ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.globalCompositeOperation = 'source-over';

            if (progress < 1) {
                magicCanvasAnim = requestAnimationFrame(drawMagic);
            } else {
                // フェードアウト
                canvas.style.opacity = '0';
                setTimeout(() => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }, 350);
            }
        }

        magicCanvasAnim = requestAnimationFrame(drawMagic);
    }

    function playMagicSound() {
        try {
            drawWaitAudio.currentTime = 0;
            drawWaitAudio.play().catch(e => console.log('Audio error:', e));
        } catch(e) {
            console.error('Audio play failed', e);
        }
    }

    // カードがめくれた瞬間のSE（SP/SRと通常で分岐）
    function playRevealSound(cardIndex) {
        try {
            drawWaitAudio.pause();
            drawWaitAudio.currentTime = 0;

            const isSpecial = (cardIndex >= 22);
            const audio = isSpecial ? drawSpAudio : drawNormalAudio;
            audio.currentTime = 0;
            audio.play().catch(e => console.log('Audio error:', e));
        } catch(e) {
            console.error('Audio play failed', e);
        }
    }

    // retryBtn removed

    function startDivination() {
        isAnimating = true;

        // Canvas\u30a2\u30cb\u30e1\u30fc\u30b7\u30e7\u30f3\u3092\u505c\u6b62\u30fb\u30af\u30ea\u30fc\u30f3\u30a2\u30c3\u30d7
        if (magicCanvasAnim) {
            cancelAnimationFrame(magicCanvasAnim);
            magicCanvasAnim = null;
        }
        const canvas = document.getElementById('magic-canvas');
        if (canvas) {
            canvas.style.opacity = '0';
            const ctx = canvas.getContext('2d');
            setTimeout(() => ctx && ctx.clearRect(0, 0, canvas.width, canvas.height), 350);
        }

        // \u9b54\u6cd5\u9663\u753b\u50cf\u3092\u975e\u8868\u793a\u306b
        const magicCircle = document.getElementById('magic-circle-container');
        if (magicCircle) {
            magicCircle.classList.remove('magic-circle-active');
            magicCircle.querySelectorAll('.magic-core-light').forEach(el => el.remove());
        }

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
        const isMaster = localStorage.getItem('noa_tarot_master') === 'true';
        const srProbability = 0.02; // Fixed 2% for SR

        if (isMaster && tarotDeck.length >= 30 && rand < srProbability) {
            // Draw SR Card (24 to 29)
            newIndex = 24 + Math.floor(Math.random() * 6);
        } else if (tarotDeck.length > 23 && rand < (isMaster ? srProbability : 0) + spProbability) {
            // Draw THE SANCTUARY (SP)
            newIndex = 23;
        } else if (tarotDeck.length > 22 && rand < (isMaster ? srProbability : 0) + (spProbability * 2)) {
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
            // ピカッと光るフラッシュを追加
            const flash = document.createElement('div');
            flash.className = 'flash-overlay';
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 1500);

            // モーダルを表示
            const completeModal = document.getElementById('complete-modal');
            if (completeModal) {
                completeModal.classList.remove('hidden');
            }
            
            // 盾（モーダル内画像コンテナ）にズームイン＆グロウのアニメーションを追加
            const shieldContainer = document.getElementById('master-shield-container');
            if (shieldContainer) {
                shieldContainer.classList.remove('shield-zoom-glow');
                void shieldContainer.offsetWidth; // リフロー強制
                shieldContainer.classList.add('shield-zoom-glow');
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
                const particleCount = 400; // 派手に: 150 -> 400
                
                const colorPalette = [
                    { r: 255, g: 255, b: 255, hex: '#ffffff' }, // 白
                    { r: 197, g: 160, b:  89, hex: '#c5a059' }, // ゴールド
                    { r: 232, g: 204, b: 161, hex: '#e8cca1' }, // ライトゴールド
                    { r:   0, g: 255, b: 255, hex: '#00ffff' }, // シアン（魔法陣カラー）
                    { r: 255, g: 200, b:  50, hex: '#ffc832' }  // ブライトゴールド
                ];
                
                for (let i = 0; i < particleCount; i++) {
                    particles.push({
                        x: Math.random() * canvas.width,
                        y: canvas.height + Math.random() * 800, // 初期配置を広めに
                        radius: Math.random() * 4 + 1.5, // 少し大きく
                        speed: Math.random() * 3 + 1, // スピードアップ
                        opacity: Math.random(),
                        drift: Math.random() * 2 - 1, // 横揺れを大きく
                        c: colorPalette[Math.floor(Math.random() * colorPalette.length)] // 色を事前決定
                    });
                }
                
                let animationFrameId;
                
                function drawOrbs() {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    // 重なり合った光が加算合成されて強く光る演出
                    ctx.globalCompositeOperation = 'lighter';
                    
                    particles.forEach(p => {
                        p.y -= p.speed;
                        p.x += Math.sin(p.y * 0.01) * p.drift;
                        
                        p.opacity += (Math.random() - 0.5) * 0.05;
                        if (p.opacity > 1) p.opacity = 1;
                        if (p.opacity < 0.1) p.opacity = 0.1;
                        
                        if (p.y < -30) {
                            p.y = canvas.height + 30;
                            p.x = Math.random() * canvas.width;
                        }
                        
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                        
                        ctx.fillStyle = `rgba(${p.c.r}, ${p.c.g}, ${p.c.b}, ${p.opacity})`;
                        ctx.shadowBlur = p.radius * 4; // 大きさに比例した強めのグロウ
                        ctx.shadowColor = p.c.hex;
                        ctx.fill();
                    });
                    
                    // リセット
                    ctx.globalCompositeOperation = 'source-over';
                    
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
        // エフェクトのクリーンアップ
        if (magicParticleInterval) {
            clearInterval(magicParticleInterval);
            magicParticleInterval = null;
        }
        const magicCircle = document.getElementById('magic-circle-container');
        if (magicCircle) {
            magicCircle.classList.remove('magic-circle-active');
            const coreLights = magicCircle.querySelectorAll('.magic-core-light');
            coreLights.forEach(el => el.remove());
        }

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
        let imgName = card.name.toLowerCase().replace(/\s+/g, '_') + '.png';
        if (cardIndex >= 24) {
            imgName = 'sr_' + imgName;
        }
        const imgPath = `/images/${imgName}`;

        const STATS_KEY = 'noa_tarot_stats';
        let stats = {};
        try {
            const storedStats = localStorage.getItem(STATS_KEY);
            if (storedStats) stats = JSON.parse(storedStats);
        } catch(e) {}
        const cardStats = stats[cardIndex] || { count: 1 };
        
        let glowClass = '';
        if (cardIndex >= 24) glowClass = 'card-sr glow-rainbow';
        else if (cardStats.count >= 20) glowClass = 'glow-rainbow';
        else if (cardStats.count >= 10) glowClass = 'glow-gold';
        else if (cardStats.count >= 7) glowClass = 'glow-strong';
        else if (cardStats.count >= 5) glowClass = 'glow-weak';

        const resultCard = document.getElementById('result-card');
        if (resultCard) {
            if (cardIndex >= 24) {
                resultCard.classList.add('sr-style');
            } else {
                resultCard.classList.remove('sr-style');
            }
        }

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
