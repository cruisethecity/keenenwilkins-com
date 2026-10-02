import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  build: {
    // Source maps ship to a public bucket, so they are off. Turn them on
    // locally when you need to debug a production build.
    sourcemap: false,
    target: "es2022",

    rollupOptions: {
      output: {
        // Everything fingerprinted lands in assets, which is the prefix the
        // deploy workflow marks immutable for a year.
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",

        // Motion and the markdown pipeline are the two heaviest imports and
        // they change far less often than the resume content. Splitting them
        // out means a copy edit does not bust the whole vendor cache.
        //
        // Function form, not the object shorthand. The object form is a
        // Rollup convenience that Vite's Rolldown based bundler rejects.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("motion")) return "motion";
          if (id.includes("marked") || id.includes("dompurify")) return "markdown";
          if (id.includes("react")) return "react";
          return undefined;
        },
      },
    },
  },

  server: {
    port: 5173,
    strictPort: false,
  },

  preview: {
    port: 4173,
  },
});
