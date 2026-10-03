// CRA's legacy SVG Jest transformer creates React 17 elements; tests use React 19.
const React = require("react");
module.exports = { __esModule: true, default: "test.svg", ReactComponent: props => React.createElement("svg", props) };
