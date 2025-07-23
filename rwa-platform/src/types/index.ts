export interface RWAAsset {
  id: string
  name: string
  symbol: string
  jurisdiction: string
  liquidationMethod: string
  custodian: string
  assetType: "bond" | "stock" | "gold" | "realestate" | "other"
  currentPrice: number
  onChainPrice: number
  offChainPrice: number
  priceDiscrepancy: number
  oracleSource: string
  totalSupply: number
  mintingAddress: string
  supportsRedemption: boolean
  supportsVoting: boolean
  supportsDividends: boolean
  leverageAvailable: boolean
  isCollateral: boolean
  chain: "ethereum" | "base" | "polygon" | "arbitrum"
  oracleStability: "high" | "medium" | "low"
  redemptionMode: "auto" | "manual" | "none"
  marketCap: number
  volume24h: number
  priceChange24h: number
}

export interface UserAsset {
  asset: RWAAsset
  holdings: number
  averageBuyPrice: number
  currentValue: number
  pnl: number
  pnlPercentage: number
}

export interface PriceHistory {
  timestamp: number
  price: number
  volume?: number
}

export interface AIAlert {
  id: string
  type: "warning" | "opportunity" | "info"
  message: string
  timestamp: number
  assetId?: string
}