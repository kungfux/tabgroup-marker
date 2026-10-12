import browser from '../shared/browser';
import { renderToolbar } from '../shared/toolbar';

renderToolbar({ settingsButton: true });

const tabs = await browser.tabs.query({ currentWindow: true });
const el = document.getElementById('tab-count');
if (el) el.textContent = `${tabs.length} tabs in this window`;
