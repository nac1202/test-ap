function setupViewSwipe() {
    const container = document.getElementById('view-container');
    const slider = document.getElementById('view-slider');

    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let isCardInteraction = false;
    let slideWidth = 0;
    let currentTrans = 0;

    container.addEventListener('touchstart', (e) => {
        if (overlayViewActive()) return;
        if (!VIEW_CYCLE.includes(activeView)) return;

        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;

        const wrapper = e.target.closest('.swipe-wrapper');
        isCardInteraction = !!wrapper;

        if (isCardInteraction) return;

        isDragging = true;
        slideWidth = slider.offsetWidth / 3;

        // Infinite Loop: -33.333% (Center)
        currentTrans = -slideWidth;

        slider.style.transition = 'none';

    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        const x = e.touches[0].clientX;
        const y = e.touches[0].clientY;
        const diffX = x - startX;
        const diffY = y - startY;

        // Scroll Lock
        if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 5) {
            isDragging = false;
            restoreSnap();
            return;
        }

        if (Math.abs(diffX) > 5) {
            if (e.cancelable) e.preventDefault();
        }

        const newTrans = currentTrans + diffX;
        slider.style.transform = `translateX(${newTrans}px)`;

    }, { passive: false });

    container.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;

        const endX = e.changedTouches[0].clientX;
        const diffX = endX - startX;
        const threshold = slideWidth * 0.25;

        const centerIdx = VIEW_CYCLE.indexOf(activeView);
        let targetView = activeView;
        let targetTrans = -33.3333;

        if (diffX > threshold) {
            // Right Swipe -> Prev
            targetView = VIEW_CYCLE[(centerIdx - 1 + 3) % 3];
            targetTrans = 0;
        } else if (diffX < -threshold) {
            // Left Swipe -> Next
            targetView = VIEW_CYCLE[(centerIdx + 1) % 3];
            targetTrans = -66.6666;
        }

        slider.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        slider.style.transform = `translateX(${targetTrans}%)`;

        if (targetView !== activeView) {
            playNav();
            const onEnd = () => {
                slider.removeEventListener('transitionend', onEnd);
                showView(targetView);
            };
            slider.addEventListener('transitionend', onEnd);
        } else {
            restoreSnap();
        }
    });

    function restoreSnap() {
        slider.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        slider.style.transform = 'translateX(-33.3333%)';
    }

    function overlayViewActive() {
        const overlay = document.getElementById('overlay-view-container');
        return overlay && overlay.style.display !== 'none';
    }
}
