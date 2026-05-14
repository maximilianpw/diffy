import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Diffy',
    short_name: 'Diffy',
    description: 'Open GitHub pull requests in Diffy.',
    action: {
      default_title: 'Diffy',
    },
    browser_specific_settings: {
      gecko: {
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  },
});
