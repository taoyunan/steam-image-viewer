function loadSteamTags() {
    const tagsApiUrl = 'https://store.steampowered.com/tagdata/populartags/schinese';
    tagsListContainer.innerHTML = `<div class="tag-item">正在加载标签列表...</div>`;
    return fetchJsonWithFallback(tagsApiUrl, { directFirst: true, proxy: 'corsproxy', timeoutMs: 10000 })
        .then(tagsData => {
            if (!Array.isArray(tagsData)) throw new Error('Steam 标签接口返回格式无效');
            tagsData.forEach(tag => steamTags.set(String(tag.tagid), tag.name));
            console.log(`Loaded ${steamTags.size} Steam tags.`);
            populateTagsViewer(tagsData);
        })
        .catch(error => {
            console.error("Error fetching Steam tags:", error);
            tagsListContainer.innerHTML = `<div class="tag-item" style="color:#ef4444;">标签列表加载失败。</div>`;
        });
 }
 
 function displaySteamEvents() {
    const eventsData = [
        { name: '侦探游戏节', dates: '1月12日 - 1月19日' },
        { name: '桌游游戏节', dates: '1月26日 - 2月2日' },
        { name: '打字游戏节（焦点）', dates: '2月5日 - 2月9日' },
        { name: 'PvP 游戏节', dates: '2月9日 - 2月16日' },
        { name: '农历新年特卖', dates: '2月12日 - 2月26日' },
        { name: '马匹游戏节（焦点）', dates: '2月19日 - 2月23日' },
        { name: '新品节：2月版', dates: '2月23日 - 3月2日' },
        { name: '塔防游戏节', dates: '3月9日 - 3月16日' },
        { name: '春季特卖', dates: '3月19日 - 3月26日' },
        { name: '居家生活游戏节', dates: '3月30日 - 4月6日' },
        { name: '隐藏物品游戏节（焦点）', dates: '4月9日 - 4月13日' },
        { name: '中世纪游戏节', dates: '4月20日 - 4月27日' },
        { name: '牌组构建游戏节', dates: '5月4日 - 5月11日' },
        { name: '海洋游戏节', dates: '5月18日 - 5月25日' },
        { name: '弹幕游戏节', dates: '6月8日 - 6月15日' },
        { name: '新品节：6月版', dates: '6月15日 - 6月22日' },
        { name: '夏季特卖', dates: '6月25日 - 7月9日' },
        { name: '社交推理游戏节', dates: '7月13日 - 7月16日' },
        { name: '火车游戏节', dates: '7月20日 - 7月27日' },
        { name: '赛博朋克游戏节', dates: '8月3日 - 8月10日' },
        { name: '弹珠与钉板游戏节', dates: '8月17日 - 8月20日' },
        { name: 'PvE 生存制作游戏节', dates: '8月31日 - 9月7日' },
        { name: '编程游戏节', dates: '9月10日 - 9月14日' },
        { name: '组队 RPG 游戏节', dates: '9月14日 - 9月21日' },
        { name: '秋季特卖', dates: '10月1日 - 10月8日' },
        { name: '烹饪游戏节', dates: '10月12日 - 10月19日' },
        { name: '新品节：10月版', dates: '10月19日 - 10月26日' },
        { name: 'Steam 尖叫游戏节 V', dates: '10月26日 - 11月2日' },
        { name: '自动战斗 RPG 游戏节', dates: '11月16日 - 11月23日' },
        { name: '冬季特卖', dates: '12月17日 - 1月4日' }
    ];

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        const currentYear = today.getFullYear();
        
        const eventObjects = eventsData.map(event => {
            const dateParts = event.dates.replace(/ /g, '').split('-');
            if (dateParts.length !== 2) return { ...event, isActive: false };

            const startMatch = dateParts[0].match(/(\d+)月(\d+)日/);
            const endMatch = dateParts[1].match(/(\d+)月(\d+)日/);

            if (!startMatch || !endMatch) return { ...event, isActive: false };

            const startMonth = parseInt(startMatch[1]);
            const startDay = parseInt(startMatch[2]);
            const endMonth = parseInt(endMatch[1]);
            const endDay = parseInt(endMatch[2]);
            
            let startYear = currentYear;
            let endYear = currentYear;

            if (startMonth > endMonth) { // Handle Dec -> Jan wrap-around
                if (today.getMonth() < startMonth - 1) { 
                     // If it's Jan now, the start date was last year
                     startYear = currentYear - 1;
                } else { 
                    // If it's Dec now, the end date is next year
                     endYear = currentYear + 1;
                }
            }

            const startDate = new Date(startYear, startMonth - 1, startDay);
            const endDate = new Date(endYear, endMonth - 1, endDay);
            endDate.setHours(23, 59, 59, 999);

            const isActive = today >= startDate && today <= endDate;
            return { ...event, isActive };
        });

        const activeEvents = eventObjects.filter(e => e.isActive);
        const otherEvents = eventObjects.filter(e => !e.isActive);
        const sortedEvents = [...activeEvents, ...otherEvents];
        
        let tableHtml = '<table id="events-table"><thead><tr><th>活动名称</th><th>日期</th></tr></thead><tbody>';
        sortedEvents.forEach(event => {
            tableHtml += `<tr class="event-row ${event.isActive ? 'active' : ''}"><td>${event.name}</td><td>${event.dates}</td></tr>`;
        });
        tableHtml += '</tbody></table>';
        eventsListContainer.innerHTML = tableHtml;

    } catch (e) {
        console.error("Error displaying Steam events:", e);
        eventsListContainer.innerHTML = `<p style="color:#ef4444;">显示活动日历时出错。</p>`;
    }
 }
