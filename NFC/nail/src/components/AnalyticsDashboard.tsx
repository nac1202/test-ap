'use client'

import { useEffect, useState } from 'react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'

type ViewStats = {
    date: string
    views: number
}

export default function AnalyticsDashboard() {
    const [data, setData] = useState<ViewStats[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/analytics/stats')
                if (res.ok) {
                    const stats = await res.json()
                    setData(stats)
                }
            } catch (error) {
                console.error("Failed to fetch analytics", error)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) {
        return <div className="p-6 text-center text-gray-500">データを読み込み中...</div>
    }

    if (data.length === 0) {
        return (
            <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-100 mt-8">
                <p className="mb-2">まだアクセスデータがありません。</p>
                <p className="text-sm">プロフィールをシェアして、アクセスを集めましょう！</p>
            </div>
        )
    }

    const totalViews = data.reduce((sum, item) => sum + item.views, 0)

    return (
        <div className="mt-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center justify-between">
                <span>アクセスレポート (最近7日間)</span>
                <span className="text-sm font-normal bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                    合計 {totalViews} Views
                </span>
            </h3>

            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                            allowDecimals={false}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ color: '#374151', fontWeight: 'bold', marginBottom: '4px' }}
                            formatter={(value: number) => [`${value} views`, 'アクセス数']}
                        />
                        <Line
                            type="monotone"
                            dataKey="views"
                            stroke="#3B82F6"
                            strokeWidth={3}
                            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
