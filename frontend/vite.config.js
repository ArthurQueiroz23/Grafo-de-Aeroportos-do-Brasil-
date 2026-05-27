import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

function staticDirPlugin(urlPrefix, dirPath) {
  return {
    name: `serve-${urlPrefix.replace("/", "")}`,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith(urlPrefix)) return next();
        const filePath = path.join(dirPath, req.url.slice(urlPrefix.length));
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return next();
        const ext = path.extname(filePath).toLowerCase();
        const mime = {
          ".json": "application/json",
          ".csv": "text/csv",
          ".html": "text/html",
          ".png": "image/png",
          ".txt": "text/plain",
        }[ext] || "application/octet-stream";
        res.setHeader("Content-Type", mime);
        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    react(),
    staticDirPlugin("/out", path.resolve(__dirname, "../out")),
    staticDirPlugin("/data", path.resolve(__dirname, "../data")),
  ],
  server: { port: 5173 },
});
