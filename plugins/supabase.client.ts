export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient()
  
  // Optional: Add global error handling
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      // Handle sign out
      navigateTo('/login')
    }
  })
})