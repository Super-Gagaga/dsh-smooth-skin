# Smooth 维护手册

这份文件给要改这份代码的人（和 agent）：构建/自检命令、宿主契约的硬边界、模块地图、验证闸门与坑位清单都在这里。

- 源码在 `src/`；`lib/index.js` 与 `lib/client.js` 是 `node build.mjs` 的产物，不可手改。
- `tools/` 是闸门与度量，`tests/` 是回归；`tests/` 直接跑构建产物，所以改了 `src/` 就必须重新 build。
- 「为什么这样做、代价是什么」不在本文，见 [设计决策](docs/design.md)。

## 环境与命令

```bash
node build.mjs                # 生成 lib/index.js 与 lib/client.js
node build.mjs --watch        # 监听 src/ 增量重建
node tools/activate-host.mjs  # 激活试验台
node tools/export-icons.mjs   # 从 src/boot.js 导出 assets/whale.svg
python tools/prepare-think.py # 从 assets/think/*.png 生成抠好的 cutout/*.webp（原图不入库，换图时才需要）
node tools/export-think.mjs   # 把 cutout 内联进 src/think.js（浏览器端无法运行时读文件）
node tools/startup-profile.mjs # 启动耗时与载荷剖析（改造前后对比用）
node tools/host-contract.mjs  # 更新 DSH 后核对宿主的类名、属性、插槽、令牌与方法
node --test tests/*.test.mjs
```

逐条说用途：

- `node build.mjs`：生成 `lib/index.js` 与 `lib/client.js`，改完 `src/` 必跑。
- `node build.mjs --watch`：监听 `src/` 增量重建，开发时用。
- `node tools/activate-host.mjs`：激活试验台，导入构建产物核对插件契约。
- `node tools/export-icons.mjs`：从 `src/boot.js` 的常量导出 `assets/whale.svg`。
- `python tools/prepare-think.py`：从 `assets/think/*.png` 生成抠好的 `cutout/*.webp`；原图不入库，只有换图时才需要跑。
- `node tools/export-think.mjs`：把 `cutout` 内联进 `src/think.js`——浏览器端无法运行时读文件。
- `node tools/startup-profile.mjs`：启动耗时与载荷剖析，改造前后对比用。
- `node tools/host-contract.mjs`：更新 DSH 后核对宿主的类名、属性、插槽、令牌与方法。
- `node --test tests/*.test.mjs`：跑全部测试（`npm test` 就是这一条）。

## 宿主契约的硬边界

1. **Host 半不声明任何 `inject`。** 它不读任何服务。Cordis 对未写进 `inject` 的服务名会直接抛 `cannot get property "..." without inject`，而事件不需要 `inject`，所以这一半仍然只导出对象形态插件 `{ name, inject: [], apply }`，`apply` 里仅 `ctx.on('webserver/index-inject', …)`。它不读状态、不碰 React 树。`remote.session` 是这条边界上最典型的例子：客户端的 `inject` 没声明它时，全新会话（输入框还空着）解析模型目录会抛 `cannot get property "remote.session" without inject`，面板宿主判定未就绪、触发器监听装不上，点模型按钮就落回原生菜单（要等第一次输入把会话绑定起来才恢复）；现在 `inject` 已声明。

2. **注入表的行必须是纯数据。** `apply` 里把启动动画的三行（`style` / `html` / `script`）和桥接地址/能力令牌推进每份 index 的注入表，监听器随插件一起释放。行必须是可 JSON 序列化的纯数据，因为静态部署会用同一张表；服务端与桌面端使用相同内容。

3. **私有桥只做四类动作，只认本次激活令牌。** 私有回环监听（`/smooth-skin/git`）提供 `status` / `checkout` 两个 Git 动作、落地页用量表的 `usage` 动作（只读扫描会话日志），以及归档列表删除按钮的 `session-delete` 动作。它只在请求到达时才用 `ctx.get` 读取 `sessions` / `workspaceRegistry` / `sessionPersistence`，并用 `ctx.waterfall` / `ctx.parallel` 走归档准入事件，因此插件激活仍然不声明任何 `inject`。它只接受带本次激活令牌的 POST，且只删除「已归档、没有仍在运行活动」的会话目录：删除前通过 `workspace/session-activity` 检查活动、`workspace/session-stop` 收尾，并清掉工作区记账与内存 store 条目（驱动客户端的 `api-session/removed`）；插件释放时关闭。令牌**跨激活保留**（写在 `$DSH_HOME/cache/smooth-bridge-token`）：页面手里的那份不会因为重新激活、重建或重启而失效，否则旧页面会被 403 挡在门外直到刷新。Host 半更新后需重启 DSH，未加载时分支按钮回退为复制分支名。

