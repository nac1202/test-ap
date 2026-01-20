import { parseInput } from './src/parser.js';

const cases = [
    { input: "来週火曜15時から田中さんと会議（仮）", expected: { intent: "create", importance: "tentative", hasTime: true } },
    { input: "明日の18:30から会食", expected: { intent: "create", importance: "normal", hasTime: true } },
    { input: "今日の15時の予定をキャンセル", expected: { intent: "delete" } },
    { input: "15時からずらして", expected: { intent: "update" } },
    { input: "来週空いてる？", expected: { intent: "query_free" } }
];

console.log("Running Parser Tests...");
let failed = 0;

cases.forEach((c, i) => {
    const result = parseInput(c.input);
    let ok = true;

    if (c.expected.intent && result.intent !== c.expected.intent) ok = false;
    if (c.expected.importance && result.importance !== c.expected.importance) ok = false;
    if (c.expected.hasTime && !result.start) ok = false;

    if (ok) {
        console.log(`Case ${i + 1}: OK (${c.input})`);
    } else {
        console.error(`Case ${i + 1}: FAIL (${c.input})`);
        console.error("Expected:", c.expected);
        console.error("Actual:", result);
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
