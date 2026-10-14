// Expose the existing response normalizer only in the isolated preview bundle.
module.exports = source => source + '\nexport { buildDaysFromServerData };\n';
