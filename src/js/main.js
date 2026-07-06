window.addEventListener('DOMContentLoaded', () => {
    // These functions now have internal error handling, so they won't crash the page.
    renderSettingsForm();
    renderAppHistory();
    tagsPromise = loadSteamTags();
    displaySteamEvents();
    
    const params = new URLSearchParams(window.location.search);
    const appIdFromUrl = params.get("appid");
    if (appIdFromUrl) { appIdInput.value = appIdFromUrl; fetchData(appIdFromUrl); }
 });
