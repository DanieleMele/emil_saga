import fs from 'fs';

const src = fs.readFileSync('index.html', 'utf8');

const de = src
  .replace(
    '<link rel="canonical" href="https://www.emilsaga.ch/"',
    '<link rel="canonical" href="https://www.emilsaga.de/"'
  )
  .replace(
    '<meta property="og:url" content="https://www.emilsaga.ch/"',
    '<meta property="og:url" content="https://www.emilsaga.de/"'
  )
  .replace(
    '<meta property="og:image" content="https://www.emilsaga.ch/book/DM_Cover_FINAL.webp"',
    '<meta property="og:image" content="https://www.emilsaga.de/book/DM_Cover_FINAL.webp"'
  )
  .replace(
    '<meta name="twitter:image" content="https://www.emilsaga.ch/book/DM_Cover_FINAL.webp"',
    '<meta name="twitter:image" content="https://www.emilsaga.de/book/DM_Cover_FINAL.webp"'
  )
  .replace(
    '"image": "https://www.emilsaga.ch/book/DM_Cover_FINAL.webp"',
    '"image": "https://www.emilsaga.de/book/DM_Cover_FINAL.webp"'
  )
  .replace('content="de_CH"', 'content="de_DE"');

fs.writeFileSync('index-de.html', de);
console.log('Generated index-de.html');
