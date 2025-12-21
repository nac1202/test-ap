
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
            {/* Body */}
            <mesh scale={[1.2, 0.8, 2.5]}>
                <boxGeometry />
                <meshStandardMaterial color="#334455" />
            </mesh>
            {/* Belly */}
            <mesh position={[0, -0.3, 0]} scale={[1.1, 0.3, 2.0]}>
                <boxGeometry />
                <meshStandardMaterial color="#eeeeee" />
            </mesh>
            {/* Tail */}
            <group position={[0, 0, -1.5]}>
                <mesh scale={[0.8, 0.2, 0.8]}>
                    <boxGeometry />
                    <meshStandardMaterial color="#334455" />
                </mesh>
            </group>
            {/* Spout */}
            <mesh position={[0, 0.4, 0.8]} scale={[0.1, 0.1, 0.1]}>
                <boxGeometry />
                <meshStandardMaterial color="black" />
            </mesh>
        </group>
    )
}
