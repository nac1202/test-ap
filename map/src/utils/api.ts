import axios from 'axios';
import type { OpenSkyState } from '../types';

const BASE_URL = 'https://opensky-network.org/api';
// Japan Bounding Box (approximate)
export const LAMIN = 20.0;
export const LAMAX = 46.0;
export const LOMIN = 122.0;
export const LOMAX = 154.0;

export const fetchAircraftInJapan = async (bounds?: { lamin: number, lamax: number, lomin: number, lomax: number }): Promise<OpenSkyState[]> => {
    try {
        const params: any = {};
        if (bounds) {
            params.lamin = bounds.lamin;
            params.lamax = bounds.lamax;
            params.lomin = bounds.lomin;
            params.lomax = bounds.lomax;
        }
        // If no bounds provided, OpenSky returns global data (requires authentication for full access, but anonymous has limits)
        // With anonymous access, we might hit limits faster globally.
        // But let's try.

        const response = await axios.get<{ time: number; states: (string | number | boolean | null)[][] }>(
            `${BASE_URL}/states/all`,
            { params }
        );

        if (!response.data.states) {
            return [];
        }

        // Map raw array to OpenSkyState object
        const aircraftList: OpenSkyState[] = response.data.states.map((s) => ({
            icao24: s[0] as string,
            callsign: (s[1] as string).trim(),
            origin_country: s[2] as string,
            time_position: s[3] as number | null,
            last_contact: s[4] as number,
            longitude: s[5] as number | null,
            latitude: s[6] as number | null,
            baro_altitude: s[7] as number | null,
            on_ground: s[8] as boolean,
            velocity: s[9] as number | null,
            true_track: s[10] as number | null,
            vertical_rate: s[11] as number | null,
            sensors: s[12] as number[] | null,
            geo_altitude: s[13] as number | null,
            squawk: s[14] as string | null,
            spi: s[15] as boolean,
            position_source: s[16] as number,
        }));

        return aircraftList;
    } catch (error) {
        console.error('Failed to fetch aircraft data', error);
        return [];
    }
};
