import { defineConfig } from 'vitepress'
import { withMermaidDiagramRenderer } from 'mermaid-diagram-for-vitepress2'

// https://vitepress.dev/reference/site-config
const config = defineConfig({ 
  title: "Intuitive D4UI ドキュメント",
  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/hirosof/IntuitiveD4UI' }
    ]
  }
})

export default withMermaidDiagramRenderer(config)
