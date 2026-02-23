import { useState, useEffect, useCallback } from 'react';

// Extend window interface for iOS specific properties
interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
    webkitCompassHeading?: number;
    requestPermission?: () => Promise<'granted' | 'denied'>;
}

export function useCompass() {
    const [heading, setHeading] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
    const [needsPermission, setNeedsPermission] = useState<boolean>(false);

    useEffect(() => {
        // Check if device is iOS 13+ which requires explicit permission for DeviceOrientationEvent
        if (typeof window !== 'undefined' && typeof (DeviceOrientationEvent as unknown as DeviceOrientationEventiOS).requestPermission === 'function') {
            setNeedsPermission(true);
        } else {
            setPermissionGranted(true);
        }
    }, []);

    const requestPermission = useCallback(async () => {
        try {
            if (typeof (DeviceOrientationEvent as unknown as DeviceOrientationEventiOS).requestPermission === 'function') {
                const permissionState = await (DeviceOrientationEvent as unknown as DeviceOrientationEventiOS).requestPermission!();
                if (permissionState === 'granted') {
                    setPermissionGranted(true);
                    setNeedsPermission(false);
                } else {
                    setError('コンパスへのアクセスが拒否されました。設定を確認してください。');
                }
            } else {
                setPermissionGranted(true);
            }
        } catch (err) {
            console.error('Permission request error:', err);
            setError('センサーの使用許可を求める際にエラーが発生しました。');
        }
    }, []);

    useEffect(() => {
        if (!permissionGranted) return;

        const handleOrientation = (event: DeviceOrientationEventiOS) => {
            if (event.webkitCompassHeading !== undefined) {
                // iOS directly provides compass heading
                setHeading(event.webkitCompassHeading);
            } else if (event.absolute && event.alpha !== null) {
                // Non-iOS devices using absolute alpha
                setHeading(360 - event.alpha);
            }
        };

        // Listen for absolute orientation first (if available on Android)
        window.addEventListener('deviceorientationabsolute', handleOrientation as any, true);
        window.addEventListener('deviceorientation', handleOrientation as any, true);

        return () => {
            window.removeEventListener('deviceorientationabsolute', handleOrientation as any, true);
            window.removeEventListener('deviceorientation', handleOrientation as any, true);
        };
    }, [permissionGranted]);

    return { heading, error, permissionGranted, needsPermission, requestPermission };
}
