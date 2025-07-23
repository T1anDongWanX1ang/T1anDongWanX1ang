"use client"

import * as React from "react"
import { 
  Search, 
  Filter,
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  CheckCircle,
  Zap,
  Shield
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { RWAAsset } from "@/types"
import { formatCurrency, formatPercentage, formatNumber, cn } from "@/lib/utils"

interface BrowsePageProps {
  assets: RWAAsset[]
  onViewAsset?: (assetId: string) => void
}

interface FilterState {
  assetType: string[]
  chain: string[]
  redemptionMode: string[]
  oracleStability: string[]
  supportsRedemption?: boolean
  leverageAvailable?: boolean
  isCollateral?: boolean
}

const assetTypeOptions = [
  { value: "bond", label: "债券" },
  { value: "stock", label: "股票" },
  { value: "gold", label: "黄金" },
  { value: "realestate", label: "房地产" },
  { value: "other", label: "其他" },
]

const chainOptions = [
  { value: "ethereum", label: "Ethereum" },
  { value: "base", label: "Base" },
  { value: "polygon", label: "Polygon" },
  { value: "arbitrum", label: "Arbitrum" },
]

const redemptionModeOptions = [
  { value: "auto", label: "自动" },
  { value: "manual", label: "手动" },
  { value: "none", label: "不支持" },
]

const oracleStabilityOptions = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
]

const assetTypeColors = {
  bond: "bg-blue-100 text-blue-800",
  stock: "bg-green-100 text-green-800", 
  gold: "bg-yellow-100 text-yellow-800",
  realestate: "bg-purple-100 text-purple-800",
  other: "bg-gray-100 text-gray-800",
}

const chainColors = {
  ethereum: "bg-blue-500 text-white",
  base: "bg-blue-600 text-white",
  polygon: "bg-purple-500 text-white",
  arbitrum: "bg-orange-500 text-white",
}

