// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
   ssr: false, // For map components, consider disabling SSR
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  plugins: ['~/plugins/leaflet.client.js'],
  modules: ['@nuxtjs/leaflet', '@nuxtjs/supabase'],
  supabase: {
    // Explicitly set the credentials
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    // Disable redirects for now
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/'] 
    }
  },
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    }
  }
})