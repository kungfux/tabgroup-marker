import browser from '../shared/browser';

browser.runtime.onInstalled.addListener(() => {
  console.info(`Tab Groups Organizer installed (${__BROWSER__})`);
});
