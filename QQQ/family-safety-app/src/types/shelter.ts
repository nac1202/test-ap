export interface Shelter {
    id: string;
    name: string;
    address: string;
    note?: string;
    latitude?: number;
    longitude?: number;
    supportedDisasters?: string[]; // E.g., ['earthquake', 'flood']
    facilityType?: 'indoor' | 'outdoor';
    createdAt: number;
}
