/**
 * 守護トリオ（上位3枚のカード）属性定義および20パターンアドバイスデータ
 */

// タロットカード全24枚の属性マッピング
// 属性種類: 'PASSION' (🔥情熱・行動), 'HEALING' (🌙癒し・直感), 'FORTUNE' (💎引き寄せ・実り), 'MIRACLE' (✨奇跡・守護)
const CARD_ELEMENTS = {
    0:  { type: 'PASSION', name: '愚者', symbol: '🔥', label: '情熱' },
    1:  { type: 'PASSION', name: '魔術師', symbol: '🔥', label: '情熱' },
    2:  { type: 'HEALING', name: '女教皇', symbol: '🌙', label: '癒し' },
    3:  { type: 'FORTUNE', name: '女帝', symbol: '💎', label: '引き寄せ' },
    4:  { type: 'PASSION', name: '皇帝', symbol: '🔥', label: '情熱' },
    5:  { type: 'FORTUNE', name: '教皇', symbol: '💎', label: '引き寄せ' },
    6:  { type: 'FORTUNE', name: '恋人たち', symbol: '💎', label: '引き寄せ' },
    7:  { type: 'PASSION', name: '戦車', symbol: '🔥', label: '情熱' },
    8:  { type: 'PASSION', name: '力', symbol: '🔥', label: '情熱' },
    9:  { type: 'HEALING', name: '隠者', symbol: '🌙', label: '癒し' },
    10: { type: 'FORTUNE', name: '運命の輪', symbol: '💎', label: '引き寄せ' },
    11: { type: 'FORTUNE', name: '正義', symbol: '💎', label: '引き寄せ' },
    12: { type: 'HEALING', name: '吊るされた男', symbol: '🌙', label: '癒し' },
    13: { type: 'MIRACLE', name: '死神', symbol: '✨', label: '奇跡' },
    14: { type: 'HEALING', name: '節制', symbol: '🌙', label: '癒し' },
    15: { type: 'FORTUNE', name: '悪魔', symbol: '💎', label: '引き寄せ' },
    16: { type: 'FORTUNE', name: '塔', symbol: '💎', label: '引き寄せ' },
    17: { type: 'HEALING', name: '星', symbol: '🌙', label: '癒し' },
    18: { type: 'HEALING', name: '月', symbol: '🌙', label: '癒し' },
    19: { type: 'PASSION', name: '太陽', symbol: '🔥', label: '情熱' },
    20: { type: 'MIRACLE', name: '審判', symbol: '✨', label: '奇跡' },
    21: { type: 'FORTUNE', name: '世界', symbol: '💎', label: '引き寄せ' },
    22: { type: 'MIRACLE', name: 'GUARDIAN DEITY', symbol: '✨', label: '奇跡' },
    23: { type: 'MIRACLE', name: 'THE SANCTUARY', symbol: '✨', label: '奇跡' }
};

