"use client"

import * as React from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { PriceHistory } from "@/types"
import { formatCurrency } from "@/lib/utils"

interface PriceChartProps {
  data: PriceHistory[]
  onChainData?: PriceHistory[]
  className?: string
  height?: number
}

interface ChartDataPoint {
  timestamp: number
  offChainPrice?: number
  onChainPrice?: number
  date: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    color?: string
    dataKey?: string
    value?: number
  }>
  label?: string
}

export function PriceChart({ 
  data, 
  onChainData, 
  className, 
  height = 300 
}: PriceChartProps) {
  // 合并链上和链下数据
  const combinedData = React.useMemo(() => {
    if (!onChainData) {
      return data.map(item => ({
        timestamp: item.timestamp,
        offChainPrice: item.price,
        date: new Date(item.timestamp).toLocaleDateString(),
      }))
    }

    // 创建时间戳映射
    const dataMap = new Map<number, ChartDataPoint>()
    
    data.forEach(item => {
      dataMap.set(item.timestamp, {
        timestamp: item.timestamp,
        offChainPrice: item.price,
        date: new Date(item.timestamp).toLocaleDateString(),
      })
    })

    onChainData.forEach(item => {
      const existing = dataMap.get(item.timestamp)
      if (existing) {
        existing.onChainPrice = item.price
      } else {
        dataMap.set(item.timestamp, {
          timestamp: item.timestamp,
          onChainPrice: item.price,
          date: new Date(item.timestamp).toLocaleDateString(),
        })
      }
    })

    return Array.from(dataMap.values()).sort((a, b) => a.timestamp - b.timestamp)
  }, [data, onChainData])

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'offChainPrice' ? 'Off-chain: ' : 'On-chain: '}
              {formatCurrency(entry.value || 0)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={combinedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            stroke="#888"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#888"
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="offChainPrice"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            name="Off-chain Price"
          />
          {onChainData && (
            <Line
              type="monotone"
              dataKey="onChainPrice"
              stroke="#dc2626"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
              name="On-chain Price"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}