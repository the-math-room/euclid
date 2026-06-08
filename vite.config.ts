import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const productionCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

export default defineConfig(({ command }) => ({
  base: "/euclid/",
  resolve: {
    alias: {
      "@euclid/activity": resolve(__dirname, "packages/activity/src"),
      "@euclid/assessment": resolve(__dirname, "packages/assessment/src"),
      "@euclid/document": resolve(__dirname, "packages/document/src"),
      "@euclid/geometry": resolve(__dirname, "packages/geometry/src"),
      "@euclid/lesson": resolve(__dirname, "packages/lesson/src"),
      "@euclid/rendering": resolve(__dirname, "packages/rendering/src"),
    },
  },
  plugins: [react(), productionSecurityMetaPlugin(command === "build")],
}));

function productionSecurityMetaPlugin(enabled: boolean) {
  return {
    name: "production-security-meta",
    transformIndexHtml(html: string): string {
      if (!enabled) {
        return html;
      }

      return html.replace(
        /content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' http:\/\/127\.0\.0\.1:\* ws:\/\/127\.0\.0\.1:\* http:\/\/localhost:\* ws:\/\/localhost:\*; object-src 'none'; base-uri 'self'; form-action 'self'"/,
        `content="${productionCsp}"`,
      );
    },
  };
}
