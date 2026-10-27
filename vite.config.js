import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Debe coincidir con el nombre de tu repositorio en GitHub
  base: '/calculadora-Delta-Estrella/',
})
