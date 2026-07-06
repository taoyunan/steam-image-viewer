// --- EVENT LISTENERS ---
 canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const logoW = logoImg.width * logoScale, logoH = logoImg.height * logoScale;
    ctx.font = `${textSize}px "${textFont}"`;
    const lines = customText.split("\n");
    const textW = lines.length > 0 ? Math.max(...lines.map(line => ctx.measureText(line).width)) : 0;
    const textH = lines.length * (textSize + lineSpacing) - lineSpacing;

    if (e.ctrlKey) {
        dragTarget = "text";
        dragOffsetX = mx - textX;
        dragOffsetY = my - textY;
    } else if (e.shiftKey) {
        dragTarget = "both";
        dragOffsetX = mx - logoX;
        dragOffsetY = my - logoY;
    } else if (logoImg.src && mx >= logoX && mx <= logoX + logoW && my >= logoY && my <= logoY + logoH) {
        dragTarget = "logo";
        dragOffsetX = mx - logoX;
        dragOffsetY = my - logoY;
    } else if (customText && mx >= textX && mx <= textX + textW && my >= textY && my <= textH) {
        dragTarget = "text";
        dragOffsetX = mx - textX;
        dragOffsetY = my - textY;
    }
    
    if (dragTarget) {
        dragging = true;
        canvas.style.cursor = "grabbing";
    }
 });
 canvas.addEventListener("mousemove", (e) => { if (!dragging) return; const rect = canvas.getBoundingClientRect(); const mx = e.clientX - rect.left, my = e.clientY - rect.top; const logoW = logoImg.width * logoScale, logoH = logoImg.height * logoScale; ctx.font = `${textSize}px "${textFont}"`; const lines = customText.split("\n"); const textW = lines.length > 0 ? Math.max(...lines.map(line => ctx.measureText(line).width)) : 0; const textH = lines.length * (textSize + lineSpacing) - lineSpacing; if (dragTarget === "logo" || dragTarget === "both") { let newX = mx - dragOffsetX; let newY = my - dragOffsetY; if(logoImg.src) { newX = snapToCenterX(newX, logoW); newY = snapToCenterY(newY, logoH); } if (dragTarget === "logo") { logoX = newX; logoY = newY; } else { let offsetX = newX - logoX, offsetY = newY - logoY; logoX = newX; logoY = newY; textX += offsetX; textY += offsetY; } } if (dragTarget === "text" && dragTarget !== "both") { let newX = mx - dragOffsetX; let newY = my - dragOffsetY; if(customText) { newX = snapToCenterX(newX, textW); newY = snapToCenterY(newY, textH); } textX = newX; textY = newY; } drawAll(); });
 ["mouseup","mouseleave"].forEach(evt => { canvas.addEventListener(evt, () => { dragging = false; dragTarget = null; canvas.style.cursor = "grab"; }); });
 scaleSlider.addEventListener("input", (e) => { logoScale = e.target.value / 100; scalePercent.textContent = `${e.target.value}%`; drawAll(); });
 overlaySlider.addEventListener("input", (e) => { overlayOpacity = e.target.value / 100; overlayPercent.textContent = `${e.target.value}%`; drawAll(); });
 gradientColorInput.addEventListener("input", (e) => { gradientColor = e.target.value; drawAll(); });
 gradientDirectionSelect.addEventListener("change", (e) => { gradientDirection = e.target.value; drawAll(); });
 saveBtn.addEventListener("click", () => { const link = document.createElement("a"); link.download = `steam_${appIdInput.value.trim()}.png`; link.href = canvas.toDataURL("image/png"); link.click(); });
 goToStoreBtn.addEventListener('click', () => { const appId = appIdInput.value.trim(); if (appId) { const storeUrl = `https://store.steampowered.com/app/${appId}/`; window.open(storeUrl, '_blank'); }});
 document.getElementById("customText").addEventListener("input", (e) => { customText = e.target.value; drawAll(); });
 document.getElementById("textColor").addEventListener("input", (e) => { textColor = e.target.value; drawAll(); });
 document.getElementById("textSize").addEventListener("input", (e) => { textSize = parseInt(e.target.value, 10) || 24; drawAll(); });
 document.getElementById("textFont").addEventListener("change", (e) => { textFont = e.target.value; drawAll(); });
 document.getElementById("lineSpacing").addEventListener("input", (e) => { lineSpacing = parseInt(e.target.value, 10) || 0; drawAll(); });
 
 // Panel Toggles
 document.getElementById('hideTutorialBtn').addEventListener('click', () => tutorialPanel.classList.add('hidden'));
 document.getElementById('showTutorialBtn').addEventListener('click', () => tutorialPanel.classList.remove('hidden'));
 document.getElementById('hideTagsBtn').addEventListener('click', () => tagsViewerPanel.classList.add('hidden'));
 document.getElementById('showTagsBtn').addEventListener('click', () => tagsViewerPanel.classList.remove('hidden'));
 document.getElementById('hideEventsBtn').addEventListener('click', () => eventsViewerPanel.classList.add('hidden'));
 document.getElementById('showEventsBtn').addEventListener('click', () => eventsViewerPanel.classList.remove('hidden'));
 document.getElementById('hideSettingsBtn').addEventListener('click', () => settingsViewerPanel.classList.add('hidden'));
 document.getElementById('showSettingsBtn').addEventListener('click', () => {
    renderSettingsForm();
    settingsViewerPanel.classList.remove('hidden');
 });
 document.getElementById('saveSettingsBtn').addEventListener('click', () => {
    saveAppSettings({
        storeCountry: settingStoreCountry.value || DEFAULT_SETTINGS.storeCountry,
        storeLanguage: settingStoreLanguage.value || DEFAULT_SETTINGS.storeLanguage
    });
    setLoading('设置已保存');
    setTimeout(clearLoading, 1200);
 });
 document.getElementById('resetSettingsBtn').addEventListener('click', () => {
    saveAppSettings(DEFAULT_SETTINGS);
    setLoading('已恢复默认：中国大陆 / 简体中文');
    setTimeout(clearLoading, 1200);
 });
 document.querySelector('.quick-nav').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-scroll-target]');
    if (!button) return;
    const targetId = button.dataset.scrollTarget;
    const apiTargets = new Set(['basicInfoSection', 'requirementsSection', 'releaseInfoSection', 'languageSection']);
    if (apiTargets.has(targetId) && apiViewerContainer.style.display === 'none') {
        if (toggleApiBtn.style.display === 'none') {
            showError('请先输入 App ID 并点击“获取”。');
            return;
        }
        apiViewerContainer.style.display = 'block';
        toggleApiBtn.textContent = '隐藏 API 数据';
    }
    const target = document.getElementById(targetId);
    if (!target || target.offsetParent === null) {
        showError('该条目当前还没有可跳转内容，请先获取游戏数据。');
        return;
    }
    clearError();
    document.querySelectorAll('.quick-nav button').forEach(navButton => navButton.classList.toggle('active', navButton === button));
    const top = target.getBoundingClientRect().top + window.pageYOffset - 18;
    window.scrollTo({ top, behavior: 'smooth' });
 });
 historyToggleBtn.addEventListener('click', () => {
    const willOpen = historyPanel.classList.contains('hidden');
    historyPanel.classList.toggle('hidden', !willOpen);
    historyToggleBtn.classList.toggle('active', willOpen);
    if (willOpen) renderAppHistory();
 });
 document.querySelectorAll('.group-mode-btn').forEach(button => {
    button.addEventListener('click', () => {
        imageGroupMode = button.dataset.groupMode;
        renderImageGroups();
    });
 });
 appHistoryBox.addEventListener('click', async (event) => {
    const detailBtn = event.target.closest('[data-action="cache-detail"][data-app-id]');
    if (detailBtn) {
        const record = await readCachedAppData(detailBtn.dataset.appId);
        if (record) renderCacheDetail(record);
        return;
    }
    const deleteBtn = event.target.closest('[data-action="delete-cache"][data-app-id]');
    if (deleteBtn) {
        await deleteCachedAppData(deleteBtn.dataset.appId);
        cacheDetailPanel.classList.add('hidden');
        await renderAppHistory();
        return;
    }
    const clearBtn = event.target.closest('[data-action="clear-cache"]');
    if (clearBtn) {
        await clearCachedAppData();
        cacheDetailPanel.classList.add('hidden');
        await renderAppHistory();
        return;
    }
    const button = event.target.closest('.history-chip[data-app-id]');
    if (!button) return;
    appIdInput.value = button.dataset.appId;
    fetchData(button.dataset.appId);
 });
