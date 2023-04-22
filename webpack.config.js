const path = require("path")

const DIST_DIR = path.join(__dirname, "dist")

module.exports = {
  entry: {
    client: "./src/extension.ts",
  },
  context: __dirname,

  output: {
    path: DIST_DIR,
    filename: "extension.js",
    libraryTarget: "commonjs2",
  },

  resolve: {
    extensions: [".ts", ".js"],
  },

  // https://webpack.js.org/configuration/node/
  target: "node",

  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: "ts-loader",
        options: { transpileOnly: true },
      },
    ],
  },

  externals: {
    vscode: "commonjs vscode",
  },
}
