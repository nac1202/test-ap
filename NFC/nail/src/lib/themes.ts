export const THEMES = [
    { id: 'STANDARD', label: 'Standard', description: 'シンプルで清潔感のある標準デザイン', color: 'bg-white border-gray-200' },
    { id: 'ELEGANT', label: 'Elegant', description: '淡いローズと曲線の柔らかなデザイン', color: 'bg-[#FFF5F7] border-rose-200' },
    { id: 'POP', label: 'Pop', description: '鮮やかなイエローと黒のインパクト', color: 'bg-[#FCD34D] border-black text-black' },

    // Luxury Collection
    { id: 'LUXURY_SAGE', label: 'Sage (Green)', description: '自然体で安らぎのあるセージグリーン', color: 'bg-[#E0E8E0] border-[#9CAF9C] text-[#556B55]' },
    { id: 'LUXURY_GREIGE', label: 'Etoupe (Greige)', description: '上品なグレージュのトーン', color: 'bg-[#A6A29D] border-[#EBE9E5] text-white' },
    { id: 'LUXURY_NAVY', label: 'Marine (Navy)', description: '深いネイビーとゴールドの品格', color: 'bg-[#182333] border-[#C5A065] text-white' },

    // Seasonal Collection
    { id: 'VALENTINE', label: 'Valentine', description: '甘くてビターなチョコレートスタイル', color: 'bg-[#3E2723] border-[#D32F2F] text-white' },
    { id: 'SAKURA', label: 'Sakura', description: '優しく舞う桜の春デザイン', color: 'bg-[#FCE4EC] border-[#F48FB1] text-pink-900' },
    { id: 'SUMMER', label: 'Summer', description: '爽やかな夏のオーシャンブルー', color: 'bg-[#E1F5FE] border-[#29B6F6] text-blue-900' },
    { id: 'HALLOWEEN', label: 'Halloween', description: '紫とオレンジの夜の宴', color: 'bg-[#4A148C] border-[#FF6D00] text-white' },
    { id: 'CHRISTMAS', label: 'Christmas', description: '聖なる夜の赤と緑', color: 'bg-[#B71C1C] border-[#1B5E20] text-white' },
    { id: 'NEW_YEAR', label: 'New Year', description: '紅白と金のお正月祝い', color: 'bg-[#B71C1C] border-white text-white' },
]

export type ThemeType =
    | 'STANDARD' | 'ELEGANT' | 'POP'
    | 'LUXURY_SAGE' | 'LUXURY_GREIGE' | 'LUXURY_NAVY'
    | 'VALENTINE' | 'SAKURA' | 'SUMMER' | 'HALLOWEEN' | 'CHRISTMAS' | 'NEW_YEAR'
