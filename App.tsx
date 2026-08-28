/**
 * React Native 的应用入口。
 *
 * 这里故意只保留“启动应用”这一层职责：
 * 1. 给整个应用挂载 SafeAreaProvider，统一处理刘海、状态栏和底部手势区域。
 * 2. 把真正的页面和业务入口交给 src/app/App，避免根文件逐渐变成“大杂烩”。
 * 3. 后续增加导航、全局状态、错误边界或本地存储初始化时，都可以在 src/app/App
 *    内集中处理，不需要修改原生生成的 index.js。
 */

import App from './src/app/App';

export default App;
