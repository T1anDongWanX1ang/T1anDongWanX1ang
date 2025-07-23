"use client"

import * as React from "react"
import { 
  Heart, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  XCircle,
  Coins,
  Vote,
  DollarSign,
  Zap,
  Shield,
  Link2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PriceChart } from "@/components/ui/price-chart"
import { RWAAsset, PriceHistory } from "@/types"
import { formatCurrency, formatPercentage, formatNumber, cn } from "@/lib/utils"

interface AssetPageProps {
  asset: RWAAsset
  priceHistory: PriceHistory[]
  onChainPriceHistory?: PriceHistory[]
  onFavorite?: (assetId: string) => void
  onGenerateReport?: (assetId: string) => void
  isFavorited?: boolean
}

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

const stabilityColors = {
  high: "success",
  medium: "warning", 
  low: "destructive",
} as const

export function AssetPage({
  asset,
  priceHistory,
  onChainPriceHistory,
  onFavorite,
  onGenerateReport,
  isFavorited = false,
}: AssetPageProps) {
  const [activeTab, setActiveTab] = React.useState<"overview" | "chart">("overview")

  const priceChange = asset.priceChange24h
  const isPriceUp = priceChange >= 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{asset.name}</h1>
            <Badge className={assetTypeColors[asset.assetType]}>
              {asset.assetType.toUpperCase()}
            </Badge>
            <Badge className={chainColors[asset.chain]}>
              {asset.chain}
            </Badge>
          </div>
          <p className="text-xl text-muted-foreground">
            {asset.symbol} • {asset.jurisdiction}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFavorite?.(asset.id)}
            className={cn(
              "gap-2",
              isFavorited && "text-red-500 border-red-500"
            )}
          >
            <Heart className={cn("h-4 w-4", isFavorited && "fill-current")} />
            {isFavorited ? "已收藏" : "收藏"}
          </Button>
          <Button
            size="sm"
            onClick={() => onGenerateReport?.(asset.id)}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            生成分析报告
          </Button>
        </div>
      </div>

      {/* Price Section */}
      <Card>
        <CardHeader>
          <CardTitle>价格信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Price */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">当前价格</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {formatCurrency(asset.currentPrice)}
                </span>
                <div className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  isPriceUp ? "text-green-600" : "text-red-600"
                )}>
                  {isPriceUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {formatPercentage(priceChange)}
                </div>
              </div>
            </div>

            {/* On-chain vs Off-chain */}
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">链上价格</p>
                <p className="text-lg font-semibold">{formatCurrency(asset.onChainPrice)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">链下价格</p>
                <p className="text-lg font-semibold">{formatCurrency(asset.offChainPrice)}</p>
              </div>
            </div>

            {/* Price Discrepancy */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">价差分析</p>
              <div className="space-y-1">
                <div className={cn(
                  "text-lg font-semibold",
                  asset.priceDiscrepancy >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(Math.abs(asset.priceDiscrepancy))}
                  <span className="text-sm ml-1">
                    ({formatPercentage((asset.priceDiscrepancy / asset.offChainPrice) * 100)})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  预言机: {asset.oracleSource}
                </p>
                <Badge variant={stabilityColors[asset.oracleStability]}>
                  {asset.oracleStability} 稳定性
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "overview"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          基本信息
        </button>
        <button
          onClick={() => setActiveTab("chart")}
          className={cn(
            "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "chart"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          价格图表
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Asset Details */}
          <Card>
            <CardHeader>
              <CardTitle>资产详情</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">清算方式</p>
                  <p className="font-medium">{asset.liquidationMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">托管人</p>
                  <p className="font-medium">{asset.custodian}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">总供应量</p>
                  <p className="font-medium">{formatNumber(asset.totalSupply)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">市值</p>
                  <p className="font-medium">{formatCurrency(asset.marketCap)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">24h交易量</p>
                  <p className="font-medium">{formatCurrency(asset.volume24h)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">赎回模式</p>
                  <p className="font-medium capitalize">{asset.redemptionMode}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">铸造地址</p>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded text-sm">
                    {asset.mintingAddress}
                  </code>
                  <Button variant="ghost" size="sm">
                    <Link2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>功能特性</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  {asset.supportsRedemption ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">赎回功能</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.supportsRedemption ? "支持" : "不支持"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {asset.supportsVoting ? (
                    <Vote className="h-5 w-5 text-green-500" />
                  ) : (
                    <Vote className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium">投票权</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.supportsVoting ? "支持" : "不支持"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {asset.supportsDividends ? (
                    <DollarSign className="h-5 w-5 text-green-500" />
                  ) : (
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium">分红</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.supportsDividends ? "支持" : "不支持"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {asset.leverageAvailable ? (
                    <Zap className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Zap className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium">杠杆可用</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.leverageAvailable ? "支持" : "不支持"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {asset.isCollateral ? (
                    <Shield className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Shield className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium">抵押品</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.isCollateral ? "可用作抵押" : "不可抵押"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Coins className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="font-medium">区块链</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {asset.chain}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "chart" && (
        <Card>
          <CardHeader>
            <CardTitle>价格走势</CardTitle>
            <CardDescription>
              显示过去30天的价格变化，包括链上和链下价格对比
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PriceChart
              data={priceHistory}
              onChainData={onChainPriceHistory}
              height={400}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}