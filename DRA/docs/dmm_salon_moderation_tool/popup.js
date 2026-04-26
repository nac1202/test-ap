// popup.js

document.addEventListener('DOMContentLoaded', () => {
    // 起動時にバッジの通知件数をリセットする
    chrome.action.setBadgeText({ text: "" });

    // --- Elements ---
    const mainView = document.getElementById('main-view');
    const settingsView = document.getElementById('settings-view');
    const uiThemeSelect = document.getElementById('ui-theme');
    
    const goToSettingsBtn = document.getElementById('goToSettingsBtn');
    const goToMainBtn = document.getElementById('goToMainBtn');
    
    const mainAiMode = document.getElementById('main-aimode');
    const mainStrictness = document.getElementById('main-strictness');
    const intervalSelect = document.getElementById('interval-select');
    const checkBtn = document.getElementById('checkBtn');
    const mainStatus = document.getElementById('main-status');
    const violationList = document.getElementById('violation-list');
    const violationCount = document.getElementById('violation-count');
    const addDummyBtn = document.getElementById('addDummyBtn');
    
    const customRulesInput = document.getElementById('customRules');
    const ngWordsInput = document.getElementById('ngWords');
    const whiteWordsInput = document.getElementById('whiteWords'); // v2.13
    const saveBtn = document.getElementById('saveBtn');
    const saveStatus = document.getElementById('save-status');
    const resetSafeListBtn = document.getElementById('resetSafeListBtn'); // v2.13
    const resetStatus = document.getElementById('reset-status'); // v2.13
    
    // v2.15.0 Features
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');
    const discordWebhookInput = document.getElementById('discordWebhook');
    const notifyEnabledCheckbox = document.getElementById('notifyEnabled');
    const safelistContainer = document.getElementById('safelist-container');

    let currentViolationCount = 0;

    // --- Navigation Logic ---
    goToSettingsBtn.addEventListener('click', () => {
        mainView.classList.remove('active');
        settingsView.classList.add('active');
    });

    goToMainBtn.addEventListener('click', () => {
        settingsView.classList.remove('active');
        mainView.classList.add('active');
    });

    const DEFAULT_RULES = `【DMM規約・D.R.A運営方針に基づく判定基準】
1. 他のサロン、外部のLINEグループ、Discord、オープンチャット、または外部サイトへの誘導・勧誘を目的とした書き込みは「danger」とする。
2. 仮想通貨、FX、未公開株、情報商材などの投資・副業話や、「絶対に儲かる」「不労所得」といった詐欺的な表現が含まれる場合は「danger」とする。
3. 他の会員、サロンオーナー、第三者に対する過度な誹謗中傷、暴言、または著しく不快感を与える攻撃的な文章は「danger」とする。
4. 自身の個人情報（電話番号、LINE ID、住所など）を公開し、直接の出会い、交際、または個人的な直接取引を求める内容は「danger」とする。
5. ネットワークビジネス（MLM）、マルチ商法、ねずみ講、特定の宗教、または政治団体への勧誘活動は「danger」とする。
6. 都市伝説やオカルトの話題であっても、実際の犯罪行為（暴力、テロなど）を助長、予告、教唆する内容は「danger」とする。
7. 「退会する」「返金しろ」など、運営の業務を妨害するような過激なクレームや扇動的な表現は「warning」または「danger」とする。`;

    const DEFAULT_NG_WORDS = `絶対儲かる, 元本保証, 不労所得, LINE追加, LINEついか, オプチャ, オープンチャット, Discord招待, 外部サーバー, 仮想通貨, 暗号資産, FX自動売買, 情報商材, マルチ商法, ねずみ講, 宗教勧誘, パパ活, 援助交際, 殺す, 死ね, 詐欺, お金配り, 直接振り込み, アフィリエイト, クレカ現金化, 闇バイト, 裏バイト`;

    // --- Load Settings and Previous State ---
    chrome.storage.local.get(['aiMode', 'strictnessLevel', 'customRules', 'ngWords', 'whiteWords', 'scanInterval', 'lastViolationsHTML', 'lastViolationCount', 'uiTheme', 'discordWebhook', 'notifyEnabled', 'safeList'], function(result) {
        if (result.aiMode) mainAiMode.value = result.aiMode;
        if (result.strictnessLevel) mainStrictness.value = result.strictnessLevel;
        
        // v2.15.0 Loads
        if (result.discordWebhook !== undefined && discordWebhookInput) discordWebhookInput.value = result.discordWebhook;
        if (result.notifyEnabled !== undefined && notifyEnabledCheckbox) notifyEnabledCheckbox.checked = result.notifyEnabled;
        if (safelistContainer) renderSafeListHistory(result.safeList || []);
        
        const currentTheme = result.uiTheme || 'dra-dark';
        if (uiThemeSelect) uiThemeSelect.value = currentTheme;
        document.documentElement.setAttribute('data-theme', currentTheme);

        let shouldSaveDefaults = false;

        // デフォルトルールの設定
        if (result.customRules !== undefined && result.customRules !== '') {
            customRulesInput.value = result.customRules;
        } else {
            customRulesInput.value = DEFAULT_RULES;
            shouldSaveDefaults = true;
        }

        // デフォルトNGワードの設定
        if (result.ngWords !== undefined && result.ngWords !== '') {
            ngWordsInput.value = result.ngWords;
        } else {
            ngWordsInput.value = DEFAULT_NG_WORDS;
            shouldSaveDefaults = true;
        }

        // 除外ワードのセット
        if (result.whiteWords !== undefined) {
            whiteWordsInput.value = result.whiteWords;
        }

        // 初回起動などで空だった場合、デフォルト値をストレージにも保存しておく
        if (shouldSaveDefaults) {
            chrome.storage.local.set({
                customRules: customRulesInput.value,
                ngWords: ngWordsInput.value
            });
        }
        
        if (result.scanInterval !== undefined) intervalSelect.value = result.scanInterval;

        // Restore previous violations list state
        if (result.lastViolationsHTML && result.lastViolationsHTML !== '') {
            violationList.innerHTML = result.lastViolationsHTML;
            currentViolationCount = result.lastViolationCount || 0;
            violationCount.textContent = `${currentViolationCount}件`;
            if (currentViolationCount > 0) violationCount.style.color = '#ff4d4d';
            
            // Re-attach click events to restored DOM elements
            attachClickListenersToCards();
        }
    });

    if (uiThemeSelect) {
        uiThemeSelect.addEventListener('change', () => {
            const selectedTheme = uiThemeSelect.value;
            // 即時反映（プレビュー）
            document.documentElement.setAttribute('data-theme', selectedTheme);
            // 自動保存も同時に行う
            chrome.storage.local.set({ uiTheme: selectedTheme }, () => {
                showStatus(saveStatus, 'テーマを変更しました！', 'success');
            });
        });
    }

    // --- Save Logic (Settings View) ---
    saveBtn.addEventListener('click', () => {
        const customRulesText = customRulesInput.value;
        const ngWordsText = ngWordsInput.value;
        const whiteWordsText = whiteWordsInput.value;
        const selectedTheme = uiThemeSelect ? uiThemeSelect.value : 'dra-dark';
        const webhookUrl = discordWebhookInput ? discordWebhookInput.value.trim() : '';
        const isNotifyOn = notifyEnabledCheckbox ? notifyEnabledCheckbox.checked : true;
        
        chrome.storage.local.set({
            customRules: customRulesText,
            ngWords: ngWordsText,
            whiteWords: whiteWordsText,
            uiTheme: selectedTheme,
            discordWebhook: webhookUrl,
            notifyEnabled: isNotifyOn,
            aiCache: {} // v2.13.9: ルール変更時はこれまでのキャッシュを破棄し、新しいルールで再スキャンさせる
        }, () => {
            document.documentElement.setAttribute('data-theme', selectedTheme);
            showStatus(saveStatus, '設定を保存しました！\n(過去の判定キャッシュもリセットしました)', 'success');
        });
    });

    // --- Reset Safe List Logic ---
    if (resetSafeListBtn) {
        resetSafeListBtn.addEventListener('click', () => {
            if (confirm("⚠️ 登録した「✅ 承認（スキップ）」の履歴をすべて消去しますか？\n次回以降、再度同じ投稿が検知されるようになります。")) {
                chrome.storage.local.set({ safeList: [] }, () => {
                    showStatus(resetStatus, '承認履歴をリセットしました！', 'success');
                    if (safelistContainer) renderSafeListHistory([]);
                    // 即座に再判定させる
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs.length > 0 && tabs[0].id) {
                            chrome.tabs.sendMessage(tabs[0].id, { action: "safe_removed" });
                        }
                    });
                });
            }
        });
    }

    // --- CSV Download Logic ---
    if (downloadCsvBtn) {
        downloadCsvBtn.addEventListener('click', () => {
            const cards = violationList.querySelectorAll('.violation-card');
            if (cards.length === 0) {
                alert("出力可能な違反データがありません。");
                return;
            }
            
            let csvContent = 'トピック名,抽出テキスト,危険度,違反理由,該当URL\n';
            
            cards.forEach(card => {
                const topicName = decodeURIComponent(card.getAttribute('data-topic-name') || "");
                const targetText = decodeURIComponent(card.getAttribute('data-target-text') || "").replace(/"/g, '""');
                
                const badge = card.querySelector('.violation-badge');
                let level = "不明";
                if (badge) {
                    level = badge.classList.contains('danger') ? 'Danger' : (badge.classList.contains('warning') ? 'Warning' : badge.textContent);
                }
                
                const reasonDiv = card.querySelector('.card-reason');
                const reason = reasonDiv ? reasonDiv.textContent.replace(/"/g, '""') : "";
                
                const url = card.getAttribute('data-permalink') || card.getAttribute('data-topic-url') || "";
                
                csvContent += `"${topicName}","${targetText}","${level}","${reason}","${url}"\n`;
            });
            
            const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
            const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
            const downloadUrl = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = `DRA_Report_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
        });
    }

    // --- Auto-Save on Change (Main View) ---
    mainAiMode.addEventListener('change', () => {
        // v2.13.9: AIモード変更時はキャッシュを破棄
        chrome.storage.local.set({ aiMode: mainAiMode.value, aiCache: {} }, () => {
            showStatus(mainStatus, '自動保存: AI判定エンジンの設定を変更しました', 'success');
        });
    });

    mainStrictness.addEventListener('change', () => {
        // v2.13.9: 厳しさ変更時もキャッシュを破棄
        chrome.storage.local.set({ strictnessLevel: mainStrictness.value, aiCache: {} }, () => {
            showStatus(mainStatus, '自動保存: 判定の厳しさを変更しました', 'success');
        });
    });

    intervalSelect.addEventListener('change', () => {
        const val = parseInt(intervalSelect.value, 10);
        chrome.storage.local.set({ scanInterval: val }, () => {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: "update_interval", interval: val }, () => {
                        if (chrome.runtime.lastError) {}
                    });
                }
            });
            showStatus(mainStatus, '自動巡回設定を適用しました', 'success');
        });
    });

    // --- Manual Check Start ---
    checkBtn.addEventListener('click', () => {
        // Clear previous results
        violationList.innerHTML = '';
        currentViolationCount = 0;
        violationCount.textContent = '0件';
        violationCount.style.color = '#39ff14'; // Matrix Green
        saveCurrentState(); // clear state
        
        showStatus(mainStatus, 'スキャン実行中...', 'success');
        checkBtn.disabled = true;

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length === 0) {
                checkBtn.disabled = false;
                return;
            }
            chrome.tabs.sendMessage(tabs[0].id, { action: "manual_check" }, function (response) {
                if (chrome.runtime.lastError) {
                    showStatus(mainStatus, '対象のページを開き直してください', 'error');
                    checkBtn.disabled = false;
                    violationList.innerHTML = '<div class="empty-state">ページが読み込まれていません。</div>';
                } else {
                    mainStatus.style.display = 'none';
                    checkBtn.disabled = false;
                    if (currentViolationCount === 0) {
                        violationList.innerHTML = '<div class="empty-state">違反は見つかりませんでした！🎉</div>';
                    }
                    saveCurrentState();
                }
            });
        });
    });

    // --- Add Dummy Post ---
    if (addDummyBtn) {
        addDummyBtn.addEventListener('click', () => {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs.length === 0) return;
                chrome.tabs.sendMessage(tabs[0].id, { action: "add_dummy_post" }, function (response) {
                    if (chrome.runtime.lastError) {
                        showStatus(mainStatus, '対象のページを開き直してください', 'error');
                    } else {
                        showStatus(mainStatus, 'ダミー投稿を追加しました', 'success');
                    }
                });
            });
        });
    }

    // --- Receive Violations and Progress from content.js ---
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "update_progress") {
            const progressEl = document.getElementById('popup-progress');
            if (progressEl) {
                progressEl.style.display = 'inline-block';
                progressEl.textContent = `巡回中... ${request.current}/${request.total}`;
                
                if (request.current >= request.total || request.total === 0) {
                    setTimeout(() => { progressEl.style.display = 'none'; }, 1500);
                }
            }
        } else if (request.action === "add_violation_to_popup") {
            // パスワードエラーなどのAPI通信エラーの通知の場合
            if (request.violation.level === 'error') {
                showStatus(mainStatus, `【エラー】${request.violation.reason}`, 'error');
                sendResponse({ status: "error_displayed" });
                return;
            }

            // v2.7: トピック名とURLを引数に追加してカード生成
            addViolationCard(request.violation, request.text, request.url, request.topicName, request.topicUrl);
            saveCurrentState(); // Update saved state on new violation
            sendResponse({ status: "received" });
        }
    });

    // --- Helper: Show Status Message ---
    function showStatus(element, text, type) {
        element.textContent = text;
        element.className = `status-msg status-${type}`;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 4000);
    }

    // --- Helper: Save State ---
    function saveCurrentState() {
        chrome.storage.local.set({
            lastViolationsHTML: violationList.innerHTML,
            lastViolationCount: currentViolationCount
        });
    }

    // --- Helper: Update Count UI ---
    function updateViolationCountUI() {
        violationCount.textContent = `${currentViolationCount}件`;
        violationCount.style.color = currentViolationCount > 0 ? '#ff0000' : '#39ff14'; // Matrix Red and Green
    }

    // --- v2.7 Clear All Btn Logic ---
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (currentViolationCount > 0 && confirm("違反リストをすべてクリアしてよろしいですか？\n（DMM上の実際の書き込みは削除されません）")) {
                violationList.innerHTML = '<div class="empty-state">違反は見つかりませんでした！🎉</div>';
                currentViolationCount = 0;
                updateViolationCountUI();
                saveCurrentState();
            }
        });
    }

    // --- Helper: Add Violation Card UI ---
    function addViolationCard(response, text, url, topicName, topicUrl) {
        // v2.13.2: 既に全く同じテキストの違反カードがUI上に存在している場合は、重複追加を防ぐ
        const encodedText = encodeURIComponent(text);
        // v2.14.5: 特殊文字によるCSSセレクタエラー回避
        let existingCard = null;
        try {
            existingCard = violationList.querySelector(`.violation-card[data-target-text="${CSS.escape(encodedText)}"]`);
        } catch(e) {}
        
        if (existingCard) {
            return; // 登録済みのためスキップ
        }

        const emptyState = violationList.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        const card = document.createElement('div');
        card.className = `violation-card ${response.level}`;
        // Store attributes for navigation and highlighting
        card.setAttribute('data-target-text', encodeURIComponent(text));
        card.setAttribute('data-topic-url', topicUrl || '');
        card.setAttribute('data-topic-name', encodeURIComponent(topicName || ''));
        card.setAttribute('data-permalink', url || '');

        const titleText = topicName ? topicName.split(' - ')[0] : '不明なトピック';
        const previewText = text.length > 50 ? text.substring(0, 50) + '...' : text;
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div class="v-type">${response.violation_type || '要確認'}</div>
                <div>
                    <button class="safe-card-btn btn-safe" title="この投稿を承認（次回以降チェックしない）">✅ 承認</button>
                    <button class="delete-card-btn" style="background:none; border:none; cursor:pointer; color:#999; padding:0; padding-left: 8px; font-size:16px; line-height:1;" title="リストから削除">×</button>
                </div>
            </div>
            <div style="font-size: 11px; color:#aaa; margin-bottom:6px; font-weight:bold; border-bottom:1px solid #333; padding-bottom:4px;">📍 ${titleText}</div>
            <div class="v-text">${previewText}</div>
            <div class="v-reason">${response.reason}</div>
            <div style="text-align: right; margin-top:5px;"><small style="color:#aaaaaa;">📌クリックでジャンプ</small></div>
        `;

        // v2.13: Safe button
        const safeBtn = card.querySelector('.safe-card-btn');
        if (safeBtn) {
            safeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const safeKey = text.substring(0, 100);
                chrome.storage.local.get(['safeList'], (res) => {
                    let safeList = res.safeList || [];
                        
                        // v2.13.2: 既に登録済みであってもUIからのカード削除処理は必ず実行する
                        const executeUIRemoval = () => {
                             card.remove();
                             currentViolationCount--;
                             if (currentViolationCount < 0) currentViolationCount = 0;
                             updateViolationCountUI();
                             if (currentViolationCount === 0) {
                                 violationList.innerHTML = '<div class="empty-state">違反は見つかりませんでした！🎉</div>';
                             }
                             saveCurrentState();
                             
                            // v2.14.5: UIから承認されたら現在アクティブなタブにも即時通知する（画面の赤枠を消すため）
                            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                                if (tabs.length > 0 && tabs[0].id) {
                                    chrome.tabs.sendMessage(tabs[0].id, { action: "safe_approved", safeKey: safeKey });
                                }
                            });
                        };

                    if (!safeList.includes(safeKey)) {
                        safeList.push(safeKey);
                        chrome.storage.local.set({ safeList }, () => {
                            if (typeof renderSafeListHistory === 'function') {
                                renderSafeListHistory(safeList);
                            }
                            executeUIRemoval();
                        });
                    } else {
                        executeUIRemoval();
                    }
                });
            });
        }

        // Bind v2.7 Delete button
        const deleteBtn = card.querySelector('.delete-card-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // クリックジャンプの誤発動を防ぐ
            card.remove();
            currentViolationCount--;
            updateViolationCountUI();
            if (currentViolationCount <= 0) {
                currentViolationCount = 0;
                violationList.innerHTML = '<div class="empty-state">違反は見つかりませんでした！🎉</div>';
            }
            saveCurrentState();
        });

        violationList.appendChild(card);
        currentViolationCount++;
        updateViolationCountUI();

        // Bind click event for jumping
        bindCardClick(card);
    }

    // Restore click events
    function attachClickListenersToCards() {
        const cards = violationList.querySelectorAll('.violation-card');
        cards.forEach(card => {
            bindCardClick(card);
            
            // 手動復元用の再バインド
            const safeBtn = card.querySelector('.safe-card-btn');
            if (safeBtn) {
                safeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const rawText = card.getAttribute('data-target-text');
                    const targetText = rawText ? decodeURIComponent(rawText) : "";
                    const safeKey = targetText.substring(0, 100);
                    chrome.storage.local.get(['safeList'], (res) => {
                        let safeList = res.safeList || [];
                            
                            const executeUIRemoval = () => {
                                card.remove();
                                currentViolationCount--;
                                if (currentViolationCount < 0) currentViolationCount = 0;
                                updateViolationCountUI();
                                if (currentViolationCount === 0) {
                                    violationList.innerHTML = '<div class="empty-state">違反は見つかりませんでした！🎉</div>';
                                }
                                saveCurrentState();
                                
                                // v2.14.5: UIから承認されたら現在アクティブなタブにも即時通知する
                                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                                    if (tabs.length > 0 && tabs[0].id) {
                                        chrome.tabs.sendMessage(tabs[0].id, { action: "safe_approved", safeKey: safeKey });
                                    }
                                });
                            };

                        if (!safeList.includes(safeKey)) {
                            safeList.push(safeKey);
                            chrome.storage.local.set({ safeList }, executeUIRemoval);
                        } else {
                            executeUIRemoval();
                        }
                    });
                });
            }

            // 再バインド: 削除ボタンのリスナー
            const deleteBtn = card.querySelector('.delete-card-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    card.remove();
                    currentViolationCount--;
                    updateViolationCountUI();
                    if (currentViolationCount <= 0) {
                        currentViolationCount = 0;
                        violationList.innerHTML = '<div class="empty-state">違反は見つかりませんでした！🎉</div>';
                    }
                    saveCurrentState();
                });
            }
        });
    }

    // v2.15.0 SafeList History Render
    function renderSafeListHistory(safeList) {
        if (!safelistContainer) return;
        safelistContainer.innerHTML = '';
        if (!safeList || safeList.length === 0) {
            safelistContainer.innerHTML = '<div style="color: #666; font-size: 11px; text-align: center; padding: 10px;">履歴はありません</div>';
            return;
        }
        
        safeList.forEach((key, index) => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.padding = '5px';
            item.style.borderBottom = '1px solid #333';
            item.style.fontSize = '11px';
            
            const textSpan = document.createElement('span');
            textSpan.textContent = key.length > 20 ? key.substring(0, 20) + '...' : key;
            textSpan.title = key;
            textSpan.style.color = '#ccc';
            textSpan.style.flex = '1';
            textSpan.style.overflow = 'hidden';
            textSpan.style.textOverflow = 'ellipsis';
            textSpan.style.whiteSpace = 'nowrap';
            
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '❌ 解除';
            removeBtn.style.background = 'transparent';
            removeBtn.style.color = '#ffb3b3';
            removeBtn.style.border = '1px solid #cc0000';
            removeBtn.style.borderRadius = '3px';
            removeBtn.style.cursor = 'pointer';
            removeBtn.style.fontSize = '10px';
            removeBtn.style.marginLeft = '5px';
            removeBtn.style.padding = '2px 5px';
            
            removeBtn.addEventListener('click', () => {
                const newList = [...safeList];
                newList.splice(index, 1);
                chrome.storage.local.set({ safeList: newList }, () => {
                    renderSafeListHistory(newList);
                    // UIから承認が解除されたため、アクティブタブに再スキャンさせる
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs.length > 0 && tabs[0].id) {
                            chrome.tabs.sendMessage(tabs[0].id, { action: "safe_removed" });
                        }
                    });
                });
            });
            
            item.appendChild(textSpan);
            item.appendChild(removeBtn);
            safelistContainer.appendChild(item);
        });
    }

    function bindCardClick(card) {
        card.addEventListener('click', () => {
            const rawText = card.getAttribute('data-target-text');
            const topicUrl = card.getAttribute('data-topic-url');
            const rawTopicName = card.getAttribute('data-topic-name');
            const topicName = rawTopicName ? decodeURIComponent(rawTopicName) : "不明なトピック";
            const permalink = card.getAttribute('data-permalink');
            
            if (rawText) {
                const targetText = decodeURIComponent(rawText);
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    if (tabs.length === 0) return;
                    
                    const currentTab = tabs[0];
                    if (!topicUrl) {
                        // URL情報がない古いデータ等の場合、そのままスクロール
                        chrome.tabs.sendMessage(currentTab.id, { action: "scroll_to_text", text: targetText, topicName: topicName, topicUrl: topicUrl, permalink: permalink });
                        return;
                    }

                    try {
                        const currentPath = new URL(currentTab.url).pathname;
                        const targetPath = new URL(topicUrl).pathname;

                        if (currentPath !== targetPath) {
                            // 別のトピックのページを開く必要がある場合、遷移してからスクロールするようストレージにフラグを立てる
                            chrome.storage.local.set({ 
                                pendingScrollText: targetText,
                                pendingScrollTopicName: topicName,
                                pendingScrollTopicUrl: topicUrl,
                                pendingScrollPermalink: permalink
                            }, () => {
                                chrome.tabs.update(currentTab.id, { url: topicUrl });
                            });
                        } else {
                            // 同じトピックにいる場合はそのままスクロール
                            chrome.tabs.sendMessage(currentTab.id, { action: "scroll_to_text", text: targetText, topicName: topicName, topicUrl: topicUrl, permalink: permalink });
                        }
                    } catch(e) {
                         chrome.tabs.sendMessage(currentTab.id, { action: "scroll_to_text", text: targetText, topicName: topicName, topicUrl: topicUrl, permalink: permalink });
                    }
                });
            }
        });
    }
});