// 4属性の重複組み合わせ（全20パターン）に対する守護メッセージ
// ソートされたキー文字列（例: "FORTUNE-HEALING-PASSION"）で検索
const TRIO_ADVICE_PATTERNS = {
    // === PASSION（情熱）メイン ===
    "PASSION-PASSION-PASSION": {
        title: "🔥 無限のエネルギーと圧倒的突破力",
        message: "あなたの守護空間は燃えるような圧倒的エネルギーに包まれています！自信を持って一歩踏み出せば、どんな目標もパワフルにクリアできる最強の行動期です✨"
    },
    "HEALING-PASSION-PASSION": {
        title: "🔥🌙 研ぎ澄まされた直感と情熱のフュージョン",
        message: "冷静な観察眼と熱い意欲が最高バランスで融合しています。自分の心の声に従って進むことで、周りを魅了する大きな成果をつかみ取れますよ！"
    },
    "FORTUNE-PASSION-PASSION": {
        title: "🔥💎 チャンスを即座に掴み取る大開運パワー",
        message: "豊かな運気と抜群の行動力がタッグを組んでいます！迷わず動くことで素晴らしい幸運や理想の展開が次々と舞い込んでくる絶好調の波に乗っています✨"
    },
    "MIRACLE-PASSION-PASSION": {
        title: "🔥✨ 奇跡の変革を起こすチャレンジャー",
        message: "守護キャストの特別な加護を受け、現状を劇的に好転させるパワーがみなぎっています。あなたの勇気ある行動が奇跡のような扉を開くキッカケになります！"
    },

    // === HEALING（癒し）メイン ===
    "HEALING-HEALING-HEALING": {
        title: "🌙 溢れる慈愛と深遠なる癒しの波動",
        message: "あなたの存在そのものが優しさと安心感で満たされています。自分自身を労わり大切にすることで、周囲からも深い愛情と信頼が自然と集まってきますよ癒"
    },
    "FORTUNE-HEALING-HEALING": {
        title: "🌙💎 心の穏やかさが引き寄せる最高の幸福",
        message: "静かで澄んだ心が豊かな幸運を引き寄せる最高のオーラを放っています。あせらずマイペースに過ごすことが、巡り巡って大きな成果につながります✨"
    },
    "HEALING-HEALING-MIRACLE": {
        title: "🌙✨ 奇跡的な導きとシンクロニシティ",
        message: "インスピレーションが冴えわたり、不思議な縁や奇跡的な出来事に守られています。ふと感じた直感や優しさを大切にすることで、素晴らしい展開が訪れます！"
    },

    // === FORTUNE（引き寄せ・実り）メイン ===
    "FORTUNE-FORTUNE-FORTUNE": {
        title: "💎 黄金の豊かさと最高の引き寄せ力",
        message: "あなたの周囲には最高の幸運サイクルが完成しています！望む成果や素敵な人間関係が自然と集まる無敵のフィーバー期。感謝の気持ちで受け取ってください✨"
    },
    "FORTUNE-FORTUNE-MIRACLE": {
        title: "💎✨ 運命の急展開と最高のギフト",
        message: "大きな実りと奇跡的な幸運が同時に訪れるスペシャルな運気です！想像以上の嬉しいサプライズや、諦めかけていた希望が素晴らしい形で叶いそうです✨"
    },

    // === MIRACLE（奇跡・守護）メイン ===
    "MIRACLE-MIRACLE-MIRACLE": {
        title: "✨ 究極の絶対守護と大奇跡のオーラ",
        message: "みりゅうママとNOAの特別な加護が最高潮に達しています！すべての厄災は跳ね返され、あなたにとって最高のご縁と繁栄だけが約束された無敵の状態です✨"
    },

    // === 複合組み合わせ ===
    "FORTUNE-HEALING-PASSION": {
        title: "🔥🌙💎 調和と引き寄せの理想的トライアングル",
        message: "「情熱・癒し・幸運」のバランスが完璧に整っています！無理なく自分らしく過ごすだけで、理想的な展開と充実した毎日がスムーズに訪れる最高の状態です✨"
    },
    "HEALING-MIRACLE-PASSION": {
        title: "🔥🌙✨ 天からの閃きと情熱のブレイクスルー",
        message: "直感と情熱、そして特別な加護が合体！アイデアを形にする力がみなぎっています。思いついたヒラメキを素直に実行すれば、想像以上の奇跡が起こります！"
    },
    "FORTUNE-MIRACLE-PASSION": {
        title: "🔥💎✨ 輝く未来を切り拓く奇跡の引き寄せ",
        message: "溢れるエネルギーと強運、そして守護の力が結集しています！大きな挑戦や願い事を叶える絶好のタイミング。自信を持って前進してください✨"
    },
    "FORTUNE-HEALING-MIRACLE": {
        title: "🌙💎✨ 満ち足りた安らぎと幸運のシナジー",
        message: "穏やかな心と豊かな引き寄せ、そして奇跡の守護に守られた至福の運気です。周囲の人々との優しい繋がりが、あなたにさらなる幸運をもたらします✨"
    },

    // === 2属性ペア＆1属性 ===
    "FORTUNE-FORTUNE-HEALING": {
        title: "🌙💎 実りと安心感に包まれた黄金期",
        message: "しっかりとした現実的な実りと、心温まる安心感が両立しています。あなたがこれまで重ねてきた努力が、最高の形となって豊かに実を結んでいます✨"
    },
    "FORTUNE-FORTUNE-PASSION": {
        title: "🔥💎 努力が大きな成果を生む強運モード",
        message: "目的意識と高い実行力が引き寄せ力を倍増させています！狙った目標は逃さずキャッチできるパワフルな時期。やりたかったことに果敢に挑戦しましょう！"
    },
    "HEALING-HEALING-PASSION": {
        title: "🔥🌙 内なる情熱を秘めた癒しのヒーラー",
        message: "優しさの中にブレない芯の強さを感じさせる魅力的なオーラです。周りを温かく包み込みながら、自分の夢も確実に手に入れていく素晴らしいバランスです✨"
    },
    "FORTUNE-HEALING-MIRACLE": {
        title: "🌙💎✨ 祝福された愛と調和のエネルギー",
        message: "周囲への感謝と愛が何倍にもなってあなたに返ってきます。特別な守護のもと、心も環境も満たされる最高に温かい日々が待っていますよ✨"
    },
    "FORTUNE-MIRACLE-MIRACLE": {
        title: "💎✨ 神秘の引き寄せと奇跡のブレッシング",
        message: "守護キャストの特別な愛と、幸運の引き寄せが重なり合う奇跡的な運気！思わぬルートから素晴らしいチャンスや最高の縁が舞い込みます✨"
    },
    "HEALING-MIRACLE-MIRACLE": {
        title: "🌙✨ 深い愛と絶対的な安心感の守護",
        message: "NOAの守護神たちがあなたをいつでも優しく見守っています。どんな時もあなたは守られており、安心して自分らしく輝いていける強運に満ちています✨"
    }
};
