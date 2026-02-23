# リアルタイム災害・警報連携タスク

# リアルタイム災害・警報連携タスク

- [x] バックエンド/外部APIリサーチと選定
  - [x] 気象庁 (JMA) API または Google Maps Geocoding の利用設計
  - [x] 都道府県コード(JMA用)の自動マッピングロジック作成
- [x] 位置情報から現在地（都道府県・市区町村）の逆ジオコーディング実装
- [x] 気象庁(JMA) 非公式APIを用いた現在地向け警報データの取得 (`useDisasterAlerts` フック作成)
- [x] 警報・注意報表示用コンポーネント (`DisasterAlertBanner`) の実装
- [x] ホーム画面 (`page.tsx`) または 安否画面 (`safety/page.tsx`) へのアラートバナー組み込み
- [x] オフライン時および取得失敗時のフォールバック処理の実装
- [x] テストと動作確認

## 天気予報の拡充（週間天気・アイコン表示）
- [x] 気象庁(JMA) 週間天気APIデータの解析（`forecastData[1]`の解析、気温・天気コードの取得）
- [x] JMA天気コードとアイコン（Lucide React等）のマッピングロジック実装
- [x] `useDisasterAlerts` フックの改修（7日分の `date`, `weatherCode`, `minTemp`, `maxTemp` の取得）
- [x] `WeeklyForecast` UIコンポーネントの実装（横スクロール可能な1週間分の天気表示）
- [x] `DisasterAlertBanner` またはホーム画面への組み込みとデザイン調整
