
import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Fish as FishType } from '../../store/gameStore'
import { getTerrainHeight, WATER_LEVEL } from '../../utils/worldGen'

import { useGameStore } from '../../store/gameStore'

interface FishProps {
    data: FishType
}

export const Fish: React.FC<FishProps> = ({ data }) => {
    const meshRef = useRef<THREE.Group>(null)
    const position = useRef(new THREE.Vector3(...data.position))
    const velocity = useRef(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(2))
    const offset = useRef(Math.random() * 100)

    useFrame((state, delta) => {
        if (!meshRef.current) return

        // --- FLOCKING LOGIC ---
        const allFish = useGameStore.getState().fish
        const detectionRadius = 4.0

        let cohesion = new THREE.Vector3()
        let separation = new THREE.Vector3()
        let count = 0

        // In a real boids system, we'd store velocity in the store too, but here we approximate.
        // We can only react to position since we don't sync velocity to store every frame (too expensive).
        // So we will just flock to "center of mass" of same-colored fish nearby (Cohesion) and avoid crowding (Separation).

        for (const f of allFish) {
            if (f.id === data.id) continue
            // Only school with same color
            if (f.color !== data.color) continue

            const fPos = new THREE.Vector3(...f.position)
            const dist = position.current.distanceTo(fPos)

            if (dist < detectionRadius) {
                // Cohesion: Add position
                cohesion.add(fPos)

                // Separation: Move away if too close
                if (dist < 1.0) {
                    const push = position.current.clone().sub(fPos).normalize().multiplyScalar(1.0 / dist)
                    separation.add(push)
                }

                count++
            }
        }

        if (count > 0) {
            // Finish Cohesion (Target is average pos)
            cohesion.divideScalar(count)
            const cohesionDir = cohesion.sub(position.current).normalize()

            // Apply Forces
            velocity.current.lerp(cohesionDir.multiplyScalar(2.0), delta * 1.0) // Steer to group
            velocity.current.add(separation.multiplyScalar(delta * 2.5)) // Avoid bumping
        }

        // --- MOVEMENT & CONSTRAINTS ---

        // 1. Move
        const speed = 2.0
        velocity.current.clampLength(speed * 0.5, speed * 1.5) // Keep speed reasonable
        position.current.add(velocity.current.clone().multiplyScalar(delta))

        // 2. Constrain to Water
        const len = position.current.length()
        const surfaceH = getTerrainHeight(position.current.x, position.current.y, position.current.z)

        // Bounds: Above terrain, Below Water Surface
        const minH = surfaceH + 1.0 // Higher from ground
        const maxH = WATER_LEVEL - 0.5 // Lower from surface

        const currentH = len
        if (currentH < minH) {
            // Too deep (hit ground), bounce up
            const normal = position.current.clone().normalize()
            position.current.add(normal.multiplyScalar(minH - currentH + 0.1))
            velocity.current.reflect(normal.negate())
            velocity.current.add(normal.multiplyScalar(0.5)) // Push up
        } else if (currentH > maxH) {
            // Too shallow (hit surface), bounce down
            const normal = position.current.clone().normalize()
            position.current.add(normal.multiplyScalar(maxH - currentH - 0.1))
            velocity.current.reflect(normal)
            velocity.current.add(normal.negate().multiplyScalar(0.5)) // Push down
        }

        // 3. Update Visuals
        meshRef.current.position.copy(position.current)

        // Orient to velocity
        const forward = velocity.current.clone().normalize()
        const targetQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward)

        meshRef.current.quaternion.slerp(targetQ, 0.1)

        // Swim wobble
        const wobble = Math.sin(state.clock.elapsedTime * 15 + offset.current) * 0.15
        meshRef.current.rotation.z += wobble

        // Random Turn (Wander)
        if (Math.random() < 0.02) {
            const randomDir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
            velocity.current.lerp(randomDir.multiplyScalar(2), 0.05)
        }
    })

    return (
        <group ref={meshRef}>
            {/* Improved Fish Shape: Flat body (Cylinder side-on) + Triangles */}
            <group rotation={[0, Math.PI / 2, 0]}>
                {/* Body: Flattened Sphere/Capsule look using Scaled Cylinder or Dodecahedron? 
                    Let's use a Box but rotated and scaled to look diamond-like or just a flattened Scaled Sphere 
                */}
                <mesh scale={[0.1, 0.35, 0.5]}>
                    <capsuleGeometry args={[0.3, 0.6, 2, 8]} />
                    <meshStandardMaterial color={data.color} roughness={0.4} />
                </mesh>

                {/* Tail: Pyramid/Cone on side */}
                <mesh position={[0, 0, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
                    <coneGeometry args={[0.15, 0.3, 3]} /> {/* Triangle cross section */}
                    <meshStandardMaterial color={data.color} />
                </mesh>

                {/* Top Fin */}
                <mesh position={[0, 0.25, 0.1]} rotation={[0, 0, 0]}>
                    <boxGeometry args={[0.02, 0.2, 0.15]} />
                    <meshStandardMaterial color={data.color} />
                </mesh>
                {/* Bottom Fin */}
                <mesh position={[0, -0.25, 0.1]} rotation={[0, 0, 0]}>
                    <boxGeometry args={[0.02, 0.2, 0.15]} />
                    <meshStandardMaterial color={data.color} />
                </mesh>

                {/* Eye */}
                <mesh position={[0.06, 0.05, 0.15]}>
                    <sphereGeometry args={[0.03]} />
                    <meshStandardMaterial color="black" />
                </mesh>
                <mesh position={[-0.06, 0.05, 0.15]}>
                    <sphereGeometry args={[0.03]} />
                    <meshStandardMaterial color="black" />
                </mesh>
            </group>
        </group>
    )
}
