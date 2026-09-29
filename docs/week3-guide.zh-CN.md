# Week 3 → Project 1 实施与验收指南

本次修改把应用从 joke 列表调整为 Caption Rating App。原来的 `jokes` 表和数据没有删除。数据库迁移尚未执行，Google / Supabase / Vercel 控制台设置也没有代替你修改。

## 1. 先确认课程数据要求

你提供的 rubric 要求 captions、投票和真实数据读写，但没有给出具体表结构、评分方式或课程数据 API。因此当前准备的是**自建数据库方案**，不是已确认的课程标准。

如果后续作业指定了共享数据库、API 或字段，先按那个接口调整 `lib/captions.ts` 与 `app/actions/votes.ts`，不要运行 `002_caption_rating.sql` 建立另一套数据源。

当前方案：

| 表            | 用途           | 关键字段                              |
| ------------- | -------------- | ------------------------------------- |
| profiles      | 姓名与头像引用 | id, first_name, last_name, avatar_url |
| images        | 配图引用       | id, url, alt_text                     |
| captions      | 配图的文案     | id, image_id, content                 |
| caption_votes | 每人的评分     | user_id, caption_id, value            |

图片文件放 Storage，关系表只存 URL。`value = 1 / -1` 表示喜欢 / 不喜欢。复合主键防止同一用户重复生成多条评分。

## 2. 检查现有数据库

打开**现有 Supabase 项目 → SQL Editor → New query**，运行 `supabase/000_inspect.sql`。

检查：

1. `profiles.id` 是否为 UUID 主键并对应 `auth.users.id`。
2. `first_name`、`last_name` 是否允许 NULL。
3. 当前 `auth.users` 的 INSERT trigger 是否负责创建 profile。
4. `avatars` bucket 是否存在、是否 public、大小与类型限制是否合适。

已经有正常工作的 trigger 就继续复用。不要删除不认识的 trigger。

再运行 `supabase/001_profiles.sql`。它补齐字段和旧用户的 profile；若 `auth.users` 已有任何自定义 INSERT trigger，会保守地跳过新 trigger 的安装，所以**必须检查现有 trigger 是否真的插入 profiles**。如果不是，先整理查询结果，再决定如何安装，不能把“脚本成功”当成“trigger 已验证”。

该 SQL 不创建、修改、启用或禁用任何 RLS policy。已有 profiles 若有额外 NOT NULL 字段、特殊 ID 结构或不同 trigger 逻辑，先调整 SQL，别强行执行。

## 3. 建立 caption 数据结构

只在确认没有课程指定 schema 时运行 `supabase/002_caption_rating.sql`，且只运行一次。脚本使用事务：失败时不会只留下半套表。

然后在 Table Editor 中按顺序录入真实内容：

1. 在 `images` 插入图片的 HTTPS URL 与有意义的 `alt_text`，记录自动生成的 `id`。
2. 在 `captions` 插入 `image_id` 与 `content`。同一张图片可以对应多条 caption。
3. 至少添加 3～6 条，刷新首页，确认图片和文字来自数据库。
4. 登录并填好姓名后评分。检查 `caption_votes` 出现记录，刷新后选中状态仍然存在。
5. 改变同一 caption 的评分，应更新原记录，而不是增加一行。

不必把旧的 setup/punchline 生硬转换成 caption，也不必删除 `jokes`。

新表 SQL 包含投票身份校验 trigger 和表级权限设置，不涉及 RLS。匿名不能写票，用户不能冒充其他人写票；页面与 Server Action 同时检查登录。**这并不代表整个项目的数据隔离已经完成**：现有 profiles、Storage 以及用户之间的数据读取权限仍需在课程允许后检查 RLS。现在不要自行修改 policies。

## 4. 配置 Google 登录

如果你现有 Google 登录已经成功，先检查下面的地址，不必重建客户端。

当前代码沿用 Supabase 的 `signInWithOAuth` / PKCE 流程。流程有两层回调：

```text
应用点击登录
  → Supabase Auth → Google
  → Supabase /auth/v1/callback
  → 你的应用 /auth/callback
  → 交换 code，写入 session cookie
  → 姓名不完整：/profile；已完整：首页
```

Google Cloud / Google Auth Platform：

1. 使用你自己的项目，设置 Branding、Audience、Data Access。
2. 创建 Web application OAuth client。
3. JavaScript origins 填 `http://localhost:3000` 与你的正式网站 origin。
4. Authorized redirect URIs 填 **Supabase Google provider 页面显示的 callback**，通常为 `https://<project-ref>.supabase.co/auth/v1/callback`。
5. 在 Supabase → Authentication → Sign In / Providers → Google 配置 Client ID 和此 OAuth 流程所需的 Secret。Secret 不放浏览器、GitHub 或 `NEXT_PUBLIC_*` 变量。
6. 如果 Google Audience 仍为 Testing，确保测试账户有权限；提交前确保老师的账号可以登录。

Supabase → Authentication → URL Configuration：

- Site URL：正式应用 origin。
- Redirect URLs：`http://localhost:3000/auth/callback`。
- 加入正式域名的 `https://你的域名/auth/callback`。
- 加入本次提交的 deployment URL 对应的 `https://本次部署域名/auth/callback`。

