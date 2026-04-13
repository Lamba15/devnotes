import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';

let currentHeaderContent: ReactNode = null;

const listeners = new Set<() => void>();

function emitChange() {
    for (const listener of listeners) {
        listener();
    }
}

export function setCrudPageHeaderContent(nextHeaderContent: ReactNode) {
    if (currentHeaderContent === nextHeaderContent) {
        return;
    }

    currentHeaderContent = nextHeaderContent;
    emitChange();
}

export function useCrudPageHeaderContent() {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);

            return () => {
                listeners.delete(listener);
            };
        },
        () => currentHeaderContent,
        () => null,
    );
}
