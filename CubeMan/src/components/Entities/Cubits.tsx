
import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import * as THREE from 'three'
import { useGameStore, type Entity } from '../../store/gameStore'
import { getTerrainHeight, WATER_LEVEL } from '../../utils/worldGen'

interface CubitsProps {
    entity: Entity
}

export const Cubits: React.FC<CubitsProps> = ({ entity }) => {
    const meshRef = useRef<Group>(null)
    const leftArm = useRef<Group>(null)
    const rightArm = useRef<Group>(null)
    const leftLeg = useRef<Group>(null)
    const rightLeg = useRef<Group>(null)
    const head = useRef<Group>(null)

    // Store Access
    // AI Refs
    const aiState = useRef<'IDLE' | 'MOVING' | 'GATHERING' | 'FLEEING' | 'WORSHIPPING' | 'DELIVERING' | 'STUCK' | 'DYING' | 'SITTING' | 'DANCING'>('IDLE')
    const unstuckDir = useRef(new THREE.Vector3())
    const targetPos = useRef<THREE.Vector3 | null>(null)
    const targetType = useRef<'tree' | 'stone' | null>(null)
    const targetId = useRef<string | null>(null)

    // Visual Refs for Carrying
    const woodVisualRef = useRef<THREE.Mesh>(null)
    const stoneVisualRef = useRef<THREE.Mesh>(null)

    // Physics Refs
    const currentPos = useRef(new THREE.Vector3(...entity.position))
    const lastForward = useRef(new THREE.Vector3(0, 0, 1))
    const lastPos = useRef(new THREE.Vector3())
    const stuckTimer = useRef(0)

    // Planet Radius for Gravity
    const PLANET_RADIUS = 26

    // Scale up slightly as requested
    const SCALE = 3.0 // Increased scale

    // Adjusted offset for SURFACE due to larger scale + center of mass
    // Adjusted offset for SURFACE
    const SURFACE_OFFSET = 0.0 // Pivot is at feet now

    useFrame((state, delta) => {
        if (!meshRef.current) return
        const time = state.clock.getElapsedTime()

        // Sync State (Death)
        if (entity.state === 'DYING') {
            aiState.current = 'DYING'
        }

        // --- AI LOGIC (EXISTING) ---
        // 1. Check Threats (Mammoths & SaberTooths)
        const mammoths = useGameStore.getState().mammoths
        const saberTooths = useGameStore.getState().saberTooths

        let nearestThreatDist = Infinity
        let nearestThreatPos: THREE.Vector3 | null = null

        // Check Mammoths
        mammoths.forEach(m => {
            const mPos = new THREE.Vector3(...m.position)
            const dist = currentPos.current.distanceTo(mPos)
            if (dist < nearestThreatDist) {
                nearestThreatDist = dist
                nearestThreatPos = mPos
            }
        })

        // Check SaberTooths (SCARY!)
        saberTooths.forEach(s => {
            const sPos = new THREE.Vector3(...s.position)
            const dist = currentPos.current.distanceTo(sPos)
            if (dist < nearestThreatDist) {
                nearestThreatDist = dist
                nearestThreatPos = sPos
            }
        })

        // Flee Threshold: 10 units (start fleeing sooner)
        if (nearestThreatDist < 10 && nearestThreatPos) {
            aiState.current = 'FLEEING'
            targetPos.current = nearestThreatPos // Run FROM this
        } else if (aiState.current === 'FLEEING' && nearestThreatDist > 20) {
            aiState.current = 'IDLE' // Safe distance increased
            targetPos.current = null
        }

        // 2. Check for Food (Fruit) - Priority over Fire
        const trees = useGameStore.getState().trees
        let nearestFruitDist = Infinity
        let nearestFruitTree: any | null = null

        if (aiState.current !== 'FLEEING') {
            // Priority 0: Delivery (If holding item)
            if (aiState.current === 'DELIVERING' && targetPos.current) {
                // Keep delivering
            }
            else {
                // Check Projects
                const currentProject = useGameStore.getState().currentProject

                // Priority 1: Construction (If project exists and not built)
                if (currentProject && !currentProject.isBuilt) {
                    // Check what we need
                    const needsWood = currentProject.current.wood < currentProject.requirements.wood
                    const needsStone = currentProject.current.stone < currentProject.requirements.stone

                    if (aiState.current === 'IDLE' || aiState.current === 'MOVING') {
                        if (needsWood) {
                            // Find nearest tree
                            let nearestDist = Infinity
                            let nearest: any = null
                            trees.forEach(t => {
                                const dist = currentPos.current.distanceTo(new THREE.Vector3(...t.position))
                                if (dist < nearestDist) { nearestDist = dist; nearest = t }
                            })

                            if (nearest && nearestDist < 30) {
                                aiState.current = 'GATHERING'
                                targetPos.current = new THREE.Vector3(...nearest.position)
                                targetType.current = 'tree'
                                targetId.current = nearest.id
                            }
                        } else if (needsStone) {
                            // Find nearest stone
                            const stones = useGameStore.getState().stones
                            let nearestDist = Infinity
                            let nearest: any = null
                            stones.forEach(s => {
                                const dist = currentPos.current.distanceTo(new THREE.Vector3(...s.position))
                                if (dist < nearestDist) { nearestDist = dist; nearest = s }
                            })

                            if (nearest && nearestDist < 30) {
                                aiState.current = 'GATHERING'
                                targetPos.current = new THREE.Vector3(...nearest.position)
                                targetType.current = 'stone'
                                targetId.current = nearest.id
                            }
                        }
                    }
                }

                // Priority 2: Food (Existing logic, but lower priority if building? Let's keep food high but for now simplistic)
                // If not gathering for build, look for food
                if (aiState.current !== 'GATHERING' && aiState.current !== 'DELIVERING') {
                    trees.forEach(t => {
                        if (t.fruitCount > 0) {
                            const tPos = new THREE.Vector3(...t.position)
                            const dist = currentPos.current.distanceTo(tPos)
                            if (dist < nearestFruitDist) {
                                nearestFruitDist = dist
                                nearestFruitTree = t
                            }
                        }
                    })

                    // Search Range for Fruit: 20 units
                    if (nearestFruitTree && nearestFruitDist < 20) {
                        aiState.current = 'GATHERING'
                        targetPos.current = new THREE.Vector3(...nearestFruitTree.position)
                        targetType.current = 'tree'
                        targetId.current = nearestFruitTree.id
                    }
                }
            }

            // 3. Check Attraction (Fire) - Only if not gathering/delivering
            if (aiState.current !== 'GATHERING' && aiState.current !== 'DELIVERING') {
                const fires = useGameStore.getState().fires
                if (fires.length > 0) {
                    // Simplistic: Just go to first fire
                    const fPos = new THREE.Vector3(...fires[0].position)
                    const dist = currentPos.current.distanceTo(fPos)

                    if (dist < 3) {
                        aiState.current = 'WORSHIPPING'
                        targetPos.current = fPos
                    } else {
                        // Walk to fire
                        aiState.current = 'MOVING'
                        targetPos.current = fPos
                    }
                } else if (aiState.current === 'WORSHIPPING') {
                    aiState.current = 'IDLE' // Fire gone
                }
            }
        }



        // 4. Social & Idle Logic
        if (aiState.current === 'IDLE') {
            // Chance to Sit (0.5%)
            if (Math.random() < 0.005) {
                aiState.current = 'SITTING'
                // Sit for 5-10 seconds
                stuckTimer.current = 5 + Math.random() * 5
            }

            // Check for Dance Partner
            const entities = useGameStore.getState().entities
            for (const e of entities) {
                if (e.id === entity.id) continue

                const ePos = new THREE.Vector3(...e.position)
                if (currentPos.current.distanceTo(ePos) < 2.0) {
                    // Check gender
                    if (e.gender !== entity.gender && (e.state === 'IDLE' || e.state === 'DANCING')) {
                        // DANCE!
                        aiState.current = 'DANCING'
                        stuckTimer.current = 8.0 // Dance for 8s

                        // Force partner to dance too (if not already)
                        if (e.state !== 'DANCING') {
                            useGameStore.getState().updateEntityState(e.id, 'DANCING')
                        }
                        break
                    }
                }
            }
        }

        // Handle SITTING / DANCING timers
        if (aiState.current === 'SITTING' || aiState.current === 'DANCING') {
            stuckTimer.current -= delta
            if (stuckTimer.current <= 0) {
                aiState.current = 'IDLE' // Done
            }
        }

        // Execution
        if (aiState.current === 'IDLE') {
            // Random Wander
            if (Math.random() < 0.01) {
                const randomDir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
                // Pick a target on Sphere surface
                const potentialTarget = currentPos.current.clone().add(randomDir.multiplyScalar(10)).normalize().multiplyScalar(PLANET_RADIUS)

                // Check if target is on Land
                const h = getTerrainHeight(potentialTarget.x, potentialTarget.y, potentialTarget.z)
                if (h > WATER_LEVEL + 0.5) {
                    targetPos.current = potentialTarget
                    targetType.current = null
                    aiState.current = 'MOVING'
                }
            }
        } else if ((aiState.current === 'MOVING' || aiState.current === 'FLEEING' || aiState.current === 'GATHERING' || aiState.current === 'DELIVERING') && targetPos.current) {
            const dist = currentPos.current.distanceTo(targetPos.current)

            // Movement Logic
            const up = currentPos.current.clone().normalize()
            let diff = targetPos.current.clone().sub(currentPos.current)

            // If Fleeing, reverse direction
            if (aiState.current === 'FLEEING') {
                diff.negate()
            }

            const tangent = diff.clone().sub(up.clone().multiplyScalar(diff.dot(up))).normalize()


            // --- MOVEMENT & COLLISION LOGIC ---
            if (tangent.lengthSq() > 0.001) {
                // --- COLLISION AVOIDANCE ---
                const trees = useGameStore.getState().trees
                const stones = useGameStore.getState().stones

                let avoidance = new THREE.Vector3()

                // Repel from Trees
                trees.forEach(t => {
                    if (targetType.current === 'tree' && targetId.current === t.id) return // Don't avoid target

                    const tPos = new THREE.Vector3(...t.position)
                    const dist = currentPos.current.distanceTo(tPos)
                    if (dist < 2.0) { // Increased radius for Scale 3.0
                        const push = currentPos.current.clone().sub(tPos).normalize()
                        // Slide Force: Cross product of push and up
                        const slide = push.clone().cross(up).normalize()

                        // Force Strength
                        avoidance.add(push.multiplyScalar(4.0 * (2.0 - dist)))
                        avoidance.add(slide.multiplyScalar(2.0)) // Constantly slide sideways
                    }
                })

                // Repel from Stones
                stones.forEach(s => {
                    if (targetType.current === 'stone' && targetId.current === s.id) return

                    const sPos = new THREE.Vector3(...s.position)
                    const dist = currentPos.current.distanceTo(sPos)
                    if (dist < 1.5) {
                        const push = currentPos.current.clone().sub(sPos).normalize()
                        const slide = push.clone().cross(up).normalize()
                        avoidance.add(push.multiplyScalar(3.0 * (1.5 - dist)))
                        avoidance.add(slide.multiplyScalar(1.5))
                    }
                })

                // Blend Avoidance
                avoidance.sub(up.clone().multiplyScalar(avoidance.dot(up)))
                tangent.add(avoidance).normalize()

                // --- WATER AVOIDANCE ---
                // Look ahead
                const lookAheadDist = 2.0
                const lookAheadPos = currentPos.current.clone().add(tangent.clone().multiplyScalar(lookAheadDist))
                const hAhead = getTerrainHeight(lookAheadPos.x, lookAheadPos.y, lookAheadPos.z)

                if (hAhead < WATER_LEVEL + 0.5) { // Approaching water margin
                    // Steer towards higher ground
                    const left = tangent.clone().cross(up).normalize()
                    const right = left.clone().negate()

                    const pLeft = currentPos.current.clone().add(left.multiplyScalar(1.0))
                    const pRight = currentPos.current.clone().add(right.multiplyScalar(1.0))

                    const hLeft = getTerrainHeight(pLeft.x, pLeft.y, pLeft.z)
                    const hRight = getTerrainHeight(pRight.x, pRight.y, pRight.z)

                    // Strong push away from water towards higher side
                    const steer = hLeft > hRight ? left : right
                    tangent.add(steer.multiplyScalar(2.0)).normalize()
                }

                lastForward.current.copy(tangent)
            }

            // Speed: Fleeing is faster
            const speed = (aiState.current === 'FLEEING' ? 8.0 : 4.0) * delta
            currentPos.current.add(tangent.multiplyScalar(speed))

            // Stuck Check (Net Progress)
            // Instead of frame-to-frame, check displacement over 1 second
            stuckTimer.current += delta
            if (stuckTimer.current > 1.0) {
                const distSinceLastCheck = currentPos.current.distanceTo(lastPos.current)

                // If moved less than 0.5 units in 1 second -> STUCK
                if (distSinceLastCheck < 0.5) {
                    aiState.current = 'STUCK'
                    unstuckDir.current.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
                }

                // Reset check
                lastPos.current.copy(currentPos.current)
                stuckTimer.current = 0
            }

            if (aiState.current === 'MOVING' && dist < 1.0) {
                aiState.current = 'IDLE'
                targetPos.current = null
            }

        } else if (aiState.current === 'STUCK') {
            // UNSTUCK FORCE LOGIC
            stuckTimer.current += delta

            // Move vigorously in random direction
            const escapeSpeed = 6.0 * delta

            // Ensure we stay on surface
            const up = currentPos.current.clone().normalize()
            const dir = unstuckDir.current.clone()
            dir.sub(up.clone().multiplyScalar(dir.dot(up))).normalize()

            currentPos.current.add(dir.multiplyScalar(escapeSpeed))

            // Jitter for visual feedback
            currentPos.current.x += (Math.random() - 0.5) * 0.1
            currentPos.current.z += (Math.random() - 0.5) * 0.1

            if (stuckTimer.current > 1.0) {
                // Try to resume normal life
                aiState.current = 'IDLE'
                targetPos.current = null
                stuckTimer.current = 0
            }
        }

        // Calculate distance to target if we have one
        const dist = targetPos.current ? currentPos.current.distanceTo(targetPos.current) : Infinity

        // DELIVERY LOGIC
        if (aiState.current === 'DELIVERING' && dist < 2.0) {
            const currentProject = useGameStore.getState().currentProject
            if (currentProject && !currentProject.isBuilt) {
                // Deposit
                // Determine what we were carrying based on targetType ref which we reused or add a new ref?
                // Let's assume targetType holds what we just gathered
                if (targetType.current === 'tree') useGameStore.getState().depositToProject('wood')
                if (targetType.current === 'stone') useGameStore.getState().depositToProject('stone')

                console.log("Cubit delivered resource!")
            }
            aiState.current = 'IDLE'
            targetPos.current = null
            targetType.current = null
        }

        // HARVEST LOGIC
        if (aiState.current === 'GATHERING' && dist < 2.5) {
            // Check if we have a valid target
            if (targetId.current) {
                // If gathering for project
                const currentProject = useGameStore.getState().currentProject
                if (currentProject && !currentProject.isBuilt) {
                    // We gathered it. Now deliver.
                    // Don't actually consume the tree/stone resource count for now (infinite source)
                    // OR consume it. Let's purely simulate gathering for now.

                    aiState.current = 'DELIVERING'
                    targetPos.current = new THREE.Vector3(...currentProject.position)
                    // targetType remains 'tree' or 'stone' so we know what we have
                } else {
                    // Normal Fruit eating
                    if (targetType.current === 'tree') {
                        useGameStore.getState().harvestFruit(targetId.current, 1)
                        console.log("Cubit ate fruit from tree", targetId.current)
                    }
                    aiState.current = 'IDLE'
                    targetPos.current = null
                    targetId.current = null
                }
            }
        }


        // Apply Surface Constraint (Height Map)
        const h = getTerrainHeight(currentPos.current.x, currentPos.current.y, currentPos.current.z)
        // Add SURFACE_OFFSET
        currentPos.current.normalize().multiplyScalar(h + SURFACE_OFFSET)

        // --- APPLY POSITION & ORIENTATION ---
        meshRef.current.position.copy(currentPos.current)

        // Rotation Logic: Explicitly construct Basis
        const quaternion = new THREE.Quaternion()
        const matrix = new THREE.Matrix4()

        // 1. Up Vector (Surface Normal)
        const up = currentPos.current.clone().normalize()

        // 2. Forward Vector (Direction of movement or last known)
        let forward = new THREE.Vector3()
        let hasTarget = false

        if (targetPos.current && (aiState.current === 'MOVING' || aiState.current === 'FLEEING' || aiState.current === 'GATHERING' || aiState.current === 'DELIVERING')) {
            let diff = targetPos.current.clone().sub(currentPos.current)
            if (aiState.current === 'FLEEING') diff.negate()

            // Project diff onto tangent plane to match 'lastForward' nature
            // This ensures 'forward' implies the tangent direction
            diff.sub(up.clone().multiplyScalar(diff.dot(up)))

            if (diff.lengthSq() > 0.01) {
                forward.copy(diff.normalize())
                hasTarget = true
            }
        }

        if (!hasTarget) {
            forward.copy(lastForward.current)
        }

        // Ensure forward is orthogonal to up
        forward.sub(up.clone().multiplyScalar(forward.dot(up))).normalize()

        // Safety: If forward is zero (degenerate), pick a safe axis
        if (forward.lengthSq() < 0.001) {
            if (Math.abs(up.y) < 0.99) forward.set(0, 1, 0)
            else forward.set(1, 0, 0)
            forward.sub(up.clone().multiplyScalar(forward.dot(up))).normalize()
        }

        // 3. Right Vector
        const right = new THREE.Vector3().crossVectors(up, forward).normalize()

        // Recalculate Forward (to ensure strict orthogonality)
        forward.crossVectors(right, up).normalize()

        // Construct Rotation Matrix (X: Right, Y: Up, Z: Forward)
        matrix.makeBasis(right, up, forward)
        quaternion.setFromRotationMatrix(matrix)

        if (aiState.current === 'DYING') {
            // Lie down (rotate -90 deg around local X)
            const lieDown = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
            quaternion.multiply(lieDown)
        }

        // Slerp
        meshRef.current.quaternion.slerp(quaternion, 0.1)

        // --- ANIMATION ---
        const isMoving = aiState.current === 'MOVING' || aiState.current === 'FLEEING' || aiState.current === 'DELIVERING' || aiState.current === 'GATHERING'
        const isDying = aiState.current === 'DYING'
        const walkSpeed = 10
        const armAmp = 0.6

        const isSitting = aiState.current === 'SITTING'
        const isDancing = aiState.current === 'DANCING'

        if (isDying) {
            // BATA BATA! (Flailing)
            const speed = 25
            if (leftArm.current) leftArm.current.rotation.x = Math.sin(time * speed)
            if (rightArm.current) rightArm.current.rotation.x = -Math.sin(time * speed)
            if (leftLeg.current) leftLeg.current.rotation.x = -Math.sin(time * speed)
            if (rightLeg.current) rightLeg.current.rotation.x = Math.sin(time * speed)
        } else if (isSitting) {
            // Sit down (sink Y correctly relative to rotation)
            if (meshRef.current) meshRef.current.translateY(-0.6)

            // Legs forward
            if (leftLeg.current) leftLeg.current.rotation.x = -1.5
            if (rightLeg.current) rightLeg.current.rotation.x = -1.5

            // Arms relaxed
            if (leftArm.current) leftArm.current.rotation.x = -0.5
            if (rightArm.current) rightArm.current.rotation.x = -0.5

        } else if (isDancing) {
            // DANCE PARTY!
            const danceSpeed = 10

            // Spin
            const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), time * 8)
            meshRef.current.quaternion.multiply(spin)

            // Jump
            meshRef.current.position.y += Math.abs(Math.sin(time * danceSpeed)) * 0.4

            // Wave Arms
            if (leftArm.current) {
                leftArm.current.rotation.z = 2.8
                leftArm.current.rotation.x = Math.sin(time * danceSpeed) * 0.5
            }
            if (rightArm.current) {
                rightArm.current.rotation.z = -2.8
                rightArm.current.rotation.x = -Math.sin(time * danceSpeed) * 0.5
            }
            if (leftLeg.current) leftLeg.current.rotation.x = 0
            if (rightLeg.current) rightLeg.current.rotation.x = 0

        } else if (isMoving) {
            const isFleeing = aiState.current === 'FLEEING'
            const currentSpeed = isFleeing ? walkSpeed * 1.5 : walkSpeed
            const currentArmAmp = isFleeing ? 0.3 : armAmp // Smaller amp if hands are up

            if (leftArm.current) {
                if (isFleeing) {
                    // PANIC: Hands up!
                    leftArm.current.rotation.z = 2.5 // Arms up
                    leftArm.current.rotation.x = Math.sin(time * currentSpeed * 2) * 0.3 // Waving
                } else {
                    leftArm.current.rotation.z = 0
                    leftArm.current.rotation.x = Math.sin(time * currentSpeed) * currentArmAmp
                }
            }
            if (rightArm.current) {
                if (isFleeing) {
                    // PANIC: Hands up!
                    rightArm.current.rotation.z = -2.5
                    rightArm.current.rotation.x = -Math.sin(time * currentSpeed * 2) * 0.3
                } else {
                    rightArm.current.rotation.z = 0
                    rightArm.current.rotation.x = -Math.sin(time * currentSpeed) * currentArmAmp
                }
            }

            if (leftLeg.current) leftLeg.current.rotation.x = -Math.sin(time * currentSpeed) * armAmp
            if (rightLeg.current) rightLeg.current.rotation.x = Math.sin(time * currentSpeed) * armAmp
            if (head.current) head.current.position.y = 0.4 + Math.sin(time * currentSpeed * 2) * 0.02
        } else {
            // Reset limbs
            if (leftArm.current) leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, 0, 0.1)
            if (rightArm.current) rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, 0, 0.1)
            if (leftLeg.current) leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, 0, 0.1)
            if (rightLeg.current) rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, 0, 0.1)
            if (head.current) {
                head.current.rotation.x = THREE.MathUtils.lerp(head.current.rotation.x, 0, 0.1)
                head.current.position.y = THREE.MathUtils.lerp(head.current.position.y, 0.4, 0.1)
            }
        }

        // --- CARRYING VISUALS ---
        if (woodVisualRef.current) {
            woodVisualRef.current.visible = aiState.current === 'DELIVERING' && targetType.current === 'tree'
        }
        if (stoneVisualRef.current) {
            stoneVisualRef.current.visible = aiState.current === 'DELIVERING' && targetType.current === 'stone'
        }
    })

    const isMale = entity.gender === 'male'

    // VOXEL COLORS (Tan skin, etc)
    const skinColor = "#ffdbac" // Tan

    // MALE
    const maleHair = "#5D4037" // Dark Brown
    const maleLoinCloth = "#8D6E63" // Brown

    // FEMALE
    const femaleHair = "#D84315" // Red Orange
    const femaleDress = "#A1887F" // Light Brown

    return (
        <group ref={meshRef} scale={[SCALE, SCALE, SCALE]}>
            {/* Voxel Centering Group (Shift up so feet are at 0) */}
            <group position={[0, 0.45, 0]}>

                {/* HEAD GROUP */}
                <group ref={head} position={[0, 0.4, 0]}>
                    <mesh position={[0, 0, 0]} castShadow>
                        <boxGeometry args={[0.3, 0.3, 0.3]} />
                        <meshStandardMaterial color={skinColor} />
                    </mesh>

                    {/* Hair */}
                    {isMale ? (
                        // Male Hair (Short, brown)
                        <group position={[0, 0.16, 0]}>
                            <mesh position={[0, 0, 0]} castShadow>
                                <boxGeometry args={[0.32, 0.1, 0.32]} />
                                <meshStandardMaterial color={maleHair} />
                            </mesh>
                            <mesh position={[0, -0.05, -0.16]}>
                                <boxGeometry args={[0.32, 0.2, 0.05]} />
                                <meshStandardMaterial color={maleHair} />
                            </mesh>
                        </group>
                    ) : (
                        // Female Hair (Orange/Red, Buns or bigger)
                        <group position={[0, 0.16, 0]}>
                            {/* Top */}
                            <mesh position={[0, 0, 0]} castShadow>
                                <boxGeometry args={[0.34, 0.15, 0.34]} />
                                <meshStandardMaterial color={femaleHair} />
                            </mesh>
                            {/* Back */}
                            <mesh position={[0, -0.1, -0.16]}>
                                <boxGeometry args={[0.34, 0.3, 0.1]} />
                                <meshStandardMaterial color={femaleHair} />
                            </mesh>
                            {/* Buns/Side hair */}
                            <mesh position={[0.18, -0.1, 0]}>
                                <boxGeometry args={[0.1, 0.3, 0.3]} />
                                <meshStandardMaterial color={femaleHair} />
                            </mesh>
                            <mesh position={[-0.18, -0.1, 0]}>
                                <boxGeometry args={[0.1, 0.3, 0.3]} />
                                <meshStandardMaterial color={femaleHair} />
                            </mesh>
                            {/* Bone Accessory (White simple cylinder or box) */}
                            <mesh position={[0, 0.1, 0]} rotation={[0, 0, -0.2]}>
                                <boxGeometry args={[0.4, 0.05, 0.05]} />
                                <meshStandardMaterial color="#ffffff" />
                            </mesh>
                        </group>
                    )}

                    {/* Face (Eyes) */}
                    <mesh position={[0.08, 0, 0.16]}>
                        <boxGeometry args={[0.04, 0.04, 0.02]} />
                        <meshStandardMaterial color="black" />
                    </mesh>
                    <mesh position={[-0.08, 0, 0.16]}>
                        <boxGeometry args={[0.04, 0.04, 0.02]} />
                        <meshStandardMaterial color="black" />
                    </mesh>

                    {/* Mouth */}
                    <mesh position={[0, -0.08, 0.16]}>
                        <boxGeometry args={[0.06, 0.02, 0.02]} />
                        <meshStandardMaterial color="#8B4513" />
                    </mesh>
                </group>

                {/* TORSO */}
                <mesh position={[0, 0.05, 0]} castShadow>
                    <boxGeometry args={[0.26, 0.35, 0.2]} />
                    {/* Chest color depends on outfit. Male = Skin, Female = Dress top */}
                    <meshStandardMaterial color={isMale ? skinColor : femaleDress} />
                </mesh>

                {/* CLOTHES DETAILS (Loincloth / Dress) */}
                {isMale ? (
                    // Male Loincloth
                    <mesh position={[0, -0.15, 0]}>
                        <boxGeometry args={[0.28, 0.15, 0.22]} />
                        <meshStandardMaterial color={maleLoinCloth} />
                    </mesh>
                ) : (
                    // Female Dress Texture (Spots?) - Keep simple brown for now with pattern blocks
                    <group position={[0, -0.1, 0.11]}>
                        {/* Just a simple dress bottom extension */}
                    </group>
                )}

                {/* ARMS */}
                <group ref={leftArm} position={[0.18, 0.15, 0]}>
                    <mesh position={[0, -0.12, 0]} castShadow>
                        <boxGeometry args={[0.08, 0.25, 0.08]} />
                        <meshStandardMaterial color={skinColor} />
                    </mesh>
                    {/* Club for Male */}
                    {isMale && (
                        <group position={[0, -0.25, 0.1]} rotation={[0.5, 0, 0]}>
                            <mesh position={[0, 0, 0]}>
                                <boxGeometry args={[0.08, 0.3, 0.08]} />
                                <meshStandardMaterial color="#5D4037" />
                            </mesh>
                            <mesh position={[0, 0.15, 0]}>
                                <boxGeometry args={[0.12, 0.15, 0.12]} />
                                <meshStandardMaterial color="#5D4037" />
                            </mesh>
                        </group>
                    )}
                </group>
                <group ref={rightArm} position={[-0.18, 0.15, 0]}>
                    <mesh position={[0, -0.12, 0]} castShadow>
                        <boxGeometry args={[0.08, 0.25, 0.08]} />
                        <meshStandardMaterial color={skinColor} />
                    </mesh>
                </group>

                {/* LEGS */}
                <group ref={leftLeg} position={[0.08, -0.15, 0]}>
                    <mesh position={[0, -0.15, 0]} castShadow>
                        <boxGeometry args={[0.1, 0.3, 0.1]} />
                        <meshStandardMaterial color={skinColor} />
                    </mesh>
                </group>
                <group ref={rightLeg} position={[-0.08, -0.15, 0]}>
                    <mesh position={[0, -0.15, 0]} castShadow>
                        <boxGeometry args={[0.1, 0.3, 0.1]} />
                        <meshStandardMaterial color={skinColor} />
                    </mesh>
                </group>
            </group>

            {/* Carried Items (Overhead) */}
            <mesh ref={woodVisualRef} position={[0, 1.2, 0]} rotation={[0, 0, 1.57]} visible={false}>
                <cylinderGeometry args={[0.08, 0.08, 0.6, 6]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>

            <mesh ref={stoneVisualRef} position={[0, 1.2, 0]} visible={false}>
                <dodecahedronGeometry args={[0.2, 0]} />
                <meshStandardMaterial color="#888888" />
            </mesh>
        </group>
    )
}


