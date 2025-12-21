import React, { useRef } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { useGameStore } from '../../store/gameStore'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

export const Stones: React.FC = () => {
    const stones = useGameStore((state) => state.stones)

    return (
        <Instances range={1000}>
            {/* Low-poly stone look: Dodecahedron */}
            <dodecahedronGeometry args={[0.5, 0]} />
            <meshStandardMaterial color="#888" roughness={0.9} />
            {stones.map((s) => (
                <StoneInstance key={s.id} position={s.position} />
            ))}
        </Instances>
    )
}

const StoneInstance: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    const ref = useRef<any>()

    useFrame(() => {
        if (!ref.current) return

        const posVec = new THREE.Vector3(...position)

        // Calculate Up vector (Center -> Pos)
        const up = posVec.clone().normalize()

        // Position on surface + offset
        const finalPos = posVec.clone().add(up.clone().multiplyScalar(0.25))

        ref.current.position.copy(finalPos)

        // Orientation: Align Up vector to Sphere Normal
        const targetQuaternion = new THREE.Quaternion()
        targetQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up)
        ref.current.quaternion.copy(targetQuaternion)

        // Scale animation (pop in)
        if (ref.current.scale.x < 1) {
            ref.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1)
        }
    })

    return <Instance ref={ref} scale={[0, 0, 0]} />
}
