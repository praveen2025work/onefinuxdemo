/** Local Vite → Java is a server hop. Forwarding Origin makes Spring CORS reject the console. */
export function stripForwardedOrigin(proxyReq) {
  proxyReq.removeHeader('origin');
}

export function configureSameOriginProxy(proxy) {
  proxy.on('proxyReq', stripForwardedOrigin);
}

export function javaDevProxies(hub = 'http://localhost:7070', sim = 'http://localhost:7081') {
  return {
    '/api': {
      target: hub,
      changeOrigin: true,
      configure: configureSameOriginProxy,
    },
    '/sim': {
      target: sim,
      changeOrigin: true,
      configure: configureSameOriginProxy,
    },
  };
}
