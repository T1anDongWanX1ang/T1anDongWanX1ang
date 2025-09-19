import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import LeftDataNav from './components/LeftDataNav'
import RightAISidebar from './components/RightAISidebar'
import RightTabSystem from './components/RightTabSystem'
import { ToastContainer, useToast } from './components/Toast'
import { AlertBadge } from './components/AlertBadge'
import { useAuth } from '../contexts/AuthContext'
import { useRef, useState } from 'react'

export default function RootLayout() {
	const { pathname } = useLocation()
	const navigate = useNavigate()
	const { authState, logout } = useAuth()
	const isChainConfig = pathname === '/chain-config'
	const isAlerts = pathname === '/alerts'
	const isUsers = pathname === '/users'
	const [showTabSystem, setShowTabSystem] = useState(true) // Default show Tab system
	const tabSystemRef = useRef<any>(null)
	const { toasts, closeToast } = useToast()

	// Format wallet address
	const formatAddress = (address: string) => {
		return `${address.slice(0, 6)}...${address.slice(-4)}`
	}

	// Handle logout
	const handleLogout = () => {
		logout()
		navigate('/')
	}


	// 处理左侧菜单点击，打开Tab
	const handleOpenTab = (tabType: 'config' | 'abi' | 'management' | 'users', pipelineId?: number) => {
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
			{/* Top Header */}
			<div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm">
				<div className="text-xl font-bold text-gray-900">Chain Data Parser</div>
				<div className="flex items-center gap-6">
					{/* Alert Management */}
					<div className="flex items-center gap-2">
						<AlertBadge
							onClick={() => navigate('/alerts')}
							className="group relative"
						/>
						<button
							onClick={() => navigate('/alerts')}
							className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5l-5-5h5v-6H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 01-2 2h-5v6z" />
							</svg>
							Alert Management
						</button>
					</div>


					{/* 用户信息 */}
					<div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
						<div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
							<svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
							</svg>
						</div>
						<div className="flex flex-col">
							<span className="text-sm font-medium text-gray-900">
								{authState.user?.display_name || formatAddress(authState.user?.wallet_address || '')}
							</span>
							<span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
								authState.user?.role === 'admin' ? 'bg-red-100 text-red-700' :
								authState.user?.role === 'moderator' ? 'bg-yellow-100 text-yellow-700' :
								'bg-blue-100 text-blue-700'
							}`}>
								{authState.user?.role}
							</span>
						</div>
					</div>

					{/* 登出按钮 */}
					<button
						onClick={handleLogout}
						className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
						</svg>
						Logout
					</button>
				</div>
			</div>
			
			<div className="flex-1 flex">
				<LeftDataNav onOpenTab={handleOpenTab} />
			
			{/* 根据是否显示Tab系统来决定布局 */}
				{showTabSystem && !isChainConfig && !isAlerts && !isUsers ? (
					<>
						{/* Tab System */}
						<RightTabSystem ref={tabSystemRef} />

						{/* Right AI Sidebar */}
						<RightAISidebar />
					</>
				) : (
					<>
						{/* 特殊页面（如chain-config、alerts、users）使用路由内容 */}
						<main className="flex-1 flex flex-col">
							<div className="flex-1 overflow-auto">
								<Outlet />
							</div>
						</main>

						{/* 只在非alerts和非users页面显示AI Sidebar */}
						{!isAlerts && !isUsers && <RightAISidebar />}
					</>
				)}
			</div>
			
			{/* 全局Toast容器 */}
			<ToastContainer toasts={toasts} onClose={closeToast} />
		</div>
	)
}