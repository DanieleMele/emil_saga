import fs from 'fs';

function makeDe(src) {
  return src
    .replace(
      /<link rel="canonical" href="https:\/\/emilsaga\.ch\//g,
      '<link rel="canonical" href="https://emilsaga.de/'
    )
    .replace(
      /<meta property="og:url" content="https:\/\/emilsaga\.ch\//g,
      '<meta property="og:url" content="https://emilsaga.de/'
    )
    .replace(
      /<meta property="og:image" content="https:\/\/emilsaga\.ch\/book\/DM_Cover_FINAL\.webp"/g,
      '<meta property="og:image" content="https://emilsaga.de/book/DM_Cover_FINAL.webp"'
    )
    .replace(
      /<meta name="twitter:image" content="https:\/\/emilsaga\.ch\/book\/DM_Cover_FINAL\.webp"/g,
      '<meta name="twitter:image" content="https://emilsaga.de/book/DM_Cover_FINAL.webp"'
    )
    .replace(
      /"image": "https:\/\/emilsaga\.ch\/book\/DM_Cover_FINAL\.webp"/g,
      '"image": "https://emilsaga.de/book/DM_Cover_FINAL.webp"'
    )
    .replace(
      /"url": "https:\/\/emilsaga\.ch\//g,
      '"url": "https://emilsaga.de/'
    )
    .replace(
      /"@id": "https:\/\/emilsaga\.ch\//g,
      '"@id": "https://emilsaga.de/'
    )
    .replace(
      /"target": "https:\/\/emilsaga\.ch\//g,
      '"target": "https://emilsaga.de/'
    )
    .replace(
      /"logo": "https:\/\/emilsaga\.ch\/book\//g,
      '"logo": "https://emilsaga.de/book/'
    )
    .replace(/"inLanguage": "de-CH"/g, '"inLanguage": "de-DE"')
    .replace(
      /<meta property="og:locale" content="de_CH"/g,
      '<meta property="og:locale" content="de_DE"'
    )
    .replace(
      /<meta property="og:locale:alternate" content="de_DE"/g,
      '<meta property="og:locale:alternate" content="de_CH"'
    );
}

const pages = [
  { src: 'index.html', out: 'index-de.html' },
  { src: 'leseprobe.html', out: 'leseprobe-de.html' },
  { src: 'support.html', out: 'support-de.html' },
];

for (const { src, out } of pages) {
  const content = fs.readFileSync(src, 'utf8');
  fs.writeFileSync(out, makeDe(content));
  console.log(`Generated ${out}`);
}
