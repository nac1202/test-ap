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

    // Check for existing result on load
    const savedResult = getStoredDailyResult();
    if (savedResult !== null) {
        // Show result immediately
        cardDeck.style.display = 'none';
        resultContainer.classList.remove('hidden');
        showResult(savedResult);
    } else {
        // Wait for user interaction
        cardDeck.addEventListener('click', () => {
            if (isAnimating) return;
            startDivination();
        });
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
