/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const CheckerPlugin = require("fork-ts-checker-webpack-plugin");
const webpack = require("webpack");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer')
const ProgressBarPlugin = require('progress-bar-webpack-plugin')
const InlineManifestWebpackPlugin = require('inline-manifest-webpack-plugin')

require("dotenv").config();

const resolve = path.resolve.bind(path, __dirname);

const pathsPlugin = new TsconfigPathsPlugin({
  configFile: "./tsconfig.json"
});

const checkerPlugin = new CheckerPlugin({
  eslint: true,
  reportFiles: ["src/**/*.{ts,tsx}"]
});
const htmlWebpackPlugin = new HtmlWebpackPlugin({
  filename: "index.html",
  hash: true,
  template: "./src/index.html"
});
const bundleAnalyzerPlugin = new BundleAnalyzerPlugin();
const inlineManifestWebpackPlugin = new InlineManifestWebpackPlugin('webpackManifest');
const environmentPlugin = new webpack.EnvironmentPlugin([
  "APP_MOUNT_URI",
  "API_URI"
]);

const dashboardBuildPath = "build/dashboard/";
const rootNodeModulesPath = resolve(__dirname, 'node_modules')
const toBoolean = bool => bool === 'true' || bool === true
const localePath = resolve(__dirname, 'locale')

module.exports = (env, argv) => {
  const prodMode = argv.mode === "production";
  const devMode = argv.mode !== "production";

  let fileLoaderPath;
  let output;

  if(!process.env.API_URI) {
    throw new Error("Environment variable API_URI not set")
  }

  if (!devMode) {
    const publicPath = process.env.STATIC_URL || "/";
    output = {
      chunkFilename: "[name].[chunkhash].js",
      filename: "[name].[chunkhash].js",
      path: resolve(dashboardBuildPath),
      publicPath
    };
    fileLoaderPath = "file-loader?name=[name].[hash].[ext]";
  } else {
    output = {
      chunkFilename: "[name].js",
      filename: "[name].js",
      path: resolve(dashboardBuildPath),
      publicPath: "/"
    };
    fileLoaderPath = "file-loader?name=[name].[ext]";
  }

  return {
    devServer: {
      compress: true,
      contentBase: path.join(__dirname, dashboardBuildPath),
      historyApiFallback: true,
      hot: true,
      port: 9000
    },
    devtool: prodMode ? false : "sourceMap",
    entry: {
      dashboard: "./src/index.tsx"
    },
    module: {
      rules: [
        {
          exclude: /node_modules/,
          loader: "babel-loader",
          options: {
            cacheDirectory: devMode,
            configFile: resolve("./babel.config.js")
          },
          test: /\.(jsx?|tsx?)$/
        },
        {
          include: [
            resolve("node_modules"),
            resolve("assets/fonts"),
            resolve("assets/images"),
            resolve("assets/favicons")
          ],
          loader: fileLoaderPath,
          test: /\.(eot|otf|png|svg|jpg|ttf|woff|woff2)(\?v=[0-9.]+)?$/
        }
      ]
    },
    optimization: {
      runtimeChunk: {
        name: 'webpackManifest',
      },
      splitChunks: {
        cacheGroups: {
          locale: {
            chunks: 'initial',
            enforce: true,
            name: 'locale',
            priority: 10,
            test({resource}) {
              return (
                resource &&
                /\.json$/.test(resource) &&
                resource.includes(localePath)
                // new RegExp(localePath, 'i').test(resource)
              )
            },
          },
          react: {
            chunks: 'initial',
            enforce: true,
            name: 'react',
            priority: 9,
            test({resource}) {
              const targets = ['react', 'react-apollo', 'react-dom', 'react-dropzone', 'react-error-boundary', 'react-helmet', 'react-infinite-scroller', 'react-inlinesvg', 'react-intl', 'react-jss', 'react-moment', 'react-router', 'react-router-dom', 'react-sortable-hoc', 'react-sortable-tree']

              return (
                resource &&
                /\.js$/.test(resource) &&
                resource.indexOf(rootNodeModulesPath) === 0 &&
                targets.find(t => new RegExp(`${rootNodeModulesPath}/${t}/`, 'i').test(resource))
              )
            },
          },
          // any required modules inside node_modules are extracted to vendor
          vendor: {
            chunks: 'initial',
            enforce: true,
            name: 'vendor',
            priority: 8,
            test({resource}) {
              return resource && /\.js$/.test(resource) && resource.indexOf(rootNodeModulesPath) === 0
            },
          },
        },
      },
    },
    output,
    plugins: [
      devMode && checkerPlugin, 
      environmentPlugin, 
      htmlWebpackPlugin, 
      toBoolean(process.env.BUNDLE_ANALYZER_REPORT) && prodMode && bundleAnalyzerPlugin,
      // new ProgressBarPlugin(),
      prodMode && inlineManifestWebpackPlugin,
    ].filter(Boolean),
    resolve: {
      extensions: [".js", ".jsx", ".ts", ".tsx"],
      plugins: [pathsPlugin]
    }
  };
};
