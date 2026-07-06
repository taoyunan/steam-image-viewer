function findImageCandidates(obj) { const results = new Set(); const imageRE = /\.(jpe?g|png|webp|gif)(\?|$)/i; function rec(v) { if (v == null) return; if (typeof v === 'string') { if (imageRE.test(v)) { results.add(v); } } else if (Array.isArray(v)) { for (const e of v) rec(e); } else if (typeof v === 'object') { for (const k in v) rec(v[k]); } } rec(obj); return [...results].map(s => s.split('#')[0].trim()).filter(Boolean); }
 
 function buildFullUrl(appid, candidate) {
     const trimmed = candidate.trim();
     if (/^https?:\/\//i.test(trimmed)) return trimmed;
     const clean = trimmed.replace(/^(\.\/|\/+)/, '');
     return `${IMG_BASE}${encodeURIComponent(appid)}/${clean}`;
 }

 function showAssets(urls) {
     imageList.innerHTML = ''; 
     if (urls.length === 0) { 
         imageList.innerHTML = '<p>没有识别到任何图片资源。</p>'; 
         return; 
     } 
     imageList.innerHTML = `<p style="color: #60a5fa; text-align: center;">正在获取 ${urls.length} 张图片尺寸用于分组，请稍候...</p>`; 
     imageCategories = {}; 
     const promises = urls.map(u => new Promise(resolve => { 
         const img = new Image(); 
         img.src = u; 
         img.onload = () => resolve({ u, res: `${img.naturalWidth}x${img.naturalHeight}` }); 
         img.onerror = () => resolve({ u, res: '未知尺寸' }); 
     })); 
     Promise.all(promises).then(results => { 
         results.forEach(({ u, res }) => { 
             if (!imageCategories[res]) imageCategories[res] = []; 
             imageCategories[res].push(u); 
         }); 
         imageItems = results.map(({ u, res }) => ({ url: u, resolution: res, purpose: inferImagePurpose(u, res) }));
         renderImageGroups(); 
     }); 
 }

 function showVideos(videos) {
    videoList.innerHTML = '';
    if (!videos || videos.length === 0) {
        videoInspector.style.display = 'none';
        return;
    }
    videoInspector.style.display = 'block';
    const grid = document.createElement('div');
    grid.className = 'video-grid';
    videos.forEach((video, index) => {
        const formats = getVideoFormats(video);
        const thumbnailUrl = getFullMovieThumbnail(video.thumbnail);
        const primary = formats.find(format => format.type === 'HLS') || formats.find(format => format.type === 'DASH' && format.quality === 'H.264') || formats[0];
        const sourceRows = formats.map(format => `
            <div class="video-source-row" data-stream-url="${escapeHtml(format.url)}">
                <span class="video-source-type">${escapeHtml(format.label)}</span>
                <span class="video-source-quality">${escapeHtml(format.quality)}</span>
                <span class="video-source-actions">
                    <button data-url="${escapeHtml(format.url)}" class="open-btn">打开</button>
                    <button data-url="${escapeHtml(format.url)}" class="copy-btn">复制</button>
                </span>
            </div>
        `).join('');
        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <div class="video-thumb-wrap">
                <img src="${escapeHtml(thumbnailUrl)}" alt="${escapeHtml(video.name)}" class="video-thumb" loading="lazy">
                <span class="video-hd-badge" data-video-quality="${index}">检测分辨率...</span>
            </div>
            <div class="video-card-body">
                <h4 class="video-title" title="${escapeHtml(video.name)}">${escapeHtml(video.name)}</h4>
                <div class="video-primary-actions">
                    ${primary ? `<button data-url="${escapeHtml(primary.url)}" class="open-btn" style="background-color:#e11d48;">打开高清流</button>` : ''}
                    <button data-url="${escapeHtml(thumbnailUrl)}" class="open-btn">打开封面</button>
                    <button data-url="${escapeHtml(thumbnailUrl)}" class="copy-btn">复制封面</button>
                    <button data-url="${escapeHtml(thumbnailUrl)}" class="dl-btn">下载封面</button>
                </div>
                <div class="video-source-list">
                    ${sourceRows || '<div class="video-source-row"><span class="video-source-quality">无可用视频地址</span></div>'}
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    videoList.appendChild(grid);
    updateVideoQualityLabels();
 }

 async function updateVideoQualityLabels() {
    const rows = [...videoList.querySelectorAll('.video-source-row[data-stream-url]')];
    const badgeResolutions = new Map();
    await Promise.all(rows.map(async (row) => {
        const url = row.dataset.streamUrl;
        if (!/\.(m3u8|mpd)(\?|$)/i.test(url)) return;
        try {
            const text = await fetchTextWithFallback(url);
            const resolution = parseHighestResolution(text);
            if (!resolution) return;
            const quality = row.querySelector('.video-source-quality');
            quality.textContent = formatResolutionLabel(resolution);
            const card = row.closest('.video-card');
            const cardIndex = [...videoList.querySelectorAll('.video-card')].indexOf(card);
            badgeResolutions.set(cardIndex, formatResolutionLabel(resolution));
        } catch (error) {
            console.warn('视频清单分辨率检测失败:', error);
        }
    }));
    badgeResolutions.forEach((resolution, index) => {
        const badge = videoList.querySelector(`[data-video-quality="${index}"]`);
        if (badge) badge.textContent = resolution;
    });
    videoList.querySelectorAll('.video-hd-badge').forEach(badge => {
        if (badge.textContent === '检测分辨率...') badge.textContent = '自适应';
    });
 }
 
 function createCategoryElement(title, items, isVideo = false) {
    const wrapper = document.createElement('div');
    wrapper.className = 'category';
    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `<h4>${title} (${items.length} ${isVideo ? '个' : '张'})</h4><button class="toggle-btn">展开</button>`;
    wrapper.appendChild(header);
    const cardGrid = document.createElement('div');
    cardGrid.className = 'card-grid';

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        if (!isVideo) {
            const u = item;
            if (u.toLowerCase().includes('schinese')) {
                card.classList.add('highlight-schinese');
            }
            const langMatch = u.match(/(schinese|tchinese|english|japanese|koreana|french|german|spanish|latam)/i);
            const lang = langMatch ? langMatch[0] : '通用';
            card.innerHTML = `<img src="${u}" alt="image" class="thumb" loading="lazy" onclick="this.style.objectFit = this.style.objectFit === 'contain' ? 'cover' : 'contain'"><div class="meta">${lang}</div><div class="actions"><button data-url="${u}" class="open-btn">打开</button><button data-url="${u}" class="copy-btn">复制</button><button data-url="${u}" class="crop-btn">裁剪</button><button data-url="${u}" class="dl-btn">下载</button></div>`;
        } else { // Video card
            const video = item;
            const formats = getVideoFormats(video);
            const formatButtons = formats.map(format => `
                <div class="video-format-row">
                    <span class="format-label">${format.type} ${format.quality}</span>
                    <button data-url="${escapeHtml(format.url)}" class="open-btn" style="background-color:#e11d48;">播放</button>
                    <button data-url="${escapeHtml(format.url)}" class="dl-btn" style="background-color:#e11d48;">下载</button>
                </div>
            `).join('');
            card.innerHTML = `
                <img src="${escapeHtml(video.thumbnail)}" alt="${escapeHtml(video.name)}" class="thumb" loading="lazy">
                <div class="meta" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(video.name)}">${escapeHtml(video.name)}</div>
                <div class="actions">
                    <button data-url="${escapeHtml(video.thumbnail)}" class="open-btn">封面</button>
                    <button data-url="${escapeHtml(video.thumbnail)}" class="copy-btn">复制封面</button>
                    <button data-url="${escapeHtml(video.thumbnail)}" class="dl-btn">下封面</button>
                    ${formatButtons || '<span class="format-label">无可用视频格式</span>'}
                </div>`;
        }
        cardGrid.appendChild(card);
    });

    wrapper.appendChild(cardGrid);
    const toggleBtn = header.querySelector('.toggle-btn');
    toggleBtn.onclick = () => {
        const isHidden = cardGrid.style.display === 'none';
        cardGrid.style.display = isHidden ? 'grid' : 'none';
        toggleBtn.textContent = isHidden ? '折叠' : '展开';
    };
    return wrapper;
 }

 function renderImageGroups() {
    document.querySelectorAll('.group-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.groupMode === imageGroupMode);
    });
    if (imageGroupMode === 'resolution') {
        renderCategories({ ...imageCategories });
    } else {
        renderPurposeCategories();
    }
 }

 function renderPurposeCategories() {
     imageList.innerHTML = '';
     const order = ['商店截图', 'Logo', 'Library Hero', '商店封面 / Capsule', '竖版封面', '封面素材', '背景图', '其他素材'];
     const groups = {};
     imageItems.forEach(item => {
         if (!groups[item.purpose]) groups[item.purpose] = [];
         groups[item.purpose].push(item.url);
     });
     order.filter(name => groups[name]?.length).forEach(name => {
         const categoryElement = createCategoryElement(name, groups[name]);
         imageList.appendChild(categoryElement);
     });
 }

 function renderCategories(categories) {
     imageList.innerHTML = '';
     
     if (categories['1920x1080']) {
         const screenshotElement = createCategoryElement('截图', categories['1920x1080']);
         imageList.appendChild(screenshotElement);
         delete categories['1920x1080'];
     }

     const sortedKeys = Object.keys(categories).sort((a, b) => { 
         if (a === '未知尺寸') return 1; 
         if (b === '未知尺寸') return -1; 
         const [wA, hA] = a.split('x').map(Number); 
         const [wB, hB] = b.split('x').map(Number); 
         return (wB * hB) - (wA * hA);
     }); 
     sortedKeys.forEach(res => { 
         const urls = categories[res]; 
         const categoryElement = createCategoryElement(`分辨率: ${res}`, urls);
         imageList.appendChild(categoryElement);
     }); 
 }

 function handleAssetListClick(e) {
    const target = e.target;
    const url = target.dataset.url;
    if (!url) return;
    if (target.classList.contains('open-btn')) {
        window.open(url, '_blank');
    } else if (target.classList.contains('copy-btn')) {
        navigator.clipboard.writeText(url).then(() => { setLoading('链接已复制!'); setTimeout(clearLoading, 1500); });
    } else if (target.classList.contains('dl-btn')) {
        downloadImage(url);
    } else if (target.classList.contains('crop-btn')) {
        cropImage.src = url;
        cropModal.style.display = 'flex';
        cropImage.onload = () => {
            if(cropper) { cropper.destroy(); }
            cropper = new Cropper(cropImage, { viewMode: 1, background: false, autoCropArea: 0.9 });
        };
    }
 }
 imageList.addEventListener('click', handleAssetListClick);
 videoList.addEventListener('click', handleAssetListClick);
 document.getElementById('copyAllBtn').addEventListener('click', () => { if (!urlsBox.value) return; navigator.clipboard.writeText(urlsBox.value).then(() => { setLoading('全部链接已复制!'); setTimeout(clearLoading, 1500); }); });
 document.getElementById('exportTxtBtn').addEventListener('click', () => { if (!urlsBox.value) return; const blob = new Blob([urlsBox.value], {type:'text/plain;charset=utf-8'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `steam_${appIdInput.value.trim()}_assets.txt`; a.click(); URL.revokeObjectURL(a.href); });
 document.getElementById('cropDownloadBtn').addEventListener('click', () => { if (!cropper) return; const cropWidth = parseInt(cropWidthInput.value, 10); const cropHeight = parseInt(cropHeightInput.value, 10); const options = {}; if (!isNaN(cropWidth) && cropWidth > 0) options.width = cropWidth; if (!isNaN(cropHeight) && cropHeight > 0) options.height = cropHeight; const canvas = cropper.getCroppedCanvas(options); const link = document.createElement('a'); link.download = `cropped_${appIdInput.value.trim()}_${Date.now()}.png`; link.href = canvas.toDataURL('image/png'); link.click(); document.getElementById('cropCancelBtn').click(); });
 document.getElementById('cropCancelBtn').addEventListener('click', () => { cropModal.style.display = 'none'; if (cropper) { cropper.destroy(); cropper = null; } cropImage.src = ''; cropWidthInput.value = ''; cropHeightInput.value = ''; });
 document.querySelectorAll('.aspect-btn').forEach(btn => { btn.addEventListener('click', (e) => { if (!cropper) return; const ratio = e.target.dataset.ratio; cropper.setAspectRatio(ratio === 'free' ? NaN : parseFloat(ratio)); cropWidthInput.value = ''; cropHeightInput.value = ''; }); });
 
 function updateCropAspectRatio() { if (!cropper) return; const width = parseFloat(cropWidthInput.value); const height = parseFloat(cropHeightInput.value); if (width > 0 && height > 0) { cropper.setAspectRatio(width / height); } else { cropper.setAspectRatio(NaN); } }
 cropWidthInput.addEventListener('input', updateCropAspectRatio);
 cropHeightInput.addEventListener('input', updateCropAspectRatio);
