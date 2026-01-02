(async () => {
  try {
    const src = chrome.runtime.getURL('assets/content.js');
    await import(src);
    console.log("WebMark Pro: Content script imported via loader");
  } catch (e) {
    console.error("WebMark Pro: Loader import failed", e);
  }
})();
