"use client"

import * as React from "react"
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  PieChart,
  AlertTriangle,
  ArrowUpRight
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AIAlertList } from "@/components/ui/ai-alert"
import { UserAsset, AIAlert } from "@/types"
import { formatCurrency, formatPercentage, formatNumber, cn } from "@/lib/utils"

interface UserPageProps {
  userAssets: UserAsset[]
  alerts: AIAlert[]
  isWalletConnected: boolean
  walletAddress?: string
  onConnectWallet?: () => void
  onViewAsset?: (assetId: string) => void
  onDismissAlert?: (alertId: string) => void
}

const assetTypeColors = {
  bond: "bg-blue-100 text-blue-800",
  stock: "bg-green-100 text-green-800", 
  gold: "bg-yellow-100 text-yellow-800",
  realestate: "bg-purple-100 text-purple-800",
  other: "bg-gray-100 text-gray-800",
}

export function UserPage({
  userAssets,
  alerts,
  isWalletConnected,
  walletAddress,
  onConnectWallet,
  onViewAsset,
  onDismissAlert,
}: UserPageProps) {
  // 计算总计数据
  const totalValue = userAssets.reduce((sum, asset) => sum + asset.currentValue, 0)
  const totalPnL = userAssets.reduce((sum, asset) => sum + asset.pnl, 0)
  const totalPnLPercentage = totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0

  const isProfitable = totalPnL >= 0

  if (!isWalletConnected) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <Wallet className="h-6 w-6" />
            </div>
            <CardTitle>连接钱包</CardTitle>
            <CardDescription>
              连接您的钱包以查看RWA资产组合
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={onConnectWallet} className="w-full">
              连接钱包
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">我的资产</h1>
          <p className="text-muted-foreground">
            钱包地址: <code className="bg-muted px-2 py-1 rounded text-sm">{walletAddress}</code>
          </p>
        </div>
      </div>

      {/* AI Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold">AI 智能提醒</h2>
          </div>
          <AIAlertList 
            alerts={alerts} 
            onDismiss={onDismissAlert}
            maxItems={5}
          />
        </div>
      )}

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总资产价值</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {userAssets.length} 项资产
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总盈亏</CardTitle>
            {isProfitable ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              isProfitable ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(Math.abs(totalPnL))}
            </div>
            <div className={cn(
              "text-xs font-medium mt-1",
              isProfitable ? "text-green-600" : "text-red-600"
            )}>
              {formatPercentage(totalPnLPercentage)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">资产类型</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from(new Set(userAssets.map(asset => asset.asset.assetType))).map(type => {
                const typeAssets = userAssets.filter(asset => asset.asset.assetType === type)
                const typeValue = typeAssets.reduce((sum, asset) => sum + asset.currentValue, 0)
                const percentage = (typeValue / totalValue) * 100
                
                return (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{type}</span>
                    <span className="font-medium">{percentage.toFixed(1)}%</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets List */}
      <Card>
        <CardHeader>
          <CardTitle>资产详情</CardTitle>
          <CardDescription>
            您持有的所有RWA代币资产
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userAssets.map((userAsset) => {
              const { asset, holdings, averageBuyPrice, currentValue, pnl, pnlPercentage } = userAsset
              const isProfitableAsset = pnl >= 0
              
              return (
                <div 
                  key={asset.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onViewAsset?.(asset.id)}
                >
                  {/* Asset Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {asset.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{asset.name}</h3>
                        <Badge className={assetTypeColors[asset.assetType]}>
                          {asset.assetType.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {asset.symbol} • {asset.chain}
                      </p>
                    </div>
                  </div>

                  {/* Holdings & Performance */}
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-4">
                      {/* Holdings */}
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">持仓数量</p>
                        <p className="font-medium">{formatNumber(holdings)}</p>
                      </div>
                      
                      {/* Average Price */}
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">均价</p>
                        <p className="font-medium">{formatCurrency(averageBuyPrice)}</p>
                      </div>
                      
                      {/* Current Value */}
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">当前市值</p>
                        <p className="font-semibold">{formatCurrency(currentValue)}</p>
                      </div>
                      
                      {/* P&L */}
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">盈亏</p>
                        <div className={cn(
                          "font-semibold",
                          isProfitableAsset ? "text-green-600" : "text-red-600"
                        )}>
                          <div>{formatCurrency(Math.abs(pnl))}</div>
                          <div className="text-xs">
                            {formatPercentage(pnlPercentage)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Liquidation Type */}
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">清算类型</p>
                        <p className="text-sm font-medium">{asset.liquidationMethod}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <Button variant="ghost" size="sm">
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
          
          {userAssets.length === 0 && (
            <div className="text-center py-8">
              <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无资产</h3>
              <p className="text-muted-foreground">
                您的钱包中还没有RWA代币资产
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}