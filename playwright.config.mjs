export default {
  testDir: "./tests/e2e",
  testMatch: /.*\.pw\.mjs/,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["line"]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- -H 127.0.0.1 -p 3100",
    url: "http://127.0.0.1:3100/login",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
};
