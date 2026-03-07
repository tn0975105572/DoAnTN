// Jest setup file
const { v4: uuidv4 } = require('uuid');

// Mock console.log để giảm noise trong test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Tăng timeout cho các test
jest.setTimeout(30000);

// Global test helpers
global.generateTestId = () => `test-${uuidv4()}`;
global.generateTestEmail = () => `test-${uuidv4()}@example.com`;

// Mock database connection nếu cần
global.mockDatabase = {
  query: jest.fn(),
  getConnection: jest.fn(),
  release: jest.fn()
};

// Cleanup function
afterEach(() => {
  jest.clearAllMocks();
});
