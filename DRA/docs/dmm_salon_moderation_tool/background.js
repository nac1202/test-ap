// background.js (Service Worker)

// 中継サーバー (Cloudflare Worker) のURL
// 画像から判明したURLに設定済み
const WORKER_URL = "https://blue-night-035a.sekilab55.workers.dev/";

// API呼び出し関数 (中継サーバーへ)
async function callWorkerAPI(password, content, strictness) {
    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // 設定画面に入力された「スタッフ用パスワード」を送信
                "Authorization": `Bearer ${password}`
            },
            body: JSON.stringify({
                text: content,
                strictness: strictness // 厳しさレベルを付与
            })
        });

        const data = await response.json();
        return data; // { level, reason, violation_type }

    } catch (error) {
        console.error("Fetch Error:", error);
        return { level: "error", reason: "中継サーバーとの通信エラーが発生しました。" };
    }
}

// コンテンツスクリプトからのメッセージ受信リスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "check_content") {
        const textToAnalyze = request.text;

        // Storageからスタッフ用パスワードと厳しさを取得
        chrome.storage.local.get(['openaiApiKey', 'strictnessLevel'], async function (result) {
            if (!result.openaiApiKey) {
                sendResponse({ level: "error", reason: "パスワードが設定されていません。拡張機能の設定画面から保存してください。" });
                return;
            }

            const strictness = result.strictnessLevel || "normal";

            // 中継サーバーを呼び出して判定スコアを取得
            const aiResult = await callWorkerAPI(result.openaiApiKey, textToAnalyze, strictness);

            // コンテンツスクリプトに結果を返す
            sendResponse(aiResult);
        });

        // 非同期レスポンスを返すために必須
        return true;
    }
});
