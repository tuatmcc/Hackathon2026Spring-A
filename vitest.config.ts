import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    testTimeout: 60000,
    includeSource: ["src/**/*.ts"],
    deps: {
      interopDefault: true,
    },
  },
});