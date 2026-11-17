import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

import {schema} from './src/sanity/schemaTypes'
import {structure} from './src/sanity/structure'

// Hosted on *.sanity.studio, which only exposes SANITY_STUDIO_* env vars, so this
// can't use ./src/sanity/env. Public values, same as NEXT_PUBLIC_SANITY_* in .env.local.
const projectId = 'fth8wagm'
const dataset = 'production'
const apiVersion = '2026-10-05'

export default defineConfig({
  projectId,
  dataset,
  schema,
  plugins: [
    structureTool({structure}),
    visionTool({defaultApiVersion: apiVersion}),
  ],
  document: {
    newDocumentOptions: (prev, {creationContext}) => {
      if (creationContext.type === 'global') {
        return prev.filter(
          (templateItem) => templateItem.templateId !== 'parishSettings',
        )
      }
      return prev
    },
  },
})
