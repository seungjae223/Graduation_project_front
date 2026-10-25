import { buildQueries, queryAllByAttribute, within } from "@testing-library/react";

// Attribute queries cover presentation-only wrappers that have no accessible role.
// Use the normal role/name/text queries for interactive behavior.
export const queryAllByClass = (container, className) => queryAllByAttribute(
  "class", container, value => value.split(/\s+/).includes(className)
);
const [queryByClass, getAllByClass, getByClass] = buildQueries(queryAllByClass,
  (_, className) => `Multiple elements have class ${className}`,
  (_, className) => `No element has class ${className}`);
export { queryByClass, getAllByClass, getByClass };
const attributeMatches = (container, attribute, value) => queryAllByAttribute(attribute, container, value);
const [, getAllAttributes, getAttribute] = buildQueries(attributeMatches,
  (_, attribute) => `Multiple elements have attribute ${attribute}`,
  (_, attribute) => `No element has attribute ${attribute}`);
export const getByAttribute = (attribute, container, value) => getAttribute(container, attribute, value);
export const getAllByAttribute = (attribute, container, value) => getAllAttributes(container, attribute, value);

export const getArticleByText = (text, container = document.body) => {
  const article = within(container).getAllByRole("article", { hidden: true })
    .find(candidate => within(candidate).queryByText(text));
  if (!article) throw new Error(`No article contains ${text}`);
  return article;
};
