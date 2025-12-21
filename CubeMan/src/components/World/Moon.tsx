import React from 'react'
import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'

export const Moon: React.FC = () => {
    const texture = useLoader(TextureLoader, '/moon.png')

    return (
        <group position={[100, 60, -100]}> {/* Far away in the sky */}
            <mesh castShadow receiveShadow>
                <sphereGeometry args={[8, 32, 32]} />
                <meshStandardMaterial
                    map={texture}
                    roughness={0.8}
                    emissiveMap={texture}
                    emissive="#ffffff"
                    emissiveIntensity={0.2} // Slight glow
                />
            </mesh>
        </group>
    )
}
