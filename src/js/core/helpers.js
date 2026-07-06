const API_BASE = "https://api.steamcmd.net/v1/info/";
 const STORE_API_BASE = "https://store.steampowered.com/api/appdetails?appids=";
 const IMG_BASE = "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/";
 const snapThreshold = 10;
 
 // DOM Elements
 const appIdInput = document.getElementById("appId");
 const canvas = document.getElementById("heroCanvas");
 const ctx = canvas.getContext("2d");
 const errorBox = document.getElementById("error");
 const loadingBox = document.getElementById("loading");
 const scaleSlider = document.getElementById("scaleSlider");
 const scalePercent = document.getElementById("scalePercent");
 const updateBtn = document.getElementById("updateBtn");
 const saveBtn = document.getElementById("saveBtn");
 const goToStoreBtn = document.getElementById("goToStoreBtn");
 const overlaySlider = document.getElementById("overlaySlider");
 const overlayPercent = document.getElementById("overlayPercent");
 const imageInspector = document.getElementById("imageInspector");
 const imageList = document.getElementById("imageList");
 const videoInspector = document.getElementById("videoInspector");
 const videoList = document.getElementById("videoList");
 const appHistoryBox = document.getElementById("appHistory");
 const historyPanel = document.getElementById("historyPanel");
 const historyToggleBtn = document.getElementById("historyToggleBtn");
 const cacheDetailPanel = document.getElementById("cacheDetailPanel");
 const gamePreview = document.getElementById("gamePreview");
 const fetchStatusPanel = document.getElementById("fetchStatusPanel");
 const healthPanel = document.getElementById("healthPanel");
 const urlsBox = document.getElementById("urlsBox");
 const gradientColorInput = document.getElementById("gradientColor");
 const gradientDirectionSelect = document.getElementById("gradientDirection");
 const apiViewerContainer = document.getElementById("apiViewerContainer");
 const apiTable = document.getElementById("api-table");
 const cropModal = document.getElementById('cropModal');
 const cropImage = document.getElementById('cropImage');
 const cropWidthInput = document.getElementById('cropWidth');
 const cropHeightInput = document.getElementById('cropHeight');
 const tagsViewerPanel = document.getElementById('tagsViewer');
 const tagsListContainer = document.getElementById('tagsListContainer');
 const eventsViewerPanel = document.getElementById('eventsViewer');
 const eventsListContainer = document.getElementById('eventsListContainer');
 const tutorialPanel = document.getElementById('tutorial');
 const settingsViewerPanel = document.getElementById('settingsViewer');
 const settingStoreCountry = document.getElementById('settingStoreCountry');
 const settingStoreLanguage = document.getElementById('settingStoreLanguage');
 
 // Global state variables
 let heroImg = new Image();
 let logoImg = new Image();
 let logoX = 0, logoY = 0, logoScale = 1;
 let customText = "", textColor = "#ffffff", textSize = 24, textFont = "微软雅黑";
 let textX = 20, textY = 20, lineSpacing = 5;
 let overlayOpacity = 0.4;
 let gradientColor = "#000000";
 let gradientDirection = "top-to-bottom";
 let dragging = false;
 let dragTarget = null;
 let dragOffsetX = 0, dragOffsetY = 0;
 let cropper = null;
 let imageCategories = {};
 let imageItems = [];
 let imageGroupMode = 'resolution';
 let videoData = [];
 let screenshotUrls = [];
 let steamTags = new Map();
 let tagsPromise = null;
 let appSettings = null;
 let currentAppSnapshot = null;
 let lastHealthItems = [];
 let currentModuleId = 'bannerBuilder';

 // --- HELPER FUNCTIONS ---
 function clearError() { errorBox.textContent = ""; }
 function showError(msg) { errorBox.textContent = msg; }
 function setLoading(msg) { loadingBox.textContent = msg; }
 function clearLoading() { loadingBox.textContent = ""; }
 function hexToRgba(hex, alpha) { const r = parseInt(hex.slice(1, 3), 16); const g = parseInt(hex.slice(3, 5), 16); const b = parseInt(hex.slice(5, 7), 16); return `rgba(${r}, ${g}, ${b}, ${alpha})`; }
 
 const get = (obj, path, defaultValue = '') => {
    if (!obj) return defaultValue;
    const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
    return value !== undefined && value !== null ? value : defaultValue;
 };
 const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
 const formatList = (items, formatter = item => escapeHtml(item)) => {
    const list = Array.isArray(items) ? items : (items ? [items] : []);
    return list.filter(Boolean).map(formatter).join(', ');
 };
 const createSearchLink = (name) => `<a href="https://store.steampowered.com/search/?term=${encodeURIComponent(name)}" target="_blank">${escapeHtml(name)}</a>`;
