'use client'

import { useCallback, useRef } from 'react';

// Minimize API calls during searching, reducing traffic
export function useDebounce(callback: () => void, delay: number) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    return useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(callback, delay);

    }, [callback, delay])
}