4. **Client 产物显式导出 `name` / `inject` / `apply`。** 服务 `theme` / `slots` / `locale` / `layout` / `uiWorkspace` / `sessions` / `remote` / `remote.workspaceFiles` 均声明在 `inject` 中，manifest 同时列出相应提供模块和设置、会话模块。

5. **重注册原生组件时保留它的全部注册选项。** 首页权限选择通过 React portal 放入输入框顶部，模式选择放入底部。重新注册原生组件时保留它的全部注册选项（`locale`、`store`、`inject`、`children` 以及宿主后续新增的字段，只排除会冲突的 `id` 并调整 `priority`/`registrant`）和确认交互。`children` 不能丢：DSH 0.2.1 的模型选择用它在 `conversation.input.model.label` 下声明子插槽，丢了 `renderSlot` 会变成 `undefined`。关闭皮肤时撤销插槽覆盖和 portal，恢复原生位置；不手动搬移宿主 React 管理的 DOM。

6. **标签状态属于本次客户端生命周期。** 顶部标签通过 `layout.selectPanel()`、`uiWorkspace.startSession()` / `openSession()` 和原生设置 store 导航。打开对话或页面先显示临时标签；在内容区输入、修改表单或点击操作控件后固定，单纯浏览不会累积标签，也不会自动加入其他历史会话，双击标签也可固定。点击关闭按钮或在标签上按 Delete 仅关闭标签，保留对话数据；关闭当前标签后切换到相邻标签，全部关闭时回到首页，且首页由页面本身承担，不占标签位也不作为固定目标。通过 slots 发布的共享 store 读取侧栏宽度和设置状态；在原生设置插槽内渲染标签，保留设置窗口的焦点管理。三块外观选项调用原生 `theme.setTheme()`，关闭时撤销插槽覆盖。

7. **样式以 `body[data-smooth-skin]` 为开关，选择器不绑构建哈希。** Client 半注册 `settings.section` 页面、注入作用域样式表（自带 `data-plugin` 标记，避免被其他插件的热替换清理）、按状态调用 `theme.overrideTokens()`，状态存在浏览器 `localStorage`（键 `dsh-smooth-skin:state`），不经过任何 Host 通道。配色通过 `theme.overrideTokens()` 提供 light / dark 两套值；页面通透度是 body 上的一个内联变量 `--smooth-glass`（区域底板权重），各区域用 `color-mix()` 从自己的调色板色派生半透明色；跟随它的是页面、侧栏、左侧图标栏、标签条、输入区底板、整页设置与浮层菜单这些大块区域，按钮 / 列表行 / 标签芯片 / 卡片 / 输入框等组件用另一个很轻的 `--smooth-glass-mild`（每 3 点通透度降 1 点不透明度：30% 时约 90% 不透明、100% 时 67%），`#root` 内的宿主控件靠改写 `--dsw-alias-bg-layer-*` / `--dsw-specific-input-major` / `--dsw-specific-bubble` 跟上；图标栏坐在侧栏玻璃上，客户端另写 `--smooth-glass-soft`（页面权重的四次方）给它避免叠加变实心带；标签条则自己铺 surface（窗体条只铺侧栏那半），是单层、用页面权重；`#root` 里的 `--dsw-specific-sidebar-fill` 改写成 `--smooth-sidebar-glass`，宿主画的工作区列表底部虚化才跟着变透；虚化元素本身走更陡的 `--smooth-sidebar-fade`（页面权重四次方，100% 时 0）。浮层与设置另有一个很淡的权重 `--smooth-glass-overlay`（每 8 点通透度降 1 点不透明度，最低 85%），避免下面的正文透上来。底纹画在 body 的负 z 层，关闭皮肤时这个内联变量一并撤销。选择器优先使用宿主的 `data-plugin-panel`、`data-plugin-package`、`data-composer-card` 等真实属性，没有公开属性的部位只匹配已核对的 CSS 模块语义后缀，不绑定构建哈希；宿主大版本升级后需重新检查这些部位。

