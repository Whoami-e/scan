/**
 * 应用入口的最小渲染测试。
 *
 * 这个测试不验证相机、文件系统或 PDF，因为这些能力属于原生模块边界，
 * 应在对应模块接入后增加集成测试。当前测试只保证 RN 根组件可以被创建。
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
