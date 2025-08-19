/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./index.html',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		extend: {
			colors: {
				brand: {
					DEFAULT: '#4F46E5',
					muted: '#EEF2FF',
				},
			},
		},
	},
	plugins: [],
};



