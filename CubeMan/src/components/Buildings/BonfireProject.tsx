import React from 'react'
import { Html } from '@react-three/drei'
import { useGameStore } from '../../store/gameStore'

export const BonfireProject: React.FC = () => {
    const project = useGameStore(state => state.currentProject)

    if (!project || project.isBuilt) return null

    const remainingWood = project.requirements.wood - project.current.wood
    const remainingStone = project.requirements.stone - project.current.stone

    // Calculate visual progress (0 to 1)
    const totalReq = project.requirements.wood + project.requirements.stone
    const totalCur = project.current.wood + project.current.stone
    const progress = totalCur / totalReq

    return (
        <group position={project.position}>
            {/* Foundation / Blueprint Marker */}
            <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1.5, 1.8, 32]} />
                <meshBasicMaterial color="#FFD700" opacity={0.5} transparent />
            </mesh>

            {/* Progress Label */}
            <Html position={[0, 2.5, 0]} center>
                <div style={{
                    color: 'white',
                    background: 'rgba(0,0,0,0.6)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap'
                }}>
                    构建中... {(progress * 100).toFixed(0)}%<br />
                    木: {project.current.wood}/{project.requirements.wood}<br />
                    石: {project.current.stone}/{project.requirements.stone}
                </div>
            </Html>

            {/* Visual Pile of Resources */}
            {/* Log Pile */}
            {Array.from({ length: project.current.wood }).map((_, i) => (
                <mesh key={`log-${i}`} position={[(i % 3) * 0.4 - 0.4, 0.2 + Math.floor(i / 3) * 0.2, (i % 2) * 0.2]} rotation={[0, 0, 1.57]}>
                    <cylinderGeometry args={[0.1, 0.1, 1, 6]} />
                    <meshStandardMaterial color="#8B4513" />
                </mesh>
            ))}

            {/* Stone Pile */}
            {Array.from({ length: project.current.stone }).map((_, i) => (
                <mesh key={`stone-${i}`} position={[(i % 3) * 0.5 + 0.5, 0.2, (i % 2) * 0.4]}>
                    <dodecahedronGeometry args={[0.3, 0]} />
                    <meshStandardMaterial color="#888888" />
                </mesh>
            ))}

            {/* Ghost of Fire (Construction Target) */}
            <mesh position={[0, 1, 0]} scale={[0.5, 0.5, 0.5]}>
                <dodecahedronGeometry args={[0.5, 0]} />
                <meshBasicMaterial color="orange" wireframe opacity={0.2} transparent />
            </mesh>
        </group>
    )
}
