import { Outlet, useLocation } from 'react-router-dom'
import LeftDataNav from './components/LeftDataNav'
import RightAISidebar from './components/RightAISidebar'
import RightTabSystem from './components/RightTabSystem'
import { useRef, useState } from 'react'

export default function RootLayout() {
	const { pathname } = useLocation()
	const isChainConfig = pathname === '/chain-config'
	const [showTabSystem, setShowTabSystem] = useState(true) // Default show Tab system
	const tabSystemRef = useRef<any>(null)


	// 处理左侧菜单点击，打开Tab
	const handleOpenTab = (tabType: 'config' | 'abi' | 'database', pipelineId?: number) => {
		setShowTabSystem(true)
		// Need to call RightTabSystem's openTab method here
		// Due to React limitations, we need to call through ref
		if (tabSystemRef.current) {
			tabSystemRef.current.openTab(tabType, pipelineId)
		}
	}

	// 移除自动初始化逻辑，让用户手动点击菜单打开Tab

	return (
		<div className="h-screen flex">
			<LeftDataNav onOpenTab={handleOpenTab} />
			
			{/* 根据是否显示Tab系统来决定布局 */}
			{showTabSystem && !isChainConfig ? (
				<>
					{/* Tab System */}
					<RightTabSystem ref={tabSystemRef} />
					
					{/* Right AI Sidebar */}
					<RightAISidebar />
				</>
			) : (
				<>
					{/* 只有特殊页面（如chain-config）才使用路由内容 */}
					<main className="flex-1 flex flex-col">
						<div className="flex-1 overflow-auto p-6">
							<Outlet />
						</div>
					</main>
					
					<RightAISidebar />
				</>
			)}
		</div>
	)
}