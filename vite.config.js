export default {
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
}