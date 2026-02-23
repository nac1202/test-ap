# Push Notification Settings - Task List

## UI Components
- [x] Create `Switch` component in `src/components/ui/Switch.tsx` (Tailwind, smooth toggle).

## State Management
- [x] Create `useNotificationSettings.ts` hook in `src/hooks/` to manage the state of the 7 notification types.
- [x] Use `localStorage` to persist user choices (e.g. `isEarthquakeEnabled`, `isTsunamiEnabled`).

## Settings Page
- [x] Create `src/app/settings/notifications/page.tsx`.
- [x] Build the layout (Header with back button, list of settings with title, description, and Switch).
- [x] Integrate the `useNotificationSettings` hook to toggle the states.

## Navigation
- [x] Add a "Settings" or gear icon button to the Home screen (e.g. Top Right in `Header.tsx` or similar) that links to `/settings/notifications`. 
 
