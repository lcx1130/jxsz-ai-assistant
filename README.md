# 校园新生 AI 服务助手 - 可运行前端 V1

这是从 Figma 原型落地出来的第一版 Next.js 前端，并预留了 Dify Service API 连接。

## 当前已经完成

- Figma 首页 -> 真正可运行网页
- Figma AI 对话页 -> 真正可输入、发送、展示回答的网页
- Next.js 服务端 `/api/chat` -> Dify `/chat-messages`
- 自动保存 `conversation_id`，支持同一会话继续追问
- 读取 Dify 返回的 `retriever_resources`，在网页展示知识库来源
- Dify API Key 只保存在服务器 `.env.local`，不会暴露到浏览器

## 1. 安装 Node.js

建议 Node.js 20 或更高版本：
https://nodejs.org/

## 2. 安装依赖

在项目目录执行：

```bash
npm install
```

## 3. 配置 Dify

复制环境变量模板：

```bash
cp .env.example .env.local
```

打开 `.env.local`，填写：

```env
DIFY_API_BASE_URL=https://api.dify.ai/v1
DIFY_API_KEY=你的真实Dify应用APIKey
```

如果你用的是自部署 Dify 或其他域名，把 `DIFY_API_BASE_URL` 改成 Dify API Access 页面显示的地址。

**不要把真实 DIFY_API_KEY 发到聊天、截图或 GitHub。**

## 4. 启动

```bash
npm run dev
```

浏览器打开：

http://localhost:3000

## 5. 第一次联调

1. 首页点“开始咨询”
2. 输入：`宿舍几人寝？`
3. 前端请求 `/api/chat`
4. Next.js 服务端读取密钥并调用 Dify `/chat-messages`
5. Dify 执行你已经搭好的 Query Rewrite -> RAG -> LLM 流程
6. 网页显示答案、conversation_id 对应的连续对话状态，以及知识库来源（如果 Dify 返回 retriever_resources）

## 目前还没做

- 点赞/点踩真正写回 Dify
- 历史会话 API
- 部署到公网

这些会在 V2/V3 继续接通。

## 人工服务接入

- 聊天页按钮和“人工客服”文字请求均由 Dify 处理。服务端使用 streaming 模式，识别 `human_input_required` 和 `workflow_paused`，将表单显示在聊天中。
- 当前支持项目现有的 paragraph 文本表单。其他字段会提示暂不支持，不会静默丢失后提交。
- `/api/human` 代理提交表单，并以同一 user 读取后续流程；提交成功与读取结果分开，结果读取失败时不会再次提交。
- 已验证真实人工表单显示、普通问答和来源引用；提交参数及恢复调用通过模拟测试。尚未提交真实人工工单验证后续工作人员处理。
- 参考：https://docs.dify.ai/en/api-reference/guides/human-input-flow
