import { useState, useEffect } from 'react';
import { Shelter } from '@/types/shelter';

const STORAGE_KEY = 'kizuna_shelters';

export function useShelterList() {
    const [shelters, setShelters] = useState<Shelter[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                // eslint-disable-next-line
                setShelters(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse shelter data', e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Save to local storage whenever shelters change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(shelters));
        }
    }, [shelters, isLoaded]);

    const addShelter = (shelter: Omit<Shelter, 'id' | 'createdAt'>) => {
        const newShelter: Shelter = {
            ...shelter,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
        };
        setShelters(prev => [newShelter, ...prev]);
    };

    const removeShelter = (id: string) => {
        setShelters(prev => prev.filter(s => s.id !== id));
    };

    const updateShelter = (id: string, updates: Partial<Omit<Shelter, 'id' | 'createdAt'>>) => {
        setShelters(prev => prev.map(s =>
            s.id === id ? { ...s, ...updates } : s
        ));
    };

    return {
        shelters,
        isLoaded,
        addShelter,
        removeShelter,
        updateShelter
    };
}
