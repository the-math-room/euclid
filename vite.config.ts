import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  base: "/euclid/",
  resolve: {
    alias: {
      "@euclid/assessment": resolve(__dirname, "packages/assessment/src"),
      "@euclid/document": resolve(__dirname, "packages/document/src"),
      "@euclid/geometry": resolve(__dirname, "packages/geometry/src"),
      "@euclid/rendering": resolve(__dirname, "packages/rendering/src"),
    },
  },
  plugins: [react()],
});
