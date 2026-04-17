import { defineConfig } from "vitest/config";
import { createNycInstrumentationPlugin } from "./nycInstrumentationPlugin";

export default defineConfig({
  plugins: [createNycInstrumentationPlugin()],
  test: {
    environment: "happy-dom",
    testTimeout: 60000,
    includeSource: ["src/**/*.ts"],
    deps: {
      interopDefault: true,
    },
  },
});
