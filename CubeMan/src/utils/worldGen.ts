
// Simple Perlin-ish Noise Implementation for Terrain

// Fixed Volcano Position (Normalized)
export const VOLCANO_DIR = { x: 0.8, y: 0.3, z: 0.5 }; // Must match logic inside, helper to export
// Normalize it
const vLen = Math.sqrt(VOLCANO_DIR.x * VOLCANO_DIR.x + VOLCANO_DIR.y * VOLCANO_DIR.y + VOLCANO_DIR.z * VOLCANO_DIR.z);
VOLCANO_DIR.x /= vLen; VOLCANO_DIR.y /= vLen; VOLCANO_DIR.z /= vLen;

export class SimplexNoise {
    // Permutation table
    private p: number[] = [];

    constructor(seed: number = Math.random()) {
        this.p = new Array(512);
        const pSource = new Array(256);
        for (let i = 0; i < 256; i++) pSource[i] = i;

        // Shuffle
        let seedVal = seed;
        const random = () => {
            const x = Math.sin(seedVal++) * 10000;
            return x - Math.floor(x);
        }

        for (let i = 0; i < 256; i++) {
            const r = Math.floor(random() * 256);
            const temp = pSource[i];
            pSource[i] = pSource[r];
            pSource[r] = temp;
        }

        for (let i = 0; i < 512; i++) {
            this.p[i] = pSource[i & 255];
        }
    }

    dot(g: number[], x: number, y: number, z: number) {
        return g[0] * x + g[1] * y + g[2] * z;
    }

    mix(a: number, b: number, t: number) {
        return (1 - t) * a + t * b;
    }

    fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }

    grad3 = [
        [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
        [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
        [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];

    noise3d(x: number, y: number, z: number) {
        // Find unit grid cell
        let X = Math.floor(x) & 255;
        let Y = Math.floor(y) & 255;
        let Z = Math.floor(z) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        let u = this.fade(x);
        let v = this.fade(y);
        let w = this.fade(z);

        // Hash coordinates of the 8 cube corners
        let A = this.p[X] + Y, AA = this.p[A] + Z, AB = this.p[A + 1] + Z;
        let B = this.p[X + 1] + Y, BA = this.p[B] + Z, BB = this.p[B + 1] + Z;

        return this.mix(
            this.mix(this.mix(this.dot(this.grad3[this.p[AA] % 12], x, y, z),
                this.dot(this.grad3[this.p[BA] % 12], x - 1, y, z), u),
                this.mix(this.dot(this.grad3[this.p[AB] % 12], x, y - 1, z),
                    this.dot(this.grad3[this.p[BB] % 12], x - 1, y - 1, z), u), v),
            this.mix(this.mix(this.dot(this.grad3[this.p[AA + 1] % 12], x, y, z - 1),
                this.dot(this.grad3[this.p[BA + 1] % 12], x - 1, y, z - 1), u),
                this.mix(this.dot(this.grad3[this.p[AB + 1] % 12], x, y - 1, z - 1),
                    this.dot(this.grad3[this.p[BB + 1] % 12], x - 1, y - 1, z - 1), u), v), w);
    }
}

const noise = new SimplexNoise(12345); // Fixed seed for consistency

export const PLANET_RADIUS = 26;
export const SEA_LEVEL_RADIUS = 25.8;

export const WATER_LEVEL = 25.5;

export function getTerrainHeight(x: number, y: number, z: number): number {
    // Normalize input vector to get direction
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len === 0) return PLANET_RADIUS;
    const nx = x / len; const ny = y / len; const nz = z / len;

    // --- VOLCANO LOGIC ---
    // Use exported direction
    const vx = VOLCANO_DIR.x; const vy = VOLCANO_DIR.y; const vz = VOLCANO_DIR.z;

    const dot = nx * vx + ny * vy + nz * vz;

    if (dot > 0.92) {
        // We are in Volcano Zone
        const volcanoHeigthMax = 6.0;

        let t = (dot - 0.92) / (1.0 - 0.92);

        let vHeight = 0;

        if (t > 0.85) {
            const ct = (t - 0.85) / 0.15;
            const rimH = volcanoHeigthMax;
            const centerH = volcanoHeigthMax * 0.7; // Crater Dip
            vHeight = rimH - (rimH - centerH) * (ct * ct);
        } else {
            vHeight = t * t * volcanoHeigthMax * 1.5;
            if (vHeight > volcanoHeigthMax) vHeight = volcanoHeigthMax;
        }

        const baseH = WATER_LEVEL - 1.0;
        const finalVolcanoH = baseH + vHeight;

        // Calculate Noise Height (Base Terrain) manually to blend/max
        // Re-implementing logic here for safety
        const scale = 0.6;
        const v = noise.noise3d(nx * scale, ny * scale, nz * scale);
        const detail = noise.noise3d(nx * 4 + 10, ny * 4 + 10, nz * 4 + 10) * 0.05;
        const finalVal = v + detail;
        const threshold = -0.15;

        let noiseH = WATER_LEVEL - 2.0;

        if (finalVal > threshold) {
            noiseH = WATER_LEVEL + 0.2 + (finalVal - threshold) * 4.0;
        } else {
            const depthDelta = threshold - finalVal;
            const shelfWidth = 0.15;
            if (depthDelta < shelfWidth) {
                const tShelf = depthDelta / shelfWidth;
                const smoothTShelf = tShelf * tShelf * (3 - 2 * tShelf);
                noiseH = (WATER_LEVEL - 0.5) - (smoothTShelf * 1.5);
            }
        }

        return Math.max(noiseH, finalVolcanoH);
    }

    // --- STANDARD TERRAIN LOGIC ---
    const scale = 0.6;
    const v = noise.noise3d(nx * scale, ny * scale, nz * scale);
    const detail = noise.noise3d(nx * 4 + 10, ny * 4 + 10, nz * 4 + 10) * 0.05;
    const finalVal = v + detail;

    const threshold = -0.15;

    if (finalVal > threshold) {
        // Land
        return WATER_LEVEL + 0.2 + (finalVal - threshold) * 4.0;
    } else {
        // Sea: Continental Shelf Logic
        const depthDelta = threshold - finalVal;
        const shelfWidth = 0.15;

        if (depthDelta < shelfWidth) {
            const t = depthDelta / shelfWidth;
            const smoothT = t * t * (3 - 2 * t);
            return (WATER_LEVEL - 0.5) - (smoothT * 1.5);
        } else {
            return WATER_LEVEL - 2.0;
        }
    }
}

export function isLand(x: number, y: number, z: number): boolean {
    return getTerrainHeight(x, y, z) > WATER_LEVEL;
}
