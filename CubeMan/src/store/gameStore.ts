import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

console.log("GAME STORE MODULE LOADED - " + Math.random())

export type ResourceType = 'wood' | 'food' | 'stone'
export type GodPower = 'none' | 'spawn_tree' | 'spawn_stone' | 'lightning' | 'place_bonfire'

export type EntityState = 'IDLE' | 'MOVING' | 'GATHERING' | 'FLEEING' | 'WORSHIPPING' | 'DELIVERING' | 'DYING' | 'SITTING' | 'DANCING'

export interface Entity {
  id: string
  position: [number, number, number]
  state: EntityState
  target: string | null
  inventory: { type: ResourceType; amount: number } | null
  gender: 'male' | 'female'
}

export interface Mammoth {
  id: string
  position: [number, number, number]
  target: string | null // Target Cubit ID to chase
}

export interface SaberTooth {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  state: 'WANDER' | 'CHASE' | 'ATTACK' | 'IDLE'
}

export interface Fire {
  id: string
  position: [number, number, number]
  fuel: number // Decays over time?
}

export interface ConstructionProject {
  id: string
  type: 'bonfire'
  position: [number, number, number]
  isBuilt: boolean
  requirements: { wood: number; stone: number }
  current: { wood: number; stone: number }
}

export interface GameState {
  resources: {
    wood: number
    food: number
    stone: number
  }
  entities: Entity[]
  trees: { id: string; position: [number, number, number]; type: 'tree' | 'trunk', health: number, growth: number, fruitCount: number }[]
  stones: { id: string; position: [number, number, number] }[]
  mammoths: Mammoth[]
  saberTooths: SaberTooth[]
  fires: Fire[]

  godPower: GodPower
  setGodPower: (power: GodPower) => void
  addResource: (type: ResourceType, amount: number) => void

  addEntity: (position: [number, number, number]) => void
  removeEntity: (id: string) => void
  updateEntityState: (id: string, state: EntityState) => void

  // World Object Actions
  spawnTree: (position: [number, number, number]) => void
  growTrees: () => void
  harvestFruit: (id: string, amount: number) => void
  spawnStone: (position: [number, number, number]) => void
  removeTree: (id: string) => void
  damageTree: (id: string) => void
  removeStone: (id: string) => void

  addMammoth: (position: [number, number, number]) => void
  removeMammoth: (id: string) => void
  addSaberTooth: (position: [number, number, number]) => void
  removeSaberTooth: (id: string) => void
  addFire: (position: [number, number, number]) => void

  lightningStrike: { start: { x: number, y: number, z: number }, end: { x: number, y: number, z: number } } | null
  setLightningStrike: (start: { x: number, y: number, z: number }, end: { x: number, y: number, z: number }) => void

  currentProject: ConstructionProject | null
  startProject: (type: 'bonfire', position: [number, number, number]) => void
  depositToProject: (resource: 'wood' | 'stone') => void
}

