// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// เพิ่มการรองรับไฟล์ .cjs
config.resolver.sourceExts.push('cjs');

// ปิดการใช้งาน package exports (สำคัญมาก!)
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
