import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles.css'
import RootLayout from './ui/RootLayout'
import ChainConfig from './ui/steps/ChainConfig'
import { AppStateProvider } from './state/AppState'

const router = createBrowserRouter([
	{
		path: '/',
		element: <RootLayout />,
		children: [
			{ index: true, element: <div /> }, // 空页面，主要内容在Tab系统中
			{ path: 'chain-config', element: <ChainConfig /> },
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


