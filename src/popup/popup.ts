import browser from '../shared/browser';

const tabs = await browser.tabs.query({ currentWindow: true });
const el = document.getElementById('tab-count');
if (el) el.textContent = `${tabs.length} tabs in this window`;
