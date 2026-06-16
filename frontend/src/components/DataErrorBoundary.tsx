'use client'

import { Component, ReactNode } from 'react'
import { ErrorState } from '@/components/ErrorState'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
}

// Wraps chain-reading sections so the masthead and map frame always render even
// if a data section throws; the section swaps to an error card with retry.
export class DataErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  reset = () => this.setState({ hasError: false })

  render() {
    if (this.state.hasError) {
      return (
        <div className="px-4 py-10">
          <ErrorState
            message="A section of the atlas could not be drawn. Reload to try charting it again."
            onRetry={this.reset}
          />
        </div>
      )
    }
    return this.props.children
  }
}
