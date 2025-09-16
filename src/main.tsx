import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles.css'
import RootLayout from './ui/RootLayout'
import ChainConfig from './ui/steps/ChainConfig'
import { AlertManagement } from './ui/pages/AlertManagement'
import { AppStateProvider } from './state/AppState'

const router = createBrowserRouter([
	{
		path: '/',
		element: <RootLayout />,
		children: [
			{ index: true, element: <div /> }, // Empty page, main content is in the Tab system
			{ path: 'chain-config', element: <ChainConfig /> },
			{ path: 'alerts', element: <AlertManagement /> },
		],
	},
])

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<AppStateProvider>
			<RouterProvider router={router} />
		</AppStateProvider>
	</React.StrictMode>
)


