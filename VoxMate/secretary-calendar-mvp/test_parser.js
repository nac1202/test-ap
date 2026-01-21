import { parseInput } from './src/parser.js';

const cases = [
    { input: "来週火曜15時から田中さんと会議（仮）", expected: { intent: "create", importance: "tentative", hasTime: true } },
    { input: "明日の18:30から会食", expected: { intent: "create", importance: "normal", hasTime: true } },
    { input: "今日の15時の予定をキャンセル", expected: { intent: "delete" } },
    { input: "15時からずらして", expected: { intent: "update" } },
    { input: "来週空いてる？", expected: { intent: "query_free" } },
    {
        input: '来週火曜日、15時から15時22分までランチ',
        expected: {
            summary: 'ランチ',
            // Date logic is relative, so we check mainly time and duration if possible
            descriptionContains: '15:00',
            durationMinutes: 22
        }
    },
    {
        input: '明日の10時から11時まで会議',
        expected: {
            summary: '会議',
            startHour: 10,
            durationMinutes: 60
        }
    },
    {
        input: '明日22時から23時15分まで会議',
        expected: {
            summary: '会議', // Summary check
            startHour: 22,
            durationMinutes: 75
        }
    },
    // Bug Report Case: Day only + Duration confusion
    {
        input: '23日1時間休憩',
        expected: {
            summary: '休憩',
            // Expect date to be 23rd (of current month ideally)
            // We can't easily check exact date obj in this simple test runner without mocking 'now', 
            // but we can check if it parsed '1時間' as duration (60min) NOT '1時' (starts at 1)
            durationMinutes: 60,
            notStartHour: 1 // Custom check we'll handle or just verify manual inspection
        }
    }
];

console.log("Running Parser Tests...");
let failed = 0;

cases.forEach((c, i) => {
    const result = parseInput(c.input);
    let ok = true;

    if (c.expected.intent && result.intent !== c.expected.intent) ok = false;
    if (c.expected.importance && result.importance !== c.expected.importance) ok = false;
    if (c.expected.hasTime && !result.start) ok = false;

    if (c.expected.checkStartHour && result.start) {
        const d = new Date(result.start);
        if (d.getHours() !== c.expected.checkStartHour) {
            console.error(`  Count not match start hour. Expected ${c.expected.checkStartHour}, Got ${d.getHours()}`);
            ok = false;
        }
    }
    if (c.expected.checkDurationMin && result.start && result.end) {
        const s = new Date(result.start);
        const e = new Date(result.end);
        const diffMin = (e - s) / 60000;
        if (Math.abs(diffMin - c.expected.checkDurationMin) > 1) {
            console.error(`  Could not match duration. Expected ${c.expected.checkDurationMin}, Got ${diffMin}`);
            failReason = `Duration mismatch. Expected ${c.expected.checkDurationMin}, Got ${diffMin}`;
            ok = false;
        }
    }

    if (ok && c.expected.notStartHour !== undefined) {
        const startHour = result.start ? new Date(result.start).getHours() : -1;
        if (startHour === c.expected.notStartHour) {
            failReason = `Start Hour should NOT be ${c.expected.notStartHour}, but it is`;
            ok = false;
        }
    }

    if (ok) {
        console.log(`Case ${i + 1}: OK (${c.input})`);
    } else {
        console.error(`Case ${i + 1}: FAIL (${c.input})`);
        if (failReason) {
            console.error(`  Reason: ${failReason}`);
        }
        console.error("  Expected:", c.expected);
        console.error("  Actual:", result.start ? { start: result.start, end: result.end, intent: result.intent, importance: result.importance } : { intent: result.intent, importance: result.importance });
        failed++;
    }
});

if (failed === 0) {
    console.log("All tests passed!");
    process.exit(0);
} else {
    console.error(`${failed} tests failed.`);
    process.exit(1);
}