8. **启动动画的三行由 Host 注入，脚本只做三件事。** Host 半的 `bootInjections()` 注入 `style`、`html`、`script` 三行纯数据。鲸鱼路径直接来自宿主 `FishLogo`（23.16 × 17.04），坐标取 2 位小数（最坏偏差 0.005 用户单位 ≈ 176px 下的 0.04px）；三行合计 5.2 KB（gzip 2.4 KB）；样式行在注入时去掉注释与缩进（该表内没有任何字符串，所以只删读者才需要的东西），源码里的版本保持可读。标记里没有 SMIL，脚本里没有几何运算：注入脚本只做三件事——读 `localStorage` 与减少动态效果偏好（不满足就摘掉整层）、等 `#root` 挂载、最短停留后 340ms 淡出并在 640ms 后清理；应用未挂载时最多多等 8s。宿主 index 里的 `<div id="root">` 是静态节点（已在 app.asar 的 `dsh-web-frontend/dist/index.html` 核对），所以等待只观察它的直接子节点，不再把应用挂载期间的每一次 DOM 变更都收进来；只有 `#root` 尚未解析出来时才退回观察整个文档子树，行为与之前一致。设置在下次页面加载时生效。

9. **等待宿主表面统一走 `src/watch.js`。** 输入卡片、英雄区、账号菜单都由它等：一个 `MutationObserver(document.body, {childList, subtree})` 服务全部 watcher，回调合并到一帧一次，最后一个 watcher 释放时 observer 一并断开。每个 watcher 的首次检查仍是同步的，所以它装饰的元素在首帧就位；这样 React 挂载期的多次 commit 只换来一次整文档查询，而不是每个 commit 每个 watcher 各一次。账号菜单需要 `aria-expanded`，因此保留自己的 observer，但回调同样按帧合并。

10. **预览与真播共用 `src/boot.js` 这一份定义。** 设置页的「预览」按钮把这份唯一定义再用一次：`splashInnerHtml()` 渲染同一个 `#dsh-smooth-splash`，时长仍取 `SPLASH_HOLD_MS` / `SPLASH_SETTLE_MS`，动画也来自同一份样式表，所以预览与真播不会各写一套。它 portal 到 `body`，只在点击后挂载，播完即卸载；若当前页面没有收到 Host 注入的样式表（旧 index、插件后装），客户端会补一份带 `data-plugin` 标记的副本，随插件卸载一起移除。系统开启「减少动态效果」时按钮禁用并在说明里写明原因——那种情况下启动也不会播。

11. **窗口亚克力是安装包补丁，不是插件的一部分。** 渲染进程改不了操作系统窗口，`backgroundMaterial: "acrylic"` 必须写在 Electron 主进程创建窗口的选项里。`tools/patch-window-glass.mjs` 直接改已安装 `resources/app.asar` 里的 `lib/main.js`：win32 主窗口分支加 `backgroundColor: "#00000000"` / `backgroundMaterial: "acrylic"`，并在窗口的 `did-finish-load` 上把 `data-smooth-window-glass` 打到页面 `<body>`。它靠裁剪同一文件里的注释文字把修改压成**等长原地写**（只写 `lib/main.js` 那一段字节，asar 头与偏移不动），因此补丁能在 DSH 运行时打、下一次启动生效；原始字节备份成 `app.asar.main.js.smooth-window-glass.bak`。皮肤只读那个 body 属性：有属性才让 `html` / `body` 透明并去掉内嵌底纹，没属性就保持应用内渐变，所以未打补丁或 DSH 更新后都不会把页面变成透明白块。代价：补丁改的是用户机器上的安装包，DSH 每次更新都会覆盖（重跑 `tools/apply-window-glass.cmd`）；`main.js` 会少掉一小段注释；锚点对不上时脚本拒绝修改；只有 Windows 11 支持该材质。

## 模块地图

