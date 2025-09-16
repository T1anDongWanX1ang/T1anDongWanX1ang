import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import LeftDataNav from './components/LeftDataNav'
import RightAISidebar from './components/RightAISidebar'
import RightTabSystem from './components/RightTabSystem'
import { ToastContainer, useToast } from './components/Toast'
import { AlertBadge } from './components/AlertBadge'
import { useRef, useState } from 'react'

export default function RootLayout() {
	const { pathname } = useLocation()
	const navigate = useNavigate()
	const isChainConfig = pathname === '/chain-config'
	const isAlerts = pathname === '/alerts'
	const [showTabSystem, setShowTabSystem] = useState(true) // Default show Tab system
	const tabSystemRef = useRef<any>(null)
	const { toasts, closeToast } = useToast()


	// 处理左侧菜单点击，打开Tab
	const handleOpenTab = (tabType: 'config' | 'abi' | 'management', pipelineId?: number) => {
		// If we're on alerts page, navigate away first to show tab system
		if (isAlerts) {
			navigate('/')
		}
		setShowTabSystem(true)
		// Need to call RightTabSystem's openTab method here
		// Due to React limitations, we need to call through ref
		if (tabSystemRef.current) {
			tabSystemRef.current.openTab(tabType, pipelineId)
		}
	}

	// 移除自动初始化逻辑，让用户手动点击菜单打开Tab

	return (
		<div className="h-screen flex flex-col">
			{/* Top Header with Alert Badge */}
			<div className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center">
				<div className="text-lg font-semibold text-gray-800">Chain Data Parser</div>
				<div className="flex items-center gap-4">
					<AlertBadge 
						onClick={() => navigate('/alerts')}
						className="group relative"
					/>
					<button
						onClick={() => navigate('/alerts')}
						className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
					>
						Alert Management
					</button>
				</div>
			</div>
			
			<div className="flex-1 flex">
				<LeftDataNav onOpenTab={handleOpenTab} />
			
			{/* 根据是否显示Tab系统来决定布局 */}
				{showTabSystem && !isChainConfig && !isAlerts ? (
					<>
						{/* Tab System */}
						<RightTabSystem ref={tabSystemRef} />
						
						{/* Right AI Sidebar */}
						<RightAISidebar />
					</>
				) : (
					<>
						{/* 特殊页面（如chain-config、alerts）使用路由内容 */}
						<main className="flex-1 flex flex-col">
							<div className="flex-1 overflow-auto">
								<Outlet />
							</div>
						</main>
						
						{/* 只在非alerts页面显示AI Sidebar */}
						{!isAlerts && <RightAISidebar />}
					</>
				)}
			</div>
			
			{/* 全局Toast容器 */}
			<ToastContainer toasts={toasts} onClose={closeToast} />
		</div>
	)
}