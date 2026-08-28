/**
 * 应用级装配入口。
 *
 * 当前工程还没有接入导航库，因此先用首页作为启动页面，保证工程生成后就能运行。
 * 等 M5 开始接入真实流程时，建议在这里挂载导航容器，并让每个页面只负责自己的
 * 展示和交互，不要把相机、图片处理或文件持久化逻辑直接写进页面。
 */

import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      {/* 首页属于浅色工作区，因此状态栏使用深色文字。相机页接入后再按页面切换。 */}
      <StatusBar barStyle="dark-content" />
      <HomeScreen />
    </SafeAreaProvider>
  );
}

export default App;