```
package.json      manifest：dsh.bundle.patch + dsh.client
cordis.patch.yml  bundle 补丁，插入 smooth-skin 行
assets/样例图/     原始 HTML 设计参考，不参与插件运行
icon.svg          插件页图标：36×36 透明底、固定色，package.json 的 icon 字段指向它（宿主按 36 / 30 渲染）
assets/whale.svg  开场鲸鱼的独立 SVG 文件，从 src/boot.js 导出，同样不参与运行
assets/think/     四挡思考强度插图：cutout/*.webp 入库用于生成面板背景；原始 PNG 不入库
locale/{zh,en}.json  插件管理页显示的标题与描述
src/shared.js     调色板、主题令牌映射、状态规范化、locale 词条
src/pricing.js    DeepSeek 价目表与当前会话金额估算（客户端，只进 client 产物）
src/think.js      由 tools/export-think.mjs 生成的 THINK_ART（四挡插图的内联 data URL），不要手改
src/skin.js       作用域样式表
src/boot.js       启动动画唯一定义：注入 index 的样式/标记/脚本 + 设置页预览
src/watch.js      等待宿主表面：一个共享的 body observer + 按帧合并的检查
src/bridge.js     Host 私有桥的浏览器侧入口（Git 菜单与每日用量共用）
src/composer.js   真实 Git 分支读取、分支菜单、信息栏与原生控件 portal
src/usage.js      落地页的每日 token 表：26 周热力图、图例与悬停提示
src/account.js    账号资料、向下展开的真实余额与原生账号菜单扩展
src/layout.js     原生导航标签、归档行删除按钮、共享布局连接与三块外观选项
src/scrollbar.js  各滚动区域的粗细动画、空闲恢复与卸载清理
src/client.js     Client 半：设置页 + 令牌覆盖 + 样式注入 + localStorage 状态
src/host.js       Host 半：启动动画注入 + 私有 /smooth-skin/git 桥（Git、每日 token、归档会话删除）
build.mjs         构建脚本
tools/            激活试验台、图标导出、启动剖析与宿主契约审计（除客户端钩子外，也核对 Host 侧 `sessions` / `workspaceRegistry` / `sessionPersistence` 的桥接符号）
tools/patch-window-glass.mjs  桌面窗口亚克力补丁：等长原地改已安装 app.asar 的主窗口选项与页面标记；apply / restore 的 .cmd 在旁
tests/            契约、样式作用域、宿主兼容性与交互测试
tests/window-glass.test.mjs  窗口补丁的锚点、等长裁剪与原地写入回归
```

`src/shared.js` 被打包进两个产物，是配色与状态规范化的唯一来源。

落地页用量面板也分两半：Host 半在 `src/host.js` 里扫描 `$DSH_HOME/sessions/**/session.v<N>.jsonl[.zstd]`（逐帧解 zstd，撕裂的尾帧不算事件），折叠出每天的 token 四件套、消息数、24 小时直方图与按模型的 token；浏览器半在 `src/usage.js` 只做取数、区间过滤、名次与排版，`src/bridge.js` 是同一条桥的公共入口（Git 菜单与用量面板共用，页面没有桥时两边都回退）。缓存文件落在 `$DSH_HOME/cache/smooth-usage-v2.json`，删掉它只会让下一次扫描变慢。

思考强度面板的插图由 `src/think.js` 提供：面板打开时按当前挡位显示对应插图（先匹配思考挡位 id，匹配不到按位置换算），拖动或点标签换挡时四张图常驻在 DOM 里交叉淡入。插图只属于 DeepSeek：只有模型目录里 DeepSeek、DeepSeek Account 这两组的模型才显示这块背景，其它 provider（例如 xiaomi）保持没有插图的纯面板；挡位文字和滑杆对所有带 reasoning 的模型照常显示。整块背景（插图连同底部虚化）比媒体区顶边低 6px，图片和渐变一起下移，不会出现「只有图动了、虚化没动」。

## 验证与闸门

### `tools/activate-host.mjs`：插件契约

`tools/activate-host.mjs` 把 Cordis / 插件加载器里 `unwrapExports` → `resolve` → 读 `name`/`inject`/`Config` 的判定逐行抄出来，导入**构建产物**核对插件契约，并断言 Host 半只订阅 `webserver/index-inject`、没有多余的 `ctx` 访问——这两类问题都曾让 DSH 启动即失败或条目无法激活。

### `tools/host-contract.mjs`：宿主兼容性闸门

这是更新 DSH 前的兼容性闸门。它直接读当前安装的 `resources/app.asar`，把 `src/` 里用到的宿主 CSS module 类名、`data-*` 属性、slot、`--dsw-*` 令牌和服务方法逐项对照宿主 bundle；缺哪一项就列出哪一项，并退出非零。`npm test` 里的 `tests/host-contract.test.mjs` 会自动跑这条检查，找不到安装时跳过；安装路径不在默认位置时用 `DSH_APP_ASAR` 或 `--asar <path>` 指定。更新前可以先跑一次 `node tools/host-contract.mjs --json > host-before.json` 留快照，更新后再跑并对比。检查本身有正反两组用例：删掉任意一个类名、属性、slot、方法、令牌、属性值或包名都必须被报出来。

