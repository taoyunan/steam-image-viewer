async function fetchData(appId, options = {}) {
    try {
        await tagsPromise; // Ensure tags are loaded before proceeding
    } catch (error) {
        // Error is already logged in loadSteamTags, just continue gracefully
    }

    const forceRefresh = Boolean(options.forceRefresh);
    clearError(); setLoading(forceRefresh ? "正在更新API..." : "正在读取数据...");
    document.body.classList.add('app-empty');
    document.body.classList.add('app-status-visible');
    renderFetchStatus([{ label: forceRefresh ? '正在更新' : '正在读取', state: 'pending', detail: appId }]);
    renderHealthStatus([{ label: '请求中', state: 'pending', detail: forceRefresh ? '正在重新请求 API' : '正在读取缓存或请求 API' }]);
    updateBtn.disabled = true; saveBtn.disabled = true; goToStoreBtn.disabled = true; scaleSlider.disabled = true;
    toggleApiBtn.style.display = 'none'; apiViewerContainer.style.display = 'none';
    videoInspector.style.display = 'none'; videoList.innerHTML = '';
    imageInspector.style.display = 'none'; imageList.innerHTML = ''; urlsBox.value = '';
    screenshotUrls = []; videoData = []; imageItems = []; currentAppSnapshot = null; gamePreview.style.display = 'none';

    try {
        const settings = getAppSettings();
        const storeApiUrl = `${STORE_API_BASE}${appId}&l=${encodeURIComponent(settings.storeLanguage)}&cc=${encodeURIComponent(settings.storeCountry)}`;
        let cacheRecord = null;
        let cacheWasUpdated = false;
        let steamCmdResult, storeResult, regionalReviewsResult, regionalPricesResult;

        if (!forceRefresh) {
            cacheRecord = await readCachedAppData(appId);
        }

        if (cacheRecord?.results) {
            setLoading("正在读取缓存...");
            steamCmdResult = restoreSettled(cacheRecord.results.steamCmdResult);
            storeResult = restoreSettled(cacheRecord.results.storeResult);
            regionalReviewsResult = restoreSettled(cacheRecord.results.regionalReviewsResult);
            regionalPricesResult = restoreSettled(cacheRecord.results.regionalPricesResult);
        } else {
            setLoading(forceRefresh ? "正在重新请求API..." : "正在请求API...");
            [steamCmdResult, storeResult, regionalReviewsResult, regionalPricesResult] = await Promise.allSettled([
                fetchJsonWithFallback(API_BASE + appId, { directFirst: true, timeoutMs: 10000 }),
                fetchJsonWithFallback(storeApiUrl, { directFirst: true, proxy: true, timeoutMs: 10000 }),
                fetchRegionalReviews(appId),
                fetchRegionalPrices(appId)
            ]);
            const hasPrimaryData = (steamCmdResult.status === 'fulfilled' && steamCmdResult.value?.data?.[appId])
                || (storeResult.status === 'fulfilled' && storeResult.value?.[appId]?.success);
            if (hasPrimaryData) {
                await writeCachedAppData(appId, { steamCmdResult, storeResult, regionalReviewsResult, regionalPricesResult });
                cacheWasUpdated = true;
            }
        }

        let steamCmdJson = {};
        let appData = null;
        const statusItems = [];
        if (cacheRecord) {
            statusItems.push({ label: '使用缓存', state: 'ok', detail: `缓存时间：${formatCacheTime(cacheRecord.savedAt)}` });
        } else if (cacheWasUpdated) {
            statusItems.push({ label: '缓存已更新', state: 'ok', detail: '已保存本次 API 结果，下次获取会优先读取缓存' });
        }
        if (steamCmdResult.status === 'fulfilled') {
            steamCmdJson = steamCmdResult.value;
            appData = steamCmdJson.data?.[appId] || null;
            statusItems.push({ label: appData ? 'SteamCMD' : 'SteamCMD 无数据', state: appData ? 'ok' : 'warn', detail: appData ? '已获取资源数据' : '接口成功但没有该 App 数据' });
        } else {
            console.warn('SteamCMD API 请求失败:', steamCmdResult.reason);
            statusItems.push({ label: 'SteamCMD 失败', state: 'fail', detail: steamCmdResult.reason?.message || '请求失败' });
        }
        
        let storeData = null;
        if (storeResult.status === 'fulfilled' && storeResult.value[appId]?.success) {
            storeData = storeResult.value[appId].data;
            statusItems.push({ label: '商店详情', state: 'ok', detail: `已获取中文商店数据（${storeResult.value.__sourceLabel || '未知来源'}）` });
        } else if (storeResult.status === 'rejected') {
            console.warn('商店 API 请求失败:', storeResult.reason);
            statusItems.push({ label: '商店详情失败', state: 'fail', detail: storeResult.reason?.message || '请求失败' });
        } else {
            statusItems.push({ label: '商店详情无数据', state: 'warn', detail: '商店 API 没有返回 success' });
        }

        if (!appData && storeData) {
            appData = {
                data: {
                    steam_appid: storeData.steam_appid,
                    developers: storeData.developers || [],
                    publishers: storeData.publishers || []
                },
                common: {
                    name: storeData.name,
                    type: storeData.type || '',
                    releasestate: storeData.release_date?.coming_soon ? 'prerelease' : 'released'
                }
            };
        }
        if (!appData && !storeData) { throw new Error("未找到游戏数据或API返回格式无效"); }

        let regionalReviews = [];
        if (regionalReviewsResult.status === 'fulfilled') {
            regionalReviews = regionalReviewsResult.value;
            const regionsWithData = regionalReviews.filter(item => item.total > 0).length;
            statusItems.push({ label: regionsWithData > 0 ? `好评度 ${regionsWithData}` : '好评度无数据', state: regionsWithData > 0 ? 'ok' : 'warn', detail: regionsWithData > 0 ? '已获取地区 / 语言好评度' : '该游戏暂无可统计评测' });
        } else {
            statusItems.push({ label: '好评度失败', state: 'fail', detail: regionalReviewsResult.reason?.message || '请求失败' });
        }

        let regionalPrices = [];
        if (regionalPricesResult.status === 'fulfilled') {
            regionalPrices = regionalPricesResult.value;
            if (storeData?.is_free) {
                regionalPrices = regionalPrices.map(item => ({ ...item, isFree: true }));
            }
            const regionsWithPrice = regionalPrices.filter(item => item.price || item.isFree).length;
            statusItems.push({ label: regionsWithPrice > 0 ? `地区价格 ${regionsWithPrice}` : '地区价格无数据', state: regionsWithPrice > 0 ? 'ok' : 'warn', detail: regionsWithPrice > 0 ? '已获取多地区本地币种价格' : 'Steam 未返回 price_overview，可能是未定价或下架' });
        } else {
            statusItems.push({ label: '地区价格失败', state: 'fail', detail: regionalPricesResult.reason?.message || '请求失败' });
        }
        
        document.body.classList.remove('app-empty');
        buildApiTable(appData, storeData, regionalReviews, regionalPrices);
        toggleApiBtn.style.display = 'block';
        renderGamePreview(appData, storeData, regionalPrices);
        
        setLoading("正在加载拼图资源...");
        let gameName = get(appData, 'common.name_localized.schinese', get(appData, 'common.name', ''));
        renderAppHistory();
        customText = `3DM《${gameName}》专区`;
        document.getElementById("customText").value = customText;
        
        const assetsFull = appData.common?.library_assets_full;
        const heroPath = assetsFull?.library_hero?.image?.english;
        let logoPath = assetsFull?.library_logo?.image?.schinese || assetsFull?.library_logo?.image?.english;
        const heroUrl = heroPath ? IMG_BASE + appId + "/" + heroPath : (storeData?.header_image || '');
        let logoUrl = logoPath ? IMG_BASE + appId + "/" + logoPath : `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
        
        if (heroUrl) {
            try {
                heroImg = new Image(); heroImg.crossOrigin = "anonymous"; heroImg.src = heroUrl;
                logoImg = new Image(); logoImg.crossOrigin = "anonymous"; logoImg.src = logoUrl;
                
                await Promise.all([
                    new Promise((res, rej) => { heroImg.onload = res; heroImg.onerror = () => rej(new Error('背景图加载失败')); }),
                    new Promise((res) => { logoImg.onload = res; logoImg.onerror = () => { logoImg.src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`; logoImg.onload = res; logoImg.onerror = res; }; }),
                ]);
                
                drawHero(heroImg);
                if(logoImg.complete && logoImg.naturalWidth > 0) {
                   logoScale = (0.2 * canvas.width) / logoImg.width;
                   logoX = (canvas.width - (logoImg.width * logoScale)) / 2;
                   logoY = (canvas.height - (logoImg.height * logoScale)) / 2;
                   scaleSlider.value = Math.round(logoScale * 100);
                   scalePercent.textContent = `${Math.round(logoScale * 100)}%`;
                   scaleSlider.disabled = false;
                } else { logoImg.src = ''; scaleSlider.disabled = true; }

                saveBtn.disabled = false;

                ctx.font = `${textSize}px "${textFont}"`;
                const lines = customText.split("\n");
                const textW = Math.max(...lines.map(line => ctx.measureText(line).width));
                const textH = lines.length * (textSize + lineSpacing) - lineSpacing;
                textX = (canvas.width - textW) / 2;
                textY = (canvas.height - textH) / 2 + 30;
                drawAll();
                statusItems.push({ label: '横幅素材', state: 'ok', detail: heroPath ? 'Library Hero / Logo 已加载' : '使用商店头图兜底' });
            } catch (assetError) {
                console.warn('横幅素材加载失败，继续解析图片和视频:', assetError);
                showError(`横幅素材加载失败，但将继续解析图片和视频。`);
                statusItems.push({ label: '横幅素材失败', state: 'warn', detail: assetError.message || '加载失败' });
            }
        } else {
            console.warn('缺少横幅素材，继续解析图片和视频。');
            statusItems.push({ label: '横幅素材缺失', state: 'warn', detail: '未获取到 library hero 或商店头图' });
        }
        goToStoreBtn.disabled = false;
        updateBtn.disabled = false;

        setLoading("正在解析图片与视频资源...");
        let candidates = findImageCandidates(steamCmdJson);
        let allImageUrls = [...new Set(candidates.map(c => buildFullUrl(appId, c)))];
        let allAssetUrlsForTxt = [...allImageUrls];

        if (storeData?.screenshots) {
            screenshotUrls = storeData.screenshots.map(ss => ss.path_full);
            allImageUrls.push(...screenshotUrls);
            allImageUrls = [...new Set(allImageUrls)];
            allAssetUrlsForTxt.push(...screenshotUrls);
        }
        
        if (storeData?.movies) {
            videoData = storeData.movies.filter(m => getVideoFormats(m).length > 0);
            videoData.forEach(v => {
                allAssetUrlsForTxt.push(getFullMovieThumbnail(v.thumbnail));
                getVideoFormats(v).forEach(format => allAssetUrlsForTxt.push(format.url));
            });
        }

        statusItems.push({ label: screenshotUrls.length > 0 ? `截图 ${screenshotUrls.length}` : '截图缺失', state: screenshotUrls.length > 0 ? 'ok' : 'warn', detail: screenshotUrls.length > 0 ? '商店截图已获取' : '商店数据没有 screenshots' });
        statusItems.push({ label: allImageUrls.length > 0 ? `图片 ${allImageUrls.length}` : '图片缺失', state: allImageUrls.length > 0 ? 'ok' : 'warn', detail: allImageUrls.length > 0 ? '已识别图片资源' : '未识别到图片资源' });
        statusItems.push({ label: videoData.length > 0 ? `视频 ${videoData.length}` : '视频缺失', state: videoData.length > 0 ? 'ok' : 'warn', detail: videoData.length > 0 ? '已获取宣传影像' : '商店数据没有 movies 或没有可用视频流' });
        renderFetchStatus(statusItems);
        renderHealthStatus(statusItems);
        currentAppSnapshot = {
            appId,
            exportedAt: new Date().toISOString(),
            settings,
            usedCache: Boolean(cacheRecord),
            appData,
            storeData,
            regionalReviews,
            regionalPrices,
            statusItems,
            screenshots: screenshotUrls,
            images: allImageUrls,
            videos: videoData,
            urls: [...new Set(allAssetUrlsForTxt)]
        };

        showVideos(videoData);

        imageInspector.style.display = 'block';
        if (allImageUrls.length > 0 || videoData.length > 0) {
            urlsBox.value = [...new Set(allAssetUrlsForTxt)].join('\n');
            showAssets(allImageUrls);
        } else {
            imageList.innerHTML = '<p>未能自动识别到任何图片资源。</p>';
        }
        clearLoading();
    } catch (e) {
        document.body.classList.add('app-empty');
        renderFetchStatus([{ label: '获取失败', state: 'fail', detail: e.message || '未知错误' }]);
        renderHealthStatus([{ label: '获取失败', state: 'fail', detail: e.message || '未知错误' }]);
        showError(e.message || "未知错误");
        clearLoading();
        updateBtn.disabled = false;
    }
}
 
 function downloadImage(url, filename) {
     setLoading('正在准备下载...');
     fetch(url)
        .then(response => response.blob())
        .then(blob => {
            saveAs(blob, filename || url.split('/').pop().split('?')[0] || `asset.tmp`);
            clearLoading();
        })
        .catch(err => {
            showError(`下载失败: ${err.message}. 正在尝试直接打开...`);
            clearLoading();
            window.open(url, '_blank');
        });
 }

 async function performCropAndGetBlob(sourceUrl, targetWidth, targetHeight) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const proxyUrl = 'https://corsproxy.io/?';
        img.src = proxyUrl + encodeURIComponent(sourceUrl);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            const sourceAspect = img.width / img.height;
            const targetAspect = targetWidth / targetHeight;
            let sx, sy, sWidth, sHeight;

            if (sourceAspect > targetAspect) {
                sHeight = img.height; sWidth = sHeight * targetAspect;
                sx = (img.width - sWidth) / 2; sy = 0;
            } else {
                sWidth = img.width; sHeight = sWidth / targetAspect;
                sx = 0; sy = (img.height - sHeight) / 2;
            }
            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
            canvas.toBlob(blob => {
                if (blob) { resolve(blob); } else { reject(new Error('Canvas toBlob failed')); }
            }, 'image/png');
        };
        img.onerror = () => reject(new Error(`图片加载失败: ${sourceUrl}`));
    });
 }
 
 async function autoCropAndZip() {
    const appId = appIdInput.value.trim(); if (!appId) return;
    const zip = new JSZip();
    const findImage = (resolution) => {
        const urls = imageCategories[resolution] || [];
        return urls.find(u => u.includes('schinese')) || urls[0] || null;
    };
    const source920 = findImage('920x430');
    const source300 = findImage('300x450');
    let tasks = [];

    if (source300) {
        tasks.push(async () => {
            try {
                setLoading("正在获取 300x450 图...");
                const response = await fetch(source300);
                if (!response.ok) throw new Error('Network response was not ok.');
                const blob = await response.blob();
                zip.file(`${appId}_300x450.png`, blob);
            } catch (e) { showError(`获取 300x450 图失败: ${e.message}`); }
        });
    } else { showError("未找到 300x450 图片。"); }

    if (source920) {
        const cropTargets = [ { w: 474, h: 242 }, { w: 497, h: 278 }, { w: 300, h: 180 } ];
        cropTargets.forEach(target => {
            tasks.push(async () => {
                try {
                    setLoading(`正在裁剪 ${target.w}x${target.h} 图...`);
                    const blob = await performCropAndGetBlob(source920, target.w, target.h);
                    zip.file(`${appId}_${target.w}x${target.h}.png`, blob);
                } catch (e) { showError(`裁剪 ${target.w}x${target.h} 失败: ${e.message}`); }
            });
        });
    } else { showError("未找到 920x430 图片用于裁剪。"); }

    if (tasks.length === 0) { clearLoading(); showError("未找到任何符合条件的图片。"); return; }
    for (const task of tasks) { await task(); }
    if (Object.keys(zip.files).length === 0) { clearLoading(); showError("所有图片处理均失败，无法创建 ZIP。"); return; }
    
    setLoading('正在生成 ZIP 文件...');
    try {
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `${appId}_covers.zip`);
        setLoading('打包下载已开始！');
    } catch (e) {
        showError(`生成 ZIP 失败: ${e.message}`);
    } finally {
        setTimeout(clearLoading, 2000);
    }
 }

 async function downloadAssetsAsZip(assets, zipFilename) {
    const zip = new JSZip(); let fetchedCount = 0;
    const assetPromises = assets.map(async (asset) => {
        try {
            const response = await fetch(asset.url);
            if (!response.ok) throw new Error(`Failed to fetch ${asset.filename}`);
            const blob = await response.blob();
            fetchedCount++; setLoading(`正在获取资源 (${fetchedCount}/${assets.length})...`);
            return { filename: asset.filename, blob: blob };
        } catch (e) { console.error(e); showError(`获取 ${asset.filename} 失败`); return null; }
    });
    const fetchedAssets = (await Promise.all(assetPromises)).filter(Boolean);
    if (fetchedAssets.length === 0) { showError("所有资源获取失败，无法创建 ZIP 文件。"); clearLoading(); return; }
    fetchedAssets.forEach(asset => zip.file(asset.filename, asset.blob));
    setLoading('正在生成 ZIP 文件，请稍候...');
    try {
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, zipFilename);
        setLoading('ZIP 文件已开始下载！');
    } catch (e) {
        showError(`生成 ZIP 文件失败: ${e.message}`);
    } finally {
        setTimeout(clearLoading, 2000);
    }
}

 async function downloadAllScreenshots() {
    if (screenshotUrls.length === 0) { showError("没有可下载的截图。"); return; }
    const appId = appIdInput.value.trim(); if (!appId) return;
    const assetsToZip = screenshotUrls.map((url, i) => ({ url: url, filename: `${appId}_screenshot_${i + 1}.jpg` }));
    await downloadAssetsAsZip(assetsToZip, `${appId}_screenshots.zip`);
 }
 
 function populateTagsViewer(tagsData) {
    tagsData.sort((a, b) => a.tagid - b.tagid);
    let html = '';
    tagsData.forEach(tag => {
        html += `<div class="tag-item"><span class="tag-id">${tag.tagid}:</span>${tag.name}</div>`;
    });
    tagsListContainer.innerHTML = html;
 }
