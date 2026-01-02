(async () => {
  try {
    const src = chrome.runtime.getURL('assets/content.js');
    await import(src);
    console.log("Sci-Lighter: Content script imported via loader");
  } catch (e) {
    console.error("Sci-Lighter: Loader import failed", e);
  }
})();
