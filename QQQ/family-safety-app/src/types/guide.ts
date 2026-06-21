export interface GuideItem {
    id: string;
    category: "earthquake" | "typhoon" | "tsunami" | "firstaid" | "fire" | "heatstroke" | "snow" | "volcano" | "missile" | "security" | "fraud" | "cyber" | "defense" | "car";
    title: string;
    description: string;
    content: string; // Markdown content
    imageUrl?: string;
    updatedAt: string;
}