### `tools/export-icons.mjs`：鲸鱼只有一条定义

它把开场鲸鱼从 `src/boot.js` 的常量导出成 `assets/whale.svg`。仓里只有一条鲸鱼：Host 半把路径当纯数据注入 index，不能运行时读文件，所以路径常量是唯一定义，`assets/` 下的文件是它的镜像。`node tools/export-icons.mjs --check` 只核对不写入，`tests/boot.test.mjs` 断言两者逐字节一致，改了 `src/boot.js` 忘了导出会直接测试失败。

### think 插图：导出 → 内联

走的是一条和鲸鱼相同的「导出 → 内联」链路。`tools/prepare-think.py` 读取 `assets/think/<名字>-Off/Low/High/Max.png`（**四张原图不入库**：单张 3.5–4.5MB，且只在换图时才需要；把它们放回 `assets/think/` 再跑这条命令即可，`.gitignore` 只忽略这一层 PNG）。它**优先使用源图自带的透明通道**（透明区里残留的白/黑 RGB 不会被当成底色而保留成不透明块），只有源图被压平成不透明背景时才从边框泛洪抠掉白色或黑色（角色内部的同色区域保留），再按文件名后缀生成 780px 宽的直通 alpha WebP 到 `assets/think/cutout/`。`tools/export-think.mjs` 再把它 base64 内联成 `src/think.js` 的 `THINK_ART`，`build.mjs` 把这份常量拼进 `lib/client.js`。`--check` 只核对不写入，`tests/think.test.mjs` 断言四张图存在、确实是 WebP、体积受限且与 cutout 逐字节一致——换图后忘了导出会直接测试失败。

### `tools/startup-profile.mjs`：启动开销的可复现度量与口径边界

产物字节与 gzip、Host/Client 两半的模块解析求值、`factory` 与 `apply` 耗时，以及样式表的规则数、选择器数、`:is(`/`:has(` 计数。它用 V8（与 Chromium 同引擎）测量并扣除新建上下文的固定开销，因此**样式重算、首屏绘制与传输时间不在其内**，那几项只能在浏览器 DevTools 里读。

浏览器侧的对照测量（真实时间、合成外壳、逐阶段计时）另有一份本地脚本，结论记在这里：外壳挂载期间**样式重算**是这份皮肤为启动付出的主要成本，其次才是 client 包的取回/解析/求值（约 6ms）。`src/watch.js` 就是据此把等待宿主表面的 observer 收成一个、并把检查按帧合并——启动期对整篇文档的查询从每次 commit 一次降到每帧一次。字节上并没有收益：`watch.js` 净增约 2.8 KB（`lib/client.js` 151538 → 154294 字节），换来的是挂载期的查询次数，而不是包体。

### `tools/patch-window-glass.mjs`：桌面窗口亚克力

不是插件的一部分，也不进 `lib/`：它负责改用户机器上**已安装**的 `resources/app.asar`，让主窗口带上系统亚克力。只替换 `lib/main.js` 的一段字节，保留文件长度（新增代码由裁剪注释补回），所以 asar 头、偏移和其它文件都不动，应用运行时也能打补丁、下次启动生效。写入前用 `node --check` 校验补丁后的 main.js，并核对字节数；原文件备份成 `app.asar.main.js.smooth-window-glass.bak`，`--restore` 写回。`--self-test` 只验证「等长且可解析」，不写盘。`tests/window-glass.test.mjs` 在合成 asar 上锁住锚点、等长裁剪、原地写入与幂等。

### `tests/` 各文件的职责

