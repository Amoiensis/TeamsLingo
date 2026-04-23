# TeamsLingo 更新指引

中文 | [English](UPDATE_GUIDE.en.md) | [日本語](UPDATE_GUIDE.ja.md)

## 通过设置页检查更新

TeamsLingo 的设置页现在提供“版本更新”区域：

- 会尝试访问 GitHub Releases 的最新正式版本。
- 如果发现新版本，会显示当前版本与最新版本，并提供“更新说明”和“查看更新指引”入口。
- 如果无法访问项目发布网址，会显示“因为无法访问项目发布网址，暂时无法确认是否有更新。”

> 最新正式版说明：<https://github.com/Amoiensis/TeamsLingo/releases/latest>
>
> 直接下载最新安装包：<https://github.com/Amoiensis/TeamsLingo/releases/latest/download/TeamsLingo.zip>

## 如何更新

1. 直接打开最新正式版说明：<https://github.com/Amoiensis/TeamsLingo/releases/latest>
2. 直接下载最新发布包 `TeamsLingo.zip`：<https://github.com/Amoiensis/TeamsLingo/releases/latest/download/TeamsLingo.zip>
3. 解压到本地目录。
4. 打开浏览器扩展管理页：
   - Edge：`edge://extensions/`
   - Chrome：`chrome://extensions/`
5. 如果你是“加载解压缩的扩展”方式安装：
   - 直接点击扩展卡片上的“重新加载 / Reload”，或
   - 重新选择最新解压目录加载。
6. 打开 TeamsLingo 设置页，再次检查版本信息是否已更新。

## 从本地开发版切换到正式版

如果你当前加载的是本地开发目录，而不是 GitHub Releases 下载包，建议：

1. 先备份需要保留的本地修改。
2. 查看最新正式版的更新说明，确认是否包含你需要的修复或功能。
3. 决定继续使用本地开发版，还是切换到正式版目录重新加载扩展。

## 发布说明中建议关注的内容

- 新增翻译服务或接口兼容性变更
- Teams 页面结构适配调整
- 设置项默认值变化
- 数据导出格式变化
- 已知问题和兼容性说明
