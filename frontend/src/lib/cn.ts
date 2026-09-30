import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Conditional class names with Tailwind conflict resolution.
 *
 * `clsx` flattens the conditional forms (arrays, objects, falsy values) and
 * `twMerge` then resolves competing utilities so the LAST one wins — which is
 * what makes a caller-supplied `className` able to override a component
 * default. Without the merge step two `px-*` classes both land in the output
 * and the winner depends on stylesheet order, not on the call site.
 *
 * Both packages were already dependencies; nothing was using them, so every
 * component in the app was hardcoding class strings.
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
