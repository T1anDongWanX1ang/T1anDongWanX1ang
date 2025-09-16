import React from 'react'

interface StepNavigationProps {
	currentStep: number
	onStepChange: (step: number) => void
}

const steps = [
	{ id: 1, name: 'Step 1: Smart ABI Selection', type: 'step1' },
	{ id: 2, name: 'Step 2: Contract Method Query', type: 'step2' },
	{ id: 3, name: 'Step 3: Mapping Rules & Decimal Config', type: 'step3' },
	{ id: 4, name: 'Step 4: Kafka Producer', type: 'step4' },
	{ id: 5, name: 'Step 5: Data Storage Configuration', type: 'step5' },
	{ id: 6, name: 'Step 6: Complete Configuration', type: 'step6' },
]

export default function StepNavigation({ currentStep, onStepChange }: StepNavigationProps) {
	return (
		<div className="bg-white border-b border-gray-200 px-6 py-4">
			<nav className="flex space-x-1">
				{steps.map(step => (
					<button
						key={step.id}
						onClick={() => onStepChange(step.id)}
						className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
							currentStep === step.id
								? 'bg-brand text-white'
								: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
						}`}
					>
						{step.name}
					</button>
				))}
			</nav>
		</div>
	)
}
