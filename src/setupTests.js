// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
// Existing regression fixtures exercise real API/authentication contracts.
// Mock integration suites opt in with their own mockConfig factory.
jest.mock('./config/mockConfig', () => ({ USE_MOCK: false }));
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
