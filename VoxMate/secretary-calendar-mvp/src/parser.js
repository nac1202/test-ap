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
    } else {
        // Day only match: "23日"
        const dayMatch = text.match(/(\d{1,2})日/);
        if (dayMatch) {
            const day = parseInt(dayMatch[1]);
            // Assume current month, but if day is clearly passed, maybe next month?
            // For MVP, assume current month unless user specifies.
            const today = now.getDate();
            let targetMonth = now.getMonth();
            let targetYear = now.getFullYear();

            // If user says "5th" and today is "21st", usually means Next Month's 5th.
            if (day < today) {
                targetMonth++;
                if (targetMonth > 11) {
                    targetMonth = 0;
                    targetYear++;
                }
            }
            targetDate.setFullYear(targetYear, targetMonth, day);
        }
    }

    // 2. Time Parsing (Find ALL matches and take the LAST one to support appended corrections)
    // 2. Time Parsing
    // Enhance regex to optionally consume "分" so it's not left for duration parser if possible, 
    // but main fix is range logic.
    // FIX: Lookahead to prevent matching "1時間" as "1時"
    const timeMatches = [...text.matchAll(/(\d{1,2})[:時](?![間])(\d{1,2})?/g)];
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
        let startTime = null;
        let endTime = null;
        let isRange = false;

        // Check for Range Pattern (A...B)
        // Find a pair where the text between them implies a range (e.g. "から", "〜", "-")
        // Loop backwards to prefer later ranges if corrections exist? No, usually "10-12 time"
        for (let i = 0; i < timeMatches.length - 1; i++) {
            const m1 = timeMatches[i];
            const m2 = timeMatches[i + 1];

            // Text between matches
            const startIdx = m1.index + m1[0].length;
            const endIdx = m2.index;
            const between = text.substring(startIdx, endIdx);

            // Check if 'between' contains range indicators (allowing for spacing or "分")
            // Also need to allow "分" if the previous regex didn't check it? 
            // Our regex `(\d{1,2})[:時](\d{1,2})?` matches "23時15". "分" is in `between` if present?
            // "23時15分まで24時" -> between="分まで"
            // "22時から23時" -> between="から"
            if (between.match(/(から|〜|~|-|まで)/)) {

                // Helper to parse match
                const parseMatch = (m) => {
                    const h = parseInt(m[1]);
                    const n = m[2] ? parseInt(m[2]) : 0;
                    const d = new Date(targetDate);
                    d.setHours(h, n, 0, 0);
                    return d;
                };

                startTime = parseMatch(m1);
                endTime = parseMatch(m2);
                isRange = true;

                // If the end time is smaller than start time (e.g. 23:00 - 01:00), add 1 day to end
                if (endTime < startTime) {
                    endTime.setDate(endTime.getDate() + 1);
                }
                break; // Stop at first valid range? Or find last? 
                // Usually only one range per input. Let's take the first distinct range.
            }
        }

        if (isRange) {
            draft.start = startTime.toISOString();
            draft.end = endTime.toISOString();
        } else {
            // Single Time (Last Match Wins)
            const lastMatch = timeMatches[timeMatches.length - 1];
            const hour = parseInt(lastMatch[1]);
            const min = lastMatch[2] ? parseInt(lastMatch[2]) : 0;
            targetDate.setHours(hour, min, 0, 0);
            draft.start = targetDate.toISOString();

            // Duration Logic (Only if NOT a range)
            const endDate = new Date(targetDate);
            // Check for explicit duration "X時間" or "X分"
            // Be careful not to match the "15分" that was part of "23時15分"
            // Simple heuristic used previously: match anywhere.
            // Problem: "23時15分" matches "15分".
            // Fix: Check if the duration match overlaps with the time match? 
            // Or remove the time match from string first?

            // Strategy: Create a temporary string with the time removed
            const tempText = text.replace(lastMatch[0], '');
            // Note: lastMatch[0] only covers "23時15". If "分" follows, it remains.
            // If Text was "23時15分", temp is "分". "分" does not match `(\d+)分`.
            // Perfect! "15" is gone.

            const durationMatch = tempText.match(/(\d+)(分|時間)/);
            if (durationMatch) {
                let durationMin = parseInt(durationMatch[1]);
                if (durationMatch[2] === "時間") durationMin *= 60;
                endDate.setMinutes(endDate.getMinutes() + durationMin);
            } else {
                endDate.setMinutes(endDate.getMinutes() + 60); // Default 1h
            }
            draft.end = endDate.toISOString();
        }
    } else {
        // All Day
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
    // Remove date patterns (Global)
    cleanText = cleanText.replace(/(\d{1,2})[\/月](\d{1,2})日?/g, '');
    cleanText = cleanText.replace(/来週|今週|再来週|明日|明後日|今日/g, '');
    cleanText = cleanText.replace(/[月火水木金土日]曜日?/g, '');

    // Remove time patterns (Global) includes "分" optionally to catch "22分"
    cleanText = cleanText.replace(/(\d{1,2})[:時](\d{1,2})?分?/g, '');

    // Remove "duration" patterns (Global) e.g. "30分"
    // Be careful, this might remove "30分" from "会議30分" (Meeting 30 min) which might be desired or not.
    // For now, let's strictly remove "X時間" but maybe keep "X分" if it wasn't part of a time?
    // Actually, "15時から15時22分" -> "22分" was part of time.
    // The previous regex `(\d{1,2})[:時](\d{1,2})?分?` handles "15時22分".

    // Clean up separators/particles
    cleanText = cleanText.replace(/から|まで|〜|~/g, ' ');
    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    // Remove leading/trailing particles often left behind
    cleanText = cleanText.replace(/^(に|の|は)/, '').replace(/(に|の|は)$/, '').trim();

    draft.summary = cleanText || text; // Fallback if we stripped everything

    // People extraction (Simple heuristic: "〇〇さん")
    const peopleMatch = text.match(/([^\s]+)さん/g);
    if (peopleMatch) {
        draft.people = peopleMatch.map(p => p.replace("さん", ""));
    }

    return draft;
}
