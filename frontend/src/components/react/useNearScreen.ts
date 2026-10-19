import { useEffect, useRef, useState } from "react";

export function useNearScreen<T extends HTMLElement>(options?: IntersectionObserverInit) {
    const ref = useRef<T>(null);
    const [isNearScreen, setIsNearScreen] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => setIsNearScreen(Boolean(entry?.isIntersecting)),
            { rootMargin: "300px", ...options }
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, [options]);

    return { ref, isNearScreen };
}
