import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {projectId: 'fth8wagm', dataset: 'production'},
  // https://san-roque-sampaloc.sanity.studio
  studioHost: 'san-roque-sampaloc',
  deployment: {
    appId: 'ofoyqp8dcumurj34ujnpvpca',
  },
  typegen: {
    enabled: true,
  },
})
