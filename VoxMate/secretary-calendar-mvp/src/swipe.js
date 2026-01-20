
/**
 * Enables swipe-to-reveal interactions on an element.
 * @param {HTMLElement} card - The foreground card element to swipe.
 * @param {HTMLElement} wrapper - The container element (used to find the background action).
 */
export function enableSwipe(card, wrapper) {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    const SNAP_THRESHOLD = 60; // px to trigger snap open
    const OPEN_OFFSET = -100; // px to slide open

    card.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        currentX = startX; // Initialize
        isDragging = true;
        card.style.transition = 'none'; // Disable transition for direct control
        card.classList.add('swiping');
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const x = e.touches[0].clientX;
        const diff = x - startX;

        // Logic: Allow sliding left freely, but resist sliding right if already closed
        if (diff < 0) {
            // Dragging Left
            currentX = x;
            card.style.transform = `translateX(${diff}px)`;
        } else {
            // Dragging Right (Closing?) - Clamp to 0
            // Ideally we support closing if it's open, but let's keep simple first:
            // If starting from 0, resist right drag
            currentX = x;
            // Add resistance
            card.style.transform = `translateX(${diff * 0.2}px)`;
        }
    }, { passive: false }); // passive false to allow preventDefault if needed? No, let scroll happen vertical.

    card.addEventListener('touchend', (e) => {
        isDragging = false;
        card.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        card.classList.remove('swiping');

        const diff = currentX - startX;

        // Check if we opened it enough
        if (diff < -SNAP_THRESHOLD) {
            // Snap Open
            card.style.transform = `translateX(${OPEN_OFFSET}px)`;
            wrapper.classList.add('swiped-open');
        } else {
            // Snap Close
            card.style.transform = `translateX(0)`;
            wrapper.classList.remove('swiped-open');
        }
    });

    // Allow closing by tapping the card while open
    card.addEventListener('click', (e) => {
        if (wrapper.classList.contains('swiped-open')) {
            e.preventDefault(); // Prevent navigating/opening details
            e.stopPropagation();
            card.style.transform = `translateX(0)`;
            wrapper.classList.remove('swiped-open');
        }
    });
}
