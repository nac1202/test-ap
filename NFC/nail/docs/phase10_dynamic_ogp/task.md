# Phase 10: Dynamic OGP Image Generation

動的OGP画像の自動生成機能を実装し、SNSシェア時の見栄えを向上させる。

- [x] **OGP API Route Implementation** <!-- id: 0 -->
    - [x] Create `src/app/api/og/route.tsx` <!-- id: 1 -->
    - [x] Implement `ImageResponse` with Vercel OG <!-- id: 2 -->
    - [x] Add theme-based styling (Standard, Sage, Sakura, City) <!-- id: 3 -->
    - [x] Test locally with various query params <!-- id: 4 -->

- [x] **Profile Page Integration** <!-- id: 5 -->
    - [x] Update `src/app/u/[handle]/page.tsx` metadata <!-- id: 6 -->
    - [x] Fetch user profile and theme in `generateMetadata` <!-- id: 7 -->
    - [x] Construct dynamic OGP URL with params <!-- id: 8 -->

- [x] **Verification** <!-- id: 9 -->
    - [x] Verify image generation speed and caching <!-- id: 10 -->
    - [x] Check design consistency with main themes <!-- id: 11 -->
