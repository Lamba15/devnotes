import { isValidElement } from 'react';
import type { ReactNode } from 'react';

export function getPageProps<T extends Record<string, unknown>>(
    node: ReactNode,
): Partial<T> {
    if (!isValidElement(node)) {
        return {};
    }

    return (node.props ?? {}) as Partial<T>;
}
