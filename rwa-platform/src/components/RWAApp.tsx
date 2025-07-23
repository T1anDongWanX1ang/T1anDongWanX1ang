"use client"

import * as React from "react"
import { Home, Search, User, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AssetPage } from "@/components/pages/AssetPage"
import { UserPage } from "@/components/pages/UserPage"
import { BrowsePage } from "@/components/pages/BrowsePage"
import { 
  mockAssets, 
  mockUserAssets, 
  mockPriceHistory, 
  mockOnChainPriceHistory, 
  mockAIAlerts 
} from "@/lib/mock-data"
import { AIAlert } from "@/types"

type ActivePage = "browse" | "user" | "asset"

interface AppState {
  activePage: ActivePage
  selectedAssetId: string | null
  isWalletConnected: boolean
  walletAddress: string | null
  favoriteAssets: Set<string>
  alerts: AIAlert[]
}

export function RWAApp() {
  const [state, setState] = React.useState<AppState>({
    activePage: "browse",
    selectedAssetId: null,
    isWalletConnected: false,
    walletAddress: null,
    favoriteAssets: new Set(),
    alerts: mockAIAlerts,
  })
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  // 获取当前选中的资产
  const selectedAsset = state.selectedAssetId 
    ? mockAssets.find(asset => asset.id === state.selectedAssetId)
    : null

  // 处理导航
  const handleNavigation = (page: ActivePage, assetId?: string) => {
    setState(prev => ({
      ...prev,
      activePage: page,
      selectedAssetId: assetId || null,
    }))
    setIsMobileMenuOpen(false)
  }

  // 连接钱包
  const handleConnectWallet = () => {
    setState(prev => ({
      ...prev,
      isWalletConnected: true,
      walletAddress: "0x1234...abcd",
    }))
  }

  // 收藏资产
  const handleFavoriteAsset = (assetId: string) => {
    setState(prev => {
      const newFavorites = new Set(prev.favoriteAssets)
      if (newFavorites.has(assetId)) {
        newFavorites.delete(assetId)
      } else {
        newFavorites.add(assetId)
      }
      return {
        ...prev,
        favoriteAssets: newFavorites,
      }
    })
  }

  // 生成报告
  const handleGenerateReport = (assetId: string) => {
    const asset = mockAssets.find(a => a.id === assetId)
    if (asset) {
      alert(`正在为 ${asset.name} (${asset.symbol}) 生成分析报告...`)
    }
  }

  // 解除AI提醒
  const handleDismissAlert = (alertId: string) => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.filter(alert => alert.id !== alertId),
    }))
  }

  const navigationItems = [
    {
      key: "browse" as const,
      label: "浏览资产",
      icon: Search,
    },
    {
      key: "user" as const,
      label: "我的资产",
      icon: User,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Home className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold">RWA Platform</h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.key}
                    variant={state.activePage === item.key ? "default" : "ghost"}
                    onClick={() => handleNavigation(item.key)}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                )
              })}
            </nav>

            {/* Wallet Connection */}
            <div className="hidden md:flex items-center gap-2">
              {!state.isWalletConnected ? (
                <Button onClick={handleConnectWallet}>
                  连接钱包
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {state.walletAddress}
                  </code>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.key}
                    variant={state.activePage === item.key ? "default" : "ghost"}
                    onClick={() => handleNavigation(item.key)}
                    className="w-full justify-start gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                )
              })}
              
              <div className="pt-2 border-t">
                {!state.isWalletConnected ? (
                  <Button onClick={handleConnectWallet} className="w-full">
                    连接钱包
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 p-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {state.walletAddress}
                    </code>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {state.activePage === "browse" && (
          <BrowsePage
            assets={mockAssets}
            onViewAsset={(assetId) => handleNavigation("asset", assetId)}
          />
        )}

        {state.activePage === "user" && (
          <UserPage
            userAssets={mockUserAssets}
            alerts={state.alerts}
            isWalletConnected={state.isWalletConnected}
            walletAddress={state.walletAddress || undefined}
            onConnectWallet={handleConnectWallet}
            onViewAsset={(assetId) => handleNavigation("asset", assetId)}
            onDismissAlert={handleDismissAlert}
          />
        )}

        {state.activePage === "asset" && selectedAsset && (
          <AssetPage
            asset={selectedAsset}
            priceHistory={mockPriceHistory[selectedAsset.id] || []}
            onChainPriceHistory={mockOnChainPriceHistory[selectedAsset.id]}
            onFavorite={handleFavoriteAsset}
            onGenerateReport={handleGenerateReport}
            isFavorited={state.favoriteAssets.has(selectedAsset.id)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold mb-3">RWA Platform</h3>
              <p className="text-sm text-muted-foreground">
                专业的实体资产代币化平台，为您提供全面的RWA投资解决方案。
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">功能特性</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 实时价格监控</li>
                <li>• AI智能提醒</li>
                <li>• 多链资产支持</li>
                <li>• 专业分析报告</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">支持链</h3>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Ethereum</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Base</span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Polygon</span>
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Arbitrum</span>
              </div>
            </div>
          </div>
          <div className="border-t pt-6 mt-6 text-center text-sm text-muted-foreground">
            © 2024 RWA Platform. 专业的实体资产代币化投资平台.
          </div>
        </div>
      </footer>
    </div>
  )
}