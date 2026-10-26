/**
 * The "Route" component library (UI_REDESIGN_PLAN_V2 §4.8). Import from here:
 *
 *   import { Button, Stamp, RouteLine } from '@/components/ui';
 *
 * Every component, with every variant, is shown on the admin-only /design page.
 * EmptyState, Sheet and the skeletons predate the library and already follow
 * its rules, so they are re-exported rather than rewritten.
 */
export { Button, buttonClass } from './Button';
export type { ButtonKind, ButtonSize, ButtonProps } from './Button';
export { Chip } from './Chip';
export type { ChipTone } from './Chip';
export { Stamp } from './Stamp';
export type { StampKind } from './Stamp';
export { Card } from './Card';
export { SectionHead } from './SectionHead';
export { RouteLine } from './RouteLine';
export type { Station, StationState } from './RouteLine';
export { ProgressRing } from './ProgressRing';
export { StatTile } from './StatTile';
export { Ticket } from './Ticket';
export { Cover, coverPatternFor } from './Cover';
export type { CoverPattern } from './Cover';
export { Avatar, initials } from './Avatar';
export { EmptyState } from '../common/EmptyState';
export { Sheet } from '../common/Sheet';
export { Skeleton, SkeletonText, SkeletonCard } from '../common/Skeleton';
