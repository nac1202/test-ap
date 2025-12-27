document.addEventListener('DOMContentLoaded', () => {
    const container = document.body;
    const fireflyCount = 20; // Number of fireflies

    for (let i = 0; i < fireflyCount; i++) {
        createFirefly();
    }

    function createFirefly() {
        const div = document.createElement('div');
        div.classList.add('firefly');

        // Random initial position
        const x = Math.random() * 100;
        const y = Math.random() * 40; // Limit to top 40vh
        div.style.left = `${x}vw`;
        div.style.top = `${y}vh`;

        // Random animation properties
        const durationX = 10 + Math.random() * 20; // 10-30s
        const durationY = 10 + Math.random() * 20;
        const delay = Math.random() * -20; // start immediately at random point

        div.style.animationDuration = `${durationX}s, ${durationY}s`;
        div.style.animationDelay = `${delay}s, ${delay}s`;

        container.appendChild(div);
    }
});
