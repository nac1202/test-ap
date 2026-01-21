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
    // Bug Report Case
    {
        input: "明日22時から23時15分まで会議",
        expected: {
            hasTime: true,
            checkStartHour: 22,
            checkDurationMin: 75 // 1h 15m
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
            ok = false;
        }
    }

    if (ok) {
        console.log(`Case ${i + 1}: OK (${c.input})`);
    } else {
        console.error(`Case ${i + 1}: FAIL (${c.input})`);
        console.error("Expected:", c.expected);
        console.error("Actual:", result.start ? { start: result.start, end: result.end } : "No Time");
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
