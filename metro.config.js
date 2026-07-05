const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Drizzle's Expo migration bundle imports raw .sql files; let Metro resolve them.
config.resolver.sourceExts.push('sql');

module.exports = config;
