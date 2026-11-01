# Smooth · DSH Web 界面皮肤

<p align="center">
  <img src="https://img.shields.io/badge/DSH-%3E%3D0.2.1--rc.5-4c6ef5?style=flat-square&labelColor=454a54" alt="DSH">
  &nbsp;
  <img src="https://img.shields.io/badge/version-0.1.0-4c6ef5?style=flat-square&labelColor=454a54" alt="Version">
  &nbsp;
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
</p>

<p align="center">
  <strong>DeepSeek Harness（DSH）Web 界面的皮肤插件：统一配色、圆角与列表密度</strong><br>
  <em>六套主题预设 · 侧栏会话树 · 顶部标签 · 双层输入卡片 · 欢迎页用量热力图 · 零主线程启动动画</em>
</p>

Smooth 是一份 DSH Web 界面的皮肤：它不复制宿主页面，只按参考图重画配色、圆角、列表密度与几处交互，其余全部沿用宿主的组件与接口。关掉皮肤即恢复原生样式与外观选项，侧栏宽度若已手动拖动也一并保留。宿主契约按 **DSH 0.2.1-rc.5** 核对，**rc.3 起可用**。

## 是什么

- **六套主题预设**：跟随主题 / 初雪白 / 玄铁黑 / 苔痕绿 / 落日橙 / 深海蓝，切换时整页用 View Transition 做一次从左上角展开的圆形揭示；主题通过宿主的 `theme.overrideTokens()` 同时写 light / dark 两档，固定预设两档取同一套颜色，所以宿主明暗怎么变都是该预设。旧版本存下的 `light` / `dark` 会自动迁移成「初雪白」/「玄铁黑」。
- **侧栏与会话树**：38px 图标栏、352px 会话树（仍可拖动）、悬停标题行浮出「进行中 / 已归档」分段切换、归档对话可在行内直接删除（先弹原生 `Modal` 确认）。会话行 28px、工作区行 29px、会话名 12.5px/18px，时间 11px/16px；收起再展开时左侧宽度保持不变。
- **顶部标签**：可拖动重排、滚轮横向滚动、新标签置前、预览标签只在真正发出第一条消息时固定、归档后标签自动下线、全部关闭回到首页。标签条是固定尺寸的 chrome，不随窗口变高变圆。
- **双层输入卡片**：上层是独立描边的输入区（1px 描边、16px 圆角、发送键在右上角），下层是页面底色上的功能行；模型入口换成皮肤自己的两页面板（思考强度滑杆 + 模型列表），最高挡位有粒子与光层；上下文占用环点开是三段占比与 Token 用量。
- **欢迎页与用量面板**：沿用宿主自己的堆叠与占比，皮肤不再手工摆位；标题下方一张用量卡，先排六格数字，再是 26 周 × 7 天的 Token 热力图与模型排行，数据来自 Host 半只读扫描会话日志。
- **启动动画**：首帧直接显示宿主 FishLogo 的内联鲸鱼，整段开场没有任何主线程动画——摆动挂在**外层 HTML 盒子的 CSS transform** 上交给 compositor，主线程被 bundle 解析占满时照跑。最短停留 1500ms，可开关，也能在设置页就地预览。
- **账号菜单**：在原生 `settings.launcher` 上增加头像资料、真实余额与帮助页；弹窗从自己的左下角（头像所在的角）缩放进场，收回时复制一份菜单播放反向动画。
- **无障碍**：分段控件带 `aria-pressed`，键盘焦点进入时控制条也会显示；系统开启「减少动态效果」时全部动效直接切换。

## 安装

### 从仓库安装

`lib/` 是构建产物，先构建一次：

```sh
git clone https://github.com/Super-Gagaga/dsh-smooth-skin.git
cd dsh-smooth-skin
node build.mjs      # 生成 lib/index.js 与 lib/client.js
```

然后把这个仓库挂进 DSH 的 profile（桌面端在 `~/.dsh/profiles/desktop/`）：

1. profile `package.json` 的 `dependencies` 里加一行 `"dsh-smooth-skin": "link:<仓库绝对路径>"`
2. 同一个文件的 `dsh.profile.bundles` 数组里加一行 `"dsh-smooth-skin"`
3. 让 profile 的 `node_modules/dsh-smooth-skin` 指向这个仓库（开发时直接建软链即可）
4. **从托盘完全退出** DSH 再打开——只刷新页面不会清除 Host 进程已导入的模块

