// popup.htmlのスクリプト

document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const strictnessSelect = document.getElementById('strictness');
    const saveBtn = document.getElementById('saveBtn');
    const statusDiv = document.getElementById('status');
    const checkBtn = document.getElementById('checkBtn');

    // 保存されている設定（パスワード・厳しさ）を読み込んで表示
    chrome.storage.local.get(['openaiApiKey', 'strictnessLevel'], function (result) {
        if (result.openaiApiKey) {
            apiKeyInput.value = result.openaiApiKey;
        }
        if (result.strictnessLevel) {
            strictnessSelect.value = result.strictnessLevel;
        }
    });

    // 保存ボタンのクリックイベント
    saveBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        const level = strictnessSelect.value;
        chrome.storage.local.set({
            openaiApiKey: key,
            strictnessLevel: level
        }, () => {
            statusDiv.style.display = 'block';
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 2000);
        });
    });

    // 一括チェックボタンのクリックイベント（アクティブなタブのcontent scriptにメッセージを送る）
    checkBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length === 0) return;
            chrome.tabs.sendMessage(tabs[0].id, { action: "manual_check" }, function (response) {
                if (chrome.runtime.lastError) {
                    // エラーを握りつぶし、ユーザーに通知
                    statusDiv.textContent = '対象のページを開き直してください';
                    statusDiv.style.color = '#ff4a4a';
                    statusDiv.style.display = 'block';
                    setTimeout(() => {
                        statusDiv.style.display = 'none';
                        statusDiv.style.color = '#fff'; // リセット
                        statusDiv.textContent = '保存しました'; // リセット
                    }, 3000);
                }
            });
        });
    });
});
