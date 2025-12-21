import React, { useRef } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { useGameStore } from '../../store/gameStore'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

const TreeInstance: React.FC<{ position: [number, number, number], type: 'trunk' | 'leaf', variant?: number, health?: number, growth?: number }> = ({ position, type, variant = 0, health = 3, growth = 100 }) => {
    const ref = useRef<any>()

    // Determine Stage
    let stage: 'small' | 'medium' | 'large' = 'small'
    if (growth > 70) stage = 'large'
    else if (growth > 30) stage = 'medium'

    useFrame(() => {
        if (!ref.current) return

        const posVec = new THREE.Vector3(...position)
        const up = posVec.clone().normalize()

        // --- POSITIONING ---
        let heightOffset = 0
        let sideOffset = new THREE.Vector3(0, 0, 0)

        if (type === 'trunk') {
            heightOffset = 0.75 // Base trunk height
            if (stage === 'large') heightOffset = 1.0
        } else {
            // LEAVES (Cloud/Bush style)
            // Variant 0: Main Top
            // Variant 1: Side Puff 1
            // Variant 2: Side Puff 2

            const baseHeight = stage === 'large' ? 2.5 : (stage === 'medium' ? 1.8 : 1.0)

            if (variant === 0) {
                heightOffset = baseHeight
            } else if (variant === 1) {
                heightOffset = baseHeight - 0.5
                // Random-ish side offset based on position (deterministic)
                const rand = Math.sin(position[0] * 12.3 + position[2] * 4.5)
                // Need a vector orthogonal to UP
                const arbitrary = Math.abs(up.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
                const right = new THREE.Vector3().crossVectors(up, arbitrary).normalize()
                sideOffset.add(right.multiplyScalar(0.6))
                right.applyAxisAngle(up, rand * Math.PI) // Use rand
            } else if (variant === 2) {
                heightOffset = baseHeight - 0.6
                // Opposite side
                const arbitrary = Math.abs(up.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
                const right = new THREE.Vector3().crossVectors(up, arbitrary).normalize()
                sideOffset.add(right.multiplyScalar(-0.5))
                // Add some forward/back
                const forward = new THREE.Vector3().crossVectors(up, right).normalize()
                sideOffset.add(forward.multiplyScalar(0.5))
            }
        }

        const finalPos = posVec.clone().add(up.clone().multiplyScalar(heightOffset))

        // Apply side offset (leaf puffs) - rotated to match planet surface? 
        // Side offset is already calculated in 3D world space relative to normal, but simple addition works for now
        finalPos.add(sideOffset)

        ref.current.position.copy(finalPos)

        const targetQuaternion = new THREE.Quaternion()
        targetQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up)

        // Random rotation for leaves to look natural
        if (type === 'leaf') {
            const randRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), position[0] + variant)
            targetQuaternion.multiply(randRot)
        }

        ref.current.quaternion.copy(targetQuaternion)

        // --- SCALING ---
        let targetScale = new THREE.Vector3(1, 1, 1)

        // Base Growth Scale
        if (stage === 'small') targetScale.set(0.5, 0.5, 0.5)
        else if (stage === 'medium') targetScale.set(1.0, 1.0, 1.0)
        else targetScale.set(1.5, 1.5, 1.5)

        // Variant Scaling
        if (type === 'leaf') {
            if (variant === 0) targetScale.multiplyScalar(1.2)
            if (variant === 1) targetScale.multiplyScalar(0.9)
            if (variant === 2) targetScale.multiplyScalar(0.8)
        }

        // Damage Modifiers
        if (health === 2) {
            if (type === 'leaf') targetScale.multiplyScalar(0.1) // Leaves gone
            else targetScale.setY(targetScale.y * 0.8)
        } else if (health <= 1) {
            if (type === 'leaf') targetScale.set(0, 0, 0)
            else targetScale.setY(targetScale.y * 0.3) // Stump
        }

        if (ref.current.scale.x !== targetScale.x) {
            ref.current.scale.lerp(targetScale, 0.1)
        }
    })

    return <Instance ref={ref} scale={[0, 0, 0]} />
}

export const Trees: React.FC = () => {
    const trees = useGameStore((state) => state.trees)

    const fruits = trees.flatMap(t => {
        const fItems = []
        for (let i = 0; i < t.fruitCount; i++) {
            fItems.push({ treeId: t.id, position: t.position, index: i })
        }
        return fItems
    })

    return (
        <group>
            {/* Trunk Instances - Tapered Cylinder */}
            <Instances range={1000}>
                {/* Top radius 0.15, Bottom 0.3, Height 1.5 */}
                <cylinderGeometry args={[0.15, 0.3, 1.5, 7]} />
                <meshStandardMaterial color="#5C4033" roughness={0.9} />
                {trees.map((t) => (
                    <TreeInstance key={`trunk-${t.id}`} position={t.position} type="trunk" health={t.health} growth={t.growth} />
                ))}
            </Instances>

            {/* Leaves Instances - Dodecahedrons for Low Poly Puff */}
            <Instances range={3000}>
                <dodecahedronGeometry args={[0.8, 0]} />
                <meshStandardMaterial color="#4A7023" flatShading />
                {trees.map((t) => (
                    <React.Fragment key={`leaves-${t.id}`}>
                        {/* 3 Cloud Puffs per tree */}
                        <TreeInstance position={t.position} type="leaf" variant={0} health={t.health} growth={t.growth} />
                        <TreeInstance position={t.position} type="leaf" variant={1} health={t.health} growth={t.growth} />
                        <TreeInstance position={t.position} type="leaf" variant={2} health={t.health} growth={t.growth} />
                    </React.Fragment>
                ))}
            </Instances>

            {/* Fruit Instances (Red Spheres) */}
            <Instances range={500}>
                <sphereGeometry args={[0.2, 8, 8]} />
                <meshStandardMaterial color="#FF3333" />
                {fruits.map((f) => (
                    <FruitInstance key={`fruit-${f.treeId}-${f.index}`} position={f.position} index={f.index} />
                ))}
            </Instances>
        </group>
    )
}

const FruitInstance: React.FC<{ position: [number, number, number], index: number }> = ({ position, index }) => {
    const ref = useRef<any>()

    useFrame((state) => {
        if (!ref.current) return
        const time = state.clock.getElapsedTime()
        const posVec = new THREE.Vector3(...position)
        const up = posVec.clone().normalize()

        // Fruit positioning 
        // Keep similar logic but slightly wider for new canopy
        // FIXED: Removed time rotation (static fruit)
        const angle = index * (Math.PI * 2 / 5)
        const radius = 1.0 // Sligthly wider
        const height = 2.0 // Higher

        let arbitrary = new THREE.Vector3(0, 1, 0)
        if (Math.abs(up.dot(arbitrary)) > 0.9) arbitrary = new THREE.Vector3(1, 0, 0)
        const right = new THREE.Vector3().crossVectors(up, arbitrary).normalize()
        const forward = new THREE.Vector3().crossVectors(up, right).normalize()

        const offset = right.clone().multiplyScalar(Math.cos(angle)).add(forward.clone().multiplyScalar(Math.sin(angle))).multiplyScalar(radius)
        const finalPos = posVec.clone().add(up.clone().multiplyScalar(height)).add(offset)

        ref.current.position.copy(finalPos)
        ref.current.scale.setScalar(1.0 + Math.sin(time * 3 + index) * 0.1)
    })

    return <Instance ref={ref} />
}
