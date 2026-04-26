// content.js
console.log("DMM Salon Check Tool is running on this page.");

// チェック対象とするDOM要素のセレクタ
// DMMサロンの実際の構造に合わせたセレクタを追加
const POST_SELECTOR = 'div[type="post"], .sc-bhlCSH, .post-content, .comment-body, p, span, .testing-dummy-post';
const CONTENT_SELECTOR = 'div[class*="content"], p, span';
const LINK_SELECTOR = 'a[href*="/posts/"]';
const PROCESSED_ATTR = 'data-dmm-check-processed';

// サイドバー関連のUI構築はv2.0で廃止されたため削除

function reportViolation(response, element, text, permalinkUrl, isManualAction) {
    // ポップアップが開いていれば直接リストに追加されるようにメッセージ送信
    chrome.runtime.sendMessage({
        action: "add_violation_to_popup",
        violation: response,
        text: text,
        url: permalinkUrl,
        topicName: document.title,       // v2.7 追加: ページタイトル
        topicUrl: window.location.href   // v2.7 追加: ページURL
    }, (res) => {
        // エラー（ポップアップが閉じている場合）は無視
        if (chrome.runtime.lastError) {}
    });

    if (!isManualAction) {
        // 自動巡回で見つかった新しい違反はバックグラウンドに通知してバッジを更新
        chrome.runtime.sendMessage({ action: "increment_badge" });
        
        // v2.15.4: Discord等へのWebhook通知連携 (Dangerのみ・重複送信防止)
        if (response && response.level === 'danger') {
            const safeKey = text.substring(0, 100); // 投稿を識別するキー

            chrome.storage.local.get(['discordWebhook', 'notifyEnabled', 'notifiedPosts'], (res) => {
                if (res.notifyEnabled && res.discordWebhook) {
                    let notifiedPosts = res.notifiedPosts || [];
                    
                    // 既に一度Discordへ通知済みの書き込みならスキップ（連投スパム防止）
                    if (notifiedPosts.includes(safeKey)) {
                        return;
                    }

                    const currentTopicName = document.title;
                    const currentTopicUrl = window.location.href;
                    const jumpUrl = permalinkUrl || currentTopicUrl;
                    
                    const payload = {
                        content: `🚨 **【D.R.A 自動パトロール】重大な規約違反の疑いを発見しました**\n\n**トピック:** ${currentTopicName}\n**判定レベル:** 🔴 Danger\n**違反種別:** ${response.violation_type || "不明"}\n**AI理由:** ${response.reason || "なし"}\n\n**▼ 確認・対応用リンク:**\n${jumpUrl}`
                    };

                    fetch(res.discordWebhook, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    }).then(r => {
                        console.log("[DMM Check] Discord Webhook送信成功");
                        // 送信成功したらリストに追加し、最大1000件で古い履歴を消す
                        notifiedPosts.push(safeKey);
                        if (notifiedPosts.length > 1000) notifiedPosts.shift();
                        chrome.storage.local.set({ notifiedPosts: notifiedPosts });
                    }).catch(err => console.error("[DMM Check] Discord Webhook送信エラー:", err));
                }
            });
        }
    }

    // 要素をハイライト（クリックで該当箇所にスクロールする機能は一部ポップアップ側で代替するが、見た目のハイライトは残す）
    // ツールチップで理由も表示する
}


/**
 * テキストをAPIに投げて判定し、画面をハイライト・一覧追加する関数
 * @param {HTMLElement} element 対象の要素
 * @param {boolean} isManualAction 手動チェックによる実行かどうか
 */