const createExternalLink = (url, label = url) => {
    if (!url) return '';
    return `<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(label)}</a>`;
};
const createSteamTagLink = (tagName, extraClass = '') => {
    if (!tagName) return '';
    const className = extraClass ? `api-tag ${extraClass}` : 'api-tag';
    return `<a class="${className}" href="https://store.steampowered.com/tags/zh-cn/${encodeURIComponent(tagName)}/" target="_blank" rel="noopener noreferrer">${escapeHtml(tagName)}</a>`;
};
 function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return div.textContent.replace(/\s+/g, ' ').trim();
 }
 function parseAppId(rawInput) {
    const raw = String(rawInput || '').trim();
    const urlMatch = raw.match(/store\.steampowered\.com\/app\/(\d+)/);
    return urlMatch?.[1] || raw;
 }
 const CACHE_DB_NAME = 'steamImageViewerCache';
 const CACHE_STORE_NAME = 'appApiData';
 const CACHE_VERSION = 1;
 let cacheDbPromise = null;
 function openCacheDb() {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    if (cacheDbPromise) return cacheDbPromise;
    cacheDbPromise = new Promise((resolve) => {
        const request = indexedDB.open(CACHE_DB_NAME, CACHE_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
                db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'appId' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            console.warn('缓存数据库打开失败:', request.error);
            resolve(null);
        };
    });
    return cacheDbPromise;
 }
 function serializeSettled(result) {
    if (!result) return { status: 'rejected', reasonMessage: '无结果' };
    if (result.status === 'fulfilled') return { status: 'fulfilled', value: result.value };
    return { status: 'rejected', reasonMessage: result.reason?.message || String(result.reason || '请求失败') };
 }
 function restoreSettled(result) {
    if (!result || result.status !== 'fulfilled') {
        return { status: 'rejected', reason: { message: result?.reasonMessage || '缓存中没有该数据' } };
    }
    return { status: 'fulfilled', value: result.value };
 }
 async function readCachedAppData(appId) {
    try {
        const db = await openCacheDb();
        if (!db) return null;
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(CACHE_STORE_NAME, 'readonly');
            const request = tx.objectStore(CACHE_STORE_NAME).get(String(appId));
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.warn('读取缓存失败:', error);
        return null;
    }
 }
 async function writeCachedAppData(appId, results) {
    try {
        const db = await openCacheDb();
        if (!db) return;
        const record = {
            appId: String(appId),
            savedAt: Date.now(),
            version: CACHE_VERSION,
            results: {
                steamCmdResult: serializeSettled(results.steamCmdResult),
                storeResult: serializeSettled(results.storeResult),
                regionalReviewsResult: serializeSettled(results.regionalReviewsResult),
                regionalPricesResult: serializeSettled(results.regionalPricesResult)
            }
        };
        record.appName = getCachedRecordName(record);
        await new Promise((resolve, reject) => {
            const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
            tx.objectStore(CACHE_STORE_NAME).put(record);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        console.warn('写入缓存失败:', error);
    }
 }
 function getCachedRecordName(record) {
    const appId = String(record?.appId || '');
    const steamValue = record?.results?.steamCmdResult?.value;
    const storeValue = record?.results?.storeResult?.value;
    const appData = steamValue?.data?.[appId];
    const storeData = storeValue?.[appId]?.data;
    return record?.appName
        || get(appData, 'common.name_localized.schinese', '')
        || get(appData, 'common.name', '')
        || storeData?.name
        || '';
 }
 async function listCachedAppData() {
    try {
        const db = await openCacheDb();
        if (!db) return [];
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(CACHE_STORE_NAME, 'readonly');
            const request = tx.objectStore(CACHE_STORE_NAME).getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.warn('读取缓存历史失败:', error);
        return [];
    }
 }
 async function deleteCachedAppData(appId) {
    try {
        const db = await openCacheDb();
        if (!db) return;
        await new Promise((resolve, reject) => {
            const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
            tx.objectStore(CACHE_STORE_NAME).delete(String(appId));
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        console.warn('删除缓存失败:', error);
        showError('删除缓存失败，请稍后再试。');
    }
 }
 async function clearCachedAppData() {
    try {
        const db = await openCacheDb();
        if (!db) return;
        await new Promise((resolve, reject) => {
            const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
            tx.objectStore(CACHE_STORE_NAME).clear();
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        console.warn('清空缓存失败:', error);
        showError('清空缓存失败，请稍后再试。');
    }
 }
 function formatCacheTime(timestamp) {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
 }
 async function renderAppHistory() {
    const history = (await listCachedAppData()).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    appHistoryBox.innerHTML = '';
    if (history.length === 0) {
        appHistoryBox.innerHTML = '<div class="history-empty">暂无缓存记录</div>';
        return;
    }
    history.forEach(item => {
        const row = document.createElement('div');
        row.className = 'history-row';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'history-chip';
        button.dataset.appId = item.appId;
        const name = getCachedRecordName(item);
        button.textContent = name ? `${name} · ${item.appId}` : item.appId;
        button.title = `${button.textContent}${item.savedAt ? `\n缓存时间：${formatCacheTime(item.savedAt)}` : ''}`;

        const detailBtn = document.createElement('button');
        detailBtn.type = 'button';
        detailBtn.className = 'history-detail-btn';
        detailBtn.dataset.action = 'cache-detail';
        detailBtn.dataset.appId = item.appId;
        detailBtn.textContent = '详';
        detailBtn.title = `查看 ${item.appId} 缓存详情`;
        detailBtn.setAttribute('aria-label', `查看 ${item.appId} 缓存详情`);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'history-delete-btn';
        deleteBtn.dataset.action = 'delete-cache';
        deleteBtn.dataset.appId = item.appId;
        deleteBtn.textContent = '×';
        deleteBtn.title = `删除 ${item.appId} 的缓存`;
        deleteBtn.setAttribute('aria-label', `删除 ${item.appId} 的缓存`);

        row.appendChild(button);
        row.appendChild(detailBtn);
        row.appendChild(deleteBtn);
        appHistoryBox.appendChild(row);
    });
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'history-clear-btn';
    clearBtn.dataset.action = 'clear-cache';
    clearBtn.textContent = '删除所有缓存';
    appHistoryBox.appendChild(clearBtn);
 }
 function getSettledStateLabel(result) {
    if (!result) return '无记录';
    return result.status === 'fulfilled' ? '成功' : `失败：${result.reasonMessage || '请求失败'}`;
 }
 function summarizeCacheRecord(record) {
    const appId = String(record?.appId || '');
    const steamValue = record?.results?.steamCmdResult?.value || {};
    const storeValue = record?.results?.storeResult?.value || {};
    const appData = steamValue.data?.[appId] || null;
    const storeData = storeValue?.[appId]?.data || null;
    const reviews = record?.results?.regionalReviewsResult?.value || [];
    const prices = record?.results?.regionalPricesResult?.value || [];
    const imageCount = findImageCandidates(steamValue).length + Number(storeData?.screenshots?.length || 0);
    const videoCount = Array.isArray(storeData?.movies) ? storeData.movies.filter(movie => getVideoFormats(movie).length > 0).length : 0;
    return {
        appId,
        name: getCachedRecordName(record) || appId,
        savedAt: formatCacheTime(record?.savedAt),
        steamState: getSettledStateLabel(record?.results?.steamCmdResult),
        storeState: getSettledStateLabel(record?.results?.storeResult),
        reviewCount: reviews.filter(item => item.total > 0).length,
        priceCount: prices.filter(item => item.price || item.isFree).length,
        imageCount,
        videoCount,
        hasSteamData: Boolean(appData),
        hasStoreData: Boolean(storeData)
    };
 }
 function renderCacheDetail(record) {
    const summary = summarizeCacheRecord(record);
    cacheDetailPanel.classList.remove('hidden');
    cacheDetailPanel.innerHTML = `
        <div class="cache-detail-title">${escapeHtml(summary.name)}</div>
        <div class="cache-detail-grid">
            <div><span>AppID</span><span>${escapeHtml(summary.appId)}</span></div>
            <div><span>缓存时间</span><span>${escapeHtml(summary.savedAt || '-')}</span></div>
            <div><span>SteamCMD</span><span>${escapeHtml(summary.steamState)}</span></div>
            <div><span>商店详情</span><span>${escapeHtml(summary.storeState)}</span></div>
            <div><span>好评度</span><span>${summary.reviewCount} 个地区 / 语言</span></div>
            <div><span>地区价格</span><span>${summary.priceCount} 个地区</span></div>
            <div><span>图片</span><span>${summary.imageCount} 条链接</span></div>
            <div><span>视频</span><span>${summary.videoCount} 条宣传影像</span></div>
        </div>
    `;
 }
 function inferImagePurpose(url, resolution = '') {
    const lower = url.toLowerCase();
    if (screenshotUrls.includes(url) || /\/ss_|screenshots?/.test(lower)) return '商店截图';
    if (/library_logo|logo/.test(lower)) return 'Logo';
    if (/library_hero|hero/.test(lower)) return 'Library Hero';
    if (/capsule|header/.test(lower)) return '商店封面 / Capsule';
    if (/page_bg|background|library_600x900/.test(lower)) return '背景图';
    if (resolution === '300x450' || /600x900|300x450/.test(lower)) return '竖版封面';
    if (/920x430|616x353|374x448|600x900/.test(lower)) return '封面素材';
    return '其他素材';
 }
 function formatMainPrice(storeData) {
    if (!storeData) return '';
    if (storeData.is_free) return '免费游玩';
    const price = storeData.price_overview;
    if (!price) return '';
    const discount = Number(price.discount_percent || 0);
    return discount > 0
        ? `${price.final_formatted}（-${discount}% / 原价 ${price.initial_formatted || '-'}）`
        : price.final_formatted;
 }
 function getPlatformLabels(platforms) {
    if (!platforms) return '';
    const labels = [];
    if (platforms.windows) labels.push('Windows');
    if (platforms.mac) labels.push('macOS');
    if (platforms.linux) labels.push('Linux / SteamOS');
    return labels.join(' / ');
 }
 function getAppTypeLabel(type) {
    const typeMap = { game: '游戏', dlc: 'DLC', application: '应用', music: '音乐', video: '视频', series: '剧集', hardware: '硬件' };
    return typeMap[String(type || '').toLowerCase()] || type || '';
 }
 function summarizeRegionalPrices(regionalPrices = []) {
    const rows = regionalPrices.filter(item => item.price);
    if (rows.length === 0) return '';
    const china = rows.find(item => item.cc === 'cn');
    const first = china || rows[0];
    return `${rows.length} 个地区，${first.label} ${first.price.final_formatted}`;
 }
 function renderPreviewFact(label, value) {
    if (!value) return '';
    return `
        <div class="game-preview-fact">
            <span class="game-preview-fact-label">${escapeHtml(label)}</span>
            <span class="game-preview-fact-value" title="${escapeHtml(value)}">${escapeHtml(value)}</span>
        </div>
    `;
 }
 function renderGamePreview(appData, storeData, regionalPrices = []) {
    const data = appData.data || {};
    const common = appData.common || {};
    const appId = get(data, 'steam_appid', get(data, 'appid', storeData?.steam_appid || appIdInput.value.trim()));
    const title = get(common, 'name_localized.schinese', storeData?.name || get(common, 'name', appId));
    const header = storeData?.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
    const developers = formatList(storeData?.developers || data.developers || []);
    const publishers = formatList(storeData?.publishers || data.publishers || []);
    const releaseDate = storeData?.release_date?.date || '未知日期';
    const price = formatMainPrice(storeData);
    const desc = stripHtml(storeData?.short_description || storeData?.about_the_game || '');
    const genres = (storeData?.genres || []).slice(0, 6).map(g => g.description);
    const categories = (storeData?.categories || []).slice(0, 6).map(c => c.description);
    const platforms = getPlatformLabels(storeData?.platforms);
    const appType = getAppTypeLabel(storeData?.type || common.type);
    const age = Number(storeData?.required_age || 0) > 0 ? `${storeData.required_age}+` : '';
    const controller = storeData?.controller_support ? storeData.controller_support : '';
    const regionalPriceNote = summarizeRegionalPrices(regionalPrices);
    const meta = [
        developers && `开发商：${developers}`,
        publishers && `发行商：${publishers}`,
        releaseDate && `日期：${releaseDate}`,
        price && `价格：${price}`
    ].filter(Boolean).map(item => `<span>${item}</span>`).join('');
    const facts = [
        ['APP ID', String(appId)],
        ['类型', appType],
        ['支持平台', platforms],
        ['控制器', controller],
        ['年龄分级', age],
        ['Metacritic', storeData?.metacritic?.score ? String(storeData.metacritic.score) : ''],
        ['地区价格', regionalPriceNote]
    ].map(([label, value]) => renderPreviewFact(label, value)).join('');
    gamePreview.innerHTML = `
        <div class="game-preview-inner">
            <img src="${escapeHtml(header)}" alt="${escapeHtml(title)}">
            <div class="game-preview-body">
                <h2 class="game-preview-title">${escapeHtml(title)}</h2>
                <div class="game-preview-meta">${meta}</div>
                ${facts ? `<div class="game-preview-facts">${facts}</div>` : ''}
                ${desc ? `<p class="game-preview-desc">${escapeHtml(desc)}</p>` : ''}
                <div class="game-preview-tags">${[...genres, ...categories].map(tag => createSteamTagLink(tag)).join('')}</div>
                <div class="game-preview-actions">
                    <a class="preview-link" href="https://store.steampowered.com/app/${escapeHtml(appId)}/" target="_blank">打开 Steam 商店</a>
                    ${storeData?.website ? `<a class="preview-link" href="${escapeHtml(storeData.website)}" target="_blank">官网</a>` : ''}
                    ${regionalPriceNote ? `<span class="preview-price-note">${escapeHtml(regionalPriceNote)}</span>` : ''}
                </div>
            </div>
        </div>
    `;
    gamePreview.style.display = 'block';
 }
 function renderFetchStatus(items) {
    if (!items || items.length === 0) {
        fetchStatusPanel.innerHTML = '<div class="fetch-status-title">获取状态</div><div class="fetch-status-item pending"><span class="status-label">等待输入</span></div>';
        return;
    }
    fetchStatusPanel.innerHTML = '<div class="fetch-status-title">获取状态</div>' + items.map(item => {
        const title = item.detail ? `${item.label}：${item.detail}` : item.label;
        return `<div class="fetch-status-item ${item.state}" title="${escapeHtml(title)}"><span class="status-label">${escapeHtml(item.label)}</span></div>`;
    }).join('');
 }
 const REVIEW_LOCALES = [
    { code: 'all', label: '全球' },
    { code: 'schinese', label: '简体中文' },
    { code: 'english', label: '英语' },
    { code: 'tchinese', label: '繁体中文' },
    { code: 'japanese', label: '日语' },
    { code: 'koreana', label: '韩语' },
    { code: 'russian', label: '俄语' },
    { code: 'german', label: '德语' },
    { code: 'french', label: '法语' },
    { code: 'spanish', label: '西班牙语' },
    { code: 'brazilian', label: '巴西葡萄牙语' }
 ];
 const PRICE_REGIONS = [
    { cc: 'cn', label: '中国大陆' },
    { cc: 'us', label: '美国' },
    { cc: 'hk', label: '中国香港' },
    { cc: 'tw', label: '中国台湾' },
    { cc: 'jp', label: '日本' },
    { cc: 'kr', label: '韩国' },
    { cc: 'sg', label: '新加坡' },
    { cc: 'th', label: '泰国' },
    { cc: 'vn', label: '越南' },
    { cc: 'my', label: '马来西亚' },
    { cc: 'id', label: '印度尼西亚' },
    { cc: 'ph', label: '菲律宾' },
    { cc: 'in', label: '印度' },
    { cc: 'tr', label: '土耳其' },
    { cc: 'ar', label: '阿根廷' },
    { cc: 'br', label: '巴西' },
    { cc: 'mx', label: '墨西哥' },
    { cc: 'ca', label: '加拿大' },
    { cc: 'gb', label: '英国' },
    { cc: 'de', label: '德国' },
    { cc: 'fr', label: '法国' },
    { cc: 'pl', label: '波兰' },
    { cc: 'ua', label: '乌克兰' },
    { cc: 'kz', label: '哈萨克斯坦' },
    { cc: 'ru', label: '俄罗斯' },
    { cc: 'au', label: '澳大利亚' },
    { cc: 'nz', label: '新西兰' },
    { cc: 'sa', label: '沙特阿拉伯' },
    { cc: 'ae', label: '阿联酋' },
    { cc: 'za', label: '南非' }
 ];
 const DEFAULT_SETTINGS = {
    storeCountry: 'cn',
    storeLanguage: 'schinese'
 };
 function loadAppSettings() {
    try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('steamViewerSettings') || '{}') };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
 }
 function saveAppSettings(settings) {
    appSettings = { ...DEFAULT_SETTINGS, ...settings };
    localStorage.setItem('steamViewerSettings', JSON.stringify(appSettings));
    renderSettingsForm();
 }
 function getAppSettings() {
    if (!appSettings) appSettings = loadAppSettings();
    return appSettings;
 }
 function getRegionLabel(cc) {
    return PRICE_REGIONS.find(region => region.cc === cc)?.label || cc.toUpperCase();
 }
 function renderSettingsForm() {
    const settings = getAppSettings();
    settingStoreCountry.innerHTML = PRICE_REGIONS.map(region => (
        `<option value="${escapeHtml(region.cc)}"${region.cc === settings.storeCountry ? ' selected' : ''}>${escapeHtml(region.label)} (${region.cc.toUpperCase()})</option>`
    )).join('');
    settingStoreLanguage.value = settings.storeLanguage || DEFAULT_SETTINGS.storeLanguage;
 }
 function renderHealthStatus(items = []) {
    lastHealthItems = items;
    if (!items.length) {
        healthPanel.innerHTML = '<div class="health-title">接口健康</div><div class="health-row pending"><span class="health-name">等待</span><span class="health-detail">输入 AppID 后显示</span></div>';
        return;
    }
    healthPanel.innerHTML = '<div class="health-title">接口健康</div>' + items.map(item => (
        `<div class="health-row ${item.state}" title="${escapeHtml(item.detail || item.label)}">
            <span class="health-name">${escapeHtml(item.label)}</span>
            <span class="health-detail">${escapeHtml(item.detail || '')}</span>
        </div>`
    )).join('');
 }
 const MODULE_TARGETS = {
    bannerBuilder: ['bannerBuilder'],
    apiViewerContainer: ['apiViewerContainer'],
    mediaInspector: ['videoInspector', 'imageInspector']
 };
 const NAV_TARGET_TO_MODULE = {
    bannerBuilder: 'bannerBuilder',
    basicInfoSection: 'apiViewerContainer',
    requirementsSection: 'apiViewerContainer',
    videoInspector: 'mediaInspector',
    imageInspector: 'mediaInspector',
    urlsBox: 'mediaInspector'
 };
 function setActiveModule(moduleId, preferredTargetId = '') {
    currentModuleId = moduleId || currentModuleId || 'bannerBuilder';
    const visibleTargets = MODULE_TARGETS[currentModuleId] || [currentModuleId];
    Object.values(MODULE_TARGETS).flat().forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = visibleTargets.includes(id) ? 'block' : 'none';
    });
    document.querySelectorAll('.quick-nav button[data-scroll-target]').forEach(button => {
        const buttonModule = NAV_TARGET_TO_MODULE[button.dataset.scrollTarget] || button.dataset.scrollTarget;
        const shouldActivate = preferredTargetId
            ? button.dataset.scrollTarget === preferredTargetId
            : buttonModule === currentModuleId;
        button.classList.toggle('active', shouldActivate);
    });
    if (preferredTargetId) {
        const preferredTarget = document.getElementById(preferredTargetId);
        if (preferredTarget && preferredTarget.offsetParent !== null) {
            preferredTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
 }
 function showDefaultResultModule() {
    setActiveModule('bannerBuilder', 'bannerBuilder');
 }
 async function runLimited(items, limit, worker) {
    const results = new Array(items.length);
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (nextIndex < items.length) {
            const index = nextIndex++;
            try {
                results[index] = { status: 'fulfilled', value: await worker(items[index], index) };
            } catch (error) {
                results[index] = { status: 'rejected', reason: error };
            }
        }
    });
    await Promise.all(workers);
    return results;
 }
 function formatReviewRate(item) {
    if (!item || item.total <= 0) return '无数据';
    const rate = (item.positive / item.total) * 100;
    const className = rate >= 80 ? 'review-rate-good' : (rate >= 60 ? 'review-rate-mid' : 'review-rate-low');
    return `<span class="${className}">${rate.toFixed(1)}%</span>`;
 }
 async function fetchRegionalReviews(appId) {
    const results = await Promise.allSettled(REVIEW_LOCALES.map(async locale => {
        const url = `https://store.steampowered.com/appreviews/${appId}?json=1&language=${locale.code}&purchase_type=all&num_per_page=0`;
        const json = await fetchJsonWithFallback(url, { directFirst: true, proxy: true, timeoutMs: 10000, allowErrorJson: true });
        const summary = json.query_summary || {};
        const total = Number(summary.total_reviews || summary.num_reviews || 0);
        const positive = Number(summary.total_positive || 0);
        const negative = Number(summary.total_negative || 0);
        return {
            code: locale.code,
            label: locale.label,
            total,
            positive,
            negative,
            desc: summary.review_score_desc || '',
            source: json.__sourceLabel || '未知来源'
        };
    }));
    return results.map((result, index) => {
        if (result.status === 'fulfilled') return result.value;
        return { ...REVIEW_LOCALES[index], total: 0, positive: 0, negative: 0, desc: '获取失败', error: result.reason?.message || '请求失败' };
    });
 }
 function formatRegionalPrice(item) {
    if (item?.isFree) return '<span class="price-current">免费游玩</span>';
    if (!item?.price) return '<span class="price-muted">无价格数据</span>';
    const price = item.price;
    let html = `<span class="price-current">${escapeHtml(price.final_formatted || '-')}</span>`;
    if (Number(price.discount_percent || 0) > 0) {
        html += ` <span class="price-discount">-${price.discount_percent}%</span>`;
        if (price.initial_formatted) html += ` <span class="price-muted">原价 ${escapeHtml(price.initial_formatted)}</span>`;
    }
    return html;
 }
 async function fetchRegionalPrices(appId) {
    const settings = getAppSettings();
    const results = await runLimited(PRICE_REGIONS, 10, async region => {
        const url = `${STORE_API_BASE}${appId}&filters=price_overview&cc=${region.cc}&l=${encodeURIComponent(settings.storeLanguage)}`;
        const json = await fetchJsonWithFallback(url, { directFirst: true, proxy: 'corsproxy', timeoutMs: 5000, allowErrorJson: true });
        const data = json?.[appId]?.data || {};
        return {
            cc: region.cc,
            label: region.label,
            price: data.price_overview || null,
            source: json.__sourceLabel || '未知来源'
        };
    });
    return results.map((result, index) => {
        if (result.status === 'fulfilled') return result.value;
        return { ...PRICE_REGIONS[index], price: null, error: result.reason?.message || '请求失败' };
    });
 }
 const getVideoFormats = (movie) => {
    const formats = [];
    if (movie?.mp4?.max) formats.push({ type: 'MP4', label: 'MP4 高清视频', quality: '高清', url: movie.mp4.max });
    if (movie?.mp4?.['480']) formats.push({ type: 'MP4', label: 'MP4 480P 视频', quality: '480P', url: movie.mp4['480'] });
    if (movie?.webm?.max) formats.push({ type: 'WebM', label: 'WebM 高清视频', quality: '高清', url: movie.webm.max });
    if (movie?.webm?.['480']) formats.push({ type: 'WebM', label: 'WebM 480P 视频', quality: '480P', url: movie.webm['480'] });
    if (movie?.hls_h264) formats.push({ type: 'HLS', label: 'HLS 自适应流', quality: 'H.264', url: movie.hls_h264 });
    if (movie?.dash_h264) formats.push({ type: 'DASH_H264', label: 'MPEG-DASH H.264', quality: 'H.264', url: movie.dash_h264 });
    if (movie?.dash_av1) formats.push({ type: 'DASH_AV1', label: 'MPEG-DASH AV1', quality: 'AV1', url: movie.dash_av1 });
    const seen = new Set();
    return formats.filter(format => {
        if (seen.has(format.url)) return false;
        seen.add(format.url);
        return true;
    });
 };
 const buildFetchAttempts = (url, options = {}) => {
    const encoded = encodeURIComponent(url);
    const attempts = [];
    if (options.directFirst) attempts.push({ label: '直连', url });
    if (options.proxy === 'corsproxy') {
        attempts.push({ label: 'CORSProxy', url: `https://corsproxy.io/?${encoded}` });
    } else if (options.proxy) {
        attempts.push(
            { label: 'AllOrigins', url: `https://api.allorigins.win/raw?url=${encoded}` },
            { label: 'CodeTabs', url: `https://api.codetabs.com/v1/proxy?quest=${encoded}` },
            { label: 'CORSProxy', url: `https://corsproxy.io/?${encoded}` },
            { label: 'IsomorphicGit', url: `https://cors.isomorphic-git.org/${url}` }
        );
    }
    if (!options.directFirst) attempts.push({ label: '直连', url });
    return attempts;
 };
 async function fetchWithTimeout(url, timeoutMs = 10000) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = setTimeout(() => { if (controller) controller.abort(); }, timeoutMs);
    try {
        return await fetch(url, { signal: controller?.signal, cache: 'no-store' });
    } finally {
        clearTimeout(timeoutId);
    }
 }
 async function fetchJsonWithFallback(url, options = {}) {
    const attempts = buildFetchAttempts(url, options);
    const errors = [];
    for (const attempt of attempts) {
        try {
            const response = await fetchWithTimeout(attempt.url, options.timeoutMs || 10000);
            const text = await response.text();
            let json = null;
            try { json = JSON.parse(text); } catch {}
            if (!response.ok && !(options.allowErrorJson && json)) throw new Error(`HTTP ${response.status} ${text.slice(0, 80)}`);
            if (!json) json = JSON.parse(text);
            if (json && typeof json === 'object') {
                Object.defineProperty(json, '__sourceLabel', { value: attempt.label, enumerable: false });
            }
            return json;
        } catch (error) {
            const message = `${attempt.label}: ${error.name === 'AbortError' ? '超时' : error.message}`;
            errors.push(message);
            console.warn(`请求失败，尝试下一个来源: ${attempt.label}`, error);
        }
    }
    throw new Error(errors.join(' / ') || '请求失败');
 }
 async function fetchTextWithFallback(url) {
    const attempts = buildFetchAttempts(url, { directFirst: true, proxy: true });
    const errors = [];
    for (const attempt of attempts) {
        try {
            const response = await fetchWithTimeout(attempt.url, 10000);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.text();
        } catch (error) {
            errors.push(`${attempt.label}: ${error.name === 'AbortError' ? '超时' : error.message}`);
        }
    }
    throw new Error(errors.join(' / ') || '请求失败');
 }
 function parseHighestResolution(manifestText) {
    let best = null;
    const patterns = [
        /RESOLUTION=(\d+)x(\d+)/g,
        /width="(\d+)"\s+height="(\d+)"/g
    ];
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(manifestText))) {
            const width = Number(match[1]);
            const height = Number(match[2]);
            if (!best || width * height > best.width * best.height) {
                best = { width, height };
            }
        }
    });
    return best ? `${best.width}x${best.height}` : '';
 }
 function formatResolutionLabel(resolution) {
    const match = String(resolution || '').match(/^(\d+)x(\d+)$/);
    if (!match) return resolution || '';
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (width >= 3840 || height >= 2160) return `${resolution} 4K`;
    if (width >= 2560 || height >= 1440) return `${resolution} 2K`;
    return resolution;
 }
 function getFullMovieThumbnail(url) {
    if (!url) return '';
    return url.replace(/movie_\d+x\d+\.jpg(?=([?#]|$))/i, 'movie_full.jpg');
 }
 // --- END HELPER FUNCTIONS ---

 function drawHero(img) { const cw = canvas.width, ch = canvas.height; ctx.clearRect(0, 0, cw, ch); if (!img.src) return; const scale = Math.max(cw / img.width, ch / img.height); const w = img.width * scale, h = img.height * scale; ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h); if (overlayOpacity > 0) { let x0 = 0, y0 = 0, x1 = 0, y1 = 0; switch (gradientDirection) { case 'top-to-bottom': y1 = ch; break; case 'bottom-to-top': y0 = ch; break; case 'left-to-right': x1 = cw; break; case 'right-to-left': x0 = cw; break; case 'tl-to-br': x1 = cw; y1 = ch; break; case 'tr-to-bl': x0 = cw; y1 = ch; break; case 'bl-to-tr': y0 = ch; x1 = cw; break; case 'br-to-tl': x0 = cw; y0 = ch; break; } const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, hexToRgba(gradientColor, overlayOpacity)); g.addColorStop(1, hexToRgba(gradientColor, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); } }
 function drawLogo() { if (!logoImg.src || !logoImg.complete) return; ctx.drawImage(logoImg, logoX, logoY, logoImg.width * logoScale, logoImg.height * logoScale); }
 function drawText() { if (!customText) return; ctx.font = `${textSize}px "${textFont}"`; ctx.fillStyle = textColor; ctx.textBaseline = "top"; const lines = customText.split("\n"); lines.forEach((line, i) => { ctx.fillText(line, textX, textY + i * (textSize + lineSpacing)); }); }
 function drawAll() { drawHero(heroImg); drawLogo(); drawText(); }
 function snapToCenterX(objX, objW) { const centerX = (canvas.width - objW) / 2; return Math.abs(objX - centerX) < snapThreshold ? centerX : objX; }
 function snapToCenterY(objY, objH) { const centerY = (canvas.height - objH) / 2; return Math.abs(objY - centerY) < snapThreshold ? centerY : objY; }
