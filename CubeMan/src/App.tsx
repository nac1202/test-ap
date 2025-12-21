import { Suspense, useEffect, useState, useMemo } from 'react'
import { getTerrainHeight, isLand } from './utils/worldGen'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { SmoothPlanet } from './components/World/SmoothPlanet'
import { Trees } from './components/World/Trees'
import { Stones } from './components/World/Stones'
import { Cubits } from './components/Entities/Cubits'
import { Mammoth } from './components/Entities/Mammoth'
import { SaberTooth } from './components/Entities/SaberTooth'
import { HUD } from './components/UI/HUD'
import { GodControls } from './components/Interaction/GodControls'
import { useGameStore } from './store/gameStore'
import { BonfireProject } from './components/Buildings/BonfireProject'
import { Whale } from './components/Entities/Whale'


// --- FIRE SHADER COMPONENT ---
const FireShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#ff5500') }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec2 vUv;

    // Simple pseudo-random noise
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }

    void main() {
      // Scrolling noise texture
      vec2 uv = vUv;
      float n = noise(uv * 5.0 + vec2(0.0, -uTime * 4.0));
      float n2 = noise(uv * 8.0 + vec2(0.0, -uTime * 6.0));
      
      // Shape the flame: fade out at top, fade out at sides based on Y
      float shape = 1.0 - uv.y; // Base fade
      shape *= smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x); // Side fade
      
      // Combine noise
      float fire = (n + n2) * 0.5;
      
      // Threshold for transparency (cut out shape)
      float alpha = step(0.4 + uv.y * 0.5, fire * shape * 2.5); 
      
      // Color gradient
      vec3 color = mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), fire);

      gl_FragColor = vec4(color, alpha);
    }
  `
}

const FireMesh = ({ position }: { position: [number, number, number] }) => {
  // Create material once and share it
  const fireMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#ff5500') }
      },
      vertexShader: FireShaderMaterial.vertexShader,
      fragmentShader: FireShaderMaterial.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  }, [])

  // Align to surface normal
  const quaternion = useMemo(() => {
    const up = new THREE.Vector3(...position).normalize()
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up)
    return q
  }, [position])

  useFrame((state) => {
    if (fireMaterial) {
      fireMaterial.uniforms.uTime.value = state.clock.getElapsedTime()
    }
  })

  return (
    <group position={position} quaternion={quaternion}>
      <pointLight intensity={2} distance={8} color="#ff6600" decay={2} />

      {/* 3-Plane Star Fire: Better volume than 2, no billboard issues */}
      <group position={[0, 0.5, 0]}>
        <mesh material={fireMaterial}>
          <planeGeometry args={[1.2, 1.5]} />
        </mesh>
        <mesh rotation={[0, Math.PI / 3, 0]} material={fireMaterial}>
          <planeGeometry args={[1.2, 1.5]} />
        </mesh>
        <mesh rotation={[0, (Math.PI / 3) * 2, 0]} material={fireMaterial}>
          <planeGeometry args={[1.2, 1.5]} />
        </mesh>
      </group>

      {/* Charred wood base */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.3, 0.4, 0.2, 5]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  )
}

function Scene() {
  const { entities, mammoths, saberTooths, fires, addEntity, addMammoth, spawnTree, spawnStone } = useGameStore()

  // Initial spawn
  useEffect(() => {
    // Basic init
    const store = useGameStore.getState()

    console.log("Init Scene. Existing totals:", store.entities.length, store.trees.length)

    // 1. Spawn Entities if empty
    if (store.entities.length === 0) {
      console.log("Spawning Initial Entities")

      const spawnOnLand = () => {
        let attempts = 0
        while (attempts < 100) {
          const vec = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
          const h = getTerrainHeight(vec.x, vec.y, vec.z)
          if (h > 25.8) { // Explicit check or use isLand
            return vec.multiplyScalar(h).toArray()
          }
          attempts++
        }
        return [0, 28, 0] // Fallback
      }

      // Helper to convert Vector3 to tuple
      const vToT = (v: any) => [v[0], v[1], v[2]] as [number, number, number]

      addEntity(vToT(spawnOnLand()))
      addEntity(vToT(spawnOnLand()))
      addMammoth(vToT(spawnOnLand()))
    }

    // 2. Spawn Nature if empty (Trees/Stones)
    if (store.trees.length === 0) {
      console.log("Spawning Initial Trees")
      let count = 0
      let attempts = 0
      while (count < 40 && attempts < 200) {
        attempts++
        const vec = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
        if (isLand(vec.x, vec.y, vec.z)) {
          const h = getTerrainHeight(vec.x, vec.y, vec.z)
          spawnTree([vec.x * h, vec.y * h, vec.z * h])
          count++
        }
      }
    }

    if (store.stones.length === 0) {
      console.log("Spawning Initial Stones")
      let count = 0
      let attempts = 0
      while (count < 20 && attempts < 100) {
        attempts++
        const vec = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
        if (isLand(vec.x, vec.y, vec.z)) {
          const h = getTerrainHeight(vec.x, vec.y, vec.z)
          spawnStone([vec.x * h, vec.y * h, vec.z * h])
          count++
        }
      }
    }

    // 3. Marine Life
    // Fish Removed as per user request

    if (store.whales.length === 0) {
      console.log("Spawning Whales")
      let count = 0
      let attempts = 0
      while (count < 1 && attempts < 500) {
        attempts++
        const vec = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
        if (!isLand(vec.x, vec.y, vec.z)) {
          // Any water is fine for surface swimming
          const depth = 25.3 // JUST below surface (Water Level is 25.5)
          store.addWhale(vec.multiplyScalar(depth).toArray())
          console.log("Whale Spawned at", vec)
          count++
        }
      }
    }
  }, [])

  // Growth Loop
  useEffect(() => {
    const interval = setInterval(() => {
      useGameStore.getState().growTrees()
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[50, 50, 25]}
        intensity={2.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      <Environment preset="park" background={false} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <color attach="background" args={['#111']} />

      <SmoothPlanet />
      <Trees />
      <Stones />

      {entities.map((entity) => (
        <Cubits key={entity.id} entity={entity} />
      ))}

      {mammoths.map((m) => (
        <Mammoth key={m.id} id={m.id} position={m.position} />
      ))}

      {saberTooths.map((st) => (
        <SaberTooth key={st.id} id={st.id} position={st.position} />
      ))}

      {fires.map((f) => (
        <FireMesh key={f.id} position={f.position} />
      ))}

      {/* Marine Life */}
      {/* Fish removed */}
      {useGameStore(state => state.whales).map((w) => (
        <Whale key={w.id} data={w} />
      ))}

      <BonfireProject />

      <OrbitControls makeDefault minDistance={30} maxDistance={80} />
      <GodControls />
    </>
  )
}

export default function App() {
  const { lightningStrike } = useGameStore()
  const [lightningBolt, setLightningBolt] = useState<{ start: { x: number, y: number, z: number }, end: { x: number, y: number, z: number } } | null>(null)

  // Sync Global Strike to Visual
  useEffect(() => {
    if (lightningStrike) {
      setLightningBolt(lightningStrike)
      const t = setTimeout(() => setLightningBolt(null), 150)
      return () => clearTimeout(t)
    }
  }, [lightningStrike])

  return (
    <div className="w-full h-screen bg-black">
      <Canvas
        shadows
        camera={{ position: [0, 40, 40], fov: 45 }}
        onPointerMissed={() => console.log("Missed")}
      >
        <Suspense fallback={null}>
          <Scene />
          {/* Lightning Visual Overlay */}
          {lightningBolt && (
            <mesh>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([
                  lightningBolt.start.x, lightningBolt.start.y, lightningBolt.start.z,
                  lightningBolt.end.x, lightningBolt.end.y, lightningBolt.end.z
                ])} itemSize={3} />
              </bufferGeometry>
              <lineBasicMaterial color="cyan" linewidth={10} />
            </mesh>
          )}
        </Suspense>
      </Canvas>
      <HUD />
    </div>
  )
}