async function analyzeAndHighlight(element, isManualAction = false) {
    // 既に処理済みの場合はスキップ
    if (element.hasAttribute(PROCESSED_ATTR)) return;

    // v2.13.2: 非同期処理による多重スキャン（待機中に別のイベントが発火して走る現象）を防ぐため、
    // まず最初に同期的に「処理中」フラグを立ててロックする。
    element.setAttribute(PROCESSED_ATTR, 'true');

    // 実際のDMMサロンでは、ラッパー要素の中に本文があるため、全体からテキストを取得
    let textNode = element.querySelector(CONTENT_SELECTOR) || element;
    const text = textNode.innerText ? textNode.innerText.trim() : element.innerText.trim();

    console.log(`[DMM Check] 抽出したテキスト:`, text.substring(0, 30) + '...');

    if (text.length < 5) {
        console.log(`[DMM Check] 短すぎるためスキップ:`, text);
        return;
    }

    // パーマリンクURLの取得を試みる（<div>内に <a> があるかを探す）
    let permalinkUrl = null;
    const linkElement = element.querySelector(LINK_SELECTOR);
    if (linkElement && linkElement.href) {
        permalinkUrl = linkElement.href;
    }

    // v2.13.1 & v2.13.6 & v2.14.1: ローカルストレージからの既存判定読み込み（コンテキスト無効エラー対応）
    const safeKey = text.substring(0, 100);
    
    let storageResult = { safeList: [], aiCache: {} };
    try {
        storageResult = await new Promise((resolve, reject) => {
            try {
                if (!chrome.storage || !chrome.storage.local) {
                    reject(new Error("Storage API unreachable"));
                    return;
                }
                chrome.storage.local.get(['safeList', 'aiCache'], (res) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(res || {});
                    }
                });
            } catch (e) {
                // Extension context invalidated 等の例外をここでキャッチ
                reject(e);
            }
        });
    } catch (error) {
        console.warn("[DMM Check] 拡張機能のコンテキストが無効になりました。ページをリロード（F5）してください。", error);
        return { level: "error", reason: "拡張機能が更新されました。ページを再読み込み（F5）してください。" };
    }

    const safeList = storageResult.safeList || [];
    let aiCache = storageResult.aiCache || {};

    // 運営による手動の承認スキップ
    if (safeList.includes(safeKey)) {
        console.log(`[DMM Check] 運営確認済み（承認スキップ）のためAPI通信を行わず安全とします:`, safeKey);
        element.style.border = ''; // 過去の警告枠のリセット
        return { level: "safe", _wasCached: true };
    }

    // AIの過去の判定結果による自動スキップ (エラー判定以外をキャッシュ)
    if (aiCache[safeKey] && aiCache[safeKey].level !== "error") {
        console.log(`[DMM Check] ローカルキャッシュから判定を再利用します（API通信をスキップ）:`, safeKey);
        const cachedResponse = aiCache[safeKey];
        
        // UIハイライトの適用
        if (cachedResponse.level === 'danger') {
            element.classList.add('dmm-check-danger');
            addTooltip(element, `🚨 ${cachedResponse.violation_type}\n${cachedResponse.reason}`);
            reportViolation(cachedResponse, element, text, permalinkUrl, isManualAction);
        } else if (cachedResponse.level === 'warning') {
            element.classList.add('dmm-check-warning');
            addTooltip(element, `⚠️ ${cachedResponse.violation_type || '要確認'}\n${cachedResponse.reason}`);
            reportViolation(cachedResponse, element, text, permalinkUrl, isManualAction);
        } else {
            element.style.border = '';
        }

        cachedResponse._wasCached = true;
        return cachedResponse;
    }

    try {
        console.log(`[DMM Check] APIへ送信中...`);
        // background.js にテキストを送って判定をリクエスト
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "check_content", text: text }, (res) => {
                if (chrome.runtime.lastError) {
                    console.error(`[DMM Check] 通信エラー:`, chrome.runtime.lastError);
                    resolve(null);
                } else {
                    console.log(`[DMM Check] APIからのレスポンス:`, res);
                    resolve(res);
                }
            });
        });

        if (!response) return;

        // v2.14.5: API待機中にユーザーが「承認」ボタンを押してsafeListに追加したケースのパッチ
        // 取得に時間がかかった場合、その間に承認されていればスキップする
        const recheckStorage = await new Promise(r => chrome.storage.local.get(['safeList'], r));
        if (recheckStorage.safeList && recheckStorage.safeList.includes(safeKey)) {
            console.log(`[DMM Check] API待機中に承認されたためスキップ:`, safeKey);
            element.style.border = ''; // 枠線を消去
            return { level: "safe", _wasCached: true };
        }

        // パスワードエラーなど、API自体からエラーレベルが返ってきた場合
        if (response.level === 'error') {
            reportViolation(response, element, text, permalinkUrl, isManualAction);
            return response; // v2.13.5: ここでresponseを返さないと、呼び出し側でエラーが検知できず中断処理が動かない
        }

        // エラー以外ならスタイルを付与し、違反があることを報告
        if (response.level === 'danger') {
            element.classList.add('dmm-check-danger');
            addTooltip(element, `🚨 ${response.violation_type}\n${response.reason}`);
            reportViolation(response, element, text, permalinkUrl, isManualAction);
        } else if (response.level === 'warning') {
            element.classList.add('dmm-check-warning');
            addTooltip(element, `⚠️ ${response.violation_type || '要確認'}\n${response.reason}`);
            reportViolation(response, element, text, permalinkUrl, isManualAction);
        }

        element.style.border = ''; // 警告じゃない場合は枠を消す

        // v2.13.6: 判定結果をローカルにキャッシュして次回以降API通信を節約
        aiCache[safeKey] = response;
        const cacheKeys = Object.keys(aiCache);
        if (cacheKeys.length > 2000) {
            // 最も古いキャッシュを削る（2000件上限）
            delete aiCache[cacheKeys[0]];
        }
        chrome.storage.local.set({ aiCache: aiCache });

        return response; // v2.13.5: ここでresponseを返さないと、呼び出し側でエラーが検知できず中断処理が動かない

    } catch (error) {
        console.error("Error communicating with background script:", error);
    }
}

