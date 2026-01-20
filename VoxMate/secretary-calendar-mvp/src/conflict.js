import { extractMeta } from './storage.js';

export function detectConflicts(newEvent, existingEvents, bufferMin = 15) {
    const conflicts = [];
    const newStart = new Date(newEvent.start).getTime();
    const newEnd = new Date(newEvent.end).getTime();

    existingEvents.forEach(ev => {
        // Skip self (update case)
        if (ev.id === newEvent.id) return;

        // Skip cancelled
        if (ev.status === 'cancelled') return;

        // Skip all-day events for now (MVP)
        if (ev.start.date) return;

        const evStart = new Date(ev.start.dateTime || ev.start.date).getTime();
        const evEnd = new Date(ev.end.dateTime || ev.end.date).getTime();

        // 1. Overlap
        if (newStart < evEnd && newEnd > evStart) {
            conflicts.push({
                type: 'overlap',
                event: ev,
                meta: extractMeta(ev.description),
                severity: 'high'
            });
            return;
        }

        // 2. Buffer Short (Default 15min)
        const bufferMs = bufferMin * 60 * 1000;
        const diffBefore = newStart - evEnd;
        const diffAfter = evStart - newEnd;

        if ((diffBefore >= 0 && diffBefore < bufferMs) || (diffAfter >= 0 && diffAfter < bufferMs)) {
            conflicts.push({
                type: 'buffer_short',
                event: ev,
                meta: extractMeta(ev.description),
                severity: 'medium'
            });
        }
    });

    return conflicts;
}

export function generateSolutions(conflicts, newEvent, events) {
    const solutions = [];

    // Helper to check if a proposed change resolves conflicts
    const isValid = (proposedEvent) => {
        const confs = detectConflicts(proposedEvent, events || []);
        return confs.length === 0;
    };

    // 1. Move Tentative Events (Priority)
    conflicts.forEach(c => {
        if (c.meta && c.meta.importance === 'tentative') {
            solutions.push({
                type: 'move_tentative',
                label: `仮予定「${c.event.summary}」を移動する`,
                targetEventId: c.event.id,
                action: 'reschedule',
                priority: 10
            });
        }
    });

    // 2. Smart Slide Forward (Find next free slot)
    if (events) {
        const startSearch = new Date(newEvent.start);
        const durationMin = (new Date(newEvent.end) - new Date(newEvent.start)) / 60000;
        // Pass bufferMin (default 15 if not specified, matching detectConflicts)
        const slots = findFreeSlots(events, startSearch, durationMin, 15);

        if (slots.length > 0) {
            const bestSlot = slots[0]; // Nearest slot
            const diffMin = (bestSlot - startSearch) / 60000;

            // Only suggest if it's different from original (and reasonable, e.g. within 24h)
            if (diffMin > 0 && diffMin < 24 * 60) {
                const newStartStr = bestSlot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                solutions.push({
                    type: 'slide_forward',
                    label: `空いている時間 (${newStartStr}) にずらす`,
                    action: 'slide',
                    minutes: diffMin,
                    priority: 8
                });
            }
        }
    }

    // 3. Slide Backward (Check fixed -30m)
    // Simple check: try moving back 30 mins
    try {
        const durationMs = (new Date(newEvent.end) - new Date(newEvent.start));
        const backStart = new Date(new Date(newEvent.start).getTime() - 30 * 60000);
        const backEnd = new Date(backStart.getTime() + durationMs);

        const proposedBack = {
            ...newEvent,
            start: { dateTime: backStart.toISOString() },
            end: { dateTime: backEnd.toISOString() }
        };

        if (isValid(proposedBack)) {
            solutions.push({
                type: 'slide_backward',
                label: `30分前倒し (${backStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
                action: 'slide',
                minutes: -30,
                priority: 5
            });
        }
    } catch (e) {
        // Ignore date parsing errors
    }

    return solutions;
}

// Debug helper
export let lastDebugLog = [];
function debug(msg) {
    // console.log("[ConflictDebug]", msg);
    lastDebugLog.push(msg);
}

export function findFreeSlots(events, startTime, durationMin, bufferMin = 0) {
    lastDebugLog = []; // Reset log
    const slots = [];
    const searchStart = new Date(startTime);
    const durationMs = durationMin * 60 * 1000;
    const bufferMs = bufferMin * 60 * 1000;

    debug(`Search Start: ${searchStart.toLocaleString()} Dur: ${durationMin}m Buf: ${bufferMin}m`);

    // Sort events by start time
    const sorted = [...events].sort((a, b) => {
        return new Date(a.start.dateTime || a.start.date) - new Date(b.start.dateTime || b.start.date);
    });

    let pointer = searchStart.getTime();

    const searchEnd = pointer + 48 * 60 * 60 * 1000; // Search up to 48h ahead

    // Filter relevant events
    const relevantEvents = sorted.filter(ev => {
        const end = new Date(ev.end.dateTime || ev.end.date).getTime();
        return end > pointer - bufferMs; // Check events that might buffer-block us
    });

    debug(`Relevant events: ${relevantEvents.length}`);

    for (const ev of relevantEvents) {
        if (slots.length >= 3) break;
        if (pointer >= searchEnd) break;

        const evStart = new Date(ev.start.dateTime || ev.start.date).getTime();
        const evEnd = new Date(ev.end.dateTime || ev.end.date).getTime();

        // Effective start of this event (minus buffer)
        const blockedStart = evStart - bufferMs;
        // Effective end of this event (plus buffer)
        const blockedEnd = evEnd + bufferMs;

        const gap = blockedStart - pointer;
        debug(` Checking gap before ${ev.summary}: Gap=${gap / 60000}m`);

        // Check if we fit BEFORE this event (between pointer and blockedStart)
        if (gap >= durationMs) {
            // Found a slot!
            slots.push(new Date(pointer));
            // Don't move pointer yet, allow multiple slots if gap is huge?
            // For simplicity, just jump to next block to avoid too many small slots in one gap
            pointer += durationMs + 30 * 60 * 1000;
            continue;
        }

        // Move pointer to AFTER this event if we are blocked
        if (pointer < blockedEnd) {
            pointer = blockedEnd;
        }
    }

    // If still need slots, add them after the last event
    while (slots.length < 3 && pointer < searchEnd) {
        slots.push(new Date(pointer));
        pointer += durationMs + 30 * 60 * 1000; // Jump a bit
    }

    return slots;
}
