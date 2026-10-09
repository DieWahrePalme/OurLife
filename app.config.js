// app.json holds the static config. This file only adds one thing on top:
// on GitHub Pages the app is served from a subpath
// (https://<user>.github.io/<repo>/), so every asset/route needs that prefix.
// The GitHub Actions workflow sets GH_PAGES_BASE_PATH before `expo export`;
// every other build (local dev) leaves it unset and behaves as before.
module.exports = ({ config }) => {
  const basePath = process.env.GH_PAGES_BASE_PATH;
  if (basePath) {
    config.experiments = { ...config.experiments, baseUrl: basePath };
  }
  return config;
};
