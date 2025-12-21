
import React from 'react'
import { useGameStore, type GodPower } from '../../store/gameStore'

export const HUD: React.FC = () => {
    const { resources, godPower, setGodPower, entities } = useGameStore()

    const powers: GodPower[] = ['none', 'place_bonfire', 'spawn_tree', 'spawn_stone', 'lightning']

    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none" style={{ pointerEvents: 'none' }}>
            {/* Info Box */}
            <div className="absolute top-4 left-4 bg-black/60 text-white p-3 md:p-4 rounded-xl pointer-events-auto backdrop-blur-md shadow-lg border border-white/20 scale-90 md:scale-100 origin-top-left">
                <h2 className="text-lg md:text-xl font-bold mb-2 text-yellow-400">Sphere World</h2>
                <div className="space-y-1 text-xs md:text-sm font-mono">
                    <div className="flex justify-between w-28 md:w-32"><span>Population:</span> <span>{entities.length}</span></div>
                    <div className="h-px bg-white/20 my-2"></div>
                    <div className="flex justify-between w-28 md:w-32"><span>🪵 Wood:</span> <span>{resources.wood}</span></div>
                    <div className="flex justify-between w-28 md:w-32"><span>🪨 Stone:</span> <span>{resources.stone}</span></div>
                    <div className="flex justify-between w-28 md:w-32"><span>🍖 Food:</span> <span>{resources.food}</span></div>
                </div>
            </div>

            {/* God Powers Toolbar */}
            <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 w-[95%] md:w-auto bg-white/90 p-2 rounded-2xl flex flex-wrap justify-center gap-2 pointer-events-auto shadow-2xl border border-white/50 backdrop-blur-md">
                {powers.map((p) => (
                    <button
                        key={p}
                        onClick={() => setGodPower(p)}
                        className={`px-4 py-2 md:px-6 md:py-3 text-sm md:text-base rounded-xl font-bold transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap ${godPower === p
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {
                            p === 'none' ? '✋ Hand' :
                                p === 'place_bonfire' ? '🔥 Bonfire' :
                                    p === 'spawn_tree' ? '🌲 Tree' :
                                        p === 'spawn_stone' ? '🪨 Stone' : '⚡ Smite'
                        }
                    </button>
                ))}
            </div>
        </div>
    )
}

