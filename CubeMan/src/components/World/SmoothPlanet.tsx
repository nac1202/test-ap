import React, { useRef, useMemo } from 'react'
import { useGameStore } from '../../store/gameStore'
import * as THREE from 'three'
import { getTerrainHeight, WATER_LEVEL, VOLCANO_DIR } from '../../utils/worldGen'

interface SmoothPlanetProps {
    radius?: number
}

export const SmoothPlanet: React.FC<SmoothPlanetProps> = ({ radius = 26 }) => {
    const meshRef = useRef<THREE.Mesh>(null)

    // Generate Terrain Geometry
    const landGeometry = useMemo(() => {
        // High count for detail
        const geo = new THREE.SphereGeometry(radius, 128, 128)

        const posAttribute = geo.attributes.position

        // Add color attribute
        const colors = new Float32Array(posAttribute.count * 3)
        const colorAttribute = new THREE.BufferAttribute(colors, 3)
        geo.setAttribute('color', colorAttribute)

        const grassColor = new THREE.Color("#4ade80")
        const sandColor = new THREE.Color("#f0e68c") // Khaki
        const seabedColor = new THREE.Color("#2db3ff") // Light Blue (Seabed)

        for (let i = 0; i < posAttribute.count; i++) {
            const x = posAttribute.getX(i)
            const y = posAttribute.getY(i)
            const z = posAttribute.getZ(i)

            // Get Height
            const h = getTerrainHeight(x, y, z)

            // Normalize direction
            const vec = new THREE.Vector3(x, y, z).normalize().multiplyScalar(h)
            posAttribute.setXYZ(i, vec.x, vec.y, vec.z)

            // Change from: // Calculate Color based on Height relative to WATER_LEVEL
            // To: 

            // --- COLOR LOGIC ---
            // Re-normalize for dot check
            const nVec = new THREE.Vector3(x, y, z).normalize();

            // Check Volcano Proximity
            const vDot = nVec.dot(new THREE.Vector3(VOLCANO_DIR.x, VOLCANO_DIR.y, VOLCANO_DIR.z));

            // Calculate Color based on Height relative to WATER_LEVEL
            const waterDiff = h - WATER_LEVEL
            let finalColor = grassColor.clone()

            if (vDot > 0.92) {
                // Volcano Zone Coloring
                // Base Rock
                finalColor.setHex(0x333333); // Dark Grey

                // Crater Lava
                // Re-calculate 't' from worldGen
                let t = (vDot - 0.92) / (1.0 - 0.92);
                if (t > 0.94) { // Inner crater
                    finalColor.setHex(0xff3300); // Lava Red
                    finalColor.lerp(new THREE.Color(0xffaa00), 0.5); // Orange mix
                }
            }
            else if (waterDiff < 0.2 && waterDiff > -0.5) {
                // Shoreline / Beach / Shallow Water Shelf
                // Mix Grass -> Sand -> Seabed
                if (waterDiff > 0.05) {
                    // Beach
                    finalColor = sandColor.clone()
                } else {
                    // Shallow Shelf (visually sand under water)
                    // Mix Sand and Seabed
                    const t = (waterDiff - (-0.5)) / 0.55 // Normalize
                    finalColor = seabedColor.clone().lerp(sandColor, t)
                }
            } else if (waterDiff <= -0.5) {
                // Deep Sea Bed
                finalColor = seabedColor.clone()
            }

            colorAttribute.setXYZ(i, finalColor.r, finalColor.g, finalColor.b)
        }

        geo.computeVertexNormals()
        return geo
    }, [radius])

    const handleClick = (e: any) => {
        e.stopPropagation()
        const point = e.point

        // Fetch fresh state directly
        const state = useGameStore.getState()
        const currentGodPower = state.godPower

        console.log("Planet Clicked!", point)
        const position: [number, number, number] = [point.x, point.y, point.z]

        // Check if Underwater (Height check)
        const h = getTerrainHeight(point.x, point.y, point.z)
        if (h <= WATER_LEVEL + 0.1) {
            console.log("Click ignored: Underwater")
            return // Ignore clicks on water for spawning logic (except maybe Tsunami?)
        }

        if (currentGodPower === 'spawn_tree') {
            state.spawnTree(position)
        } else if (currentGodPower === 'spawn_stone') {
            state.spawnStone(position)
        } else if (currentGodPower === 'lightning') {
            // ... (Lightning logic same as before, maybe ignore water?)
            state.addFire(position) // For simple testing
        }
    }

    return (
        <group name="planet">
            {/* WATER SPHERE */}
            <mesh receiveShadow castShadow={false}>
                <sphereGeometry args={[WATER_LEVEL, 64, 64]} />
                <meshPhongMaterial
                    color="#0066cc"
                    transparent
                    opacity={0.8}
                    shininess={100}
                    specular={new THREE.Color(0x111111)}
                />
            </mesh>

            {/* LAND SPHERE */}
            <mesh ref={meshRef} geometry={landGeometry} onClick={handleClick} receiveShadow castShadow>
                <meshStandardMaterial
                    vertexColors={true}
                    roughness={0.8}
                />
            </mesh>
        </group>
    )
}
