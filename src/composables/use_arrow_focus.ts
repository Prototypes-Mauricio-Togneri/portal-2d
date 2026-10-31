/**
 * Left and right arrow keys move keyboard focus along a row of cards.
 */
import {onBeforeUnmount, onMounted} from 'vue'
import type {ShallowRef} from 'vue'

/**
 * While the calling component is mounted, the left and right arrows move focus
 * between the cards inside the container, wrapping around. With no card
 * focused, they start from the first card (right) or the last (left).
 * @param container - Element holding the cards
 * @param cardSelector - CSS selector matching the cards, in visual order
 */
export function useArrowFocus(container: Readonly<ShallowRef<HTMLElement | null>>, cardSelector: string): void {
  /**
   * Lists the cards in visual order.
   * @returns The cards inside the container
   */
  function cards(): HTMLElement[] {
    return Array.from(container.value?.querySelectorAll<HTMLElement>(cardSelector) ?? [])
  }

  /**
   * Moves focus to the card at the given offset from the focused one, wrapping around.
   * @param offset - +1 for next, -1 for previous
   */
  function moveFocus(offset: number): void {
    const allCards = cards()
    if (allCards.length === 0) {
      return
    }
    const currentIndex = allCards.findIndex((card) => card === document.activeElement)
    if (currentIndex === -1) {
      allCards[offset > 0 ? 0 : allCards.length - 1]?.focus()
      return
    }
    const nextIndex = (currentIndex + offset + allCards.length) % allCards.length
    allCards[nextIndex]?.focus()
  }

  /**
   * Left and right arrows move between the cards.
   * @param event - Keyboard event
   */
  function handleKeydown(event: KeyboardEvent): void {
    // With a modifier the arrows are browser shortcuts (Alt+Left goes back), so leave them alone
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return
    }
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        moveFocus(1)
        break
      case 'ArrowLeft':
        event.preventDefault()
        moveFocus(-1)
        break
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
}
