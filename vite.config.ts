
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix: 'Property cwd does not exist on type Process'. 
  // Using '.' as a safe alternative to process.cwd() for loadEnv in Vite config to resolve TS path recognition issues.
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // Это позволяет использовать process.env.API_KEY в коде, как того требует SDK Gemini
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
    },
    build: {
      target: 'esnext'
    }
  };
});
