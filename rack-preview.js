(() => {
  'use strict';
  const wardrobe = document.getElementById('preview-wardrobe');
  const choices = [...document.querySelectorAll('[data-city-choice]')];
  const cityLink = document.getElementById('preview-city-link');
  fetch('rack-products.json').then(response => {
    if (!response.ok) throw new Error('Collection unavailable');
    return response.json();
  }).then(data => {
    const show = city => {
      wardrobe.querySelector('.garment-rack')?.dispatchEvent(new Event('rack:destroy'));
      const source = document.createElement('div');
      source.className = 'drop-grid';
      source.dataset.city = city;
      source.innerHTML = data[city].map(product => product.html).join('\n');
      wardrobe.replaceChildren(source);
      window.ApshabdRack.mount(source);
      choices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.cityChoice === city)));
      cityLink.href = `${city}.html#drop`;
      cityLink.textContent = `Open ${city[0].toUpperCase() + city.slice(1)} collection ↗`;
    };
    choices.forEach(button => button.addEventListener('click', () => show(button.dataset.cityChoice)));
    show('mumbai');
  }).catch(() => {
    wardrobe.textContent = 'This wardrobe could not be loaded. Open the city collection below.';
  });
})();
