import type { MetaRole } from './types'

export function roleFromPosition(position: string | null): MetaRole | null {
  switch (position?.toUpperCase()) {
    case 'TOP': return 'top'
    case 'JUNGLE': return 'jungle'
    case 'MIDDLE':
    case 'MID': return 'mid'
    case 'BOTTOM':
    case 'ADC': return 'adc'
    case 'UTILITY':
    case 'SUPPORT': return 'support'
    default: return null
  }
}
