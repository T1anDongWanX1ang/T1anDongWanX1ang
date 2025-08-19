import { PropsWithChildren } from 'react'
import { clsx } from 'clsx'

type BoxProps = PropsWithChildren<{
	title?: string
	right?: React.ReactNode
	className?: string
}>

export default function Box({ title, right, className, children }: BoxProps) {
	return (
		<section className={clsx('bg-white rounded border border-gray-200', className)}>
			{(title || right) && (
				<header className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
					{title && <h3 className="font-semibold text-gray-800">{title}</h3>}
					{right}
				</header>
			)}
			<div className="p-4">{children}</div>
		</section>
	)
}


