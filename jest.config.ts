import type { Config } from "jest"

const config: Config = {
  testTimeout: 10000,
  projects: [
    {
      displayName: "unit",
      testEnvironment: "jsdom",
      testMatch: ["<rootDir>/tests/unit/**/*.test.{ts,tsx}"],
      transform: {
        "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
        "\\.(css|less|scss|sass)$": "<rootDir>/tests/__mocks__/styleMock.js",
      },
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
      transformIgnorePatterns: ["/node_modules/(?!(date-fns|tailwind-merge|clsx)/)"],
    },
    {
      displayName: "integration",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
      transform: {
        "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
      },
    },
  ],
}

export default config
