export function Button(label, options = {}) {
  const button = document.createElement('button');
  button.type = options.type || 'button';
  button.className = options.className || 'button';
  button.textContent = label;

  if (options.onClick) {
    button.addEventListener('click', options.onClick);
  }

  return button;
}

