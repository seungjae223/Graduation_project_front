// Production-only: never publish original sources through source maps.
process.env.GENERATE_SOURCEMAP = "false";
require("react-scripts/scripts/build");
