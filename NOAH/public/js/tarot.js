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

    // Sound effects (Optional, if we had files)
    // const shuffleSound = new Audio('/sounds/shuffle.mp3');
    // const flipSound = new Audio('/sounds/flip.mp3');

    const instruction = document.querySelector('.instruction');

    // Check for existing result on load
    const savedResult = getStoredDailyResult();
    if (savedResult !== null) {
        // すでに占っている場合は、タップで結果を表示するように変更（タップ時に別のSEを鳴らすため）
        if (instruction) instruction.innerHTML = "タップして結果を確認";
        cardDeck.addEventListener('click', () => {
            if (isAnimating) return;
            isAnimating = true;
            playRevealSound();
            
            showResult(savedResult);
            // Transition immediately without shuffling
            cardDeck.style.opacity = '0';
            setTimeout(() => {
                cardDeck.style.display = 'none';
                resultContainer.classList.remove('hidden');
            }, 500);
        });
    } else {
        // Wait for user interaction
        cardDeck.addEventListener('click', () => {
            if (isAnimating) return;
            playMagicSound();
            startDivination();
        });
    }

    // Web Audio APIを利用した魔法陣/シャッフル風のSE生成
    let audioCtx = null;
    function playMagicSound() {
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const t = audioCtx.currentTime;
            // シャララン♪という魔法のようなアルペジオ（Aメジャーコードの分散和音）
            const notes = [880.00, 1108.73, 1318.51, 1760.00]; 
            
            notes.forEach((freq, index) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t + index * 0.1);
                
                gain.gain.setValueAtTime(0, t + index * 0.1);
                gain.gain.linearRampToValueAtTime(0.3, t + index * 0.1 + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, t + index * 0.1 + 1.0);
                
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                
                osc.start(t + index * 0.1);
                osc.stop(t + index * 0.1 + 1.0);
            });

            // 最後にキラッと光るような高い音
            const oscWin = audioCtx.createOscillator();
            const gainWin = audioCtx.createGain();
            oscWin.type = 'triangle';
            oscWin.frequency.setValueAtTime(2093.00, t + 0.4); 
            gainWin.gain.setValueAtTime(0, t + 0.4);
            gainWin.gain.linearRampToValueAtTime(0.2, t + 0.45);
            gainWin.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
            oscWin.connect(gainWin);
            gainWin.connect(audioCtx.destination);
            oscWin.start(t + 0.4);
            oscWin.stop(t + 1.5);
        } catch(e) {
            console.error('Audio play failed', e);
        }
    }

    // すでに占った結果を開く時のSE（明るい和音＋キラッ）
    function playRevealSound() {
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const t = audioCtx.currentTime;
            
            // Fリディアンのような明るい和音 [F5, A5, C6, E6] を一斉に鳴らす
            const notes = [698.46, 880.00, 1046.50, 1318.51]; 
            notes.forEach((freq) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);
                
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
                
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                
                osc.start(t);
                osc.stop(t + 1.2);
            });

            // 短く素早いキラキラ音
            const oscWin = audioCtx.createOscillator();
            const gainWin = audioCtx.createGain();
            oscWin.type = 'triangle';
            oscWin.frequency.setValueAtTime(2637.02, t + 0.1); // E7
            oscWin.frequency.exponentialRampToValueAtTime(3135.96, t + 0.3); // G7へ上昇
            gainWin.gain.setValueAtTime(0, t + 0.1);
            gainWin.gain.linearRampToValueAtTime(0.15, t + 0.15);
            gainWin.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
            oscWin.connect(gainWin);
            gainWin.connect(audioCtx.destination);
            oscWin.start(t + 0.1);
            oscWin.stop(t + 0.8);

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
        if (existing !== null) return existing;

        const STORAGE_KEY = 'noa_tarot_v1';
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`; // YYYY-M-D

        // Generate new random result
        const newIndex = Math.floor(Math.random() * tarotDeck.length);
        const newData = {
            date: todayStr,
            cardIndex: newIndex
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
        return newIndex;
    }

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
        }, 500);

        isAnimating = false;
    }

    function showResult(cardIndex) {
        const card = tarotDeck[cardIndex];

        cardNumber.textContent = card.number;
        // cardName & cardNameJs elements were removed from HTML
        // cardName.textContent = card.name;
        // if (cardNameJs) cardNameJs.textContent = card.nameJs;
        // cardSymbol.textContent = '★'; 
        cardSymbol.textContent = card.number;

        // Inject Image and Logo
        const cardInner = document.querySelector('.card-inner');

        // Clear old injection
        const oldImg = cardInner.querySelector('.card-image-bg');
        if (oldImg) oldImg.remove();
        const oldLogo = cardInner.querySelector('.card-logo-overlay');
        if (oldLogo) oldLogo.remove();

        // Dynamically load image
        // File format: lower_case_snake_case (e.g. "the_fool.png", "death.png")
        const imgName = card.name.toLowerCase().replace(/\s+/g, '_') + '.png';
        const imgPath = `/images/${imgName}`;

        const img = document.createElement('img');
        img.src = imgPath;
        img.className = 'card-image-bg';

        // Error handling: if image not found, do nothing (keep CSS background)
        img.onerror = function () {
            console.log('Image not found, using CSS background:', imgPath);
            img.remove();
        };

        // Success: insert image
        // Must insert before card-front content to be background
        cardInner.insertBefore(img, cardInner.firstChild);

        // Add Logo
        const logo = document.createElement('img');
        logo.src = '/images/logo_final.png';
        logo.className = 'card-logo-overlay';


        resultKeyword.textContent = `${card.nameJs} - ${card.keyword}`;
        resultMessage.textContent = card.message;
        luckyItem.textContent = card.luckyAction;
    }
});
