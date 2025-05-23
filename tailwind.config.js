/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'media', // Respects user's system preference
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    'bg-blue-100',
    'bg-blue-500',
    'bg-red-100', 
    'bg-red-500',
    'bg-orange-100',
    'bg-orange-500',
    'bg-purple-100',
    'bg-purple-500',
    'bg-teal-100',
    'bg-teal-500',
    'bg-indigo-100',
    'bg-indigo-500',
    'bg-gray-100',
    'hover:opacity-80',
    // Dark mode variants
    'dark:bg-blue-700',
    'dark:bg-blue-900',
    'dark:bg-red-700',
    'dark:bg-red-900',
    'dark:bg-orange-700',
    'dark:bg-orange-900',
    'dark:bg-purple-700',
    'dark:bg-purple-900',
    'dark:bg-teal-700',
    'dark:bg-teal-900',
    'dark:bg-indigo-700',
    'dark:bg-indigo-900',
    'dark:bg-gray-600',
    'dark:bg-gray-800'
  ]
} 