"use client";

import { useState, useEffect, useCallback } from 'react';
import { useGeolocation } from 'react-use';

// This API URL provides a mapping from points to area codes
const REVERSE_GEOCODE_API = 'https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress';

// JMA Warning Code Definitions (simplified)
const WARNING_CODES: Record<string, { label: string; level: 'warning' | 'advisory' | 'emergency' }> = {
    // Emergency
    '03': { label: '大雨特別警報', level: 'emergency' },
    '04': { label: '大雪特別警報', level: 'emergency' },
    '05': { label: '暴風特別警報', level: 'emergency' },
    '08': { label: '高潮特別警報', level: 'emergency' },
    '09': { label: '波浪特別警報', level: 'emergency' },
    '32': { label: '暴風雪特別警報', level: 'emergency' },

    // Warning
    '10': { label: '大雨警報', level: 'warning' },
    '12': { label: '大雪警報', level: 'warning' },
    '13': { label: '暴風警報', level: 'warning' },
    '15': { label: '波浪警報', level: 'warning' },
    '16': { label: '高潮警報', level: 'warning' },
    '33': { label: '暴風雪警報', level: 'warning' },
    '35': { label: '洪水警報', level: 'warning' },

    // Advisory (Notice)
    '14': { label: '大雨注意報', level: 'advisory' },
    '17': { label: '大雪注意報', level: 'advisory' },
    '18': { label: '風雪注意報', level: 'advisory' },
    '19': { label: '雷注意報', level: 'advisory' },
    '20': { label: '強風注意報', level: 'advisory' },
    '21': { label: '波浪注意報', level: 'advisory' },
    '22': { label: '融雪注意報', level: 'advisory' },
    '23': { label: '濃霧注意報', level: 'advisory' },
    '24': { label: '乾燥注意報', level: 'advisory' },
    '25': { label: 'なだれ注意報', level: 'advisory' },
    '31': { label: '着氷注意報', level: 'advisory' },
    '36': { label: '洪水注意報', level: 'advisory' },
};

// Simplified Prefecture Mapping (first 2 digits of city code)
const PREF_MAPPING: Record<string, string> = {
    '01': '北海道', '02': '青森県', '03': '岩手県', '04': '宮城県', '05': '秋田県',
    '06': '山形県', '07': '福島県', '08': '茨城県', '09': '栃木県', '10': '群馬県',
    '11': '埼玉県', '12': '千葉県', '13': '東京都', '14': '神奈川県', '15': '新潟県',
    '16': '富山県', '17': '石川県', '18': '福井県', '19': '山梨県', '20': '長野県',
    '21': '岐阜県', '22': '静岡県', '23': '愛知県', '24': '三重県', '25': '滋賀県',
    '26': '京都府', '27': '大阪府', '28': '兵庫県', '29': '奈良県', '30': '和歌山県',
    '31': '鳥取県', '32': '島根県', '33': '岡山県', '34': '広島県', '35': '山口県',
    '36': '徳島県', '37': '香川県', '38': '愛媛県', '39': '高知県', '40': '福岡県',
    '41': '佐賀県', '42': '長崎県', '43': '熊本県', '44': '大分県', '45': '宮崎県',
    '46': '鹿児島県', '47': '沖縄県'
};

export interface DisasterAlert {
    code: string;
    label: string;
    level: 'warning' | 'advisory' | 'emergency';
    areaName: string;
}

export interface WeatherForecast {
    areaName: string;
    weather: string;
}

export interface DailyForecast {
    date: string;
    weatherCode: string;
    minTemp: string; // temperature might be empty
    maxTemp: string;
}

