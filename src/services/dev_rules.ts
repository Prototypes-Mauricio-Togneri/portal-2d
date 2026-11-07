/**
 * Development only (stage 01): which rules the chambers play on.
 */
import type {LevelV2} from '@/game/level_v2'

// Asked for by opening the visit's first address with ?rules=v2 (such as
// /chamber/1?rules=v2), and read once, when the app starts, so it lasts for
// the whole visit, through Next chamber and the menu
const v2RulesRequested = import.meta.env.DEV && (new URLSearchParams(window.location.search).get('rules') === 'v2')

/**
 * The level that plays the v2 rules when they were asked for, otherwise
 * null. Loaded only then, so production builds, where it is always null,
 * leave the v2 rules out.
 */
export const v2LevelClass: typeof LevelV2 | null = v2RulesRequested ? (await import('@/game/level_v2')).LevelV2 : null
