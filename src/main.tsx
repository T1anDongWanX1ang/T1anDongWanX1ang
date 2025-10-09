import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles.css'
import RootLayout from './ui/RootLayout'
import ChainConfig from './ui/steps/ChainConfig'
import { AlertManagement } from './ui/pages/AlertManagement'
import UserManagement from './ui/pages/UserManagement'
import { AppStateProvider } from './state/AppState'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './ui/components/ProtectedRoute'
import { setupTokenInterceptors } from './utils/tokenManager'

// Initialize automatic token management
setupTokenInterceptors()

const router = createBrowserRouter([
	{
		path: '/',
		element: (
			<ProtectedRoute>
				<RootLayout />
			</ProtectedRoute>
		),
		children: [
			{ index: true, element: <div /> }, // Empty page, main content is in the Tab system
			{ path: 'chain-config', element: <ChainConfig /> },
			{ path: 'alerts', element: <AlertManagement /> },
			{
				path: 'users',
				element: (
					<ProtectedRoute requireAdmin={true}>
						<UserManagement />
					</ProtectedRoute>
				)
			},
		],
	},
])

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<AuthProvider>
			<AppStateProvider>
				<RouterProvider router={router} />
			</AppStateProvider>
		</AuthProvider>
	</React.StrictMode>
)