export const useGameStore = create<GameState>((set) => ({
  resources: { wood: 0, food: 0, stone: 0 },
  entities: [],
  trees: [],
  stones: [],
  mammoths: [],
  saberTooths: [],
  fires: [],
  godPower: 'none',

  setGodPower: (power) => {
    console.log("Store: setGodPower called with", power)
    set({ godPower: power })
  },

  addResource: (type, amount) =>
    set((state) => ({
      resources: { ...state.resources, [type]: state.resources[type] + amount },
    })),

  addEntity: (position) =>
    set((state) => ({
      entities: [
        ...state.entities,
        {
          id: uuidv4(),
          position,
          state: 'IDLE',
          target: null,
          inventory: null,
          gender: Math.random() > 0.5 ? 'male' : 'female',
        },
      ],
    })),

  removeEntity: (id) =>
    set((state) => ({
      entities: state.entities.filter((e) => e.id !== id),
    })),

  updateEntityState: (id, newState) =>
    set((state) => ({
      entities: state.entities.map(e => e.id === id ? { ...e, state: newState } : e)
    })),

  spawnTree: (pos) =>
    set((state) => ({
      trees: [...state.trees, { id: uuidv4(), position: pos, type: 'tree', health: 3, growth: 0, fruitCount: 0 }]
    })),

  growTrees: () =>
    set((state) => ({
      trees: state.trees.map((t) => {
        let newGrowth = t.growth + (Math.random() * 2) // Random growth
        if (newGrowth > 100) newGrowth = 100

        let newFruitCount = t.fruitCount
        // If Large tree (growth > 70) and has space for fruit, chance to spawn fruit
        if (newGrowth > 70 && newFruitCount < 5 && Math.random() < 0.05) {
          newFruitCount++
        }

        return { ...t, growth: newGrowth, fruitCount: newFruitCount }
      })
    })),

  harvestFruit: (id, amount) =>
    set((state) => ({
      resources: { ...state.resources, food: state.resources.food + amount * 10 }, // Fruit gives food
      trees: state.trees.map((t) => {
        if (t.id === id) {
          return { ...t, fruitCount: Math.max(0, t.fruitCount - amount) }
        }
        return t
      })
    })),

  spawnStone: (pos) =>
    set((state) => ({
      stones: [...state.stones, { id: uuidv4(), position: pos }]
    })),

  addMammoth: (pos) =>
    set((state) => ({
      mammoths: [...state.mammoths, { id: uuidv4(), position: pos, target: null }]
    })),

  addFire: (pos) =>
    set((state) => ({
      fires: [...state.fires, { id: uuidv4(), position: pos, fuel: 100 }]
    })),

  removeTree: (id) =>
    set((state) => ({
      trees: state.trees.filter((t) => t.id !== id)
    })),

  damageTree: (id) =>
    set((state) => {
      const newTrees = state.trees.map(t => {
        if (t.id === id) {
          return { ...t, health: t.health - 1 }
        }
        return t
      }).filter(t => t.health > 0)
      return { trees: newTrees }
    }),

  removeStone: (id) =>
    set((state) => ({
      stones: state.stones.filter((s) => s.id !== id)
    })),

  removeMammoth: (id) =>
    set((state) => ({
      mammoths: state.mammoths.filter((m) => m.id !== id),
    })),

  addSaberTooth: (position) =>
    set((state) => ({
      saberTooths: [
        ...state.saberTooths,
        {
          id: uuidv4(),
          position,
          rotation: [0, 0, 0],
          state: 'WANDER',
        },
      ],
    })),

  removeSaberTooth: (id) =>
    set((state) => ({
      saberTooths: state.saberTooths.filter((s) => s.id !== id),
    })),

  // Visual Effects State
  lightningStrike: null,
  setLightningStrike: (start, end) => set({ lightningStrike: { start, end } }),

  // Construction Projects
  currentProject: null,
  startProject: (type, position) => set({
    currentProject: {
      id: uuidv4(),
      type,
      position,
      isBuilt: false,
      requirements: { wood: 5, stone: 3 }, // Fixed cost for Bonfire
      current: { wood: 0, stone: 0 }
    }
  }),
  depositToProject: (resource) => set((state) => {
    if (!state.currentProject) return state;

    const newCurrent = { ...state.currentProject.current };
    if (resource === 'wood' && newCurrent.wood < state.currentProject.requirements.wood) {
      newCurrent.wood++;
    } else if (resource === 'stone' && newCurrent.stone < state.currentProject.requirements.stone) {
      newCurrent.stone++;
    }

    // Check Completion
    const isComplete =
      newCurrent.wood >= state.currentProject.requirements.wood &&
      newCurrent.stone >= state.currentProject.requirements.stone;

    // If complete, add a real Fire entity
    if (isComplete && !state.currentProject.isBuilt) {
      return {
        currentProject: { ...state.currentProject, current: newCurrent, isBuilt: true },
        fires: [...state.fires, { id: uuidv4(), position: state.currentProject.position, fuel: 100 }]
      }
    }

    return {
      currentProject: { ...state.currentProject, current: newCurrent }
    }
  })
}))
