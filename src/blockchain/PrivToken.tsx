import { createContext, useContext, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { AlertTriangle } from '@phosphor-icons/react'

// PRIV Token has been deprecated - gas fees now paid with ATOM by developer wallet
interface TokenContextType {
  deprecated: boolean
  message: string
}

const TokenContext = createContext<TokenContextType | null>(null)

export function PrivTokenProvider({ children }: { children: ReactNode }) {
  const contextValue: TokenContextType = {
    deprecated: true,
    message: 'PRIV token functionality has been removed. All gas fees are now sponsored by the developer using ATOM.'
  }

  return (
    <TokenContext.Provider value={contextValue}>
      {children}
    </TokenContext.Provider>
  )
}

export const usePrivToken = () => {
  const context = useContext(TokenContext)
  if (!context) {
    throw new Error('usePrivToken must be used within PrivTokenProvider')
  }
  return context
}

// Deprecated - keeping for compatibility but showing deprecation notice
export function PrivTokenDeprecationNotice() {
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="w-5 h-5" />
          PRIV Token Deprecated
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Badge variant="outline" className="border-orange-300 text-orange-700">
            System Update
          </Badge>
          <p className="text-orange-700">
            The PRIV token system has been removed from PrivaChain. All blockchain operations now use:
          </p>
          <ul className="list-disc list-inside text-orange-600 space-y-1">
            <li><strong>ATOM tokens</strong> for gas payments</li>
            <li><strong>Developer-sponsored gas</strong> - users pay nothing</li>
            <li><strong>No staking required</strong> - simplified user experience</li>
            <li><strong>Immediate access</strong> - start using the platform right away</li>
          </ul>
          <p className="text-sm text-orange-600">
            Users can now enjoy all PrivaChain features without needing to understand or manage cryptocurrency.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Legacy gas fee calculation for backward compatibility - now returns ATOM values
export interface GasFeeEstimate {
  gasLimit: number
  gasPrice: number
  totalFee: number
  estimatedTime: string
  currency: string
}

export function calculateGasFees(
  txType: string, 
  gasPrice: number = 0.025, // ATOM gas price
  priority: 'low' | 'medium' | 'high' = 'medium'
): GasFeeEstimate {
  const gasLimits: Record<string, number> = {
    transfer: 21000,
    mail: 75000,
    domain: 100000,
    video_signal: 60000,
    smart_contract: 200000
  }

  const priorityMultipliers = {
    low: 0.8,
    medium: 1.0,
    high: 1.5
  }

  const estimatedTimes = {
    low: '~30 seconds',
    medium: '~10 seconds',
    high: '~5 seconds'
  }

  const gasLimit = gasLimits[txType] || 21000
  const adjustedGasPrice = gasPrice * priorityMultipliers[priority]
  const totalFee = gasLimit * adjustedGasPrice

  return {
    gasLimit,
    gasPrice: adjustedGasPrice,
    totalFee,
    estimatedTime: estimatedTimes[priority],
    currency: 'ATOM (Developer Sponsored)'
  }
}