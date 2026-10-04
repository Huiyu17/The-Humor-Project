# Week 4 实现与验收记录

本文件记录本次协作中用户提供的截图、SQL 查询结果和本地代码状态。不是远程数据库的自动审计报告，也不代表已经完成线上验收。

## 已实现

- Google 登录；未登录不能通过生成 action 或投票 action 写入。
- 首页公开浏览已发布配文。Explore 为左侧黑色按钮，Create 为右侧描边按钮。
- 从创建页的登录提示登录后，返回 `/create`。
- 创建页列出预设图和自己的上传图片；首页仍展示所有用户发布的配文。
- 预设图使用描述生成；上传图从 `caption-images` 下载后以图片数据交给 Gemini。
- 三种幽默风格：relatable、deadpan、absurd；场景输入 5–500 字符。
- 完整文字 prompt、模型、输入、生成者、图片引用保存在 `generations`；输出保存在 `captions`。
- 一人一条配文一张票：首次投票插入，改票更新。评分只能为 1 或 -1。

## 数据库配置记录

基于用户在 SQL Editor 中执行并返回的结果：

| 表 | 读取 | 写入 |
| --- | --- | --- |
| profiles | 登录用户只能读本人 | 只能更新本人姓名、头像地址、更新时间 |
| caption_votes | 登录用户只能读本人 | 本人插入和更新；不开放删除 |
| generations | 登录用户只能读本人 | 本人插入；不开放更新或删除 |
| captions | 公开读取 | 登录用户只能关联本人 generation，且图片 ID 必须匹配 |
| images | 公开读取 | 上传者必须为本人、路径为本人目录、URL 对应本项目 caption-images 桶，且文件已存在 |
| jokes | 公开读取 | 客户端不开放写入 |

最终只读审计确认上述六张表均开启 RLS，anon 无任何列的 INSERT/UPDATE 权限，也无 DELETE 权限。图片选择页过滤只是产品行为，不能把它当作图片元数据私有性的保证：images 当前为公开读取，两个桶也都是公开桶。

配置归档：[004_week4_schema_and_rls.sql](../supabase/004_week4_schema_and_rls.sql)，依据用户返回的 17 条不同 policy 及本次执行的 schema/grant 语句整理。当前项目已配置，不需要重新运行。此文件不是全新 Supabase 项目的完整初始化脚本；依赖 Week 3 表结构，桶通过 Dashboard/API 创建。换项目须替换图片 policy 内的项目 URL；未知旧策略和列级授权需另外审计。

新增结构：
- generations：id、user_id、image_id、user_input、prompt、model、created_at。
- captions.generation_id：可空外键，兼容原有配文。
- images.user_id 与 images.storage_path：可空，兼容原有预设图片。

Storage：
- avatars：公开桶，2 MB，JPEG/PNG/WebP；本人目录 INSERT、SELECT、DELETE。
- caption-images：公开桶，5 MB，JPEG/PNG/WebP；本人目录 INSERT、SELECT，无覆盖或删除权限。
- 上传后即有公开链接；图片只有关联配文后才出现在首页。

## 已验证

- 本地 Gemini 文本生成、上传图片看图生成及发布成功。
- 数据库查询确认生成配文、完整 prompt、模型、用户及时间关联正确。
- 两个账号对同一配文独立评分，刷新后保留；他人可评分上传图对应的新配文。
- 未登录浏览正常，评分入口要求登录，创建表单受登录限制。
- 开启 RLS 后，头像上传、姓名修改及刷新后读取正常。
- SQL 事务模拟 authenticated 身份：其他用户的 profiles、caption_votes、generations 可见行数为零；其他用户资料和投票 UPDATE 影响行数为零，随后回滚。
- 最终六表 RLS/anon 写权限审计通过；模拟用户冒用另一个真实用户身份插入投票，被权限错误拒绝，测试事务回滚。
- 用户运行完整 `npm run lint` 与 `npm run build` 均通过；生产构建包含首页、创建页、资料页和登录回调。手机尺寸创建页截图确认图片、表单及按钮正常排列。
- INVOKER 发布函数实际生成成功；数据库查询确认新 caption 关联 generation、prompt 长度为 681、图片引用一致。
- Vercel Production 已添加敏感变量 GEMINI_API_KEY；Supabase URL/key 已有。Week 4 线上部署及密钥实际调用仍待验证。

## 待完成

- [x] 最终表权限审计：六表开启 RLS，anon 无写权限；伪造投票归属被拒绝。
- [ ] 跨用户 Storage 上传拒绝测试。
- [x] 根据实际导出的 17 条策略整理 Week 4 schema/RLS SQL（已在远程逐步执行，归档未重新执行）。
- [ ] 改善生成结果长度约束；目前仅严格检查 500 字符，30 词只是 prompt 要求。
- [x] 已创建并接入 `005_publish_generation.sql` 中的 INVOKER 函数，生成记录与配文同一事务保存；新流程实际生成和数据关联已验证，故障回滚测试尚未执行。网络中断时仍需先查看首页再重试，避免重复发布。
- [x] npm run lint、npm run build 和手机创建页布局检查通过。
- [ ] 审阅 Git diff；不提交 .env.local 或编辑器备份文件；提交最终代码。
- [ ] Vercel 环境变量、登录回调、关闭部署保护与线上无痕验收。
- [ ] PM 真实反馈、对应修改和复测记录。
- [ ] 提交最终 commit 对应的部署 URL。

## 产品设计与 PM 反馈

目标用户 Sam：哥大学生、住校、刚到纽约、喜欢网络幽默。已实现的改进是支持自己的照片、校园/纽约场景、可选幽默风格，以及明确的创建入口。

每日回访和内容传播仍需产品说明及 PM 验证；每日主题、排行榜、独立分享页均未实现，不应作为已完成功能宣传。用户尚未收到 PM 反馈，不以本次自主界面调整替代课程反馈环节。

反馈记录模板：具体问题 → PM 建议 → 实施修改 → 复测结果。
