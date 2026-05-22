/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                babyCream: '#FFFDF9',
                babyYellow: '#FFF0CA',
                babyBlue: '#D4ECFC',
                babyPink: '#FFD6D6',
                babyGreen: '#D8ECD0',
                babyPurple: '#F0E5FC',
                textColor: '#4A3E3D',
                brandPrimary: '#FF9E9E'
            }
        },
    },
    plugins: [],
}
