/**
 * DMM Salon Check Tool - Cloudflare Worker
 */

const BASE_PROMPT = `あなたはDMMオンラインサロン「Mr.都市伝説 関暁夫のD.R.A」の書き込みを監視するAIモデレーターです。

【重要：サロン独自の前提コンテキスト（大前提）】
本サロンは「都市伝説」「オカルト」「陰謀論」「スピリチュアル」「精神世界」などの話題を扱う専門的なエンターテインメント・考察コミュニティです。
そのため、一般的なSNSやAIの安全基準では「不適切・奇抜」とされるようなオカルト的、スピリチュアル的、都市伝説的な発言（例：特定の秘密結社、宇宙人、世界の裏側、過激な予言など）であっても、それ自体は本サロンにおいては【正常なコミュニケーション】です。
他の利用者への明白な誹謗中傷や、現実の犯罪行為への直接的な教唆、明らかな外部ツールでの詐欺・投資勧誘などがない限り、「オカルト的な話題であること」を理由に「公序良俗に反する内容」や「スパム」としてwarningやdanger判定をしないでください。

以下の規約に基づいて、ユーザーの投稿内容を客観的かつサロンの趣旨に寄り添って判定し、JSON形式で結果を返してください。

【違反基準】
■D.R.A 独自規約
1. サロン内情報やオーナー発信情報の外部への転記・漏洩の示唆
2. 他の利用者への誹謗中傷、脅迫、いやがらせ
3. 宗教活動、ビジネス、投資案件、政治活動、反社会勢力等への勧誘

■DMM規約
1. 援助交際・売春・買春等の勧誘・助長
2. 出会い・交際目的
3. 権利侵害（著作権、プライバシー権、肖像権等）
4. 差別的な表現
5. 自殺、違法・脱法薬物使用等の現実的な犯罪行為の勧誘・助長
6. 単なる不気味な話題ではなく、無許可の宣伝・明らかなスパムやチェーンメール
7. 現実社会において明らかに公序良俗に反する内容（オカルト的な思考や世界観はこれに該当しません）

【出力形式】
以下のJSONフォーマットで出力してください。
{
  "level": "safe" | "warning" | "danger",
  "reason": "判定理由（簡潔に）",
  "violation_type": "違反している規約の項目名（安全な場合はnull または 空文字）"
}

判定レベルの定義：
- safe: 規約違反の疑いがない
- warning: 規約違反の可能性がある（グレーゾーン）、強い言葉遣いなど
- danger: 明確な規約違反、スパム、勧誘、中傷など
`;

export default {
    async fetch(request, env) {
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        };

        if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
        if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

        try {
            const body = await request.json();
            const authHeader = request.headers.get("Authorization");

            if (!authHeader || authHeader !== `Bearer ${env.STAFF_ACCESS_PASSWORD}`) {
                return new Response(JSON.stringify({ level: "error", reason: "パスワードが間違っています。" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            if (!body.text) {
                return new Response(JSON.stringify({ level: "error", reason: "テキストがありません。" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // 厳しさレベルに応じた追加指示
            let strictnessPrompt = "";
            if (body.strictness === "loose") {
                strictnessPrompt = "\n【判定の厳しさ】: 緩い。明らかなスパムや悪質な勧誘、明確な中傷のみをdangerとし、多少言葉が荒い程度はsafeとして許容してください。";
            } else if (body.strictness === "strict") {
                strictnessPrompt = "\n【判定の厳しさ】: 厳しい。少しでも他のユーザーが不快に思う可能性がある言葉、少しでもビジネス・投資の匂いがするものは厳しくwarningやdangerと判定してください。";
            } else {
                strictnessPrompt = "\n【判定の厳しさ】: 普通。一般的なモデレーションの基準で公平に判断してください。";
            }

            // カスタムルールの結合処理
            let customRulesPrompt = "";
            if (body.customRules && body.customRules.trim() !== "") {
                customRulesPrompt = `\n\n【ユーザ側の追加規約・NGワード】\n以下の基準も「厳格に」判定に含めてください:\n${body.customRules.trim()}`;
            }

            const finalSystemPrompt = BASE_PROMPT + strictnessPrompt + customRulesPrompt;

            const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: finalSystemPrompt },
                        { role: "user", content: `以下の投稿を判定してください：\n\n${body.text}` }
                    ],
                    temperature: 0.1,
                    response_format: { type: "json_object" }
                })
            });

            if (!openAIResponse.ok) {
                let errorBody = "AI APIエラー";
                try {
                    const errorJson = await openAIResponse.json();
                    errorBody = JSON.stringify(errorJson);
                } catch(e) {
                    errorBody = await openAIResponse.text();
                }
                
                // OpenAIのエラー内容をそのまま包含して返す
                return new Response(JSON.stringify({ 
                    level: "error", 
                    reason: `【OpenAIエラー】ステータス: ${openAIResponse.status}, 内容: ${errorBody}` 
                }), { status: openAIResponse.status === 429 ? 429 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            const openAIData = await openAIResponse.json();
            return new Response(openAIData.choices[0].message.content, { headers: { ...corsHeaders, "Content-Type": "application/json" } });

        } catch (error) {
            return new Response(JSON.stringify({ level: "error", reason: "Workerエラー" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
    }
};
