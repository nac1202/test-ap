
import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Whale as WhaleType } from '../../store/gameStore'
import { getTerrainHeight, WATER_LEVEL } from '../../utils/worldGen'

interface WhaleProps {
    data: WhaleType
}

export const Whale: React.FC<WhaleProps> = ({ data }) => {
    const meshRef = useRef<THREE.Group>(null)
    const position = useRef(new THREE.Vector3(...data.position))
    // Move tangentially to surface
    const angle = useRef(Math.random() * Math.PI * 2)

    useFrame((state, delta) => {
        if (!meshRef.current) return

        // 1. Move slowly around planet
        const speed = 1.5

        // Calculate tangent direction
        const up = position.current.clone().normalize()
        // Arbitrary axis to cross with
        const axis = new THREE.Vector3(0, 1, 0)
        let forward = new THREE.Vector3().crossVectors(up, axis).normalize()
        if (forward.lengthSq() < 0.01) {
            forward = new THREE.Vector3().crossVectors(up, new THREE.Vector3(1, 0, 0)).normalize()
        }

        // Rotate forward vector by angle to get random direction
        forward.applyAxisAngle(up, angle.current)

        // Apply movement
        position.current.add(forward.multiplyScalar(speed * delta))

        // 2. Depth Logic (Bobbing)
        // Keep right at surface or slightly submerged
        const idealHeight = WATER_LEVEL - 0.2 + Math.sin(state.clock.elapsedTime * 0.5) * 0.3

        const currentLen = position.current.length()
        const surfaceH = getTerrainHeight(position.current.x, position.current.y, position.current.z)

        // Clamp
        let targetH = idealHeight
        if (targetH < surfaceH + 1.0) targetH = surfaceH + 1.0 // Don't hit ground
        if (targetH > WATER_LEVEL - 0.5) targetH = WATER_LEVEL - 0.5 // Don't fly (unless breaching logic added later)

        // Smoothly adjust height (radius)
        const newLen = THREE.MathUtils.lerp(currentLen, targetH, delta * 0.5)
        position.current.setLength(newLen)

        // 3. Change direction slowly
        if (Math.random() < 0.005) {
            angle.current += (Math.random() - 0.5) * 1.0
        }

        // 4. Update Visuals
        meshRef.current.position.copy(position.current)

        // Orientation
        const lookTarget = position.current.clone().add(forward)
        meshRef.current.lookAt(lookTarget)

        // Ensure "up" is away from planet center
        // lookAt sets Z to target, we need to enforce Y up as planet normal
        // This is tricky with lookAt. Using LookAt usually overrides Up. 
        // Manual basis construction is safer but lookAt + Up usually works if Up is set first?
        // Actually, just let it orient to forward, but rolling might be an issue.
        // Let's use makeBasis:
        // X = Right, Y = Up (Normal), Z = Forward
        const Z = forward.clone().negate().normalize() // forward
        const Y = up.clone().normalize() // up
        const X = new THREE.Vector3().crossVectors(Y, Z).normalize()
        const m = new THREE.Matrix4().makeBasis(X, Y, Z)
        meshRef.current.quaternion.setFromRotationMatrix(m)
        // Slight fix: model needs to be rotated if it's not modeled facing Z
        // Assuming model faces +Z?
    })


    return (
        <group ref={meshRef}>
            {/* --- LEGO STYLE WHALE --- */}

            {/* MAIN BODY */}
            {/* Top Blue Layer (Back) */}
            <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.2, 0.4, 1.8]} />
                <meshStandardMaterial color="#3a86ff" />
            </mesh>
            {/* Top Blue Layer (Front Slope) */}
            <mesh position={[0, 0.4, 1.1]} castShadow receiveShadow>
                <boxGeometry args={[1.2, 0.4, 0.4]} />
                <meshStandardMaterial color="#3a86ff" />
            </mesh>

            {/* Mid Blue Layer (Upper Body) */}
            <mesh position={[0, 0, 0.2]} castShadow receiveShadow>
                <boxGeometry args={[1.4, 0.4, 2.4]} />
                <meshStandardMaterial color="#3a86ff" />
            </mesh>

            {/* LOWER BODY (White/Cream Belly) */}
            <mesh position={[0, -0.4, 0.3]} castShadow receiveShadow>
                <boxGeometry args={[1.4, 0.4, 2.0]} />
                <meshStandardMaterial color="#f0f0f0" />
            </mesh>
            <mesh position={[0, -0.8, 0.3]} castShadow receiveShadow>
                <boxGeometry args={[1.0, 0.4, 1.2]} />
                <meshStandardMaterial color="#f0f0f0" />
            </mesh>

            {/* TAIL SECTION */}
            {/* Connects to body */}
            <mesh position={[0, -0.1, -1.2]} castShadow receiveShadow>
                <boxGeometry args={[0.8, 0.6, 0.6]} />
                <meshStandardMaterial color="#3a86ff" />
            </mesh>
            {/* Tail Fluke Stem */}
            <mesh position={[0, 0.1, -1.6]} castShadow receiveShadow>
                <boxGeometry args={[0.4, 0.4, 0.4]} />
                <meshStandardMaterial color="#3a86ff" />
            </mesh>
            {/* Tail Fluke (Horizontal Fins at back) */}
            <mesh position={[0, 0.3, -1.9]} castShadow receiveShadow>
                <boxGeometry args={[1.2, 0.2, 0.4]} />
                <meshStandardMaterial color="#3a86ff" />
            </mesh>

            {/* SIDE FINS */}
            {/* Left Fin */}
            <mesh position={[0.8, -0.4, 0.6]} rotation={[0, 0, 0.2]} castShadow receiveShadow>
                <boxGeometry args={[0.6, 0.2, 0.4]} />
                <meshStandardMaterial color="#3a86ff" />
            </mesh>
            {/* Right Fin */}
            <mesh position={[-0.8, -0.4, 0.6]} rotation={[0, 0, -0.2]} castShadow receiveShadow>
                <boxGeometry args={[0.6, 0.2, 0.4]} />
                <meshStandardMaterial color="#3a86ff" />
            </mesh>

            {/* EYES */}
            {/* White Plate */}
            <mesh position={[0.71, -0.1, 1.0]} rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
                <meshStandardMaterial color="white" />
            </mesh>
            <mesh position={[-0.71, -0.1, 1.0]} rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
                <meshStandardMaterial color="white" />
            </mesh>
            {/* Pupil (Closed eye dash or dot) */}
            <mesh position={[0.74, -0.1, 1.0]} rotation={[0, 0, Math.PI / 2]}>
                <boxGeometry args={[0.02, 0.15, 0.02]} />
                <meshStandardMaterial color="black" />
            </mesh>
            <mesh position={[-0.74, -0.1, 1.0]} rotation={[0, 0, Math.PI / 2]}>
                <boxGeometry args={[0.02, 0.15, 0.02]} />
                <meshStandardMaterial color="black" />
            </mesh>

            {/* SPOUT (Water Spray) */}
            <mesh position={[0, 0.6, 0.5]}>
                <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
                <meshStandardMaterial color="#a0c4ff" transparent opacity={0.6} />
            </mesh>
            <mesh position={[0, 0.9, 0.5]}>
                <cylinderGeometry args={[0.15, 0.02, 0.2, 8]} />
                <meshStandardMaterial color="#a0c4ff" transparent opacity={0.6} />
            </mesh>

        </group>
    )
}
