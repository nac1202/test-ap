# Push Notification Server Integration - Task List

## Setup & Configuration
- [ ] Generate VAPID key pairs (public/private) for Web Push.
- [ ] Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in `.env.local` and Vercel.
- [ ] Install the `web-push` npm module.

## Backend (Database & Routing)
- [ ] Create `push_subscriptions` table in Supabase to store subscription objects + user preferences (e.g. `earthquake`, `tsunami`).
- [ ] Create `/api/push/subscribe` API Route to handle incoming `PushSubscription` objects from clients and save to DB.
- [ ] Create `/api/push/send-alert` (Test API) to fetch subscriptions from DB matching rules and send push via `web-push`.

## Frontend (Service Worker & UI)
- [ ] Prompt for Notification permissions on the client when they enable Push Notifications in `/settings/notifications`.
- [ ] Add `subscribeToPushNotifications` logic (using VAPID public key + `PushManager`).
- [ ] Update Service Worker (`public/sw.js`) to listen for `push` events and show system notifications via `self.registration.showNotification`.
