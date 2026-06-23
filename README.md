# 行动积分

这是一个给个人使用的 PWA 小工具：把每天要完成的任务变成积分，再用积分兑换奖励，并生成 Markdown 日报。

## 第一版功能

- 添加今日任务
- 使用快捷任务模板
- 完成任务获得积分
- 即时积分 / 长期积分分账
- 奖励商店兑换奖励
- 生成 Markdown 日报，可复制到 Obsidian
- 导出 / 导入 JSON 备份
- 可添加到 iPhone 主屏幕

## 推荐运行方式：GitHub Pages

正式使用建议把这些文件放到 GitHub Pages。这样 iPhone Safari 可以通过 HTTPS 打开，也更适合添加到主屏幕。

步骤：

1. 解压 `action-points-pwa.zip`。
2. 创建一个 GitHub 仓库，例如 `action-points`。
3. 把解压后的全部文件上传到仓库根目录，确保 `index.html` 在根目录。
4. 进入仓库 Settings → Pages。
5. Source 选择 `Deploy from a branch`。
6. Branch 选择 `main`，目录选择 `/root`，保存。
7. 等待 GitHub Pages 部署完成。
8. 用 iPhone Safari 打开 GitHub Pages 生成的网址。
9. 点击分享按钮 → 添加到主屏幕。

## 临时运行方式：电脑本地预览

在电脑上进入项目目录，执行：

```bash
python3 -m http.server 8000
```

然后在电脑浏览器打开：

```text
http://localhost:8000
```

如果想在 iPhone 上临时访问，需要让 iPhone 和电脑在同一个 Wi-Fi 下，然后访问电脑的局域网 IP 地址，例如：

```text
http://192.168.1.10:8000
```

注意：局域网 HTTP 方式适合预览，不适合长期正式使用。正式使用建议 GitHub Pages。

## 数据说明

当前版本不需要登录，数据保存在当前设备浏览器的本地存储里。

因此：

- 不要随便清除 Safari 网站数据。
- 换手机前先用“导出 JSON 备份”。
- 换设备后用“导入 JSON 备份”恢复。

## 文件说明

- `index.html`：页面结构
- `styles.css`：界面样式
- `app.js`：任务、积分、奖励、日报逻辑
- `manifest.webmanifest`：PWA 配置
- `sw.js`：离线缓存
- `icons/`：主屏幕图标
