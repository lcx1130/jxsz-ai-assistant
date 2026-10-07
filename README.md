# 校园新生 AI 服务助手

Next.js 网页通过服务器调用 Dify Chatflow，提供校园咨询、连续对话与历史记录。本版补上新副本需要的 Markdown 图片、来源链接、资源表格和学生反馈表单支持。

## 对应的 Dify 副本

- 应用：校园新生 AI 服务助手 副本
- 编辑地址：https://cloud.dify.ai/app/30de30b8-d6fd-42e7-944a-e69eda067d03/workflow
- Dify 负责知识库检索、联网查询、图片查询、意图分类、表单校验和飞书写入。
- 网页负责显示回答、展示学生表单、提交已选择的操作，以及读取后续结果。

编辑地址不是 API 地址。是否实际连接副本由服务器的 `DIFY_API_KEY` 决定；仅修改代码不会切换 Dify 应用。

## 本地运行

```bash
npm ci
cp .env.example .env.local
npm run dev
```

在 `.env.local` 填入副本“访问点 / API 访问”提供的 API 地址与应用密钥。不要提交真实密钥，不要把密钥发送到聊天或截图里。

## 在现有 Netlify 项目上线

保留项目 `jxsf-ai`，以及现有域名 https://jxsf-ai.netlify.app/ 。

1. 在 Netlify 的仓库配置中确认使用 `lcx1130/jxsz-ai-assistant` 的 `main`。
2. 构建命令：`npm run build`；发布目录：`.next`。仓库内的 `netlify.toml` 已设置这两项。
3. Netlify 自动使用当前 Next.js 适配器。不要将 `public/` 当作整个 Next.js 网站上传，也不要添加将 `/api/*` 转到 `index.html` 的通用静态重写。
4. 在 Netlify 环境变量中把 `DIFY_API_KEY` 换成**新副本的应用密钥**，并确认 `DIFY_API_BASE_URL` 与副本显示的 API 地址一致。密钥只供服务器使用，不能加 `NEXT_PUBLIC_` 前缀。
5. 环境变量需同时可用于构建和 Functions；改完必须重新构建部署。
6. 如果设置了独立的 `SESSION_SECRET`，保留它；否则会话签名使用 Dify 密钥。切换密钥后需要新建对话，旧应用的对话不能直接拿到新应用继续。
7. Dify 中的最新工作流也要发布。未发布的编辑改动不会出现在网站调用结果里。

飞书密钥仍留在 Dify 环境变量，不需要复制到网页代码或 Netlify。

## 上线验证

- 只查知识库中的四六级资源：返回已收录链接，不打开反馈表单。
- 请求联网查询宿舍条件：显示真实来源与资料日期。
- 查看食堂照片：显示图片；查询内部照片时不能用外观照片代替。
- 打开提交反馈：显示学生表单，允许取消；取消不应新增飞书记录。
- 提交一条注明“部署验证”的测试反馈：检查返回编号与飞书新增记录一致。
- 工作人员的回复表单和审批令牌不得出现在学生网页。

只有真实线上验证通过后，才能宣称新副本已上线且该功能可用。

## 表单支持和限制

- 支持原有 `service_issue` 人工咨询表单。
- 支持最多三个 paragraph 字段、包含 `SUBMIT_FEEDBACK` 或“提交反馈”操作的反馈表单。
- 支持 Dify 返回的 `actions` 和 `user_actions` 两种字段。
- 取消反馈允许空输入；正式提交的必填和业务内容由 Dify 现有校验分支判断。
- 服务端根据 Dify 实际表单定义核对字段和操作，不接收伪造的工作人员回复字段。
- 工作人员 Email 表单保持等待状态。表单提交成功后只读取后续结果，不因读取失败再次提交。
- 当前不支持 select、file 等字段；如果以后扩展 Dify 表单类型，需要同步更新前端。
- “有帮助 / 没帮助”目前仍是展示按钮，尚未接入评价保存。

## 校园图片

图片位于 `public/images/campus-images/`。工具返回 Markdown 图片链接，网页显示为图片并可点开查看。

已提供两张食堂外观与三张寝室示例。拍摄日期未知，寝室楼栋和房型未确认，图片不能证明当前统一配置或实际入住分配。

## 验证命令

```bash
node --test tests/*.cjs
npm run build
```

测试覆盖表单权限、反馈取消与提交验证、Dify 事件解析、历史记录、会话身份、Markdown 图片与安全链接。模拟测试不替代真实 Dify / 飞书联调。

接口说明：https://docs.dify.ai/en/api-reference/guides/human-input-flow
