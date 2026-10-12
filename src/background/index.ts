import browser from '../shared/browser';

browser.runtime.onInstalled.addListener(() => {
  console.info(`Group Tags installed (${__BROWSER__})`);
});