/**
 * ツールチップ（理由を表示する枠）を追加する関数
 * @param {HTMLElement} element 対象の要素
 * @param {string} message 表示するメッセージ
 */
function addTooltip(element, message) {
    const tooltip = document.createElement('div');
    tooltip.className = 'dmm-check-tooltip';
    tooltip.innerText = message;

    // サポート用のコンテナを作って相対位置にする
    element.style.position = 'relative';
    element.appendChild(tooltip);
}

let isChecking = false;
let needsAnotherCheck = false;

// --- v2.13.10: ポップアップのヘッダーへ進捗を送信 ---
function showProgress(current, total) {
    try {
        chrome.runtime.sendMessage({ action: "update_progress", current: current, total: total }, () => {
            if (chrome.runtime.lastError) {} // ポップアップが閉じていればエラーになるが無視する
        });
    } catch(e) {}
}

function hideProgress() {
    try {
        // totalとcurrentを同じにすることでポップアップ側で完了表示（非表示）にする
        chrome.runtime.sendMessage({ action: "update_progress", current: 1, total: 1 }, () => {
            if (chrome.runtime.lastError) {}
        });
    } catch(e) {}
}
// --------------------------------------------------

/**
 * 画面上のすべての投稿をチェックする
 * @param {boolean} isManual popupの一括チェックボタンからの発火かどうか
 */
