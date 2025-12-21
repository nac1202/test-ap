import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import * as THREE from 'three'
import { useGameStore } from '../../store/gameStore'
import { getTerrainHeight, WATER_LEVEL } from '../../utils/worldGen'

interface SaberToothProps {
    id: string
    position: [number, number, number]
}

export const SaberTooth: React.FC<SaberToothProps> = ({ position }) => {
    const meshRef = useRef<Group>(null)

    // Joint Refs for Animation
    const legFL = useRef<Group>(null)
    const legFR = useRef<Group>(null)
    const legBL = useRef<Group>(null)
    const legBR = useRef<Group>(null)
    const tailRef = useRef<Group>(null)
    const headRef = useRef<Group>(null)
    const jawRef = useRef<Group>(null)

    // Access Global Store
    const entities = useGameStore(state => state.entities)
    const removeEntity = useGameStore(state => state.removeEntity)
    const updateEntityState = useGameStore(state => state.updateEntityState)

    // State
    const currentPos = useRef(new THREE.Vector3(...position))
    const currentHeading = useRef(new THREE.Vector3(1, 0, 0))
    const targetHeading = useRef(new THREE.Vector3(1, 0, 0))

    // AI State
    const aiState = useRef<'WANDER' | 'CHASE' | 'ATTACK'>('WANDER')
    const targetId = useRef<string | null>(null)
    const attackTimer = useRef(0)
    const detectionTimer = useRef(0)

    const SCALE = 2.0
    const SURFACE_OFFSET = 0.5
    const DETECTION_RADIUS = 25.0 // Increased range
    const ATTACK_RANGE = 2.5
    const RUN_SPEED_WANDER = 3.0
    const RUN_SPEED_CHASE = 14.0 // SUPER FAST!

    useFrame((state, delta) => {
        if (!meshRef.current) return
        const time = state.clock.getElapsedTime()
        const up = currentPos.current.clone().normalize()
        let speed = RUN_SPEED_WANDER
        let isRunning = true

        // --- AI LOGIC ---

        // 1. WANDER
        if (aiState.current === 'WANDER') {
            // Random direction change
            if (Math.random() < 0.02) {
                const randDir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
                // Check if this direction leads to water?
                // Hard to check "direction to water" without lookahead, but we do lookahead in physics step.
                // Just set heading.
                targetHeading.current = randDir
            }

            // Look for food
            detectionTimer.current += delta
            if (detectionTimer.current > 0.5) { // check every 0.5s
                detectionTimer.current = 0
                let nearest = null;
                let minDst = DETECTION_RADIUS;
                const myPos = currentPos.current;

                for (const e of entities) { // entities are Cubits
                    const ePos = new THREE.Vector3(...e.position)
                    const dst = myPos.distanceTo(ePos)
                    if (dst < minDst) {
                        minDst = dst
                        nearest = e
                    }
                }

                if (nearest) {
                    aiState.current = 'CHASE'
                    targetId.current = nearest.id
                    console.log("SaberTooth detected prey!", nearest.id)
                }
            }
        }

        // 2. CHASE
        else if (aiState.current === 'CHASE') {
            const target = entities.find(e => e.id === targetId.current)
            if (!target) {
                // Lost target
                aiState.current = 'WANDER'
                targetId.current = null
            } else {
                speed = RUN_SPEED_CHASE
                const targetPos = new THREE.Vector3(...target.position)
                const dist = currentPos.current.distanceTo(targetPos)

                // Move towards target
                const dirToTarget = targetPos.clone().sub(currentPos.current).normalize()

                // Project 'dirToTarget' onto surface tangent to ensure we stay on sphere
                // Tangent direction = dirToTarget - up * (dirToTarget . up)
                targetHeading.current = dirToTarget.sub(up.clone().multiplyScalar(dirToTarget.dot(up))).normalize()

                if (dist < ATTACK_RANGE) {
                    aiState.current = 'ATTACK'
                    attackTimer.current = 2.0 // Animation duration (slightly longer for dying anim)

                    // TRIGGER DYING ANIMATION
                    updateEntityState(target.id, 'DYING')
                    console.log("CHOMP! Target dying...")
                }
            }
        }

        // 3. ATTACK (Pausing/Eating)
        else if (aiState.current === 'ATTACK') {
            speed = 0
            isRunning = false
            attackTimer.current -= delta
            if (attackTimer.current <= 0) {
                // FINISH KILL
                if (targetId.current) {
                    removeEntity(targetId.current)
                    console.log("Target consumed.")
                }

                aiState.current = 'WANDER'
                targetId.current = null
            }
        }


        // --- Movement Physics (Sphere Constrained) ---
        if (speed > 0) {
            let desiredDir = targetHeading.current.clone()
            // Make sure heading is perpendicular to UP
            desiredDir.sub(up.clone().multiplyScalar(desiredDir.dot(up))).normalize()

            let actualDir = currentHeading.current.clone()

            // Turn smoothly
            const turnRate = aiState.current === 'CHASE' ? 8.0 : 2.0
            const angle = actualDir.angleTo(desiredDir)
            if (angle > 0.001) {
                const step = Math.min(1, (turnRate * delta) / angle)
                actualDir.lerp(desiredDir, step).normalize()
            }
            // Re-orthogonalize to be safe
            actualDir.sub(up.clone().multiplyScalar(actualDir.dot(up))).normalize()

            // --- WATER AVOIDANCE (SaberTooth) ---
            // Look ahead
            const lookAheadDist = 4.0 // Faster, look further
            const lookAheadPos = currentPos.current.clone().add(actualDir.clone().multiplyScalar(lookAheadDist))
            const hAhead = getTerrainHeight(lookAheadPos.x, lookAheadPos.y, lookAheadPos.z)

            if (hAhead < WATER_LEVEL + 0.5) {
                // Steer towards higher ground
                const left = actualDir.clone().cross(up).normalize()
                const right = left.clone().negate()

                const pLeft = currentPos.current.clone().add(left.multiplyScalar(2.0))
                const pRight = currentPos.current.clone().add(right.multiplyScalar(2.0))

                const hLeft = getTerrainHeight(pLeft.x, pLeft.y, pLeft.z)
                const hRight = getTerrainHeight(pRight.x, pRight.y, pRight.z)

                const steer = hLeft > hRight ? left : right
                // Hard turn
                actualDir.add(steer.multiplyScalar(1.0)).normalize()
            }

            currentHeading.current = actualDir

            const moveVec = currentHeading.current.clone().multiplyScalar(speed * delta)
            currentPos.current.add(moveVec)

            // Apply Surface Constraint (Height Map)
            const h = getTerrainHeight(currentPos.current.x, currentPos.current.y, currentPos.current.z)
            currentPos.current.normalize().multiplyScalar(h + SURFACE_OFFSET)
        }

        meshRef.current.position.copy(currentPos.current)
        meshRef.current.up.copy(up)
        meshRef.current.lookAt(currentPos.current.clone().add(currentHeading.current))

        // --- Animation ---
        if (legFL.current && legFR.current && legBL.current && legBR.current && tailRef.current && headRef.current && jawRef.current) {
            if (isRunning) {
                // Gait
                const animSpeed = speed * 2.0
                const legAmp = 0.5
                legFL.current.rotation.x = Math.sin(time * animSpeed) * legAmp
                legFR.current.rotation.x = Math.sin(time * animSpeed + Math.PI) * legAmp
                legBL.current.rotation.x = Math.sin(time * animSpeed + Math.PI * 0.5) * legAmp
                legBR.current.rotation.x = Math.sin(time * animSpeed + Math.PI * 1.5) * legAmp

                headRef.current.rotation.x = Math.sin(time * animSpeed * 2) * 0.05
            } else {
                // Idle / Attack
                legFL.current.rotation.x = 0
                legFR.current.rotation.x = 0
                legBL.current.rotation.x = 0
                legBR.current.rotation.x = 0

                // Chomp animation
                if (aiState.current === 'ATTACK') {
                    // Dramatic chomp
                    const bite = Math.sin(time * 20) * 0.5 + 0.5
                    jawRef.current.rotation.x = bite
                    headRef.current.rotation.x = 0.2
                }
            }

            // Tail always moves a bit
            tailRef.current.rotation.y = Math.sin(time * 5) * 0.3
            tailRef.current.rotation.z = -0.5 + Math.cos(time * 3) * 0.1
        }
    })

    // Colors
    const furColor = "#D68D42" // Tawny Orange
    const bellyColor = "#E8C39E" // Lighter belly
    const fangColor = "#FFFFF0" // Ivory

    return (
        <group ref={meshRef} scale={[SCALE, SCALE, SCALE]}>
            {/* Body: Sleek and muscular */}
            <mesh position={[0, 0.6, 0]} castShadow>
                <boxGeometry args={[0.5, 0.6, 1.2]} />
                <meshStandardMaterial color={furColor} />
            </mesh>

            {/* Belly/Chest (lighter) */}
            <mesh position={[0, 0.35, 0.1]}>
                <boxGeometry args={[0.48, 0.4, 1.1]} />
                <meshStandardMaterial color={bellyColor} />
            </mesh>

            {/* Head Group */}
            <group ref={headRef} position={[0, 0.9, 0.7]}>
                {/* Main Skull */}
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[0.45, 0.4, 0.5]} />
                    <meshStandardMaterial color={furColor} />
                </mesh>

                {/* Ears */}
                <mesh position={[0.18, 0.25, -0.1]}>
                    <boxGeometry args={[0.1, 0.15, 0.05]} />
                    <meshStandardMaterial color={furColor} />
                </mesh>
                <mesh position={[-0.18, 0.25, -0.1]}>
                    <boxGeometry args={[0.1, 0.15, 0.05]} />
                    <meshStandardMaterial color={furColor} />
                </mesh>

                {/* Snout */}
                <mesh position={[0, -0.05, 0.3]}>
                    <boxGeometry args={[0.3, 0.25, 0.3]} />
                    <meshStandardMaterial color={bellyColor} />
                </mesh>

                {/* THE SABER FANGS */}
                <group position={[0, -0.1, 0.4]}>
                    {/* Left Fang */}
                    <mesh position={[0.1, -0.2, 0]} rotation={[0.2, 0, 0]}>
                        <coneGeometry args={[0.04, 0.5, 8]} />
                        <meshStandardMaterial color={fangColor} roughness={0.4} />
                    </mesh>
                    {/* Right Fang */}
                    <mesh position={[-0.1, -0.2, 0]} rotation={[0.2, 0, 0]}>
                        <coneGeometry args={[0.04, 0.5, 8]} />
                        <meshStandardMaterial color={fangColor} roughness={0.4} />
                    </mesh>
                </group>

                {/* Lower Jaw (for subtle movement) */}
                <group ref={jawRef} position={[0, -0.2, 0.1]}>
                    <mesh position={[0, 0, 0.1]}>
                        <boxGeometry args={[0.25, 0.1, 0.3]} />
                        <meshStandardMaterial color={bellyColor} />
                    </mesh>
                </group>
            </group>

            {/* Legs */}
            <group position={[0, 0.4, 0]}>
                {/* Front Left */}
                <group ref={legFL} position={[0.25, 0, 0.4]}>
                    <mesh position={[0, -0.3, 0]}>
                        <boxGeometry args={[0.15, 0.6, 0.15]} />
                        <meshStandardMaterial color={furColor} />
                    </mesh>
                </group>
                {/* Front Right */}
                <group ref={legFR} position={[-0.25, 0, 0.4]}>
                    <mesh position={[0, -0.3, 0]}>
                        <boxGeometry args={[0.15, 0.6, 0.15]} />
                        <meshStandardMaterial color={furColor} />
                    </mesh>
                </group>
                {/* Back Left */}
                <group ref={legBL} position={[0.25, 0, -0.4]}>
                    <mesh position={[0, -0.3, 0]}>
                        <boxGeometry args={[0.15, 0.6, 0.15]} />
                        <meshStandardMaterial color={furColor} />
                    </mesh>
                </group>
                {/* Back Right */}
                <group ref={legBR} position={[-0.25, 0, -0.4]}>
                    <mesh position={[0, -0.3, 0]}>
                        <boxGeometry args={[0.15, 0.6, 0.15]} />
                        <meshStandardMaterial color={furColor} />
                    </mesh>
                </group>
            </group>

            {/* Tail */}
            <group ref={tailRef} position={[0, 0.7, -0.6]} rotation={[-0.5, 0, 0]}>
                <mesh position={[0, 0, -0.3]}>
                    <boxGeometry args={[0.1, 0.1, 0.8]} />
                    <meshStandardMaterial color={furColor} />
                </mesh>
                <mesh position={[0, 0, -0.7]}>
                    <boxGeometry args={[0.15, 0.15, 0.2]} /> {/* Tuft */}
                    <meshStandardMaterial color="#3D2B1F" /> {/* Dark Tip */}
                </mesh>
            </group>

        </group>
    )
}
