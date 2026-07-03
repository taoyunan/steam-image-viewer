# 功能与 API 对照表

本文档用于记录 `123.html` 中每个功能模块对应的接口、关键字段、页面位置词条和左侧获取状态词条，方便后续维护和扩展。

## 页面位置词条

| 左侧词条 | 页面区域 | DOM / 锚点 | 主要内容 |
| --- | --- | --- | --- |
| 横幅 | 横幅生成器 | `#bannerBuilder` | SteamID 输入、顶部预览卡片、横幅画布、保存图片 |
| 基础 | API 数据 / 基础数据 | `#basicInfoSection` | AppID、商店页、类型、开发商、发行商、官网、价格、地区价格、平台、分类 |
| 配置 | API 数据 / PC 配置要求 | `#requirementsSection` | 最低配置、推荐配置 |
| 视频 | 宣传影像 | `#videoInspector` | 视频封面、MP4/WebM/HLS/DASH 链接、最高分辨率 |
| 图片 | 图片探查器 | `#imageInspector` | 图片按分辨率/用途分组、裁剪、下载 |
| 链接 | 链接导出框 | `#urlsBox` | 全部图片、封面、视频链接导出 |
| 获取状态 | 左侧状态面板 | `#fetchStatusPanel` | 成功、失败、缺失项提示 |
| 历史记录 | 左侧历史面板 | `#appHistory` | 最近搜索过的 AppID |

## 功能与接口

| 功能模块 | 页面位置词条 | 使用接口 / 来源 | 关键字段 / 数据 | 左侧状态词条 |
| --- | --- | --- | --- | --- |
| AppID 解析 | 横幅 | 用户输入，无外部 API | 支持纯 AppID 或 `store.steampowered.com/app/{appid}` 链接 | 正在请求 / 获取失败 |
| SteamCMD 基础资源 | 横幅、基础、图片 | `https://api.steamcmd.net/v1/info/{appid}` | `data.{appid}.common`、`common.library_assets_full`、`common.store_tags`、`common.name_localized`、`data.developers`、`data.publishers` | SteamCMD / SteamCMD 无数据 / SteamCMD 失败 |
| Steam 商店详情 | 顶部预览卡片、基础、配置、视频、图片 | `https://store.steampowered.com/api/appdetails?appids={appid}&l=schinese&cc=cn` | `name`、`header_image`、`developers`、`publishers`、`website`、`required_age`、`controller_support`、`price_overview`、`platforms`、`release_date`、`metacritic`、`genres`、`categories`、`short_description`、`about_the_game`、`pc_requirements`、`supported_languages`、`screenshots`、`movies` | 商店详情 / 商店详情无数据 / 商店详情失败 |
| 顶部商店预览卡片 | 横幅 | Steam 商店详情 + 地区价格 | `header_image`、`name`、`developers`、`publishers`、`price_overview`、`platforms`、`type`、`required_age`、`metacritic.score`、地区价格摘要 | 跟随商店详情、地区价格状态 |
| 横幅背景与 Logo | 横幅 | SteamCMD `library_assets_full` + Steam 静态资源 | `library_hero.image.english`、`library_logo.image.schinese`、`library_logo.image.english`；拼接 `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{appid}/{path}` | 横幅素材 / 横幅素材缺失 / 横幅素材失败 |
| 地区价格 | 基础 | `https://store.steampowered.com/api/appdetails?appids={appid}&filters=price_overview&cc={cc}&l=schinese` | `price_overview.currency`、`initial`、`final`、`discount_percent`、`initial_formatted`、`final_formatted` | 地区价格 {数量} / 地区价格无数据 / 地区价格失败 |
| 地区 / 语言好评度 | 基础 | `https://store.steampowered.com/appreviews/{appid}?json=1&language={language}&purchase_type=all&num_per_page=0` | `query_summary.total_reviews`、`total_positive`、`total_negative`、`review_score_desc` | 好评度 {数量} / 好评度无数据 / 好评度失败 |
| Steam 标签中文名 | 基础 | `https://store.steampowered.com/tagdata/populartags/schinese` | `tagid`、`name`；用于把 SteamCMD `common.store_tags` 的 tag id 转为中文标签 | 不进左侧状态，失败时标签面板内提示 |
| 商店截图 | 图片、链接 | Steam 商店详情 | `screenshots[].path_full` | 截图 {数量} / 截图缺失 |
| 图片资源扫描 | 图片、链接 | SteamCMD 全量 JSON + 商店截图 | 递归扫描 `.jpg`、`.jpeg`、`.png`、`.webp`、`.gif` 链接；相对路径使用 `IMG_BASE + appid + "/" + path` 补全 | 图片 {数量} / 图片缺失 |
| 图片分辨率分组 | 图片 | 图片 URL + 图片加载后的自然尺寸 | 优先按真实 `naturalWidth x naturalHeight`，失败时用 URL 中的尺寸特征兜底 | 跟随图片状态 |
| 图片用途分组 | 图片 | 图片 URL + 截图列表 | 商店截图、Logo、Library Hero、商店封面 / Capsule、背景图、竖版封面、封面素材、其他素材 | 跟随图片状态 |
| 宣传影像 | 视频、链接 | Steam 商店详情 | `movies[]`、`thumbnail`、`mp4.max`、`mp4.480`、`webm.max`、`webm.480`、`hls_h264`、`dash_h264`、`dash_av1` | 视频 {数量} / 视频缺失 |
| 视频高清封面 | 视频、链接 | Steam 商店详情图片 URL | 将 `movie_600x337.jpg` 等尺寸封面替换为 `movie_full.jpg` | 跟随视频状态 |
| HLS / DASH 分辨率识别 | 视频 | `hls_h264`、`dash_h264`、`dash_av1` 清单 URL | 读取 manifest 中的 `RESOLUTION=宽x高` 或 `width/height`，显示最高分辨率，如 `1920x1080`、`2560x1440 2K`、`3840x2160 4K` | 跟随视频状态 |
| API 数据浏览器 | 基础、配置 | SteamCMD + Steam 商店详情 + 地区价格 + 好评度 | 结构化展示基础数据、价格、地区价格、平台、分类、好评度、发布信息、配置、本地化名称、支持语言 | 跟随各接口状态 |
| 链接导出 | 链接 | 图片资源 + 商店截图 + 视频封面 + 视频流 | 去重后的 URL 列表，支持复制全部和导出 `.txt` | 跟随图片、截图、视频状态 |
| 搜索历史 | 历史记录 | `localStorage` | key: `steamAssetHistory`；保存 `appId`、`name`、`time`，最多 8 条 | 不进左侧获取状态 |

