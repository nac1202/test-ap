# Implementation Plan - Fix Camera Image Display in Burger Shop

User reported that captured photos are not displayed in the chat in the Burger Shop demo.
Investigation revealed that `captureAndSend` function only sends a text message "（画像を送信しました）" instead of embedding the image.

## Proposed Changes

### [Website]

#### [MODIFY] [widget_v6.js](file:///d:/Antigravity/data/Project_BurgerShop/Website/public/assets/js/widget_v6.js)

- **Update `captureAndSend` function**:
    - Instead of showing just text, create an `<img>` tag with the base64 data.
    - Pass this HTML string to `addMessage`.

```javascript
/* Current */
addMessage("（画像を送信しました）", "user");

/* New */
const imgTag = `<img src="${base64}" style="max-width:100%; border-radius:8px;">`;
addMessage(imgTag, "user");
```

## Verification Plan

### Manual Verification
1. Deploy `Project_BurgerShop` to production (`vercel --prod`).
2. Open the Burger Shop site on mobile (or simulated mobile).
3. Use the camera feature to take a picture.
4. Verify that the taken picture appears in the chat bubble.