async function checkAllPosts(isManual = false) {
    if (isChecking) {
        // v2.13.4: 既にスキャン実行中なら多重起動を防ぎ、終わった後にもう一度回すフラグを立てる
        needsAnotherCheck = true;
        return;
    }
    isChecking = true;
    needsAnotherCheck = false;

    try {
        const allCandidates = document.querySelectorAll(POST_SELECTOR);
    
    // 親要素が既にターゲットになっている場合は除外する（重複チェック防止）
    const posts = Array.from(allCandidates).filter(el => {
        let parent = el.parentElement;
        while(parent) {
            if (parent.matches && parent.matches(POST_SELECTOR)) {
                return false;
            }
            parent = parent.parentElement;
        }
        return true;
    });

    // v2.13.5: サーバーダウンを完全に防ぐため、同時の並列通信を廃止（1件ずつ完全に直列処理）
    // OpenAIのAPI利用制限などを回避するための最も安全な設計
    let errorOccurred = false;

    if (posts.length > 0) {
        showProgress(0, posts.length);
    }

    for (let i = 0; i < posts.length; i++) {
        if (errorOccurred) break;
        showProgress(i + 1, posts.length);

        // 1件ずつ完全に待機して処理
        const res = await analyzeAndHighlight(posts[i], isManual);
        
        // 深刻なエラーが返ってきたらその時点で中止する
        if (res && res.level === "error") {
            console.log("[DMM Check] 通信エラーが返されたため、一括スキャンを即時中断します。");
            errorOccurred = true;
            if (isManual) {
                chrome.runtime.sendMessage({
                    action: "add_violation_to_popup",
                    violation: res,
                    text: "",
                    url: ""
                });
            }
            break;
        }

        // 次のリクエストの前に1000ms（1秒）待機し、サーバー負担を激減させる
        // ただし、ローカルキャッシュやNGワード判定など、APIを呼ばずに即決した場合は待機時間をスキップ（高速化）
        const wasCached = res && res._wasCached;
        if (i < posts.length - 1 && !errorOccurred && !wasCached) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    } finally {
        isChecking = false;
        hideProgress();
        if (needsAnotherCheck) {
            setTimeout(() => checkAllPosts(false), 1000);
        }
    }
}

// 初回実行
// setTimeout(checkAllPosts, 2000); // ページの動的ロードを待機

// popup.jsからの手動チェック実行を受け取る
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "manual_check") {
        console.log("Manual check triggered.");
        // 全要素の処理済みマークと装飾を一旦リセットして再チェック
        document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach(el => {
            el.removeAttribute(PROCESSED_ATTR);
            el.classList.remove('dmm-check-danger', 'dmm-check-warning');
            const tooltip = el.querySelector('.dmm-check-tooltip');
            if (tooltip) tooltip.remove();
        });
        // 第二引数の true (isManualAction=true) を渡す
        checkAllPosts(true).then(() => {
            sendResponse({ status: "ok" });
        });
        return true; // 非同期でsendResponseを呼ぶために必須
    } else if (request.action === "add_dummy_post") {
        console.log("Adding dummy post for testing.");
        addDummyPost();
        sendResponse({ status: "dummy_added" });
        // return true は不要なため削除
    } else if (request.action === "safe_approved") {
        // v2.14.5: 承認ボタンが押されたとき、リアルタイムに画面上の赤枠を消して再評価する
        const approvedKey = request.safeKey;
        document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach(el => {
            let fullText = el.innerText || "";
            const postTexts = fullText.split('\n').map(t => t.trim()).filter(t => t.length > 0);
            if (postTexts.some(t => t.substring(0, 100) === approvedKey)) {
                // マーク付きを一旦外し、装飾をクリアする
                el.removeAttribute(PROCESSED_ATTR);
                el.classList.remove('dmm-check-danger', 'dmm-check-warning');
                const tooltip = el.querySelector('.dmm-check-tooltip');
                if (tooltip) tooltip.remove();
            }
        });
        // 処理済みマークが外れた要素（承認された要素）だけを狙って再スキャン
        // 承認済みの行はスキップされ、もし別の違反行があればそれだけが正しくマーキングされる
        checkAllPosts(false);
        sendResponse({ status: "rechecked" });
    } else if (request.action === "update_interval") {
        applyScanInterval(request.interval);
        sendResponse({ status: "interval_updated" });
    } else if (request.action === "scroll_to_text") {
        scrollToText(request.text, request.topicName, request.topicUrl, request.permalink);
        sendResponse({ status: "scrolled" });
    }
});

/**
 * 渡されたテキストが含まれる要素を探し、スクロールとハイライトを行う
 */
function scrollToText(searchText, topicName, topicUrl, permalink) {
    const posts = document.querySelectorAll(POST_SELECTOR);
    let found = false;

    for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        let textNode = post.querySelector(CONTENT_SELECTOR) || post;
        const text = textNode.innerText ? textNode.innerText.trim() : post.innerText.trim();

        // v2.13.3: 完全一致だけでなく、先頭30文字の部分一致も考慮してジャンプ精度を上げる
        const isMatch = text === searchText || 
                        (searchText.length > 20 && text.includes(searchText.substring(0, 30)));

        if (isMatch) {
            post.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // D.R.A仕様: アクセントカラーで目立たせるアニメーション
            post.style.transition = 'all 0.3s ease';
            const originalBg = post.style.backgroundColor;
            const originalBoxShadow = post.style.boxShadow;
            
            post.style.backgroundColor = '#4a0000'; // 暗い赤色
            post.style.boxShadow = '0 0 15px #cc0000';
            
            setTimeout(() => {
                post.style.backgroundColor = originalBg;
                post.style.boxShadow = originalBoxShadow;
            }, 2000);
            
            found = true;
            break;
        }
    }

    if (!found) {
        let targetLink = permalink || topicUrl;
        let msg = "該当する投稿が画面内に見つかりませんでした。\n画面を下へスクロールして新着記事を読み込ませてから、再度お試しください。";
        if (topicName && targetLink) {
            msg += `\n\n【本来のトピック】\n・${topicName}\n\n※投稿が古いか、別のコメント欄にある可能性があります。\n「OK」を押すと該当のページのリンクを開きます。`;
            if (confirm(msg)) {
                // v2.15.5: window.open() がポップアップブロックに引っかかる問題への対策
                // 拡張機能の background 経由で新しくタブを開かせるよう変更
                chrome.runtime.sendMessage({ action: "open_new_tab", url: targetLink });
            }
        } else {
            alert(msg);
        }
    }
}

