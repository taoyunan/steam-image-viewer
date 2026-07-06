function buildApiTable(appData, storeData, regionalReviews = [], regionalPrices = []) {
    const data = appData.data || {};
    const common = appData.common || {};
    let html = '';

    const addRow = (label, value) => {
        if (value === '' || value === undefined || value === null || (Array.isArray(value) && value.length === 0)) return;
        html += `<tr><td>${label}</td><td>${value}</td></tr>`;
    };

    const addSection = (title, id = '') => {
        html += `<tr class="api-section-header"${id ? ` id="${id}"` : ''}><td colspan="2">${title}</td></tr>`;
    };
    
    const formatChineseDate = (ts) => {
        if (!ts || isNaN(ts)) return 'N/A';
        const date = new Date(ts * 1000);
        return date.toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    
    const englishName = get(common, 'name', '基本信息');
    const chineseName = get(common, 'name_localized.schinese');
    const resolvedAppId = get(data, 'steam_appid', get(data, 'appid', storeData?.steam_appid || appIdInput.value.trim()));
    let titleHtml = '';
    if (chineseName) {
        titleHtml += `<p class="api-game-title-zh">${chineseName}</p><p class="api-game-title">${englishName}</p>`;
    } else {
        titleHtml += `<p class="api-game-title-zh">${englishName}</p>`;
    }
    html += `<tr class="api-title-header"><td colspan="2">${titleHtml}</td></tr>`;
    
    addSection('基础数据', 'basicInfoSection');
    addRow('APP ID', resolvedAppId);
    addRow('Steam 商店页', createExternalLink(`https://store.steampowered.com/app/${resolvedAppId}/`, `https://store.steampowered.com/app/${resolvedAppId}/`));
    const typeMap = { game: '游戏', dlc: 'DLC', application: '应用', music: '音乐', video: '视频', series: '剧集', hardware: '硬件' };
    const appType = get(common, 'type', '');
    addRow('APP 类型', typeMap[appType.toLowerCase()] || appType);
    
    let developers = get(storeData, 'developers', get(data, 'developers', []));
    const devHtml = formatList(developers, createSearchLink);
    addRow('开发商', devHtml);

    let publishers = get(storeData, 'publishers', get(data, 'publishers', []));
    const pubHtml = formatList(publishers, createSearchLink);
    addRow('发行商', pubHtml);

    if (storeData) {
        addRow('官方网站', createExternalLink(storeData.website));
        addRow('年龄分级', get(storeData, 'required_age'));
        addRow('控制器支持', get(storeData, 'controller_support'));
        if (storeData.is_free) { addRow('价格', '免费游玩'); }
        else if (storeData.price_overview) {
            const price = storeData.price_overview;
            let priceHtml = `${price.final_formatted}`;
            if (price.discount_percent > 0) {
                priceHtml += ` <span style="color:#a1e196;">(-${price.discount_percent}%)</span> (原价: ${price.initial_formatted})`;
            }
            addRow('价格', priceHtml);
        }
        const priceRows = regionalPrices.filter(item => item.price || item.isFree);
        if (priceRows.length > 0) {
            const priceTable = `
                <table class="price-table">
                    <thead><tr><th>地区</th><th>CC</th><th>价格</th><th>币种</th></tr></thead>
                    <tbody>
                        ${priceRows.map(item => `
                            <tr>
                                <td>${escapeHtml(item.label)}</td>
                                <td>${escapeHtml(item.cc.toUpperCase())}</td>
                                <td>${formatRegionalPrice(item)}</td>
                                <td>${escapeHtml(item.price?.currency || (item.isFree ? '-' : ''))}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            addRow('地区价格', priceTable);
        }
        
        if (storeData.platforms) {
            let platformsHtml = '';
            if (storeData.platforms.windows) platformsHtml += `<span class="platform-icon" title="Windows">🪟</span>`;
            if (storeData.platforms.mac) platformsHtml += `<span class="platform-icon" title="macOS"></span>`;
            if (storeData.platforms.linux) platformsHtml += `<span class="platform-icon" title="Linux / SteamOS">🐧</span>`;
            addRow('支持平台', platformsHtml);
        }
        addRow('商店发布日期', get(storeData, 'release_date.date'));
        addRow('即将推出', storeData.release_date?.coming_soon ? '是' : '否');
        
        if (storeData.metacritic) {
            addRow('Metacritic 评分', `<a href="${storeData.metacritic.url}" target="_blank">${storeData.metacritic.score}</a>`);
        }
        
        if(storeData.genres) {
            const genresHtml = storeData.genres.map(g => createSteamTagLink(g.description)).join(' ');
            addRow('分类', genresHtml);
        }
        if(storeData.categories) {
            const categoriesHtml = storeData.categories.map(c => createSteamTagLink(c.description)).join(' ');
            addRow('小分类', categoriesHtml);
        }
    }
    addRow('支持系统', get(common, 'oslist'));
    
    const storeTagsObject = get(common, 'store_tags', {});
    const playerTags = Object.values(storeTagsObject)
        .map(tagId => steamTags.get(String(tagId)))
        .filter(Boolean);
    if (playerTags.length > 0) {
        const tagsHtml = playerTags.map(tagName => createSteamTagLink(tagName)).join(' ');
        addRow('玩家标签', tagsHtml);
    }

    const reviewRows = regionalReviews.filter(item => item.total > 0);
    if (reviewRows.length > 0) {
        addSection('地区 / 语言好评度', 'regionalReviewsSection');
        const reviewTable = `
            <table class="review-table">
                <thead><tr><th>地区 / 语言</th><th>好评率</th><th>好评 / 差评</th><th>总评测</th><th>Steam 评价</th></tr></thead>
                <tbody>
                    ${reviewRows.map(item => `
                        <tr>
                            <td>${escapeHtml(item.label)}</td>
                            <td>${formatReviewRate(item)}</td>
                            <td>${item.positive.toLocaleString()} / ${item.negative.toLocaleString()}</td>
                            <td>${item.total.toLocaleString()}</td>
                            <td>${escapeHtml(item.desc || '-')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        html += `<tr><td></td><td>${reviewTable}</td></tr>`;
    }
    
    addSection('发布信息', 'releaseInfoSection');
    addRow('商店页发行日期', formatChineseDate(get(common, 'steam_release_date')));
    addRow('发布状态', get(common, 'releasestate'));
    addRow('最后更新时间', formatChineseDate(get(common, 'last_record_update')));
    addRow('Last Changenumber', get(common, 'last_changenumber'));
    
    if (storeData) {
        addSection('PC 配置要求', 'requirementsSection');
        addRow('最低配置', get(storeData, 'pc_requirements.minimum', '无'));
        addRow('推荐配置', get(storeData, 'pc_requirements.recommended', '无'));
    }
    
    const localized = get(common, 'name_localized');
    if (localized && Object.keys(localized).length > 1) {
        addSection('本地化名称', 'localizationSection');
        const langMap = {'english':'英语','japanese':'日语','schinese':'简体中文','tchinese':'繁体中文','french':'法语','german':'德语','italian':'意大利语','koreana':'韩语','spanish':'西班牙语','russian':'俄语','thai':'泰语','portuguese':'葡萄牙语','polish':'波兰语','danish':'丹麦语','dutch':'荷兰语','finnish':'芬兰语','norwegian':'挪威语','swedish':'瑞典语','hungarian':'匈牙利语','czech':'捷克语','romanian':'罗马尼亚语','turkish':'土耳其语','arabic':'阿拉伯语','bulgarian':'保加利亚语','greek':'希腊语','ukrainian':'乌克兰语','vietnamese':'越南语','brazilian':'巴西葡萄牙语','latam':'拉丁美洲西班牙语'};
        Object.entries(localized).forEach(([lang, name]) => {
            if(lang !== 'schinese') addRow(langMap[lang] || lang, name)
        });
    }
    
    const langValue = get(data, 'supported_languages');
    if (langValue) {
        addSection("支持的语言", 'languageSection');
        const langMap = {'english': '英语', 'japanese': '日语', 'french': '法语', 'italian': '意大利语', 'german': '德语', 'spanish': '西班牙语 - 西班牙', 'brazilian': '葡萄牙语 - 巴西', 'russian': '俄语', 'schinese': '简体中文', 'tchinese': '繁体中文', 'koreana': '韩语'};
        let langTable = '<table class="language-table"><thead><tr><th>语言</th><th>界面</th><th>音频</th><th>字幕</th></tr></thead><tbody>';
        Object.entries(langValue).forEach(([lang, support]) => {
            if (support.supported) {
                langTable += `<tr><td>${langMap[lang] || lang}</td><td class="support-cell"><span class="check-mark">✔</span></td><td class="support-cell">${support.full_audio ? '<span class="check-mark">✔</span>' : ''}</td><td class="support-cell">${support.subtitles ? '<span class="check-mark">✔</span>' : ''}</td></tr>`;
            }
        });
        langTable += '</tbody></table>';
        html += `<tr><td></td><td>${langTable}</td></tr>`;
    }

    apiTable.innerHTML = html;
}
