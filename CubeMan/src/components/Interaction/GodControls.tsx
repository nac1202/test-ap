import React, { useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'
import * as THREE from 'three'
import { getTerrainHeight, isLand } from '../../utils/worldGen'

export const GodControls: React.FC = () => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toUpperCase()
            const randomPos = (): [number, number, number] => {
                let attempts = 0
                while (attempts < 50) {
                    const vec = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
                    if (isLand(vec.x, vec.y, vec.z)) {
                        const h = getTerrainHeight(vec.x, vec.y, vec.z)
                        return vec.multiplyScalar(h).toArray()
                    }
                    attempts++
                }
                return [0, 28, 0] // Fail
            }

            if (key === 'T') {
                console.log("Debug: Spawning SaberTooth")
                useGameStore.getState().addSaberTooth(randomPos())
            } else if (key === 'C') {
                console.log("Debug: Spawning Cubit")
                useGameStore.getState().addEntity(randomPos())
            } else if (key === 'M') {
                console.log("Debug: Spawning Mammoth")
                useGameStore.getState().addMammoth(randomPos())
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const handleClick = (e: any) => {
        // Essential: stop propagation to prevent other potential click captures
        e.stopPropagation()

        // Access state directly to ensure we have the absolute latest value, bypassing render cycles
        const currentPower = useGameStore.getState().godPower

        console.log("GodControls: Clicked! Current Power:", currentPower)

        if (currentPower === 'none') {
            return
        }

        const pos = new THREE.Vector3().copy(e.point)
        // Do not round or flatten Y for spherical world

        if (currentPower === 'spawn_tree') {
            if (isLand(pos.x, pos.y, pos.z)) {
                const h = getTerrainHeight(pos.x, pos.y, pos.z)
                const spawnPos = pos.clone().normalize().multiplyScalar(h)
                console.log("God Power: Spawn Tree at", spawnPos)
                useGameStore.getState().spawnTree([spawnPos.x, spawnPos.y, spawnPos.z])
            } else {
                console.log("Cannot spawn tree in water!")
            }
        } else if (currentPower === 'spawn_stone') {
            useGameStore.getState().addResource('stone', 5)
        } else if (currentPower === 'lightning') {
            console.log("Smite!", pos)
            // Check for trees nearby
            const { trees, setLightningStrike, removeTree } = useGameStore.getState()

            // Simple distance check
            for (const tree of trees) {
                const treePos = new THREE.Vector3(...tree.position)
                if (pos.distanceTo(treePos) < 5.0) { // Hitbox
                    console.log("Hit Tree!", tree.id)
                    useGameStore.getState().addFire(tree.position)
                    removeTree(tree.id) // Consume the tree

                    // Visuals
                    // Lightning from sky (extended outward from normal)
                    const normal = treePos.clone().normalize()
                    const start = treePos.clone().add(normal.multiplyScalar(20))
                    setLightningStrike(start, treePos)
                    return // Only burn one at a time
                }
            }
            // If misses tree, just strike ground
            const normal = pos.clone().normalize()
            const start = pos.clone().add(normal.multiplyScalar(20))
            setLightningStrike(start, pos)
        } else if (currentPower === 'place_bonfire') {
            if (isLand(pos.x, pos.y, pos.z)) {
                const h = getTerrainHeight(pos.x, pos.y, pos.z)
                const spawnPos = pos.clone().normalize().multiplyScalar(h)
                console.log("God Power: Start Bonfire Project at", spawnPos)
                useGameStore.getState().startProject('bonfire', [spawnPos.x, spawnPos.y, spawnPos.z])
                useGameStore.getState().setGodPower('none') // Auto-deselect
            }
        }
    }

    // Interaction Sphere (invisible) covering the planet
    return (
        <mesh
            position={[0, 0, 0]}
            onClick={handleClick}
        >
            <sphereGeometry args={[30, 32, 32]} /> {/* Larger than highest peak (approx 28) */}
            <meshBasicMaterial transparent opacity={0} depthWrite={false} color="red" />
        </mesh>
    )
}
