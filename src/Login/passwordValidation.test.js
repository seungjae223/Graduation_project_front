import { getPasswordIssues, PASSWORD_PATTERN } from "./passwordValidation";

test.each(["ValidPass!10", "Abcdefghij~", "With spacesA!", "Abcdefghij&", "Abcdefghij@"])("existing accepted password remains accepted: %s", value => {
  expect(PASSWORD_PATTERN.test(value)).toBe(true);
  expect(getPasswordIssues(value)).toEqual([]);
});

test.each(["short", "abcdefghij!", "ABCDEFGHIJ!", "Abcdefghij", "Abcdefghij.", "Abcdefghij\n!"])("every existing rejected sample has an actionable reason: %s", value => {
  expect(PASSWORD_PATTERN.test(value)).toBe(false);
  expect(getPasswordIssues(value).length).toBeGreaterThan(0);
});
