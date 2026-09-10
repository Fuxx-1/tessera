import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: "dist-library",
    lib: { entry: "src/library.ts", formats: ["es"], fileName: "index", cssFileName: "components" },
    rollupOptions: {
      external: ["react", "react/jsx-runtime", "react/jsx-dev-runtime", "react-dom", "react-dom/client", "dompurify", "markdown-it", "mermaid"],
    },
    sourcemap: false,
  },
});
