    })

return (
    <group ref={meshRef} scale={[SCALE, SCALE, SCALE]}>
        {/* Pivot Debug */}
        <axesHelper args={[1]} />
        <group position={[0, 0.45, 0]}>
            {/* Visuals were deleted, need to restore them properly? No, I deleted the DUPLICATE visuals. The original visuals should be abobe useFrame? Wait. */}
        </group>
    </group>
)
}
