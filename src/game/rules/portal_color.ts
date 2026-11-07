/**
 * One of the two portals: the one the blue key shoots, or the orange.
 */
export type PortalColor = 'blue' | 'orange'

/**
 * Named values of PortalColor.
 */
export const PortalColor = {
  BLUE: 'blue',
  ORANGE: 'orange',
} as const

/** Both portals, in the order the rules look at them */
export const PORTAL_COLORS: readonly PortalColor[] = [
  PortalColor.BLUE,
  PortalColor.ORANGE,
]
