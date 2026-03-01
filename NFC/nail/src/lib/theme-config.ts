export interface ThemeStyle {
    bg: string;
    card: string;
    text: string;
    subtext: string;
    button: string;
    accent: string;
    font: string;
    decorative?: boolean; // Whether to show background decoration
    customDecoration?: 'SAGE' | 'NAVY' | 'GREIGE' | 'ELEGANT' | 'POP' | 'VALENTINE' | 'SAKURA' | 'SUMMER' | 'HALLOWEEN' | 'CHRISTMAS' | 'NEW_YEAR';
}

export const THEME_CONFIG: Record<string, ThemeStyle> = {
    STANDARD: {
        bg: 'bg-[#F5F5F0]', // Warm White
        card: 'bg-white/80 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white',
        text: 'text-[#5F6F81]', // Slate Blue
        subtext: 'text-gray-400',
        button: 'bg-white hover:bg-[#FAF9F6] border-[#E5E5E0] text-[#5F6F81] shadow-sm',
        accent: 'text-[#8D6E63]', // Cocoa
        font: 'font-sans',
        decorative: true
    },
    ELEGANT: {
        bg: 'bg-gradient-to-br from-[#FFF5F7] via-[#FFF0F5] to-[#FDFCF8]', // Soft Pink gradient
        card: 'bg-white/90 backdrop-blur border border-rose-100 shadow-[0_10px_40px_rgba(255,228,230,0.5)]',
        text: 'text-[#8B5E66]', // Mauve / Dried Rose
        subtext: 'text-[#BFA5AA]',
        button: 'bg-white hover:bg-[#FFF5F7] border border-rose-200 text-[#8B5E66] shadow-sm',
        accent: 'text-[#D4A5A5]',
        font: 'font-serif',
        customDecoration: 'ELEGANT'
    },
    POP: {
        bg: 'bg-[#FFFDE7]', // Light Yellow base
        card: 'bg-white shadow-[8px_8px_0px_#FCD34D] border-2 border-black rounded-xl', // Neo-Brutalism shadow
        text: 'text-black',
        subtext: 'text-gray-500',
        button: 'bg-[#FCD34D] hover:bg-[#FBBF24] border-2 border-black text-black font-black shadow-[4px_4px_0px_#000000] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000000] transition-all',
        accent: 'text-[#EF4444]',
        font: 'font-sans',
        customDecoration: 'POP'
    },
    // New Luxury Collections
    LUXURY_SAGE: {
        bg: 'bg-[#E0E8E0]', // Sage White
        card: 'bg-white shadow-xl border border-[#C5D5C5]',
        text: 'text-[#4A5D4A]', // Deep Sage
        subtext: 'text-[#879987]',
        button: 'bg-white hover:bg-[#F1F6F1] border border-[#9CAF9C] text-[#556B55] shadow-sm',
        accent: 'text-[#7A9A7A]',
        font: 'font-serif',
        customDecoration: 'SAGE'
    },
    LUXURY_GREIGE: {
        bg: 'bg-[#EBE9E5]', // Etoupe (Greige) Base
        card: 'bg-[#F7F6F4] shadow-xl border border-[#DCDAD5]',
        text: 'text-[#5E5B55]', // Deep Greige
        subtext: 'text-[#96928B]',
        button: 'bg-transparent hover:bg-white border border-[#A6A29D] text-[#5E5B55]',
        accent: 'text-[#5E5B55]',
        font: 'font-sans',
        customDecoration: 'GREIGE'
    },
    LUXURY_NAVY: {
        bg: 'bg-[#182333]', // Deep Marine Navy
        card: 'bg-[#212E40] shadow-2xl border border-[#2A3B52]',
        text: 'text-[#E8ECF2]', // Off-white/Silver
        subtext: 'text-[#8A9BB3]',
        button: 'bg-[#182333] hover:bg-[#2A3B52] border border-[#3A4D6B] text-[#E8ECF2]',
        accent: 'text-[#C5A065]', // Gold/Camel Accent
        font: 'font-serif',
        customDecoration: 'NAVY'
    },
    // Seasonal Collections
    VALENTINE: {
        bg: 'bg-[#3E2723]', // Dark Chocolate
        card: 'bg-[#5D4037] shadow-xl border border-[#D7CCC8]',
        text: 'text-[#EFEBE9]', // White Chocolate
        subtext: 'text-[#BCAAA4]',
        button: 'bg-[#D32F2F] hover:bg-[#C62828] text-white border-none shadow-md', // Red Ribbon
        accent: 'text-[#FFCDD2]',
        font: 'font-serif',
        customDecoration: 'VALENTINE'
    },
    SAKURA: {
        bg: 'bg-gradient-to-b from-[#FCE4EC] to-white', // Pale Sakura
        card: 'bg-white/80 backdrop-blur-sm border border-[#F8BBD0] shadow-sm',
        text: 'text-[#880E4F]', // Deep Pink
        subtext: 'text-[#F48FB1]',
        button: 'bg-white hover:bg-[#FCE4EC] text-[#880E4F] border border-[#F8BBD0]',
        accent: 'text-[#EC407A]',
        font: 'font-serif',
        customDecoration: 'SAKURA'
    },
    SUMMER: {
        bg: 'bg-gradient-to-br from-[#E1F5FE] to-[#81D4FA]', // Ocean Blue
        card: 'bg-white/50 backdrop-blur-md border border-white/50 shadow-lg',
        text: 'text-[#01579B]', // Deep Blue
        subtext: 'text-[#0288D1]',
        button: 'bg-white hover:bg-[#E0F7FA] text-[#0277BD] shadow-sm',
        accent: 'text-[#00BCD4]', // Cyan
        font: 'font-sans',
        customDecoration: 'SUMMER'
    },
    HALLOWEEN: {
        bg: 'bg-[#212121]', // Dark Night
        card: 'bg-[#4A148C] border-2 border-[#FF6D00] shadow-[0_0_20px_rgba(255,109,0,0.5)]',
        text: 'text-[#FFD180]', // Orange tint white
        subtext: 'text-[#E040FB]', // Purple neon
        button: 'bg-[#FF6D00] hover:bg-[#F57C00] text-black font-bold border-none',
        accent: 'text-[#FFAB40]',
        font: 'font-sans',
        customDecoration: 'HALLOWEEN'
    },
    CHRISTMAS: {
        bg: 'bg-[#004D40]', // Deep Green
        card: 'bg-[#B71C1C] border-[3px] border-[#FFD54F] border-dashed shadow-2xl', // Red box with Gold stitch
        text: 'text-white',
        subtext: 'text-[#FFECB3]',
        button: 'bg-white hover:bg-[#FFF8E1] text-[#B71C1C] font-bold shadow-lg',
        accent: 'text-[#FFD54F]', // Gold
        font: 'font-serif',
        customDecoration: 'CHRISTMAS'
    },
    NEW_YEAR: {
        bg: 'bg-[#FAFAFA]', // White
        card: 'bg-white border- double border-[6px] border-[#B71C1C] shadow-lg', // Red Frame
        text: 'text-black',
        subtext: 'text-gray-500',
        button: 'bg-[#B71C1C] hover:bg-[#D32F2F] text-white border border-[#FFD700]',
        accent: 'text-[#FFD700]', // Gold
        font: 'font-serif',
        customDecoration: 'NEW_YEAR'
    }
}
