/**
 * Jest 配置。
 *
 * `prototype/interactive/scan-ux/prototype.test.js` 是一个可以直接通过
 * Node 执行的原型检查脚本，不属于 Jest 测试套件，因此需要显式排除。
 * 正式 RN 测试仍然放在 `__tests__/` 和 `tests/` 目录中。
 */
module.exports = {
  preset: '@react-native/jest-preset',
  testPathIgnorePatterns: ['/node_modules/', '/prototype/'],
  transformIgnorePatterns: [
    'node_modules/(?!((@)?react-native|react-native-image-picker)/)',
  ],
};
