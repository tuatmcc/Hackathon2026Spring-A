import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const repositoryName =
    process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'Hackathon2026Spring-A'

  return {
    base: command === 'build' ? `/${repositoryName}/` : '/',
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] })
    ],
  }
})
