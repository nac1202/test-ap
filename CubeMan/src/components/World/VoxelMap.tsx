import React, { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { useGameStore } from '../../store/gameStore'
import * as THREE from 'three'

interface VoxelMapProps {
    radius?: number
}

export const VoxelMap: React.FC<VoxelMapProps> = ({ radius = 12 }) => {
    const { spawnTree, spawnStone } = useGameStore()

    const handleClick = (e: any) => {
        e.stopPropagation()
        const currentPower = useGameStore.getState().godPower
        if (currentPower === 'none') return

        const point = e.point
        // Calculate the clicked block position (simple rounding for now, but on a sphere it's nuanced)
        // With Voxels, the instance id gives us the exact block, but for now let's prioritize simple raycast point
        const pos = new THREE.Vector3().copy(point).round()

        console.log("Planet Interaction:", currentPower, "at", pos)

        if (currentPower === 'spawn_tree') {
            spawnTree([pos.x, pos.y, pos.z])
        } else if (currentPower === 'spawn_stone') {
            spawnStone([pos.x, pos.y, pos.z])
        } else if (currentPower === 'lightning') {
            // Visual feedback would be nice
        }
    }

    const blocks = useMemo(() => {
        const temp = []


        // --- Flat Earth / Cylinder Geometry ---
        // Radius provided via props (default 24 usually in App)
        // Thickness = 5 blocks, placed just below y=0
        const thickness = 5
        const r2 = radius * radius

        // Scan volume
        // We only need to scan x, z in radius, and y in thickness range
        const limit = Math.ceil(radius)

        for (let x = -limit; x <= limit; x++) {
            for (let z = -limit; z <= limit; z++) {
                // Circular check
                if (x * x + z * z <= r2) {
                    // Create disk thickness (e.g. from y=-5 to y=0)
                    // Let's make the top surface at y=0
                    for (let y = -thickness; y <= 0; y++) {
                        // Optional: noise/imperfect bottom?
                        temp.push({ x, y, z })
                    }
                }
            }
        }
        return temp
    }, [radius])

    return (
        <group name="planet">
            <Instances range={blocks.length} limit={20000} onClick={handleClick}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#4ade80" roughness={0.8} />
                {blocks.map((block, i) => (
                    <Instance
                        key={i}
                        position={[block.x, block.y, block.z]}
                    />
                ))}
            </Instances>
        </group>
    )
}
