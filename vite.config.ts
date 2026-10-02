import { createLogger, defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => {
  const localBackend = command === "serve" && process.env.EASYMSA_LOCAL_BACKEND === "1";
  const logger = createLogger();
  // Vite proxy errors include the request URL; job URLs can contain access tokens.
  const originalError = logger.error.bind(logger);
  logger.error = (message, options) => originalError(
    message.replace(/([?&]token=)[^\s&#]*/gi, "$1[REDACTED]"), options
  );
  return {
    plugins: [react()],
    base: "/easymsa/",
    customLogger: logger,
    server: localBackend ? {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      // Windows editors on /mnt/d do not reliably emit WSL inotify events.
      watch: { usePolling: true, interval: 500 },
      proxy: {
        "/api": {
          target: "http://127.0.0.1:18000",
          changeOrigin: true,
          timeout: 1_900_000,
          proxyTimeout: 1_900_000,
          configure(proxy) {
            proxy.on("error", (_error, _request, response) => {
              if ("writeHead" in response && !response.headersSent && !response.destroyed) {
                response.writeHead(502, { "Content-Type": "application/json" });
                response.end(JSON.stringify({ error: {
                  code: "DEV_BACKEND_OFFLINE",
                  message: "SSH development connection is offline. Run Reconnect-local-dev.cmd.",
                  details: null
                } }));
              }
            });
          }
        }
      }
    } : undefined
  };
});
