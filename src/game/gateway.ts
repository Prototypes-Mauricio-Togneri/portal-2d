import {Portal} from '@/game/portal'

/**
 * The pair of portals. The subject can only travel once both are open.
 */
export class Gateway {
  readonly blue = new Portal() // Opened with the A key
  readonly orange = new Portal() // Opened with the D key

  /**
   * Closes both portals.
   */
  clear(): void {
    this.blue.clear()
    this.orange.clear()
  }

  /**
   * Closes whichever portals are on a tile.
   * @param x - Column
   * @param y - Row
   */
  clearPortalAt(x: number, y: number): void {
    if (this.blue.isIn(x, y)) {
      this.blue.clear()
    }

    if (this.orange.isIn(x, y)) {
      this.orange.clear()
    }
  }
}
