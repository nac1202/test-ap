export function parseInput(text) {
    const draft = {
        summary: text,
        start: null,
        end: null,
        location: null,
        people: [],
        type: "meeting", // default
        importance: "normal",
        notify_policy: "default",
        intent: "create", // create, update, delete, query_free
    };

    // Normalize full-width numbers to half-width
    text = text.replace(/[０-９]/g, (s) => {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });

    // Intent Detection
    if (text.match(/キャンセル|取り消し|中止/)) {
        draft.intent = "delete";
    } else if (text.match(/ずら(す|し)|移動|変更/)) {
        draft.intent = "update";
    } else if (text.match(/空いて(る|き)|時間作って/)) {
        draft.intent = "query_free";
    }

    // Importance & Policy
    if (text.match(/仮|予定|かも/)) {
        draft.importance = "tentative";
        draft.notify_policy = "none";
    }
    if (text.match(/確定|絶対|必ず/)) {
        draft.importance = "must";
        draft.notify_policy = "default";
    }

    // Date/Time Parsing
    const now = new Date();
    let targetDate = new Date(now);

    // 1. Explicit Date "M/D" or "M月D日"
    const dateMatch = text.match(/(\d{1,2})[\/月](\d{1,2})日?/);
    if (dateMatch) {
        const month = parseInt(dateMatch[1]);
        const day = parseInt(dateMatch[2]);
        // Simple year guess: if month < current month, assume next year.
        let year = now.getFullYear();
        if (month < now.getMonth() + 1) {
            year++;
        }
        targetDate.setFullYear(year, month - 1, day);
    } else if (text.match(/明日/)) {
        targetDate.setDate(targetDate.getDate() + 1);
    } else if (text.match(/明後日/)) {
        targetDate.setDate(targetDate.getDate() + 2);
    }

    // 2. Time Parsing (Find ALL matches and take the LAST one to support appended corrections)
    // 2. Time Parsing
    const timeMatches = [...text.matchAll(/(\d{1,2})[:時](\d{2})?/g)];
    const isUndecided = text.match(/時間.*未定|未定/);

    if (isUndecided) {
        draft.timeUndecided = true;
        // Set date-only start for undecided
        const y = targetDate.getFullYear();
        const m = String(targetDate.getMonth() + 1).padStart(2, '0');
        const d = String(targetDate.getDate()).padStart(2, '0');
        draft.start = { date: `${y}-${m}-${d}` };
        draft.end = { date: `${y}-${m}-${d}` };
    } else if (timeMatches.length > 0) {
        // Use the last match found in the string (assumed to be the correction)
        const lastMatch = timeMatches[timeMatches.length - 1];
        const hour = parseInt(lastMatch[1]);
        const min = lastMatch[2] ? parseInt(lastMatch[2]) : 0;
        targetDate.setHours(hour, min, 0, 0);

        // Default duration 1h
        draft.start = targetDate.toISOString();
        const endDate = new Date(targetDate);

        const durationMatch = text.match(/(\d+)(分|時間)/);
        if (durationMatch) {
            let durationMin = parseInt(durationMatch[1]);
            if (durationMatch[2] === "時間") durationMin *= 60;
            endDate.setMinutes(endDate.getMinutes() + durationMin);
        } else {
            endDate.setMinutes(endDate.getMinutes() + 60);
        }
        draft.end = endDate.toISOString();
    } else {
        // No time specified -> All Day (Date Only)
        // Ensure we actually found a date intent or it's implicitly "today/tomorrow" from context?
        // Current logic defaults targetDate to 'now' if no date match.
        // We should treat this as All Day.
        const y = targetDate.getFullYear();
        const m = String(targetDate.getMonth() + 1).padStart(2, '0');
        const d = String(targetDate.getDate()).padStart(2, '0');
        draft.start = { date: `${y}-${m}-${d}` };
        draft.end = { date: `${y}-${m}-${d}` };
        draft.isAllDay = true;
    }

    // Clean up summary: remove matched date/time patterns
    // We construct a regex to remove date/time related parts specifically
    let cleanText = text;
    // Remove date patterns
    cleanText = cleanText.replace(/(\d{1,2})[\/月](\d{1,2})日?/, '');
    cleanText = cleanText.replace(/明日|明後日/, '');
    // Remove time patterns
    cleanText = cleanText.replace(/(\d{1,2})[:時](\d{2})?/, '');
    // Remove "duration" patterns if we parsed them?
    // Maybe too aggressive, users might want "会議30分" to stay "会議".
    // But "15時に" -> "に" might remain.
    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    // Remove trailing "に" or "から" often left behind
    cleanText = cleanText.replace(/^(に|から|まで)/, '').replace(/(に|から|まで)$/, '').trim();

    draft.summary = cleanText || text; // Fallback if we stripped everything

    // People extraction (Simple heuristic: "〇〇さん")
    const peopleMatch = text.match(/([^\s]+)さん/g);
    if (peopleMatch) {
        draft.people = peopleMatch.map(p => p.replace("さん", ""));
    }

    return draft;
}