export function BrowsePage({ assets, onViewAsset }: BrowsePageProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [showFilters, setShowFilters] = React.useState(false)
  const [filters, setFilters] = React.useState<FilterState>({
    assetType: [],
    chain: [],
    redemptionMode: [],
    oracleStability: [],
  })

  // 过滤资产
  const filteredAssets = React.useMemo(() => {
    return assets.filter(asset => {
      // 搜索查询过滤
      const matchesSearch = 
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.assetType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.jurisdiction.toLowerCase().includes(searchQuery.toLowerCase())

      // 资产类型过滤
      const matchesAssetType = filters.assetType.length === 0 || filters.assetType.includes(asset.assetType)
      
      // 区块链过滤
      const matchesChain = filters.chain.length === 0 || filters.chain.includes(asset.chain)
      
      // 赎回模式过滤
      const matchesRedemption = filters.redemptionMode.length === 0 || filters.redemptionMode.includes(asset.redemptionMode)
      
      // 预言机稳定性过滤
      const matchesStability = filters.oracleStability.length === 0 || filters.oracleStability.includes(asset.oracleStability)
      
      // 功能特性过滤
      const matchesRedemptionSupport = filters.supportsRedemption === undefined || asset.supportsRedemption === filters.supportsRedemption
      const matchesLeverage = filters.leverageAvailable === undefined || asset.leverageAvailable === filters.leverageAvailable
      const matchesCollateral = filters.isCollateral === undefined || asset.isCollateral === filters.isCollateral

      return matchesSearch && matchesAssetType && matchesChain && 
             matchesRedemption && matchesStability && matchesRedemptionSupport && 
             matchesLeverage && matchesCollateral
    })
  }, [assets, searchQuery, filters])

  const toggleFilter = (category: keyof FilterState, value: string) => {
    setFilters(prev => {
      const current = prev[category] as string[]
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value]
      
      return { ...prev, [category]: updated }
    })
  }

  const toggleBooleanFilter = (key: 'supportsRedemption' | 'leverageAvailable' | 'isCollateral') => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key] === undefined ? true : prev[key] === true ? false : undefined
    }))
  }

  const clearFilters = () => {
    setFilters({
      assetType: [],
      chain: [],
      redemptionMode: [],
      oracleStability: [],
    })
  }

  const hasActiveFilters = Object.values(filters).some(filter => 
    Array.isArray(filter) ? filter.length > 0 : filter !== undefined
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">浏览RWA资产</h1>
          <p className="text-muted-foreground">
            发现和分析实体资产代币化产品
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索资产名称、符号或类型..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn("gap-2", hasActiveFilters && "border-primary text-primary")}
          >
            <Filter className="h-4 w-4" />
            筛选
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                !
              </Badge>
            )}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">高级筛选</CardTitle>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  清除筛选
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Asset Type */}
              <div>
                <h4 className="font-medium mb-2">资产类型</h4>
                <div className="flex flex-wrap gap-2">
                  {assetTypeOptions.map(option => (
                    <Badge
                      key={option.value}
                      variant={filters.assetType.includes(option.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFilter('assetType', option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Chain */}
              <div>
                <h4 className="font-medium mb-2">支持链</h4>
                <div className="flex flex-wrap gap-2">
                  {chainOptions.map(option => (
                    <Badge
                      key={option.value}
                      variant={filters.chain.includes(option.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFilter('chain', option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Redemption Mode */}
              <div>
                <h4 className="font-medium mb-2">赎回模式</h4>
                <div className="flex flex-wrap gap-2">
                  {redemptionModeOptions.map(option => (
                    <Badge
                      key={option.value}
                      variant={filters.redemptionMode.includes(option.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFilter('redemptionMode', option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Oracle Stability */}
              <div>
                <h4 className="font-medium mb-2">预言机稳定性</h4>
                <div className="flex flex-wrap gap-2">
                  {oracleStabilityOptions.map(option => (
                    <Badge
                      key={option.value}
                      variant={filters.oracleStability.includes(option.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFilter('oracleStability', option.value)}
                    >
                      {option.label}稳定性
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Feature Toggles */}
              <div>
                <h4 className="font-medium mb-2">功能特性</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={filters.supportsRedemption === true ? "default" : filters.supportsRedemption === false ? "destructive" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleBooleanFilter('supportsRedemption')}
                  >
                    支持赎回
                  </Badge>
                  <Badge
                    variant={filters.leverageAvailable === true ? "default" : filters.leverageAvailable === false ? "destructive" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleBooleanFilter('leverageAvailable')}
                  >
                    杠杆可用
                  </Badge>
                  <Badge
                    variant={filters.isCollateral === true ? "default" : filters.isCollateral === false ? "destructive" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleBooleanFilter('isCollateral')}
                  >
                    可作抵押
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          找到 <span className="font-medium">{filteredAssets.length}</span> 个资产
        </p>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets.map((asset) => {
          const priceChange = asset.priceChange24h
          const isPriceUp = priceChange >= 0

          return (
            <Card 
              key={asset.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onViewAsset?.(asset.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{asset.symbol}</CardTitle>
                      <Badge className={assetTypeColors[asset.assetType]}>
                        {asset.assetType.toUpperCase()}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {asset.name}
                    </CardDescription>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Price */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {formatCurrency(asset.currentPrice)}
                    </span>
                    <div className={cn(
                      "flex items-center gap-1 text-sm font-medium",
                      isPriceUp ? "text-green-600" : "text-red-600"
                    )}>
                      {isPriceUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {formatPercentage(priceChange)}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    24h交易量: {formatCurrency(asset.volume24h)}
                  </p>
                </div>

                {/* Chain and Jurisdiction */}
                <div className="flex items-center justify-between">
                  <Badge className={chainColors[asset.chain]}>
                    {asset.chain}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {asset.jurisdiction}
                  </span>
                </div>

                {/* Features */}
                <div className="flex items-center gap-2">
                  {asset.supportsRedemption && (
                    <div title="支持赎回">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  )}
                  {asset.leverageAvailable && (
                    <div title="杠杆可用">
                      <Zap className="h-4 w-4 text-yellow-500" />
                    </div>
                  )}
                  {asset.isCollateral && (
                    <div title="可作抵押">
                      <Shield className="h-4 w-4 text-blue-500" />
                    </div>
                  )}
                </div>

                {/* Market Data */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">市值</p>
                    <p className="font-medium">{formatCurrency(asset.marketCap / 1000000)}M</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">供应量</p>
                    <p className="font-medium">{formatNumber(asset.totalSupply / 1000000)}M</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* No Results */}
      {filteredAssets.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">未找到匹配的资产</h3>
            <p className="text-muted-foreground mb-4">
              请尝试调整搜索条件或筛选器
            </p>
            <Button variant="outline" onClick={() => {
              setSearchQuery("")
              clearFilters()
            }}>
              重置搜索
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}