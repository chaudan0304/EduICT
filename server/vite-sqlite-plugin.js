export function sqliteApiPlugin() {
  return {
    name: 'vite-plugin-edumaster-sqlite',
    async configureServer(server) {
      // Build must never initialize or reconcile the user's SQLite database.
      const { handleApiRequest } = await import('./api-handler.js');
      const { handleUploadsRequest } = await import('./static-file-handler.js');
      const { startAutomaticBackup } = await import('./services/automaticBackup.js');
      const stopBackup = startAutomaticBackup();
      server.httpServer?.once('close', stopBackup);
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/uploads/')) {
          const handled = handleUploadsRequest(req, res);
          if (handled) return;
        }

        if (req.url && req.url.startsWith('/api/')) {
          try {
            const handled = await handleApiRequest(req, res);
            if (handled || res.headersSent || res.writableEnded) return;
          } catch (err) {
            console.error('API Error:', err);
            if (res.headersSent || res.writableEnded) return;
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
        }
        next();
      });
    },
  };
}
