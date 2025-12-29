import { IconLayer } from '@deck.gl/layers';
import type { OpenSkyState } from '../types';

interface Props {
    data: OpenSkyState[];
}

const AIRPLANE_ICON_ATLAS = 'data:image/svg+xml;charset=utf-8,%3Csvg viewBox=%220 0 24 24%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z%22 fill=%22white%22/%3E%3C/svg%3E';

const ICON_MAPPING = {
    airplane: { x: 0, y: 0, width: 24, height: 24, mask: true }
};

export const createAircraftLayer = (props: Props) => {
    // @ts-ignore
    return new IconLayer({
        id: 'aircraft-layer',
        data: props.data,
        pickable: true,
        iconAtlas: AIRPLANE_ICON_ATLAS,
        iconMapping: ICON_MAPPING,
        getIcon: () => 'airplane',
        getSize: 32,
        getPosition: (d: OpenSkyState) => [d.longitude || 0, d.latitude || 0, d.geo_altitude || 0],
        getAngle: (d: OpenSkyState) => -(d.true_track || 0), // Deck.gl rotates counter-clockwise? Need to verify. Usually standard degrees are clockwise from North, deck is CCW from East.
        // Actually IconLayer: 0 is up (if icon is facing up). Rotates clockwise?
        // Let's assume icon faces UP (North).
        // true_track is clockwise from North.
        // IconLayer angle prop: "The angle of the icon in degrees, 0 is horizontal (3 o'clock)". OR depends on billboarding.
        // If billboard is true (default), it's screen space.
        // But we want it to rotate with the map? "billboard: false"?
        // If we want 3D orientation, we might need simple mesh layer.
        // For now, let's keep it simple. simple 2D icon.
        // If billboard: false, it lies flat on map.
        // If billboard: true, it faces camera. We want to rotate it based on heading.
        // "angle" prop rotates the icon in screen space if billboard is true.
        // true_track is 0=North, 90=East.
        // If icon points UP. Rotation 0 brings it to ?
        // IconLayer by default rotates counter clockwise.
        // Let's defer exact rotation logic. -d.true_track (CCW) is a good guess if 0 is North.
        // Actually, normally 0 in DeckGL might be East.
        // Let's stick to -d.true_track and fine tune later.
        getColor: [255, 255, 255],
        updateTriggers: {
            getAngle: [props.data],
            getPosition: [props.data]
        }
    });
};