/**
 * 動作確認用: 画面上にダミーの違反投稿DOMを挿入する関数
 */
function addDummyPost() {
    // 挿入先となるコンテナを雑に探す（通常はbody直下か、既存の投稿の親要素）
    const existingPosts = document.querySelectorAll(POST_SELECTOR);
    let container = document.body;
    if (existingPosts.length > 0) {
        container = existingPosts[0].parentNode;
    }

    const dummyContent = document.createElement('div');
    // DMMサロンの投稿に似せた構造とクラス（テスト用）
    dummyContent.className = 'sc-bhlCSH testing-dummy-post';
    dummyContent.style.border = '2px dashed red';
    dummyContent.style.padding = '10px';
    dummyContent.style.margin = '10px 0';
    dummyContent.style.backgroundColor = '#fff0f0';

    dummyContent.innerHTML = `
        <div style="font-weight: bold; color: red;">【テスト用ダミー投稿】</div>
        <div class="content">
            <p>絶対儲かる投資案件教えます！月利30%保証！詳しくはこちらのLINEまで👉🔗</p>
            <p>あいつのサロンは詐欺だ。全員で潰そうぜ。</p>
        </div>
        <div style="font-size: 10px; color: #999;">この要素は動作確認用にツールが挿入したものです。</div>
    `;

    // コンテナの先頭に挿入
    if (container === document.body) {
        document.body.insertBefore(dummyContent, document.body.firstChild);
    } else {
        container.insertBefore(dummyContent, container.firstChild);
    }
}

// オプション: DOMの変更を監視して、新しく読み込まれた投稿（無限スクロール等）も自動チェックする
const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    mutations.forEach(mutation => {
        if (mutation.addedNodes.length > 0) {
            shouldCheck = true;
        }
    });

    if (shouldCheck) {
        // デバウンス処理（連続実行を避ける）
        clearTimeout(window.checkTimeout);
        window.checkTimeout = setTimeout(() => checkAllPosts(false), 1000);
    }
});

// body全体を監視
observer.observe(document.body, { childList: true, subtree: true });

// === v2.0 定期巡回（自動スキャン）ロジック ===
let scanIntervalId = null;

function applyScanInterval(intervalMinutes) {
    if (scanIntervalId) {
        clearInterval(scanIntervalId);
        scanIntervalId = null;
    }
    if (intervalMinutes > 0) {
        const ms = intervalMinutes * 60 * 1000;
        console.log(`[DMM Check] 定期巡回を ${intervalMinutes}分 にセットしました`);
        scanIntervalId = setInterval(() => {
            console.log(`[DMM Check] 定期巡回実行中...`);
            checkAllPosts(false);
        }, ms);
    } else {
        console.log(`[DMM Check] 定期巡回をオフにしました`);
    }
}

// ロード時にストレージから設定を読み込む
chrome.storage.local.get(['scanInterval', 'pendingScrollText', 'pendingScrollTopicName', 'pendingScrollTopicUrl', 'pendingScrollPermalink'], function(result) {
    // v2.7: トピック遷移によるスクロール待機処理
    if (result.pendingScrollText) {
        chrome.storage.local.remove(['pendingScrollText', 'pendingScrollTopicName', 'pendingScrollTopicUrl', 'pendingScrollPermalink']);
        console.log(`[DMM Check] 遷移後の自動スクロールを実行:`, result.pendingScrollText);
        setTimeout(() => {
            scrollToText(
                result.pendingScrollText, 
                result.pendingScrollTopicName, 
                result.pendingScrollTopicUrl, 
                result.pendingScrollPermalink
            );
        }, 2000); // DOMレンダリング待機
    }

    if (result.scanInterval !== undefined) {
        applyScanInterval(result.scanInterval);
        
        // v2.2: 定期巡回がオンの場合、ページを開いた瞬間にすぐ1回目のスキャンを自動実行する（蓄積用）
        if (result.scanInterval > 0) {
            console.log(`[DMM Check] 定期巡回オンのため、ページロード直後の初回スキャンを実行します`);
            setTimeout(() => {
                checkAllPosts(false);
            }, 1500); // DOMレンダリング待機
        }
    }
});
