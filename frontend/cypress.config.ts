import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/commands.ts",
    video: true,
    videoCompression: 32,
    screenshotOnRunFailure: true,
    retries: { runMode: 2, openMode: 0 },
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    viewportWidth: 1280,
    viewportHeight: 720,
    env: {
      API_URL: "http://localhost:8000",
    },
    setupNodeEvents(on, config) {
      on("task", {
        log(message) { console.log(message); return null; },
      });
      return config;
    },
  },
});
