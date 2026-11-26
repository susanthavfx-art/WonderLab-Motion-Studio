import { defineConfig } from "vite";
export default defineConfig({
  // Relative assets work under GitHub project Pages and on the Arena preview.
  base: "./",
  server: { host: "0.0.0.0", allowedHosts: [".e2b.app"] },
});
