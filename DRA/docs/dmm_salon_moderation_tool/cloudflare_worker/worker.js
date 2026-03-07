/**
 * DMM Salon Check Tool - Cloudflare Worker
 */

const BASE_PROMPT = `あなたはDMMオンラインサロンの書き込みを監視するAIモデレーターです。
以下の規約に基づいて、ユーザーの投稿内容を判定し、JSON形式で結果を返してください。

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
5. 自殺、違法・脱法薬物使用等の勧誘・助長
6. スパム、チェーンメール、無許可の宣伝・広告
7. 明らかに公序良俗に反する内容

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

            const finalSystemPrompt = BASE_PROMPT + strictnessPrompt;

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
                return new Response(JSON.stringify({ level: "error", reason: "AI APIエラー" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            const openAIData = await openAIResponse.json();
            return new Response(openAIData.choices[0].message.content, { headers: { ...corsHeaders, "Content-Type": "application/json" } });

        } catch (error) {
            return new Response(JSON.stringify({ level: "error", reason: "Workerエラー" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
    }
};
