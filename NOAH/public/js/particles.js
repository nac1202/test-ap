// public/js/particles.js
document.addEventListener('DOMContentLoaded', () => {
  // 色の候補（白、黄、シアン、ピンク、紫など）
  const flareColors = [
    '#ffffff', 
    'rgba(255, 255, 0, 0.9)', 
    'rgba(0, 255, 255, 0.9)', 
    'rgba(255, 105, 180, 0.9)', 
    'rgba(138, 43, 226, 0.9)'
  ];

  function spawnCrossFlare(container) {
    const flare = document.createElement('div');
    flare.classList.add('js-cross-flare');
    
    // 隣のカードに干渉しないよう、完全に対象カードの領域内（10% 〜 90%）で発生させる
    const left = Math.random() * 80 + 10; 
    const top = Math.random() * 80 + 10;
    
    // カードのサイズに応じて基準スケールを変更する
    const rect = container.getBoundingClientRect();
    const baseScale = Math.max(0.3, rect.width / 300); 
    
    // サイズのランダム化（0.2 〜 0.7倍に抑えて光の広がりを小さくする） * カードの相対サイズ
    const scale = (0.2 + (Math.random() * 0.5)) * baseScale;
    
    // 色のランダム化
    const color = flareColors[Math.floor(Math.random() * flareColors.length)];

    flare.style.left = `${left}%`;
    flare.style.top = `${top}%`;
    
    // CSS変数をセットしてアニメーション内で利用する
    flare.style.setProperty('--flare-scale', scale);
    flare.style.setProperty('--flare-color', color);

    container.appendChild(flare);

    // アニメーションが終わったら自動でDOMから削除する（ゴミが残らないように）
    flare.addEventListener('animationend', () => {
      flare.remove();
    });
  }

  // 定期的に発生させるループ
  setInterval(() => {
    // 画面に存在するすべての女帝エフェクト要素を取得
    const targets = document.querySelectorAll('.glow-rainbow');
    targets.forEach(target => {
      // 一定確率で発生させることで、完全に不規則な瞬きを演出
      if (Math.random() > 0.5) {
        spawnCrossFlare(target);
      }
      // まれに一気に2つ発生する
      if (Math.random() > 0.8) {
        spawnCrossFlare(target);
      }
    });
  }, 400); // 400msごとに判定（パチパチとした瞬きの間隔）

  // === 音声ファイルの準備 ===
  const rippleGoldAudio = new Audio('/audio/ripple_gold.mp3');
  const rippleRainbowAudio = new Audio('/audio/ripple_rainbow.mp3');
  rippleGoldAudio.volume = 0.5; // 音量調整（少し控えめに）
  rippleRainbowAudio.volume = 0.5;

  function playRippleSound(isRainbow) {
    const audio = isRainbow ? rippleRainbowAudio : rippleGoldAudio;
    audio.currentTime = 0; // 連続タップ時に頭から再生し直す
    audio.play().catch(e => {
      // ユーザーのインタラクション前は再生ブロックされるためエラーを無視
      console.log('Audio playback blocked pending user interaction.');
    });
  }

  // === インタラクティブな波紋エフェクト ===
  function initRippleEffect() {
    document.addEventListener('pointerdown', (e) => {
      // glow-gold または glow-rainbow を持つ要素を探す
      const card = e.target.closest('.glow-gold, .glow-rainbow');
      if (!card) return;

      const isRainbow = card.classList.contains('glow-rainbow');
      
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 波紋要素を作成
      const ripple = document.createElement('div');
      ripple.classList.add('js-ripple');
      ripple.classList.add(isRainbow ? 'ripple-rainbow' : 'ripple-gold');
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      card.appendChild(ripple);
      
      // SEを再生
      playRippleSound(isRainbow);

      ripple.addEventListener('animationend', () => {
        ripple.remove();
      });

      // 女帝（レインボー）の場合は、同時に周囲に星屑を弾けさせる
      if (isRainbow) {
        spawnBurstFlares(card, x, y);
      }
    });
  }

  function spawnBurstFlares(container, cx, cy) {
    const burstCount = 12 + Math.floor(Math.random() * 8); // 12〜19個の星が弾ける
    for (let i = 0; i < burstCount; i++) {
      const flare = document.createElement('div');
      flare.classList.add('js-burst-flare');
      
      // ランダムな飛散方向（ベクトル）
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 150; // 80px〜230px飛ぶ（大幅に飛距離UP）
      const vx = Math.cos(angle) * distance;
      const vy = Math.sin(angle) * distance;
      
      const scale = 0.5 + Math.random() * 1.2; // サイズも大きく（0.5〜1.7倍）
      const color = flareColors[Math.floor(Math.random() * flareColors.length)];

      flare.style.left = `${cx}px`;
      flare.style.top = `${cy}px`;
      flare.style.setProperty('--vx', `${vx}px`);
      flare.style.setProperty('--vy', `${vy}px`);
      flare.style.setProperty('--flare-scale', scale);
      flare.style.setProperty('--flare-color', color);

      container.appendChild(flare);

      flare.addEventListener('animationend', () => {
        flare.remove();
      });
    }
  }

  let lastTrailSoundTime = 0;
  function playTrailSound(isRainbow) {
    const now = Date.now();
    // 音が重なりすぎないよう、200ms（0.2秒）に1回の頻度に制限する
    if (now - lastTrailSoundTime < 200) return;
    lastTrailSoundTime = now;

    // 波紋の音源を流用する
    const audioTemplate = isRainbow ? rippleRainbowAudio : rippleGoldAudio;
    
    // 長く響く音を途切れさせないよう、クローンを作成して複数重ねて鳴らす
    const clonedAudio = audioTemplate.cloneNode();
    clonedAudio.volume = 0.15; // 音量を少し上げる（0.05 -> 0.15）
    clonedAudio.play().catch(e => {
      // ユーザーインタラクション前はエラーを無視
    });
  }

  // === マウス追従エフェクト ===
  function initMouseTrailEffect() {
    let lastTime = 0;
    
    document.addEventListener('pointermove', (e) => {
      // スロットル処理：約30msに1回の頻度で発生させる（描画負荷軽減）
      const now = Date.now();
      if (now - lastTime < 30) return;
      
      const card = e.target.closest('.glow-gold, .glow-rainbow');
      if (!card) return;
      
      lastTime = now;
      const isRainbow = card.classList.contains('glow-rainbow');
      
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      spawnTrailOrb(card, x, y, isRainbow);
      
      // 女帝（レインボー）の場合は、軌跡からさらにキラキラが飛び散る
      if (isRainbow && Math.random() > 0.4) { // 60%の確率で発生
        spawnTrailSparkle(card, x, y);
      }

      // マウス追従時の微かなSEを鳴らす
      playTrailSound(isRainbow);
    });
  }

  function spawnTrailOrb(container, cx, cy, isRainbow) {
    const orb = document.createElement('div');
    orb.classList.add('js-trail-orb');
    
    if (isRainbow) {
      orb.classList.add('trail-rainbow');
      // 女帝は色がランダムに変わる魔法の粉
      const color = flareColors[Math.floor(Math.random() * flareColors.length)];
      orb.style.setProperty('--trail-color', color);
    } else {
      orb.classList.add('trail-gold');
    }
    
    orb.style.left = `${cx}px`;
    orb.style.top = `${cy}px`;
    
    // スケールを少しランダムにしてバラつきを出す
    const scale = 0.5 + Math.random() * 0.8;
    orb.style.transform = `translate(-50%, -50%) scale(${scale})`;

    container.appendChild(orb);

    orb.addEventListener('animationend', () => {
      orb.remove();
    });
  }

  function spawnTrailSparkle(container, cx, cy) {
    const sparkle = document.createElement('div');
    sparkle.classList.add('js-trail-sparkle');
    
    // ランダムな飛散ベクトル（少し下や横にこぼれ落ちるイメージ）
    const angle = Math.random() * Math.PI * 2;
    const distance = 10 + Math.random() * 30; // 10〜40px飛び散る
    const vx = Math.cos(angle) * distance;
    const vy = Math.sin(angle) * distance + 15; // 少し重力っぽく下方向を足す
    
    const scale = 0.4 + Math.random() * 0.8;
    const rot = Math.random() * 360;

    sparkle.style.left = `${cx}px`;
    sparkle.style.top = `${cy}px`;
    sparkle.style.setProperty('--vx', `${vx}px`);
    sparkle.style.setProperty('--vy', `${vy}px`);
    sparkle.style.setProperty('--flare-scale', scale);
    sparkle.style.setProperty('--rot', `${rot}deg`);

    container.appendChild(sparkle);

    sparkle.addEventListener('animationend', () => {
      sparkle.remove();
    });
  }

  initRippleEffect();
  initMouseTrailEffect();
});