export function useDisasterAlerts() {
    const currentLocation = useGeolocation({
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 300000
    });

    const [alerts, setAlerts] = useState<DisasterAlert[]>([]);
    const [forecast, setForecast] = useState<WeatherForecast | null>(null);
    const [weeklyForecast, setWeeklyForecast] = useState<DailyForecast[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [locationName, setLocationName] = useState<string | null>(null);

    // Round coordinates to 3 decimal places (~110m precision) to prevent continuous re-fetching on GPS jitter
    const lat = currentLocation.latitude ? Number(currentLocation.latitude.toFixed(3)) : null;
    const lng = currentLocation.longitude ? Number(currentLocation.longitude.toFixed(3)) : null;

    const checkAlerts = useCallback(async () => {
        if (!lat || !lng) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Convert Lat/Lng to JMA area code using GSI API
            // The GSI API takes lat/lon and returns a custom code. We need the first 2 digits for prefecture and 5 for city.
            const gsiRes = await fetch(`${REVERSE_GEOCODE_API}?lat=${lat}&lon=${lng}`);
            if (!gsiRes.ok) throw new Error('Failed to reverse geocode');

            const gsiData = await gsiRes.json();

            // GSI returns results like { results: { muniCd: "13101", lv01Nm: "千代田区" } }
            if (!gsiData.results || !gsiData.results.muniCd) {
                throw new Error('Could not determine municipality code');
            }

            const muniCd = gsiData.results.muniCd as string; // 5 digit City Code (e.g. 13101)
            const municipalityName = gsiData.results.lv01Nm as string; // City Name (e.g. 千代田区)

            // For JMA Warning API, we need the "Center" (Office) code which is usually a 6-digit number mapped to prefectures.
            // A simple approximation for JMA Area Code mapping:
            // JMA Prefecture Code = First 2 digits of muniCd + '0000'
            const prefId = muniCd.substring(0, 2);
            const prefCode = prefId + '0000';
            const prefName = PREF_MAPPING[prefId] || '';

            // 2. We don't have the prefecture names directly from GSI without a lookup table, 
            // so we'll fetch the JMA warning JSON for that prefecture and extract info
            const jmaUrl = `https://www.jma.go.jp/bosai/warning/data/warning/${prefCode}.json`;
            const jmaRes = await fetch(jmaUrl);

            if (!jmaRes.ok) {
                // For Hokkaido, codes are split differently, etc. Fallback to empty if it 404s
                // But we can at least show the location
                setLocationName(`${prefName}${municipalityName}`);
                setAlerts([]);
                return;
            }

            const areaWarnings = await jmaRes.json();
            // JMA format: [ { areaTypes: [ { area: { code: '1310100', name: '千代田区' }, warnings: [ { code: '10', status: '発表' } ]} ] } ]
            // Note: JMA municipality code is 7 digits (5 digit muni + '00')
            const targetJmaCode = muniCd + '00';

            const activeAlerts: DisasterAlert[] = [];
            let foundAreaName = municipalityName;

            // Traverse the messy JMA JSON structure structure to find our municipality's warnings
            for (const timeSeries of areaWarnings.timeSeries || []) {
                for (const areaType of timeSeries.areas || []) {
                    if (areaType.area && areaType.area.code === targetJmaCode) {
                        if (!foundAreaName) foundAreaName = areaType.area.name;

                        // Look at warnings
                        for (const w of areaType.warnings || []) {
                            // status: '発表' or '継続' means active. '解除' means removed.
                            if ((w.status === '発表' || w.status === '継続' || w.status === '') && WARNING_CODES[w.code]) {
                                // Add if not already there and if it's not a "00" (which means no warning sometimes)
                                if (!activeAlerts.some(a => a.code === w.code)) {
                                    activeAlerts.push({
                                        code: w.code,
                                        label: WARNING_CODES[w.code].label,
                                        level: WARNING_CODES[w.code].level,
                                        areaName: foundAreaName
                                    });
                                }
                            }
                        }
                    }
                }
            }

            // GSI's lv01Nm doesn't include the prefecture, but jmaUrl gives us the prefecture name in forecast data usually.
            // For warning alerts, the JMA area name is often just the city. 
            // We combine them for a specific explicit location (e.g. 東京都千代田区)
            const fullLocationName = `${prefName}${foundAreaName}`;

            setLocationName(fullLocationName);
            setAlerts(activeAlerts);

            // 3. Fetch weather forecast for the prefecture
            try {
                const forecastUrl = `https://www.jma.go.jp/bosai/forecast/data/forecast/${prefCode}.json`;
                const forecastRes = await fetch(forecastUrl);
                if (forecastRes.ok) {
                    const forecastData = await forecastRes.json();
                    if (forecastData && forecastData.length > 0) {
                        // --- Short Term Forecast (Today) ---
                        const shortTerm = forecastData[0];
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const tsWeathers = shortTerm.timeSeries.find((ts: any) => ts.areas && ts.areas.length > 0 && ts.areas[0].weathers);
                        if (tsWeathers && tsWeathers.areas && tsWeathers.areas.length > 0) {
                            const area = tsWeathers.areas[0];
                            if (area.weathers && area.weathers.length > 0) {
                                setForecast({
                                    areaName: area.area.name,
                                    weather: area.weathers[0].replace(/　/g, ' ')
                                });
                            }
                        }

                        // --- Weekly Forecast (7 Days) ---
                        // Usually forecastData[1] contains the weekly forecast
                        if (forecastData.length > 1) {
                            const weekly = forecastData[1];
                            const timeDef = weekly.timeSeries[0].timeDefines; // Array of dates
                            const weatherArea = weekly.timeSeries[0].areas[0]; // Weather codes
                            const tempArea = weekly.timeSeries[1].areas[0]; // min/max temps

                            if (timeDef && weatherArea && tempArea) {
                                const parsedWeekly: DailyForecast[] = [];

                                // Weekly temps are staggered, tempsMin/tempsMax usually start from index 1 or have empty strings for today if today is almost over
                                // We iterate through timeDef (dates)
                                for (let i = 0; i < timeDef.length; i++) {
                                    // Parse ISO string to short date (e.g. 2/22)
                                    const dateObj = new Date(timeDef[i]);
                                    const shortDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

                                    const weatherCode = weatherArea.weatherCodes ? weatherArea.weatherCodes[i] : 'unknown';

                                    // tempsMin and Max array length might differ or be empty for index 0
                                    let minTemp = "";
                                    let maxTemp = "";

                                    if (tempArea.tempsMin && tempArea.tempsMin.length > i) {
                                        minTemp = tempArea.tempsMin[i] !== "" ? tempArea.tempsMin[i] : "-";
                                    }
                                    if (tempArea.tempsMax && tempArea.tempsMax.length > i) {
                                        maxTemp = tempArea.tempsMax[i] !== "" ? tempArea.tempsMax[i] : "-";
                                    }

                                    parsedWeekly.push({
                                        date: shortDate,
                                        weatherCode: weatherCode,
                                        minTemp,
                                        maxTemp
                                    });
                                }
                                setWeeklyForecast(parsedWeekly);
                            }
                        }
                    }
                }
            } catch (fcErr) {
                console.error('Error fetching weather forecast:', fcErr);
            }

        } catch (err: unknown) {
            console.error('Error fetching disaster alerts/weather:', err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Unknown error occurred');
            }
        } finally {
            setLoading(false);
        }
    }, [lat, lng]);

    useEffect(() => {
        checkAlerts();

        // Poll every 5 minutes
        const interval = setInterval(checkAlerts, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [checkAlerts]);

    return {
        alerts,
        forecast,
        weeklyForecast,
        locationName,
        loading,
        error,
        refetch: checkAlerts
    };
}
