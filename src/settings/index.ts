import '../shared/styles.css';
import { initCategories } from './categories';
import { renderEmojiHint } from './emoji-hint';
import { setupShortcutsLink } from './shortcuts-link';

const currentYear = document.getElementById('current-year');
if (currentYear) currentYear.textContent = String(new Date().getFullYear());

setupShortcutsLink();
renderEmojiHint();
await initCategories();
