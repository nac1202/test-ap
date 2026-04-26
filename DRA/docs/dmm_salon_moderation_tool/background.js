// background.js (Service Worker)

// 拡張機能アイコンをクリックした際にサイドパネルを開く設定
if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));
}

// 中継サーバー (Cloudflare Worker) のURL
// 画像から判明したURLに設定済み
const WORKER_URL = "https://blue-night-035a.sekilab55.workers.dev/";
const STAFF_ACCESS_PASSWORD = "Sekilab2026";

// API呼び出し関数 (中継サーバーへ)
async function callWorkerAPI(password, content, strictness, customRules, retryCount = 0) {
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
                strictness: strictness, // 厳しさレベルを付与
                customRules: customRules // 追加の審査ルール・NGワードを付与
            })
        });

        if (!response.ok) {
            console.error(`[DMM Check] Worker HTTP Error: ${response.status}`);
            if (response.status === 429) {
                return { level: "error", reason: "【アクセス制限】APIの利用上限に達しました。1分ほど待ってから再試行してください。" };
            }
            // 502 Bad Gateway などの一時的なサーバーエラーの場合はリトライ
            if (response.status >= 500 && retryCount < 2) {
                console.log(`[DMM Check] サーバーエラー (${response.status})。リトライします...(${retryCount + 1}/2)`);
                await new Promise(r => setTimeout(r, 1500));
                return callWorkerAPI(password, content, strictness, customRules, retryCount + 1);
            }
            return { level: "error", reason: `サーバー異常が発生しました (${response.status})。しばらく待ってから再度お試しください。` };
        }

        const data = await response.json();
        return data; // { level, reason, violation_type }

    } catch (error) {
        console.error("Fetch Error:", error);
        // v2.13.3: タイムアウトや切断エラー時の自動再試行
        if (retryCount < 2) {
             console.log(`[DMM Check] 通信切断。リトライします...(${retryCount + 1}/2)`);
             await new Promise(r => setTimeout(r, 1500));
             return callWorkerAPI(password, content, strictness, customRules, retryCount + 1);
        }
        return { level: "error", reason: "【通信エラー】回線が切断されたか、中継サーバーが応答しませんでした。少し待ってから再試行してください。" };
    }
}

// コンテンツスクリプトからのメッセージ受信リスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "check_content") {
        const textToAnalyze = request.text;

        // 非同期処理を正しく返却するためにPromiseチェーンを使う
        chrome.storage.local.get(['aiMode', 'strictnessLevel', 'customRules', 'ngWords', 'whiteWords'])
            .then(async (result) => {
                if (result.ngWords && result.ngWords.trim() !== '') {
                    // カンマ、読点、改行、全角/半角スペースなどで分割して配列化
                    const ngWordList = result.ngWords.split(/[,\s、\n　]+/).map(w => w.trim()).filter(w => w.length > 0);
                    
                    // テキスト内にNGワードが含まれているかチェック
                    const foundWord = ngWordList.find(word => textToAnalyze.includes(word));
                    
                    if (foundWord) {
                        console.log(`[DMM Check] ローカルNGワード検知: ${foundWord}`);
                        // AIへは送信せず、即座にdanger判定を返す
                        sendResponse({
                            level: "danger",
                            reason: `NGワード「${foundWord}」が使用されています。`,
                            violation_type: "必須NGワードの使用",
                            _wasCached: true // v2.13.8: 即時判定の場合はAPI待機時間をスキップ
                        });
                        return; // ここで処理終了
                    }
                }

                // v2.13.7: AIモードが「オフ」の場合はここで判定を終了し、安全として返す
                if (result.aiMode === "off") {
                    console.log(`[DMM Check] AI判定オフのためAPI送信をスキップします`);
                    sendResponse({
                        level: "safe",
                        reason: "AI判定機能がオフになっています（NGワードは検出されませんでした）",
                        violation_type: "",
                        _wasCached: true // v2.13.8: 即時判定の場合はAPI待機時間をスキップ
                    });
                    return; // ここで処理を終了。APIへは送らない
                }

                // --- 通常のAI判定（文脈チェック） ---
                let combinedRules = result.customRules || '';

                // v2.13: 除外ワード（ホワイトリスト）をAIへのプロンプト指示に強力に追記する
                if (result.whiteWords && result.whiteWords.trim() !== '') {
                    combinedRules += `\n\n※以下のキーワードが含まれる話題は【サロン独自の正常な話題（セーフリスト）】であるため、それ自体を公序良俗・スパムなどの違反として扱わず、安全（safe）と判定してください:\n${result.whiteWords}`;
                }

                const strictness = result.strictnessLevel || 'normal';

                // 中継サーバーを呼び出して判定スコアを取得
                const aiResult = await callWorkerAPI(STAFF_ACCESS_PASSWORD, textToAnalyze, strictness, combinedRules);
                
                // 判定結果をcontent.jsに送り返す
                sendResponse(aiResult);
            })
            .catch(error => {
                console.error("Storage/API error:", error);
                sendResponse({ level: "error", reason: "内部エラーが発生しました。" });
            });

        // sendResponseを非同期で呼ぶために必須
        return true;
    } else if (request.action === "increment_badge") {
        // 現在のバッジの数値を取得して+1する
        chrome.action.getBadgeText({}, (currentText) => {
            let count = parseInt(currentText, 10);
            if (isNaN(count)) count = 0;
            count++;
            chrome.action.setBadgeText({ text: count.toString() });
            chrome.action.setBadgeBackgroundColor({ color: '#ea4335' }); // 赤色
        });
        sendResponse({ status: "badge_updated" });
    } else if (request.action === "open_new_tab") {
        // コンテンツスクリプトからの要請で新しいタブを開く（ポップアップブロック回避）
        if (request.url) {
            chrome.tabs.create({ url: request.url });
        }
        sendResponse({ status: "tab_opened" });
    }
});
