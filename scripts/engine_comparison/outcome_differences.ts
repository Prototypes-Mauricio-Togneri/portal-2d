import type {ComparedOutcome, ComparedView} from '@scripts/engine_comparison/compared_run'

/** Every field of a view, in the order differences are listed */
const VIEW_FIELDS: readonly (keyof ComparedView)[] = [
  'subject',
  'bluePortal',
  'orangePortal',
  'boxes',
  'buttons',
  'barriers',
  'ditches',
  'doors',
  'fizzlers',
  'lasers',
  'exit',
  'chamberCompleted',
]

/**
 * Lists where two values of one view field differ: entry by entry for a
 * list, whole otherwise.
 * @param field - The field's name
 * @param classicValue - Today's value
 * @param v2Value - The v2 value
 * @returns One line per difference, naming both values
 */
function describeFieldDifferences(field: string, classicValue: unknown, v2Value: unknown): string[] {
  if (Array.isArray(classicValue) && Array.isArray(v2Value)) {
    const classicItems: readonly unknown[] = classicValue
    const v2Items: readonly unknown[] = v2Value
    const result: string[] = []

    for (let i = 0; i < Math.max(classicItems.length, v2Items.length); i++) {
      result.push(...describeFieldDifferences(`${field}[${i}]`, classicItems[i], v2Items[i]))
    }

    return result
  }

  const classicText = JSON.stringify(classicValue)
  const v2Text = JSON.stringify(v2Value)

  return (classicText === v2Text) ? [] : [`${field}: classic ${classicText}, v2 ${v2Text}`]
}

/**
 * Lists everything two outcomes of the same step differ in: the error, the
 * events and every field of the state.
 * @param classic - What today's rules did
 * @param v2 - What the v2 rules did
 * @returns One line per difference, empty when the outcomes agree
 */
export function describeOutcomeDifferences(classic: ComparedOutcome, v2: ComparedOutcome): string[] {
  const result: string[] = []

  if (classic.error !== v2.error) {
    result.push(`error: classic ${JSON.stringify(classic.error)}, v2 ${JSON.stringify(v2.error)}`)
  }

  const classicEvents = classic.events.join(', ')
  const v2Events = v2.events.join(', ')

  if (classicEvents !== v2Events) {
    result.push(`events: classic [${classicEvents}], v2 [${v2Events}]`)
  }

  for (const field of VIEW_FIELDS) {
    result.push(...describeFieldDifferences(field, classic.view[field], v2.view[field]))
  }

  return result
}
