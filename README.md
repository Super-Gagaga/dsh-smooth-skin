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
- **背景透明度**：`设置 → Smooth → 背景透明度` 用 0–100 的滑杆调页面背景的透出程度，默认 5%，拉到 0 与旧版完全一致。装了下面的窗口补丁时，透出的是**系统亚克力**（桌面的磨砂视图）；没装时透出的是皮肤自己的柔和渐变。跟着滑杆透出桌面的是**大块区域底板**：页面底色、侧栏、左侧图标栏、标签条与输入区底板；其中图标栏坐在侧栏玻璃上，用更陡的权重（页面权重的四次方）避免叠成实心；标签条自己铺 surface（窗体条只在侧栏那半铺侧栏色、不再在标签条下面铺一层），所以是单层、和对话区同一权重，左上角角块的侧栏色也只叠在桌面上，和侧栏同色。工作区列表底部那层 24px 虚化也跟着滑杆：`#root` 里的 `--dsw-specific-sidebar-fill` 被改写成侧栏玻璃色，虚化本身再用更陡的四次方权重（30% 时约 24%、50% 时约 6%），比页面更快变透，100% 时完全消失。按钮、列表行、标签芯片、卡片、输入框这些**组件只轻微跟随**（每 3 点通透度降 1 点不透明度：30% 时约 90% 不透明，100% 时 67%），看起来仍是实心的，不会发虚、也不会丢掉选中与悬停的层次。浮层菜单与整页设置只透一层很淡的底板（每 8 点通透度才降 1 点不透明度，最低 85% 不透明），里面的菜单项、表单行、按钮和输入框保持实心——底板足够不透，下面的正文不会干扰阅读。
- **侧栏与会话树**：38px 图标栏、352px 会话树（仍可拖动）、悬停标题行浮出「进行中 / 已归档」分段切换、归档对话可在行内直接删除（先弹原生 `Modal` 确认）。会话行 28px、工作区行 29px、会话名 12.5px/18px，时间 11px/16px；收起再展开时左侧宽度保持不变。
- **顶部标签**：可拖动重排、滚轮横向滚动、新标签置前、预览标签只在真正发出第一条消息时固定、归档后标签自动下线、全部关闭回到首页。标签条是固定尺寸的 chrome，不随窗口变高变圆。
- **双层输入卡片**：上层是独立描边的输入区（1px 描边、16px 圆角、发送键在右上角），下层是页面底色上的功能行；模型入口换成皮肤自己的两页面板（思考强度滑杆 + 模型列表），最高挡位有粒子与光层。输入卡片下方是一枚紧凑的会话用量胶囊按钮，字号与功能行一致：与 ¥ 同形的金额图标、带向下/向上箭头的输入与输出 token、带靶心图标的缓存命中率、带阶梯图标的轮次步数、带仪表图标的 tok/s，右端是上下文占比饼图；点它弹出三段占比与 Token 用量。数字变化时滚动计数而不是瞬间跳变；读数静止时与模型选择按钮同一档亮度，悬停、聚焦或展开浮层时才提亮；设置里可以逐项开关、拖动排序这些读数，上方有实时预览，位置有「收进上下文 / 紧贴底栏 / 独立成行」三档，紧贴底栏还能选左/中/右对齐，独立行固定居中；这两个分段控件和顶部页签一样用滑动药丸，可点击或左右拖动切换。新会话还没有任何 token、轮次或步数时整枚按钮不画，出现第一条读数后再出现。
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

安装后进入 `设置 → Smooth`，标题旁有一枚实时状态徽标（已启用 / 已关闭）。页面按「外观 / 统计 / 启动」三枚页签组织：外观管启用、主题、背景透明度与标记颜色，统计管用量按钮的位置、对齐与显示字段，启动管开场动画与启动窗口尺寸。选中的页签药丸会在三枚之间滑动，也可以直接在页签条上左右拖动或横滑触控板切换。所有改动即时写入 `localStorage`，没有单独的保存按钮；关闭皮肤会撤销插槽覆盖、令牌覆盖与样式表，恢复原生样式，侧栏宽度保留手动拖出的值。

### 透过窗口看到桌面（可选，Windows 11）

插件只能画页面，真正的窗口透明 / 亚克力是 Electron **主进程**的窗口选项，渲染进程碰不到。仓库自带一个补丁脚本，直接改已安装的桌面壳：

1. 双击 `tools/apply-window-glass.cmd`（等价于 `node tools/patch-window-glass.mjs`）。**不需要先退出 DSH**：补丁只覆盖 `resources/app.asar` 里 `lib/main.js` 的一段字节，运行中的进程继续用它已加载的副本。
2. 从**托盘完全退出** DeepSeek Harness 再打开（只关窗口不算）。新进程会按补丁创建窗口。
3. 进入 `设置 → Smooth`，把「背景透明度」拉到 30–70，就能透过窗口看到桌面的磨砂视图。

- 补丁只给 Windows 主窗口加 `backgroundMaterial: "acrylic"` 与 `backgroundColor: "#00000000"`，并在页面每次加载后给 `<body>` 打上 `data-smooth-window-glass`。它靠裁剪同一文件里的注释文字来保持 `lib/main.js` **字节数不变**，所以 asar 头、文件偏移和其它文件都不动；写入前校验语法与字节数，失败保持原样。
- 原始 `lib/main.js` 备份在同目录的 `app.asar.main.js.smooth-window-glass.bak`；`tools/restore-window-glass.cmd`（或 `--restore`）写回，同样重启生效。
- **DSH 每次更新都会覆盖 `app.asar`**，更新后重跑一次补丁即可。没打补丁时皮肤自动退回应用内渐变，滑杆照常可用，只是透出的是皮肤自己的底纹而不是桌面。
- 页面只在看到 `data-smooth-window-glass` 时才交出底色；没打过补丁（或更新后）页面保持实心，不会变成透明白块。

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
- 皮肤不隐藏任何宿主内容：`display:none` 只用在参考图里同样不可见的装饰性预览徽标、插件自己可折起的余额面板、设置页那枚多余的关闭按钮，以及输入卡片下方 dock 里被饼图和会话用量行接管的宿主上下文环与两个统计胶囊。
- 桌面窗口尺寸没有宿主 API 可走：`dshDesktop` 桥没有尺寸通道，主窗口尺寸也不持久化，所以只能由渲染进程调 `window.resizeTo`（Electron 对隐藏窗口同样照做）。因此启动尺寸只在两个时机请求：启动时窗口仍不可见的那一次，以及你在设置里改宽或高时。
- 遵循系统「减少动态效果」：开启后启动动画、圆形揭示、滚动条粗细过渡与各面板进出动效全部直接切换。
- 会话用量行依赖 DSH 0.2.1 的 `conversation.composer.dock` 插槽与 `data-composer-stat` 标记；更早的版本这一行不会出现，宿主自己的数据行会留在卡片下方。

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