- `tests/client.test.mjs`：直接执行浏览器构建产物，检查模块导出、依赖访问、设置页注册、启用/关闭和卸载清理。源码与构建产物必须完全一致，修改 `src/` 后需重新构建。
- `tests/window-glass.test.mjs`：窗口补丁的锚点、等长裁剪与原地写入在合成 asar 上回归；不需要安装 DSH。
- `tests/git-bridge.test.mjs`：在临时 Git 仓库里验证分支列表、未提交计数、建分支和带能力令牌的 Host 监听。
- `tests/host-contract.test.mjs`：跑上面那条宿主兼容性闸门，找不到 DSH 安装时跳过。
- `tests/boot.test.mjs`：断言 `assets/whale.svg` 与 `src/boot.js` 的常量逐字节一致。
- `tests/think.test.mjs`：断言四张 think 插图存在、确实是 WebP、体积受限且与 cutout 逐字节一致。
- `tests/usage.test.mjs`：用合成日志覆盖日记录、同一步骤重试只算一次、纯 JSONL、撕裂尾帧、(size, mtime) 缓存复用与窗口外日志跳过；真的起一个监听请求 `usage` 动作，并把 `src/usage.js` 放进 VM 里单测那几个纯函数（计数格式、热力档位、区间过滤、高峰时段、书目换算）。

## 坑位清单

1. **`cordis.patch.yml` 的备份名不能用 `<patch>.bak-<纯数字>`。** 手工改 profile 的 `cordis.patch.yml` 时，dshmarket 把这种命名当成 DSH 自己 `sanitizeProfile` 留下的宿主恢复残留（备份行比当前 patch 多时会弹「宿主恢复」横幅），而那条横幅渲染的 `IconWarningOutline16` 在本版 DSH 的原语里不存在（只有 `IconWarningOutlineRegular`），会让插件市场整页崩成「插件市场无法显示」。用 `-manual` 之类的后缀把数字挪到名字中间即可绕开检测。

2. **zstd 尾帧可能是撕裂的。** 扫描 `$DSH_HOME/sessions/**/session.v<N>.jsonl[.zstd]` 时逐帧解 zstd，撕裂的尾帧不算事件；`tests/usage.test.mjs` 专门覆盖这一条，改扫描逻辑时别把它当成一次完整事件。

3. **`src/think.js` 不要手改。** 它由 `tools/export-think.mjs` 生成，内容是四挡插图的内联 data URL，构建时才被拼进 `lib/client.js`。

4. **改了 `src/` 必须重新 build。** `tests/client.test.mjs` 直接执行浏览器构建产物，源码与构建产物必须完全一致。

5. **think 原图 3.5–4.5MB，不入库。** 单张就这个体积，且只在换图时才需要；`.gitignore` 只忽略 `assets/think/` 这一层 PNG。

6. **`assets/whale.svg` 是 `src/boot.js` 的镜像。** 仓里只有一条鲸鱼：Host 半把路径当纯数据注入 index，不能运行时读文件，所以路径常量是唯一定义，`assets/` 下的文件是它的镜像。

7. **窗口尺寸这条路没有宿主 API 可走。** 渲染进程的 `dshDesktop` 桥（`lib/preload-app.cjs`）只有 browser/keyboard/shortcuts/updates/deviceInfo，桌面 IPC 列表里有 `window-fullscreen` 却没有尺寸通道，主窗口的尺寸在 `lib/main.js` 里写死也不持久化，Host 半所在的子进程协议只有 ready/platform-session/shutdown/fatal。可用的一条是渲染进程自己的 `window.resizeTo`——Electron 会照做，包括对隐藏窗口（用随应用同版本的 Electron 44 实测：1280 × 820 的隐藏窗口在加载完成后为 1441 × 901，即请求的 1440 × 900 加一像素边框）。

8. **旧 `lib/index.js` 报错要先构建再完全退出。** 若仍出现旧版 `lib/index.js` 访问 `host` 的报错，先构建，再从托盘完全退出 DeepSeek Harness 并重新打开；只刷新页面不会清除 Host 进程已导入的模块。

9. **窗口补丁会被 DSH 更新覆盖，但不需要先退出应用。** 补丁只改 `lib/main.js` 的一段等长字节，asar 头和偏移不动，所以 DSH 运行时也能写；运行中的进程继续用它已加载的副本，**完全退出并重新打开** DSH 后新进程才按补丁创建窗口（只刷新页面不算）。DSH 每次更新会把 `app.asar` 换回官方版本——更新后重跑 `tools/apply-window-glass.cmd`；在重跑之前皮肤自动退回应用内渐变，不会坏。还原用 `tools/restore-window-glass.cmd`（或 `--restore`），同样重启生效。

## 改动前先读

动任何一条契约、选择器或桥动作之前，先读 [设计决策](docs/design.md)：那里记着现在这样做的理由和换方案要付的代价。
