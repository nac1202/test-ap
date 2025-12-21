
import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import * as THREE from 'three'
import { useGameStore } from '../../store/gameStore'
import { getTerrainHeight } from '../../utils/worldGen'

interface MammothProps {
    id?: string
    position: [number, number, number]
}

export const Mammoth: React.FC<MammothProps> = ({ position }) => {
    const meshRef = useRef<Group>(null)
    const legFL = useRef<Group>(null)
    const legFR = useRef<Group>(null)
    const legBL = useRef<Group>(null)
    const legBR = useRef<Group>(null)
    const headRef = useRef<Group>(null)

    // Trunk Joints
    const trunk1Ref = useRef<Group>(null)
    const trunk2Ref = useRef<Group>(null)
    const trunk3Ref = useRef<Group>(null)

    const aiState = useRef<'WANDER' | 'CHASE' | 'FLEE_FIRE' | 'FORAGING' | 'EATING'>('WANDER')
    const currentPos = useRef(new THREE.Vector3(...position))
    const currentHeading = useRef(new THREE.Vector3(1, 0, 0))
    const targetHeading = useRef(new THREE.Vector3(1, 0, 0))

    // Hunger System
    const hunger = useRef(0) // 0 to 100
    const targetTreeId = useRef<string | null>(null)
    const eatTimer = useRef(0)

    const SCALE = 3.5
    // Adjusted offset for shorter legs/stout body
    const SURFACE_OFFSET = 0.1 * SCALE

    useFrame((state, delta) => {
        if (!meshRef.current) return
        const time = state.clock.getElapsedTime()
        const up = currentPos.current.clone().normalize()

        // --- AI & MOVEMENT LOGIC ---

        // 0. Update Hunger
        hunger.current += delta * 5 // Full hunger in ~20s

        // 1. Check for Fires (High Priority Override)
        const fires = useGameStore.getState().fires
        let nearestFireDist = Infinity
        let nearestFirePos: THREE.Vector3 | null = null

        for (const fire of fires) {
            const fPos = new THREE.Vector3(...fire.position)
            const dist = currentPos.current.distanceTo(fPos)
            if (dist < nearestFireDist) {
                nearestFireDist = dist
                nearestFirePos = fPos
            }
        }

        // State Transitions for Fire
        if (nearestFireDist < 10.0 && nearestFirePos) {
            aiState.current = 'FLEE_FIRE'
            // Vector pointing AWAY from fire
            const fleeDir = currentPos.current.clone().sub(nearestFirePos).normalize()
            targetHeading.current = fleeDir
        } else if (aiState.current === 'FLEE_FIRE' && nearestFireDist > 15.0) {
            aiState.current = 'WANDER' // Safe now
        }

        // 2. Hunger Check (If safe)
        if (aiState.current !== 'FLEE_FIRE') {
            if (hunger.current > 80 && aiState.current !== 'FORAGING' && aiState.current !== 'EATING') {
                aiState.current = 'FORAGING'
                targetTreeId.current = null
            }

            if (aiState.current === 'FORAGING') {
                const { trees } = useGameStore.getState()

                // Find target if none
                if (!targetTreeId.current) {
                    let nearestTreeDist = Infinity
                    let nearestTree: any = null

                    for (const tree of trees) {
                        const tPos = new THREE.Vector3(...tree.position)
                        const dist = currentPos.current.distanceTo(tPos)
                        if (dist < nearestTreeDist) {
                            nearestTreeDist = dist
                            nearestTree = tree
                        }
                    }

                    if (nearestTree) {
                        targetTreeId.current = nearestTree.id
                    } else {
                        // No trees found? Wander sadly
                        aiState.current = 'WANDER'
                    }
                }

                // Move to Target
                if (targetTreeId.current) {
                    const tree = trees.find(t => t.id === targetTreeId.current)
                    if (tree) {
                        const tPos = new THREE.Vector3(...tree.position)
                        const dist = currentPos.current.distanceTo(tPos)

                        targetHeading.current = tPos.clone().sub(currentPos.current).normalize()

                        if (dist < 5.0) {
                            // Start Eating
                            aiState.current = 'EATING'
                            eatTimer.current = 0
                        }
                    } else {
                        // Tree gone? Repick
                        targetTreeId.current = null
                    }
                }
            }

            if (aiState.current === 'EATING' && targetTreeId.current) {
                eatTimer.current += delta
                // Damage tree every 1 second (approx)
                // We use a simple integer check of the timer to trigger damage once per second
                // Damage tree every 1 second (approx)

                // We need to track last damage time to avoid damaging every frame
                // Since this is a ref-based component, let's use a local ref for lastDamage if possible, 
                // but since we don't have one, we can use the integer part of eatTimer.
                // However, we need to ensure we don't damage multiple times in the same second.
                // A simpler way: Trigger at 1.0, 2.0, 3.0

                // Hacky but simple: check if we crossed a threshold this frame
                // But delta is variable.
                // Let's rely on the store's health check.
                // Actually, store remove logic is handled by health <= 0.

                const { trees, damageTree } = useGameStore.getState()
                const tree = trees.find(t => t.id === targetTreeId.current)

                if (tree) {
                    // Logic:
                    // 0s: Start Eating
                    // 1s: Damage (3->2)
                    // 2s: Damage (2->1)
                    // 3s: Damage (1->0) -> Gone

                    if (eatTimer.current > 1.0 && tree.health === 3) {
                        damageTree(targetTreeId.current)
                    }
                    if (eatTimer.current > 2.0 && tree.health === 2) {
                        damageTree(targetTreeId.current)
                    }
                    if (eatTimer.current > 3.0 && tree.health === 1) {
                        console.log("Mammoth ATE tree!", targetTreeId.current)
                        damageTree(targetTreeId.current) // This will remove it
                        hunger.current = 0
                        aiState.current = 'WANDER'
                        targetTreeId.current = null
                    }
                } else {
                    // Tree gone (maybe destroyed by other)
                    aiState.current = 'WANDER'
                    targetTreeId.current = null
                }
            }
        }

        // 3. Normal Wander
        if (aiState.current === 'WANDER' && Math.random() < 0.005) {
            targetHeading.current = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
        }

        let desiredDir = targetHeading.current.clone().sub(up.clone().multiplyScalar(targetHeading.current.dot(up))).normalize()
        let actualDir = currentHeading.current.clone().sub(up.clone().multiplyScalar(currentHeading.current.dot(up))).normalize()

        const angle = actualDir.angleTo(desiredDir)
        if (angle > 0.001) {
            // Turn faster when fleeing
            const turnSpeed = aiState.current === 'FLEE_FIRE' ? 2.5 : 0.8
            const step = Math.min(1, (turnSpeed * delta) / angle)
            actualDir.lerp(desiredDir, step).normalize()
        }
        currentHeading.current = actualDir

        // Move Speed
        const isFleeing = aiState.current === 'FLEE_FIRE'
        const isForaging = aiState.current === 'FORAGING'
        const baseSpeed = 0.8

        let speedMultiplier = 1.0
        if (isFleeing) speedMultiplier = 2.5
        if (isForaging) speedMultiplier = 1.2
        if (aiState.current === 'EATING') speedMultiplier = 0.0

        const moveVec = currentHeading.current.clone().multiplyScalar(baseSpeed * speedMultiplier * delta)
        currentPos.current.add(moveVec)

        // Apply Surface Constraint (Height Map)
        const h = getTerrainHeight(currentPos.current.x, currentPos.current.y, currentPos.current.z)
        currentPos.current.normalize().multiplyScalar(h + SURFACE_OFFSET)

        meshRef.current.position.copy(currentPos.current)
        meshRef.current.up.copy(up)
        meshRef.current.lookAt(currentPos.current.clone().add(currentHeading.current))

        // --- ANIMATION ---
        const walkSpeed = isFleeing ? 4.0 : 2.0 // Run faster!
        const legAmp = 0.5

        if (legFL.current && legFR.current && legBL.current && legBR.current && headRef.current) {
            legFL.current.rotation.x = Math.sin(time * walkSpeed) * legAmp
            legFR.current.rotation.x = Math.sin(time * walkSpeed + Math.PI) * legAmp
            legBL.current.rotation.x = Math.sin(time * walkSpeed + Math.PI) * legAmp
            legBR.current.rotation.x = Math.sin(time * walkSpeed) * legAmp
            // Head bob slightly slower
            headRef.current.rotation.x = Math.sin(time * walkSpeed * 2) * 0.05
        }

        // --- TRUNK ANIMATION ---
        // --- TRUNK ANIMATION ---
        if (trunk1Ref.current && trunk2Ref.current && trunk3Ref.current) {
            if (aiState.current === 'EATING') {
                // Eating Animation: Waving trunk around to mouth (simulated)
                const eatSpeed = 10
                trunk1Ref.current.rotation.x = -0.5 + Math.sin(time * eatSpeed) * 0.3
                trunk2Ref.current.rotation.x = -0.5 + Math.sin(time * eatSpeed + 1) * 0.3
                trunk3Ref.current.rotation.x = -0.5 + Math.sin(time * eatSpeed + 2) * 0.3

                trunk1Ref.current.rotation.z = Math.sin(time * eatSpeed * 0.5) * 0.2
            } else {
                trunk1Ref.current.rotation.x = -0.2 + Math.sin(time * 2) * 0.1
                trunk2Ref.current.rotation.x = 0.2 + Math.sin(time * 2 + 0.5) * 0.1
                trunk3Ref.current.rotation.x = 0.3 + Math.sin(time * 2 + 1) * 0.15

                trunk1Ref.current.rotation.z = Math.cos(time * 1.5) * 0.05
                trunk2Ref.current.rotation.z = Math.cos(time * 1.5 + 0.5) * 0.08
            }
        }
    })

    // Colors from Reference
    const bodyColor = "#8D5524" // Rich Brown
    const hairColor = "#5D3A1A" // Dark Chocolate Hair

    const tuskColor = "#FFFAF0" // Creamy White

    return (
        <group ref={meshRef} scale={[SCALE, SCALE, SCALE]}>
            {/* BODY: Stout and Rounder */}
            <mesh position={[0, 0.8, 0]} castShadow>
                <boxGeometry args={[1.3, 1.3, 1.6]} />
                <meshStandardMaterial color={bodyColor} roughness={1.0} />
            </mesh>

            {/* BACK HAIR: Hump/Coat */}
            <mesh position={[0, 1.5, 0.1]} castShadow>
                <boxGeometry args={[1.4, 0.6, 1.4]} />
                <meshStandardMaterial color={hairColor} roughness={1.0} />
            </mesh>

            {/* HEAD GROUP */}
            <group ref={headRef} position={[0, 1.3, 1.0]}>
                {/* Face/Skull */}
                <mesh position={[0, 0, 0]} castShadow>
                    <boxGeometry args={[1.0, 1.0, 0.9]} />
                    <meshStandardMaterial color={bodyColor} roughness={0.9} />
                </mesh>

                {/* HEAD HAIR: The "Crown" */}
                <mesh position={[0, 0.6, 0]} castShadow>
                    <boxGeometry args={[1.1, 0.5, 0.8]} />
                    <meshStandardMaterial color={hairColor} roughness={1.0} />
                </mesh>



                {/* EARS: Small and cute */}
                <mesh position={[0.6, 0.1, -0.1]} rotation={[0, -0.3, -0.1]}>
                    <boxGeometry args={[0.1, 0.5, 0.4]} />
                    <meshStandardMaterial color={bodyColor} />
                </mesh>
                <mesh position={[-0.6, 0.1, -0.1]} rotation={[0, 0.3, 0.1]}>
                    <boxGeometry args={[0.1, 0.5, 0.4]} />
                    <meshStandardMaterial color={bodyColor} />
                </mesh>

                {/* --- ARTICULATED TRUNK --- */}
                <group ref={trunk1Ref} position={[0, -0.2, 0.45]}>
                    <mesh position={[0, -0.2, 0]}>
                        <boxGeometry args={[0.3, 0.4, 0.3]} />
                        <meshStandardMaterial color={bodyColor} roughness={0.9} />
                    </mesh>

                    <group ref={trunk2Ref} position={[0, -0.4, 0]}>
                        <mesh position={[0, -0.2, 0]}>
                            <boxGeometry args={[0.25, 0.4, 0.25]} />
                            <meshStandardMaterial color={bodyColor} roughness={0.9} />
                        </mesh>

                        <group ref={trunk3Ref} position={[0, -0.4, 0]}>
                            <mesh position={[0, -0.2, 0]}>
                                <boxGeometry args={[0.18, 0.4, 0.18]} />
                                <meshStandardMaterial color={bodyColor} roughness={0.9} />
                            </mesh>
                        </group>
                    </group>
                </group>

                {/* --- TUSKS: Big, Curved Up --- */}
                {/* Right Tusk */}
                <group position={[0.35, -0.4, 0.4]} rotation={[0, 0.3, 0]}> {/* Angle outward more */}
                    {/* Segment 1: Base (Root) - Pointing Forward and Down */}
                    <mesh position={[0, -0.1, 0.1]} rotation={[-0.4, 0, 0]}> {/* Pointing Up/Back (~-23 deg) */}
                        <cylinderGeometry args={[0.12, 0.09, 0.4]} />
                        <meshStandardMaterial color={tuskColor} />

                        {/* Segment 2: Mid (Curving Up) */}
                        <group position={[0, -0.2, 0]} rotation={[-0.8, 0, 0]}> {/* Sharp turn up */}
                            <mesh position={[0, -0.2, 0]}>
                                <cylinderGeometry args={[0.09, 0.06, 0.5]} />
                                <meshStandardMaterial color={tuskColor} />

                                {/* Segment 3: Tip (Vertical / Back) */}
                                <group position={[0, -0.25, 0]} rotation={[-0.8, 0, 0]}>
                                    <mesh position={[0, -0.2, 0]}>
                                        <cylinderGeometry args={[0.06, 0.01, 0.4]} />
                                        <meshStandardMaterial color={tuskColor} />
                                    </mesh>
                                </group>
                            </mesh>
                        </group>
                    </mesh>
                </group>

                {/* Left Tusk (Mirror) */}
                <group position={[-0.35, -0.4, 0.4]} rotation={[0, -0.3, 0]}>
                    <mesh position={[0, -0.1, 0.1]} rotation={[-0.4, 0, 0]}>
                        <cylinderGeometry args={[0.12, 0.09, 0.4]} />
                        <meshStandardMaterial color={tuskColor} />

                        <group position={[0, -0.2, 0]} rotation={[-0.8, 0, 0]}>
                            <mesh position={[0, -0.2, 0]}>
                                <cylinderGeometry args={[0.09, 0.06, 0.5]} />
                                <meshStandardMaterial color={tuskColor} />

                                <group position={[0, -0.25, 0]} rotation={[-0.8, 0, 0]}>
                                    <mesh position={[0, -0.2, 0]}>
                                        <cylinderGeometry args={[0.06, 0.01, 0.4]} />
                                        <meshStandardMaterial color={tuskColor} />
                                    </mesh>
                                </group>
                            </mesh>
                        </group>
                    </mesh>
                </group>

            </group>

            {/* LEGS: Short and Stubby (Pivoting from Hip area to fix clipping) */}
            <group position={[0, 0.2, 0]}>
                {/* 
                    Leg Logic:
                    Old Pivot (Center): [x, 0, z] inside this group.
                    Old Height: 0.8 (extends +0.4 to -0.4).
                    New Height: 0.4.
                    To keep Pivot Position same (Group at [x,0,z]):
                    To keep Ground Contact same (Bottom at -0.4):
                    New Mesh must extend from 0.0 to -0.4.
                    So Mesh Center is -0.2.
                */}

                {/* Front Left */}
                <group ref={legFL} position={[0.4, 0, 0.5]}>
                    <mesh position={[0, -0.2, 0]}>
                        <boxGeometry args={[0.4, 0.4, 0.4]} />
                        <meshStandardMaterial color={bodyColor} />
                    </mesh>
                </group>

                {/* Front Right */}
                <group ref={legFR} position={[-0.4, 0, 0.5]}>
                    <mesh position={[0, -0.2, 0]}>
                        <boxGeometry args={[0.4, 0.4, 0.4]} />
                        <meshStandardMaterial color={bodyColor} />
                    </mesh>
                </group>

                {/* Back Left */}
                <group ref={legBL} position={[0.4, 0, -0.5]}>
                    <mesh position={[0, -0.2, 0]}>
                        <boxGeometry args={[0.4, 0.4, 0.4]} />
                        <meshStandardMaterial color={bodyColor} />
                    </mesh>
                </group>

                {/* Back Right */}
                <group ref={legBR} position={[-0.4, 0, -0.5]}>
                    <mesh position={[0, -0.2, 0]}>
                        <boxGeometry args={[0.4, 0.4, 0.4]} />
                        <meshStandardMaterial color={bodyColor} />
                    </mesh>
                </group>
            </group>

            {/* TAIL: Tiny and cute */}
            <group position={[0, 1.0, -0.8]} rotation={[0.5, 0, 0]}>
                <mesh position={[0, -0.2, 0]}>
                    <boxGeometry args={[0.1, 0.4, 0.1]} />
                    <meshStandardMaterial color={bodyColor} />
                </mesh>
            </group>

        </group>
    )
}