## 地区价格范围

地区价格使用 `PRICE_REGIONS` 配置，当前包含：

| CC | 地区 |
| --- | --- |
| `cn` | 中国大陆 |
| `us` | 美国 |
| `hk` | 中国香港 |
| `tw` | 中国台湾 |
| `jp` | 日本 |
| `kr` | 韩国 |
| `sg` | 新加坡 |
| `th` | 泰国 |
| `vn` | 越南 |
| `my` | 马来西亚 |
| `id` | 印度尼西亚 |
| `ph` | 菲律宾 |
| `in` | 印度 |
| `tr` | 土耳其 |
| `ar` | 阿根廷 |
| `br` | 巴西 |
| `mx` | 墨西哥 |
| `ca` | 加拿大 |
| `gb` | 英国 |
| `de` | 德国 |
| `fr` | 法国 |
| `pl` | 波兰 |
| `ua` | 乌克兰 |
| `kz` | 哈萨克斯坦 |
| `ru` | 俄罗斯 |
| `au` | 澳大利亚 |
| `nz` | 新西兰 |
| `sa` | 沙特阿拉伯 |
| `ae` | 阿联酋 |
| `za` | 南非 |

## 好评度语言范围

好评度使用 `REVIEW_LOCALES` 配置，当前包含：

| language | 页面显示 |
| --- | --- |
| `all` | 全球 |
| `schinese` | 简体中文 |
| `english` | 英语 |
| `tchinese` | 繁体中文 |
| `japanese` | 日语 |
| `koreana` | 韩语 |
| `russian` | 俄语 |
| `german` | 德语 |
| `french` | 法语 |
| `spanish` | 西班牙语 |
| `brazilian` | 巴西葡萄牙语 |

## 获取状态词条

左侧“获取状态”用于提示每类数据是否拿到：

| 词条 | 成功 | 无数据 / 缺失 | 失败 |
| --- | --- | --- | --- |
| SteamCMD | `SteamCMD` | `SteamCMD 无数据` | `SteamCMD 失败` |
| 商店详情 | `商店详情` | `商店详情无数据` | `商店详情失败` |
| 好评度 | `好评度 {数量}` | `好评度无数据` | `好评度失败` |
| 地区价格 | `地区价格 {数量}` | `地区价格无数据` | `地区价格失败` |
| 横幅素材 | `横幅素材` | `横幅素材缺失` | `横幅素材失败` |
| 截图 | `截图 {数量}` | `截图缺失` | - |
| 图片 | `图片 {数量}` | `图片缺失` | - |
| 视频 | `视频 {数量}` | `视频缺失` | - |

## 代理与容错

- 商店详情、好评度等接口优先直连，失败后按需尝试代理。
- 通用代理顺序：`AllOrigins`、`CodeTabs`、`CORSProxy`、`IsomorphicGit`。
- 地区价格为了避免全量地区请求过慢，只使用直连 + `CORSProxy` 快速兜底。
- 某个接口失败时，不中断整个页面；只要 SteamCMD 或商店详情任一成功，就尽量继续展示可用数据。
