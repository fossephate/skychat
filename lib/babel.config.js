module.exports = {
  presets: ['module:react-native-builder-bob/babel-preset'],
  plugins: [
    [
      "module-resolver",
      {
        root: ["./src"],
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        alias: {
          "@": "./src",
        },
      },
    ],
  ]
};
