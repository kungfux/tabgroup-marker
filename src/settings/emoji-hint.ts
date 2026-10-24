type HintPart = string | { key: string };

function getEmojiHint(platform: string): HintPart[] {
  if (platform.includes('win')) {
    return [
      'Use ',
      { key: 'Win' },
      ' + ',
      { key: '.' },
      ' to open the emoji picker.',
    ];
  }
  if (platform.includes('mac')) {
    return [
      'Press ',
      { key: 'Control' },
      ' + ',
      { key: 'Command' },
      ' + ',
      { key: 'Space' },
      ' to open the emoji picker.',
    ];
  }
  if (platform.includes('linux')) {
    return [
      "Open your desktop's emoji picker; its keyboard shortcut depends on your desktop environment.",
    ];
  }
  return ["Open your system's emoji picker."];
}

function createHintNode(part: HintPart): Node {
  if (typeof part === 'string') return document.createTextNode(part);

  const key = document.createElement('kbd');
  key.className = 'shortcut-key';
  key.textContent = part.key;
  return key;
}

export function renderEmojiHint(): void {
  const hint = document.getElementById('emoji-hint');
  const platform = navigator.platform.toLowerCase();
  hint?.replaceChildren(...getEmojiHint(platform).map(createHintNode));
}
