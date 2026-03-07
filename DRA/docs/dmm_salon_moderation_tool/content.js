// content.js
console.log("DMM Salon Check Tool is running on this page.");

// チェック対象とするDOM要素のセレクタ
// DMMサロンの実際の構造に合わせたセレクタを追加
const POST_SELECTOR = 'div[type="post"], .sc-bhlCSH, .post-content, .comment-body, p';
const CONTENT_SELECTOR = 'div[class*="content"], p, span';
const LINK_SELECTOR = 'a[href*="/posts/"]';
const PROCESSED_ATTR = 'data-dmm-check-processed';

// サイドバー表示関数
function createSidebar() {
    let sidebar = document.getElementById('dmm-check-sidebar');
    if (!sidebar) {
        sidebar = document.createElement('div');
        sidebar.id = 'dmm-check-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h3>違反一覧 (DMM Check)</h3>
                <button id="close-sidebar">✕</button>
            </div>
            <div id="violation-list"></div>
        `;
        document.body.appendChild(sidebar);

        document.getElementById('close-sidebar').addEventListener('click', () => {
            sidebar.style.display = 'none';
        });
    }

    // 中身をクリアして表示
    document.getElementById('violation-list').innerHTML = '';
    sidebar.style.display = 'flex';
}

function addToSidebar(response, element, text) {
    const list = document.getElementById('violation-list');
    if (!list) return;

    const item = document.createElement('div');
    item.className = `violation-item ${response.level}`;

    // 日時と本文のプレビューのみ表示
    const previewText = text.length > 40 ? text.substring(0, 40) + '...' : text;
    item.innerHTML = `
        <div class="v-type">${response.violation_type || '要確認'}</div>
        <div class="v-text">${previewText}</div>
        <div class="v-reason">${response.reason}</div>
    `;

    // クリックで該当箇所にスクロール
    item.addEventListener('click', () => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 一時的に目立たせるエフェクト
        element.style.transition = 'background-color 0.5s';
        const originalBg = element.style.backgroundColor;
        element.style.backgroundColor = '#ffff99';
        setTimeout(() => {
            element.style.backgroundColor = originalBg;
        }, 1500);
    });

    list.appendChild(item);
}


/**
 * テキストをAPIに投げて判定し、画面をハイライト・一覧追加する関数
 * @param {HTMLElement} element 対象の要素
 * @param {boolean} isManualAction 手動チェックによる実行かどうか
 */
async function analyzeAndHighlight(element, isManualAction = false) {
    // 既に処理済みの場合はスキップ
    if (element.hasAttribute(PROCESSED_ATTR)) return;

    // 実際のDMMサロンでは、ラッパー要素の中に本文があるため、全体からテキストを取得
    let textNode = element.querySelector(CONTENT_SELECTOR) || element;
    const text = textNode.innerText ? textNode.innerText.trim() : element.innerText.trim();

    if (text.length < 5) return;

    // パーマリンクURLの取得を試みる（<div>内に <a> があるかを探す）
    let permalinkUrl = null;
    const linkElement = element.querySelector(LINK_SELECTOR);
    if (linkElement && linkElement.href) {
        permalinkUrl = linkElement.href;
    }

    // 処理中マークをつける
    element.setAttribute(PROCESSED_ATTR, 'true');

    try {
        // background.js にテキストを送って判定をリクエスト
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "check_content", text: text }, (res) => {
                resolve(res);
            });
        });

        if (!response) return;

        // エラー以外ならスタイルを付与し、違反があればサイドバーに追加
        if (response.level === 'danger') {
            element.classList.add('dmm-check-danger');
            addTooltip(element, `🚨 ${response.violation_type}\n${response.reason}`);
            if (isManualAction) addToSidebar(response, element, text, permalinkUrl);
        } else if (response.level === 'warning') {
            element.classList.add('dmm-check-warning');
            addTooltip(element, `⚠️ ${response.violation_type || '要確認'}\n${response.reason}`);
            if (isManualAction) addToSidebar(response, element, text, permalinkUrl);
        }

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

/**
 * 画面上のすべての投稿をチェックする
 * @param {boolean} isManual popupの一括チェックボタンからの発火かどうか
 */
// isManual = popupの一括チェックボタンからの発火かどうか
// 自動巡回と区別して、手動チェック時のみサイドバーを構築する
function checkAllPosts(isManual = false) {
    if (isManual) {
        createSidebar();
    }
    const posts = document.querySelectorAll(POST_SELECTOR);
    posts.forEach(post => {
        analyzeAndHighlight(post, isManual);
    });
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
        checkAllPosts(true);
    }
});

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
        window.checkTimeout = setTimeout(checkAllPosts, 1000);
    }
});

// body全体を監視
observer.observe(document.body, { childList: true, subtree: true });
