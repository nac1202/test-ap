const tarotDeck = [
    {
        number: "0",
        name: "THE FOOL",
        nameJs: "愚者",
        keyword: "自由・始まり",
        message: "新しい冒険が始まる予感。常識にとらわれず、直感に従って行動してみましょう。思いがけない素敵な出会いが待っているかもしれません。",
        luckyAction: "いつもと違う席に座り、新しい視点を見つける"
    },
    {
        number: "I",
        name: "THE MAGICIAN",
        nameJs: "魔術師",
        keyword: "創造・可能性",
        message: "あなたには無限の可能性があります。アイデアを形にするチャンス。自信を持って新しい一歩を踏み出しましょう。",
        luckyAction: "「運気アップ茶」を頼んでみる"
    },
    {
        number: "II",
        name: "THE HIGH PRIESTESS",
        nameJs: "女教皇",
        keyword: "知性・神秘",
        message: "静かな直感力が冴え渡る日。騒がしい場所より、落ち着いた空間で自分と向き合う時間が幸運を呼び込みます。",
        luckyAction: "静かなカウンターの隅で、グラスの輝きを見つめる"
    },
    {
        number: "III",
        name: "THE EMPRESS",
        nameJs: "女帝",
        keyword: "豊穣・愛",
        message: "愛と喜びに満ちた一日。心に余裕を持ち、優雅な時間を過ごすことで、さらなる幸運が舞い込むでしょう。",
        luckyAction: "ゆったりとソファに身を預け、豊かさを全身で感じる"
    },
    {
        number: "IV",
        name: "THE EMPEROR",
        nameJs: "皇帝",
        keyword: "責任・安定",
        message: "揺るぎない自信が鍵となる日。リーダーシップを発揮したり、決断を下すのに最適なタイミングです。",
        luckyAction: "背筋を伸ばしてウイスキーを味わい、自信を高める"
    },
    {
        number: "V",
        name: "THE HIEROPHANT",
        nameJs: "法王",
        keyword: "信頼・慈悲",
        message: "信頼できる人との対話が心の支えになります。誰かに相談したり、アドバイスを求めると良い方向へ進むでしょう。",
        luckyAction: "隣の席の人やママと少し会話を楽しんでみる"
    },
    {
        number: "VI",
        name: "THE LOVERS",
        nameJs: "恋人",
        keyword: "調和・選択",
        message: "心ときめく瞬間が訪れる予感。直感的な「好き」という感情を大切に。素敵な選択ができるはずです。",
        luckyAction: "直感で「これだ！」と思った名前のドリンクを注文する"
    },
    {
        number: "VII",
        name: "THE CHARIOT",
        nameJs: "戦車",
        keyword: "勝利・前進",
        message: "迷わず突き進むことで道が開けます。今日は勢いが大切。目標に向かってアクセルを踏み込みましょう。",
        luckyAction: "気になっていた強めのお酒に挑戦してみる"
    },
    {
        number: "VIII",
        name: "STRENGTH",
        nameJs: "力",
        keyword: "勇気・忍耐",
        message: "本当の強さは優しさの中にあります。困難な状況でも、穏やかな心を保つことで乗り越えられるでしょう。",
        luckyAction: "時間をかけてゆっくりとウイスキーを味わう"
    },
    {
        number: "IX",
        name: "THE HERMIT",
        nameJs: "隠者",
        keyword: "探求・内省",
        message: "少し立ち止まって、自分の内側を見つめる時間が必要です。静かなBarでグラスを傾けながら、思索に耽ってみては。",
        luckyAction: "グラスの氷が溶ける音に耳を傾け、静かに自分と向き合う"
    },
    {
        number: "X",
        name: "WHEEL OF FORTUNE",
        nameJs: "運命の輪",
        keyword: "チャンス・変化",
        message: "運命が動き出すタイミング。変化を恐れず、流れに身を任せることで、想像以上の場所へ辿り着けるでしょう。",
        luckyAction: "偶然流れてきたBGMに身を委ね、リズムを感じる"
    },
    {
        number: "XI",
        name: "JUSTICE",
        nameJs: "正義",
        keyword: "均衡・正当性",
        message: "バランス感覚が重要な日。感情に流されず、公平な視点を持つことで、正しい判断ができるはずです。",
        luckyAction: "ただ素直にオーブに祈りを捧げる"
    },
    {
        number: "XII",
        name: "THE HANGED MAN",
        nameJs: "吊るされた男",
        keyword: "試練・視点の変化",
        message: "行き詰まりを感じたら、視点を変えてみましょう。一見無駄に思える時間が、実は大きな気付きを与えてくれます。",
        luckyAction: "視点を変えて、店内の装飾を逆側から眺めてみる"
    },
    {
        number: "XIII",
        name: "DEATH",
        nameJs: "死神",
        keyword: "終わりと始まり",
        message: "古いものを手放すことで、新しい何かが始まります。過去にとらわれず、未来への扉を開きましょう。",
        luckyAction: "飲み終わったグラスを眺め、次の一杯で気分を変える"
    },
    {
        number: "XIV",
        name: "TEMPERANCE",
        nameJs: "節制",
        keyword: "調和・自制",
        message: "ほどよいバランスが幸運の鍵。無理をせず、自然体でいることで、周囲との調和が生まれます。",
        luckyAction: "ノンアルコールや水も挟みつつ、長く空間を楽しむ"
    },
    {
        number: "XV",
        name: "THE DEVIL",
        nameJs: "悪魔",
        keyword: "束縛・誘惑",
        message: "甘い誘惑に注意が必要ですが、たまには羽目を外すのも人生のスパイス。自分の理性を信じて楽しみましょう。",
        luckyAction: "今の気分に正直になり、一番飲みたいものを欲望のままに頼む"
    },
    {
        number: "XVI",
        name: "THE TOWER",
        nameJs: "塔",
        keyword: "崩壊・啓示",
        message: "予期せぬ出来事が起こるかもしれませんが、それは現状打破のチャンス。驚きの先に新しい景色が待っています。",
        luckyAction: "初めて見るメニューや、普段頼まない色のお酒を試す"
    },
    {
        number: "XVII",
        name: "THE STAR",
        nameJs: "星",
        keyword: "希望・ひらめき",
        message: "暗闇の中に希望の星が輝いています。願いが叶いやすい日。理想の未来を思い描いてみましょう。",
        luckyAction: "店内に漂うオーブの光を目で追い、願い事を唱える"
    },
    {
        number: "XVIII",
        name: "THE MOON",
        nameJs: "月",
        keyword: "不安・神秘",
        message: "何かがはっきりと見えないミステリアスな日。直感を信じ、曖昧さを楽しむ余裕を持つと良いでしょう。",
        luckyAction: "照明が少し暗い場所を選び、幻想的な雰囲気に浸る"
    },
    {
        number: "XIX",
        name: "THE SUN",
        nameJs: "太陽",
        keyword: "成功・祝福",
        message: "すべてが明るく照らされる最高の日。屈託のない笑顔で過ごせば、周囲も幸せな気分に包まれます。",
        luckyAction: "一番明るい照明の下や、華やかな色のカクテルを選ぶ"
    },
    {
        number: "XX",
        name: "JUDGEMENT",
        nameJs: "審判",
        keyword: "復活・決断",
        message: "過去の努力が報われる時。諦めかけていたことに再挑戦するチャンスです。良い知らせが届くかもしれません。",
        luckyAction: "懐かしい思い出のお酒をオーダーする"
    },
    {
        number: "XXI",
        name: "THE WORLD",
        nameJs: "世界",
        keyword: "完成・達成",
        message: "ひとつのサイクルが完成し、満ち足りた気分になれるでしょう。最高のハッピーエンドと、次の旅の始まりです。",
        luckyAction: "今この瞬間の空間と時間を、心から味わい尽くす"
    }
];
