/* eslint-env node */
// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { FileStore } = require('metro-cache');
const path = require("path");
const fs = require('fs');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.transformer.getTransformOptions = async () => ({
  transform: {
    inlineRequires: true,
  },
});

// This helps support certain popular third-party libraries
// such as Firebase that use the extension cjs.
config.resolver.sourceExts.push("cjs");

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

// Watch all folders in the monorepo
config.watchFolders = [monorepoRoot];

// Add node_modules resolution paths
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force resolution for problematic packages
const extraNodeModules = {};

// Specifically resolve these packages to the root node_modules
const packagesToResolve = [
  'react',
  'react-dom',
  'react-native',
  'expo',
  'expo-modules-core',
  'expo-localization',
  'fast-text-encoding',
  'react-native-get-random-values',
  '@ethersproject/shims',
  '@react-navigation/native',
  '@react-navigation/bottom-tabs',
  '@react-navigation/elements',
  '@react-navigation/core',
  'react-native-reanimated',
  'react-native-gesture-handler',
  'react-native-safe-area-context'
];

// Add each package to extraNodeModules with explicit path
packagesToResolve.forEach(pkg => {
  const packagePath = path.resolve(monorepoRoot, 'node_modules', pkg);
  if (fs.existsSync(packagePath)) {
    extraNodeModules[pkg] = packagePath;
  }
});

config.resolver.extraNodeModules = extraNodeModules;

// Make sure symlinks work
config.resolver.disableHierarchicalLookup = false;
config.resolver.enableWorkspacesSymlinksResolution = true;

// Use turborepo to restore the cache when possible
config.cacheStores = [
  new FileStore({ root: path.join(__dirname, 'node_modules', '.cache', 'metro') }),
];

module.exports = config;