仓库根目录的 `cordis.patch.yml` 是插件自带的 bundle 补丁（插入 `smooth-skin` 行），随包一起生效，不需要再往 profile 的 patch 层里写一遍。

### 启用与关闭

安装后进入 `设置 → Smooth`，标题旁有一枚实时状态徽标（已启用 / 已关闭）。所有改动即时写入 `localStorage`，没有单独的保存按钮；关闭皮肤会撤销插槽覆盖、令牌覆盖与样式表，恢复原生样式，侧栏宽度保留手动拖出的值。

### 手工升级

```sh
git pull && node build.mjs
```

`lib/` 是构建产物，Host 半的改动必须完全退出 DSH 才生效；Client 半的改动刷新页面即可。

## 故障排查

### 插件激活失败，报 `cannot get property "..." without inject`

Cordis 对未写进 `inject` 的服务名会直接抛错。客户端的 `inject` 必须声明它用到的全部服务（`theme` / `slots` / `locale` / `layout` / `uiWorkspace` / `sessions` / `remote` / `remote.workspaceFiles` 等）；漏掉 `remote.session` 时，全新会话（输入框还空着）点模型按钮会落回原生菜单——这是已知的表现，补上声明即可。Host 半反过来不声明任何 `inject`，只在请求到达时 `ctx.get`。

### 改了 Host 半（`lib/index.js`）不生效

Host 半随应用启动被导入一次，之后不会再读磁盘。先 `node build.mjs`，再从托盘完全退出 DeepSeek Harness 并重新打开。

### 更新 DSH 后样式错位或插件不显示

宿主大版本升级后需要复核 CSS module 类名、`data-*` 属性、slot 与 `--dsw-*` 令牌：

```sh
npm run check:host      # 缺哪一项就报哪一项，并退出非零
```

安装路径不在默认位置时用 `DSH_APP_ASAR` 或 `--asar <path>` 指定。选择器优先匹配宿主的真实属性（`data-plugin-panel`、`data-composer-card` 等），没有公开属性的部位只匹配已核对的 CSS 模块语义后缀，不绑定构建哈希——所以升级后需要重新核对，但不会被构建哈希直接打断。

### 插件市场整页崩成「插件市场无法显示」

手工改 profile 的 `cordis.patch.yml` 时，备份名**不要**用 `<patch>.bak-<纯数字>`：dshmarket 把这种命名当成宿主恢复残留，弹出的横幅要渲染本版 DSH 里不存在的 `IconWarningOutline16`，市场页会整页渲染失败。用 `-manual` 之类的后缀把数字挪到名字中间即可绕开。

### 已归档会话删不掉

删除只对「已归档且没有仍在运行的活动」的会话生效：仍有运行的轮次 / 任务 / 子代理 / 计划任务会拒绝删除，空闲时才会经 `workspace/session-stop` 收尾并清掉持久化日志与投影缓存。

## 已知限制

- 只调整样式与宿主插槽，不复制参考 HTML 的 SVG、图标字体或示例数据；会话名、工作区与插件列表都来自宿主，会话树沿用你当前已安装的 Codex UI 插件。
- 皮肤不隐藏任何宿主内容：`display:none` 只用在参考图里同样不可见的装饰性预览徽标、插件自己可折起的余额面板，以及设置页那枚多余的关闭按钮上。
- 桌面窗口尺寸没有宿主 API 可走：`dshDesktop` 桥没有尺寸通道，主窗口尺寸也不持久化，所以只能由渲染进程调 `window.resizeTo`（Electron 对隐藏窗口同样照做）。因此启动尺寸只在两个时机请求：启动时窗口仍不可见的那一次，以及你在设置里改宽或高时。
- 遵循系统「减少动态效果」：开启后启动动画、圆形揭示、滚动条粗细过渡与各面板进出动效全部直接切换。
- DSH 0.2.0 缺少 composer dock 的新属性，输入框下方那行数据无法完整隐藏；需要 0.2.1 及以上。

## 开发与文档

```sh
node build.mjs                # 构建 lib/index.js 与 lib/client.js
node build.mjs --watch        # 监听 src/ 增量重建
npm test                      # node --test tests/*.test.mjs
npm run check:host            # 宿主契约审计（更新 DSH 后必跑）
```

- 构建、测试、宿主契约边界、模块地图与坑位清单：见 [AGENTS.md](AGENTS.md)
- 每一处尺寸、时序与取舍的理由（结论 → 为什么 → 代价）：见 [docs/design.md](docs/design.md)

## 许可

MIT © Super-Gagaga
