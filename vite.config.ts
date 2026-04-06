import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const [repositoryOwner = 'tuatmcc', repositoryName = 'Hackathon2026Spring-A'] =
    process.env.GITHUB_REPOSITORY?.split('/') ?? ['tuatmcc', 'Hackathon2026Spring-A']
  const siteUrl = `https://${repositoryOwner}.github.io/${repositoryName}/`
  const ogImageUrl = new URL('thumbnail.png', siteUrl).toString()

  return {
    base: command === 'build' ? `/${repositoryName}/` : '/',
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      {
        name: 'inject-social-meta',
        transformIndexHtml(html) {
          return html
            .replaceAll('%SITE_URL%', siteUrl)
            .replaceAll('%OG_IMAGE_URL%', ogImageUrl)
        },
      },
    ],
  }
})
