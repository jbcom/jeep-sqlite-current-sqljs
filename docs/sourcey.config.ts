import { defineConfig, markdown } from 'sourcey';

export default defineConfig({
  name: 'jeep-sqlite',
  siteUrl: 'https://jonbogaty.com',
  baseUrl: '/jeep-sqlite-current-sqljs',
  theme: {
    preset: 'default',
    colors: {
      primary: '#16161d',
      light: '#5a67d8',
      dark: '#0b0b10',
    },
    fonts: {
      sans: 'system-ui, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    },
    layout: {
      sidebar: '17rem',
      toc: '18rem',
      content: '46rem',
    },
    css: ['./brand.css'],
  },
  favicon: './assets/favicon.svg',
  repo: 'https://github.com/jbcom/jeep-sqlite-current-sqljs',
  editBranch: 'main',
  editBasePath: 'docs',
  prettyUrls: 'slash',
  navbar: {
    links: [
      { type: 'github', href: 'https://github.com/jbcom/jeep-sqlite-current-sqljs' },
      { label: 'npm', href: 'https://www.npmjs.com/package/jeep-sqlite-current-sqljs' },
      { label: 'Upstream', href: 'https://github.com/jepiqueau/jeep-sqlite' },
    ],
  },
  footer: {
    links: [
      {
        label: 'MIT License',
        href: 'https://github.com/jbcom/jeep-sqlite-current-sqljs/blob/main/LICENSE',
      },
      {
        label: 'Security',
        href: 'https://github.com/jbcom/jeep-sqlite-current-sqljs/security/policy',
      },
    ],
  },
  navigation: {
    tabs: [
      {
        tab: 'Documentation',
        slug: '',
        source: markdown({
          groups: [
            {
              group: 'Getting Started',
              pages: ['introduction', 'getting-started'],
            },
            {
              group: 'Guides',
              pages: ['Stencil_App'],
            },
            {
              group: 'Reference',
              pages: ['API', 'ARCHITECTURE'],
            },
            {
              group: 'Project',
              pages: ['decisions', 'contributing', 'release-history'],
            },
          ],
        }),
      },
    ],
  },
});
