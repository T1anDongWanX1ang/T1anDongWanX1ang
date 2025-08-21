import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles.css'
import RootLayout from './ui/RootLayout'
import Step1 from './ui/steps/Step1'
import Step2 from './ui/steps/Step2'
import Step3 from './ui/steps/Step3'
import Step4 from './ui/steps/Step4'
import Step5 from './ui/steps/Step5'
import Step6 from './ui/steps/Step6'
import ChainConfig from './ui/steps/ChainConfig'
import { AppStateProvider } from './state/AppState'

const router = createBrowserRouter([
	{
		path: '/',
		element: <RootLayout />,
		children: [
			{ index: true, element: <Step1 /> },
			{ path: 'step-1', element: <Step1 /> },
			{ path: 'step-2', element: <Step2 /> },
			{ path: 'step-3', element: <Step3 /> },
			// { path: 'step-4', element: <Step4 /> },
			{ path: 'step-4', element: <Step5 /> },
			{ path: 'step-5', element: <Step6 /> },
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


