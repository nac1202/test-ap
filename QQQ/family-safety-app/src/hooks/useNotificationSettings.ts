"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/Auth/AuthProvider";

export interface NotificationSettings {
    earthquake: boolean;
    regionalWarning: boolean;
    heavyRain: boolean;
    weather: boolean;
    majorTsunami: boolean;
    tsunami: boolean;
}

const defaultSettings: NotificationSettings = {
    earthquake: true,
    regionalWarning: true,
    heavyRain: true,
    weather: true,
    majorTsunami: true,
    tsunami: true,
};

// VAPID public key
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function useNotificationSettings() {
    const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
    const [isLoaded, setIsLoaded] = useState(false);
    const { user } = useAuth(); // If they are logged in

    useEffect(() => {
        const saved = localStorage.getItem("kizuna_notification_settings");
        if (saved) {
            try {
                setSettings({ ...defaultSettings, ...JSON.parse(saved) });
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
        setIsLoaded(true);
    }, []);

    const subscribeToPush = async (currentSettings: NotificationSettings) => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn("Push notifications are not supported by the browser.");
            alert("お使いのブラウザはプッシュ通知に対応していないか、ホーム画面に追加する必要があります（iOS Safariの場合）。");
            return;
        }

        try {
            // Request permission first to ensure it happens in the same synchronous execution block as the user gesture
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.warn("Permission for notifications not granted.");
                alert("通知が許可されませんでした。ブラウザの設定から通知を許可してください。");
                return;
            }

            const registration = await navigator.serviceWorker.ready;

            // Subscribe to push
            const subscribeOptions = {
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            };

            const subscription = await registration.pushManager.subscribe(subscribeOptions);

            // Send subscription and settings to our backend
            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscription: subscription,
                    settings: currentSettings,
                    userId: user?.id || null
                })
            });

            console.log("Successfully subscribed and synced settings to backend.");

        } catch (error) {
            console.error("Error during push subscription:", error);
        }
    };

    const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        localStorage.setItem("kizuna_notification_settings", JSON.stringify(newSettings));

        // Sync setting changes dynamically to Supabase
        subscribeToPush(newSettings);
    };

    // Optionally call subscribeToPush on initial load if we want to ensure sync,
    // but only if permission is already granted, so we don't spam the prompt.
    useEffect(() => {
        if (isLoaded && 'Notification' in window && Notification.permission === 'granted') {
            subscribeToPush(settings);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoaded, user?.id]);

    return { settings, updateSetting, isLoaded };
}
