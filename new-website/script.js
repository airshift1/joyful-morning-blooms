document.addEventListener('DOMContentLoaded', () => {
  const year = new Date().getFullYear();
  const footer = document.querySelector('.footer');

  if (footer && !footer.querySelector('.year')) {
    const span = document.createElement('span');
    span.className = 'year';
    span.textContent = `© ${year}`;
    footer.appendChild(span);
  }
});
