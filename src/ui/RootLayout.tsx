import { Outlet, useLocation } from 'react-router-dom'
import LeftDataNav from './components/LeftDataNav'
import RightAISidebar from './components/RightAISidebar'
import { NavLink } from 'react-router-dom'

const steps = [
	{ id: 1, name: 'Step 1: Define Data Plan', path: '/step-1' },
	{ id: 2, name: 'Step 2: Field Mapping Rules', path: '/step-2' },
	{ id: 3, name: 'Step 3: Kafka Producer', path: '/step-3' },
	// { id: 4, name: 'Step 4: Mapping Validation', path: '/step-4' },
	{ id: 5, name: 'Step 4: Upload Data Storage Configuration', path: '/step-4' },
	{ id: 6, name: 'Step 5: Data Ingestion', path: '/step-5' },
]

export default function RootLayout() {
	const { pathname } = useLocation()
	const currentPath = pathname === '/' ? '/step-1' : pathname
	const isChainConfig = pathname === '/chain-config'

	return (
		<div className="h-screen flex">
			<LeftDataNav />
			
			<main className="flex-1 flex flex-col">
				{/* Step Navigation Header - Only show when not on chain-config */}
				{!isChainConfig && (
					<header className="bg-white border-b border-gray-200 px-6 py-4">
						<nav className="flex space-x-1">
							{steps.map(step => (
								<NavLink
									key={step.id}
									to={step.path}
									className={({ isActive }) =>
										`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
											isActive || (currentPath === '/' && step.id === 1)
												? 'bg-brand text-white'
												: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
										}`
									}
								>
									{step.name}
								</NavLink>
							))}
						</nav>
					</header>
				)}
				
				{/* Main Content Area */}
				<div className="flex-1 overflow-auto p-6">
					<Outlet />
				</div>
			</main>
			
			<RightAISidebar />
		</div>
	)
}