应用的 `redirectTo` 严格为 `${window.location.origin}/auth/callback`，不额外添加 `?next=...`。身份提供商回传 `?code=...` 是正常协议行为，不是你手工改变 redirectTo。

**关于作业的“不用 Google Client Secret”提示：**它并不是禁止使用 Secret。当前 `signInWithOAuth` 方案按官方文档需要在 Supabase provider 后台配置 Secret，但应用本身不持有它。Google Identity Services + `signInWithIdToken` 是另一种客户端登录方式，不应直接拼接进当前 PKCE callback。若老师明确要求整个配置过程都不用 Secret，应先确认指定方式，再切换登录实现。

参考：[Supabase Google 登录文档](https://supabase.com/docs/guides/auth/social-login/auth-google)。

## 5. 验证头像上传

当前组件上传到 `avatars` bucket，再把 public URL 写入 `profiles.avatar_url`。只接受 JPG、PNG、WebP，客户端限制 2 MB。

1. 优先沿用现在已经能工作的 public `avatars` bucket。
2. 若没有 bucket，在 Storage 创建 `avatars`；文件大小设 2 MB，类型限定 `image/jpeg,image/png,image/webp`。图片本体由 Storage 保存。
3. 上传文件路径为 `<登录用户 UUID>/avatar-<随机 UUID>.<后缀>`。
4. 上传后刷新 Profile，确认照片仍显示。

Public bucket 只意味着读取公开，并不自动授予上传权限。若返回 RLS / permission 错误，记录具体错误并和课程要求核对，**不要添加或修改 storage.objects policies，也不要把 service-role key 放入浏览器绕过问题**。这一步可能需要老师确认既有权限设置；在上传实际成功前不能把 Week 3 标为完成。

## 6. 本地运行与检查

继续使用 `.env.local` 里的两个变量，不提交该文件：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的公开anon-key
```

```powershell
npm run lint
npm run build
npm run dev
```

打开 `http://localhost:3000`。SQL 尚未运行时首页会提示 captions 无法加载，这是实际的数据库未准备好，不会用假内容掩盖。

## 7. 用两个账号完成验收

| 操作                                | 应有结果                                  |
| ----------------------------------- | ----------------------------------------- |
| 无痕打开首页                        | 可以看见真实 captions，不要求 Vercel 登录 |
| 无痕直接输入 `/profile`             | 返回首页，不显示账户资料                  |
| 第一次用新的 Google 账号登录        | auth.users 与 profiles 各出现一行         |
| 首次登录、姓名为空                  | 跳到 Profile，并提示填写姓名              |
| 保存空白姓名                        | 不能保存为空白；两个名字都要填写          |
| 修改姓名后刷新                      | 新姓名保留                                |
| 上传头像后刷新                      | 照片保留，数据库只保存 URL                |
| 未登录浏览 captions                 | 显示登录引导，不能写票                    |
| 已登录但姓名未完成                  | 显示补全 Profile 引导                     |
| 姓名完整后评分并刷新                | 评分保留                                  |
| 同一 caption 改票                   | 原记录更新，无重复票                      |
| 第二个账号评分                      | 不覆盖第一个账号的票                      |
| 退出后再访问 `/profile`             | 被拦截                                    |
| 直接访问无 code 的 `/auth/callback` | 显示可重试的登录失败页                    |
| 手机宽度查看首页与 Profile          | 导航、表单、图片无横向溢出                |

## 8. 部署与提交

1. 在原 Vercel 项目配置相同的公开 Supabase 变量，覆盖实际使用的 Production / Preview 环境。
2. 先在本地确认 lint、build 和数据库闭环成功，再提交并推送代码到原仓库。
3. Vercel → 项目 Settings → Deployment Protection，关闭 Vercel Authentication；如开启了其他访问限制，也按作业要求关闭。保存后验证提交链接。参考：[Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)。
4. 在 Deployments 打开与此次 Git commit 对应的 deployment，核对 commit SHA，复制那个 deployment 的专属 URL，不使用以后会指向新版本的主域名代替。
5. 把此 deployment origin 的 `/auth/callback` 加到 Supabase Redirect URLs。
6. 用无痕窗口在**这个专属 URL**重新走一遍首页、Google 登录、Profile、头像、评分、退出。
7. 提交这个 commit-specific URL。截止时间为 **2026-10-01 18:00 EDT**。

## 9. 与最终 rubric 的对应关系

- 本次结构覆盖浏览 captions、Supabase 查询、登录退出、受保护 Profile、姓名与头像、评分持久化。
- UI 提供响应式首页、统一导航、Profile、搜索、登录引导、加载失败与空状态。
- 仍需真实验证 Google 设置、trigger、Storage 权限、评分落库和 Vercel 公网访问。
- 后续课程指定 API / schema、RLS 阶段、Assignment 4/5 要求尚未知，不能宣称现在已经满足整个 Project 1 或保证满分。
- 必看视频仍需观看；本指南没有把无法取得的完整视频内容当成已核实依据。
