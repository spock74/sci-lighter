
// Configura o comportamento do painel lateral ao clicar no ícone da extensão
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Erro ao configurar sidePanel:", error));

chrome.runtime.onInstalled.addListener(() => {
  console.log('WebMark Pro: Extensão instalada e pronta.');
});
