const fs = require('fs');
const forecastData = JSON.parse(fs.readFileSync('jma_dump2.json', 'utf8'));

const shortTerm = forecastData[0];
const weekly = forecastData[1];
const timeDef = weekly.timeSeries[0].timeDefines;
const weatherArea = weekly.timeSeries[0].areas[0];
const tempArea = weekly.timeSeries[1].areas[0];

const parsedWeekly = [];

let jmaTodayStr = '';
if (shortTerm && shortTerm.reportDatetime) {
    const rdParts = shortTerm.reportDatetime.split('T')[0].split('-');
    jmaTodayStr = parseInt(rdParts[1]) + '/' + parseInt(rdParts[2]);
}

for (let i = 0; i < timeDef.length; i++) {
    const dParts = timeDef[i].split('T')[0].split('-');
    const shortDate = parseInt(dParts[1]) + '/' + parseInt(dParts[2]);

    const weatherCode = weatherArea.weatherCodes ? weatherArea.weatherCodes[i] : 'unknown';

    let minTemp = '-';
    let maxTemp = '-';

    if (tempArea.tempsMin && tempArea.tempsMin.length > i && tempArea.tempsMin[i] !== '') {
        minTemp = tempArea.tempsMin[i];
    }
    if (tempArea.tempsMax && tempArea.tempsMax.length > i && tempArea.tempsMax[i] !== '') {
        maxTemp = tempArea.tempsMax[i];
    }

    parsedWeekly.push({
        date: shortDate,
        weatherCode: weatherCode,
        minTemp,
        maxTemp
    });
}

const stWeatherArea = shortTerm.timeSeries[0]?.areas[0];
const stTimeDef = shortTerm.timeSeries[0]?.timeDefines;

const targetWeeklyAreaName = tempArea?.area?.name;
let stTempArea = shortTerm.timeSeries[2]?.areas[0];
if (targetWeeklyAreaName && shortTerm.timeSeries[2]?.areas) {
    const matchedArea = shortTerm.timeSeries[2].areas.find(a => a.area.name === targetWeeklyAreaName);
    if (matchedArea) stTempArea = matchedArea;
}
const stTempTimeDef = shortTerm.timeSeries[2]?.timeDefines;

if (parsedWeekly.length > 0 && parsedWeekly[0].date !== jmaTodayStr) {
    let todayWeatherCode = 'unknown';
    if (stTimeDef && stWeatherArea) {
        for (let j = 0; j < stTimeDef.length; j++) {
            const tStr = stTimeDef[j];
            if (!tStr) continue;
            const jmaDateParts = tStr.split('T')[0].split('-');
            const jmaDateStr = parseInt(jmaDateParts[1]) + '/' + parseInt(jmaDateParts[2]);
            if (jmaDateStr === jmaTodayStr) {
                todayWeatherCode = stWeatherArea.weatherCodes ? stWeatherArea.weatherCodes[j] : 'unknown';
                break;
            }
        }
    }
    parsedWeekly.unshift({ date: jmaTodayStr, weatherCode: todayWeatherCode, minTemp: '-', maxTemp: '-' });
    if (parsedWeekly.length > 7) parsedWeekly.pop();
}

if (stTempTimeDef && stTempArea && stTempArea.temps) {
    for (let d = 0; d < Math.min(parsedWeekly.length, 3); d++) {
        if (parsedWeekly[d].minTemp === '-' || parsedWeekly[d].maxTemp === '-') {
            const dateTarget = parsedWeekly[d].date;
            for (let k = 0; k < stTempTimeDef.length; k++) {
                const tStr = stTempTimeDef[k];
                if (!tStr) continue;
                const jmaDateParts = tStr.split('T')[0].split('-');
                const jmaDateStr = parseInt(jmaDateParts[1]) + '/' + parseInt(jmaDateParts[2]);

                if (jmaDateStr === dateTarget) {
                    const h = parseInt(tStr.split('T')[1].substring(0, 2), 10);
                    if (parsedWeekly[d].maxTemp === '-') {
                        if (h === 9 || h === 12 || h === 15 || h === 18) parsedWeekly[d].maxTemp = stTempArea.temps[k];
                    }
                    if (parsedWeekly[d].minTemp === '-') {
                        if (h === 0 || h === 6) parsedWeekly[d].minTemp = stTempArea.temps[k];
                    }
                }
            }
        }
    }
}

console.log(JSON.stringify(parsedWeekly, null, 2));
