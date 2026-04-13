import { useSyncExternalStore } from 'react';

let currentHeaderSlot: HTMLElement | null = null;

const listeners = new Set<() => void>();

function emitChange() {
    for (const listener of listeners) {
        listener();
    }
}

export function setCrudPageHeaderSlot(nextHeaderSlot: HTMLElement | null) {
    if (currentHeaderSlot === nextHeaderSlot) {
        return;
    }

    currentHeaderSlot = nextHeaderSlot;
    emitChange();
}

export function useCrudPageHeaderSlot() {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);

            return () => {
                listeners.delete(listener);
            };
        },
        () => currentHeaderSlot,
        () => null,
    );
}
