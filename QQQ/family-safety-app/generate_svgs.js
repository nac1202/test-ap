/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'public', 'images', 'guide');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const svgs = [
    {
        name: 'fire-evacuation.svg',
        color: '#EF4444',
        bg: '#FEF2F2',
        icon: '🔥',
        text: 'FIRE'
    },
    {
        name: 'heatstroke.svg',
        color: '#F97316',
        bg: '#FFF7ED',
        icon: '☀️',
        text: 'HEAT'
    },
    {
        name: 'heavy-snow.svg',
        color: '#3B82F6',
        bg: '#EFF6FF',
        icon: '❄️',
        text: 'SNOW'
    },
    {
        name: 'volcano.svg',
        color: '#7F1D1D',
        bg: '#FEF2F2',
        icon: '🌋',
        text: 'VOLCANO'
    },
    {
        name: 'missile.svg',
        color: '#1F2937',
        bg: '#F3F4F6',
        icon: '🚀',
        text: 'ALERT'
    },
    {
        name: 'fraud.svg',
        color: '#7C3AED',
        bg: '#F5F3FF',
        icon: '📞',
        text: 'FRAUD'
    },
    {
        name: 'cyber.svg',
        color: '#2563EB',
        bg: '#EFF6FF',
        icon: '💻',
        text: 'CYBER'
    },
    {
        name: 'defense.svg',
        color: '#059669',
        bg: '#ECFDF5',
        icon: '🛡️',
        text: 'DEFENSE'
    },
    {
        name: 'stalker.svg',
        color: '#4B5563',
        bg: '#F9FAFB',
        icon: '👁️',
        text: 'DANGER'
    },
    {
        name: 'evacuation-life.svg',
        color: '#000000',
        bg: '#E0E0E0',
        icon: '⛺',
        text: 'SHELTER'
    },
    {
        name: 'water-ration.svg',
        color: '#3B82F6',
        bg: '#DBEAFE',
        icon: '💧',
        text: 'WATER'
    }
];

svgs.forEach(item => {
    const svgContent = `
<svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="300" fill="${item.bg}"/>
  <circle cx="200" cy="130" r="60" fill="${item.color}" opacity="0.2"/>
  <text x="200" y="150" font-family="Arial, sans-serif" font-size="80" text-anchor="middle">${item.icon}</text>
  <text x="200" y="240" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="${item.color}" font-weight="bold" letter-spacing="2">${item.text}</text>
</svg>
`;
    fs.writeFileSync(path.join(outputDir, item.name), svgContent.trim());
    console.log(`Generated ${item.name}`);
});
