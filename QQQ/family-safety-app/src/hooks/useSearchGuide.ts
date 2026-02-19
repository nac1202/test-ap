import { useState, useMemo } from 'react';
import { GuideItem } from '@/types/guide';

export const useSearchGuide = (guides: GuideItem[]) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredGuides = useMemo(() => {
        if (!searchTerm) return guides;

        const lowerTerm = searchTerm.toLowerCase();
        return guides.filter(guide =>
            guide.title.toLowerCase().includes(lowerTerm) ||
            guide.description.toLowerCase().includes(lowerTerm) ||
            guide.content.toLowerCase().includes(lowerTerm)
        );
    }, [guides, searchTerm]);

    return {
        searchTerm,
        setSearchTerm,
        filteredGuides
    };
};
