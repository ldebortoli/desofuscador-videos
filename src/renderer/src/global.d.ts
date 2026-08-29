import type { InspectorApi } from '../../shared/types'

declare global {
  interface Window {
    inspector: InspectorApi
  }
}

export {}
