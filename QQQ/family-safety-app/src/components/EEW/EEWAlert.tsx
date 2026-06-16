'use client';

import React, { useEffect } from 'react';
import { useEEW } from './EEWContext';
import { AlertTriangle, MapPin, Activity, X } from 'lucide-react';

// 震度の数値を文字列に変換するヘルパー
const formatScale = (scale: number): string => {
  switch (scale) {
    case 10: return '1';
    case 20: return '2';
    case 30: return '3';
    case 40: return '4';
    case 45: return '5弱';
    case 50: return '5強';
    case 55: return '6弱';
    case 60: return '6強';
    case 70: return '7';
    default: return '不明';
  }
};

export const EEWAlert = () => {
  const { isAlertVisible, alertData, dismissAlert } = useEEW();

  if (!isAlertVisible || !alertData) return null;

  const earthquake = alertData.earthquake;
  
  // 最大震度を計算
  const maxScaleArea = alertData.areas?.reduce((prev, current) => 
    (prev.scaleFrom > current.scaleFrom) ? prev : current
  );
  
  const maxScale = maxScaleArea ? formatScale(maxScaleArea.scaleFrom) : '不明';

  // 警報時の音とバイブレーション
  useEffect(() => {
    if (!isAlertVisible || !alertData) return;

    // 1. バイブレーション（対応デバイスのみ）
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([1000, 500, 1000, 500, 1000, 500, 1000, 500, 1000]);
    }

    // 2. 警告音（Web Audio APIを利用してブラウザ内でビープ音を生成）
    let audioCtx: AudioContext | null = null;
    let intervalId: NodeJS.Timeout;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        
        const playBeep = () => {
          if (!audioCtx) return;
          
          const osc1 = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          
          osc1.type = 'sine';
          osc2.type = 'sine';
          
          // 不協和音で強い警告感を演出（C5 と F#5）
          osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime);
          osc2.frequency.setValueAtTime(739.99, audioCtx.currentTime);
          
          // 音量（0.3から減衰）
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
          
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc1.start();
          osc2.start();
          osc1.stop(audioCtx.currentTime + 0.8);
          osc2.stop(audioCtx.currentTime + 0.8);
        };

        // 最初の再生
        playBeep();
        // 1秒ごとに繰り返し再生
        intervalId = setInterval(playBeep, 1000);
      }
    } catch (err) {
      console.warn('Audio playback failed', err);
    }

    // アラートが消えたら（クリーンアップ関数）音とバイブを止める
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(console.error);
      }
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(0); // 停止
      }
    };
  }, [isAlertVisible, alertData]);

  return (
    <div className="fixed inset-0 z-[9999] bg-red-600/95 flex flex-col items-center justify-center p-4 text-white overflow-y-auto animate-in fade-in zoom-in duration-300">
      
      {/* 緊急地震警報 ヘッダー */}
      <div className="flex flex-col items-center mb-8">
        <AlertTriangle className="w-24 h-24 text-yellow-300 mb-4 animate-pulse" />
        <h1 className="text-4xl md:text-6xl font-black tracking-widest text-yellow-300 drop-shadow-md text-center">
          緊急地震警報
        </h1>
        <p className="text-xl md:text-3xl font-bold mt-4 tracking-wider text-center">
          強い揺れに警戒してください
        </p>
      </div>

      {/* 地震詳細情報 */}
      {earthquake && (
        <div className="bg-black/40 rounded-xl p-6 md:p-8 w-full max-w-2xl backdrop-blur-md border-2 border-red-400/50 shadow-2xl">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 震源地 */}
            <div className="flex flex-col items-center md:items-start bg-black/30 p-4 rounded-lg">
              <div className="flex items-center text-red-200 mb-2">
                <MapPin className="w-5 h-5 mr-2" />
                <span className="text-sm font-bold tracking-wider">震源地</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white">
                {earthquake.hypocenter.name}
              </p>
              <p className="text-sm text-gray-300 mt-2">
                深さ: {earthquake.hypocenter.depth === 0 ? 'ごく浅い' : `${earthquake.hypocenter.depth}km`}
              </p>
            </div>

            {/* 最大予想震度・マグニチュード */}
            <div className="flex flex-col items-center md:items-start bg-black/30 p-4 rounded-lg">
              <div className="flex items-center text-red-200 mb-2">
                <Activity className="w-5 h-5 mr-2" />
                <span className="text-sm font-bold tracking-wider">予想最大震度</span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl md:text-5xl font-black text-yellow-300">{maxScale}</span>
              </div>
              <p className="text-sm text-gray-300 mt-2">
                マグニチュード: M{earthquake.hypocenter.magnitude.toFixed(1)}
              </p>
            </div>

          </div>

          {/* 対象地域 */}
          {alertData.areas && alertData.areas.length > 0 && (
            <div className="mt-6">
              <p className="text-sm text-red-200 font-bold mb-2">強い揺れが予想される地域:</p>
              <div className="flex flex-wrap gap-2">
                {alertData.areas.slice(0, 5).map((area, idx) => (
                  <span key={idx} className="px-3 py-1 bg-red-500/40 text-white font-bold rounded-full text-sm">
                    {area.name}
                  </span>
                ))}
                {alertData.areas.length > 5 && (
                  <span className="px-3 py-1 bg-red-500/40 text-white font-bold rounded-full text-sm">
                    他 {alertData.areas.length - 5} 地域
                  </span>
                )}
              </div>
            </div>
          )}

          {alertData.test && (
            <div className="mt-6 text-center text-yellow-300 font-bold bg-yellow-900/50 py-2 rounded">
              ※これはテスト配信です
            </div>
          )}

        </div>
      )}

      {/* アクションボタン */}
      <button
        onClick={dismissAlert}
        className="mt-12 bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-full font-bold text-lg flex items-center transition-all focus:outline-none focus:ring-4 focus:ring-red-300"
      >
        <X className="w-6 h-6 mr-2" />
        確認しました（閉じる）
      </button>

    </div>
  );
};
