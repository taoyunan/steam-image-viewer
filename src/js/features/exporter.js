function downloadTextFile(filename, content, type = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

function collectExportSnapshot() {
    const appId = appIdInput.value.trim();
    const tableText = apiTable.innerText.trim();
    return currentAppSnapshot || {
        appId,
        exportedAt: new Date().toISOString(),
        settings: getAppSettings(),
        statusItems: lastHealthItems,
        apiText: tableText,
        urls: urlsBox.value ? urlsBox.value.split(/\r?\n/).filter(Boolean) : []
    };
}

function exportCurrentDataAsJson() {
    const snapshot = collectExportSnapshot();
    if (!snapshot.appId) {
        showError('请先获取一个 AppID 后再导出。');
        return;
    }
    downloadTextFile(`steam_${snapshot.appId}_data.json`, JSON.stringify(snapshot, null, 2), 'application/json;charset=utf-8');
}

function exportCurrentDataAsMarkdown() {
    const snapshot = collectExportSnapshot();
    if (!snapshot.appId) {
        showError('请先获取一个 AppID 后再导出。');
        return;
    }
    const statusLines = (snapshot.statusItems || []).map(item => `- ${item.label}: ${item.detail || item.state || ''}`).join('\n');
    const urlLines = (snapshot.urls || []).map(url => `- ${url}`).join('\n');
    const title = snapshot.storeData?.name || snapshot.appData?.common?.name_localized?.schinese || snapshot.appData?.common?.name || snapshot.appId;
    const markdown = [
        `# ${title}`,
        '',
        `- AppID: ${snapshot.appId}`,
        `- 导出时间: ${snapshot.exportedAt}`,
        `- 默认地区: ${getRegionLabel(snapshot.settings?.storeCountry || 'cn')}`,
        `- 默认语言: ${snapshot.settings?.storeLanguage || 'schinese'}`,
        '',
        '## 获取状态',
        statusLines || '- 无',
        '',
        '## API 文本',
        apiTable.innerText.trim() || snapshot.apiText || '无',
        '',
        '## 资源链接',
        urlLines || '无'
    ].join('\n');
    downloadTextFile(`steam_${snapshot.appId}_data.md`, markdown, 'text/markdown;charset=utf-8');
}

document.getElementById('exportJsonBtn').addEventListener('click', exportCurrentDataAsJson);
document.getElementById('exportMarkdownBtn').addEventListener('click', exportCurrentDataAsMarkdown);
