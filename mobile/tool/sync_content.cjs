// Copies the website's reviewed lessons and public client configuration.
// Run from any directory: node mobile/tool/sync_content.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'mobile/assets');
fs.mkdirSync(output, { recursive: true });
const source = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
const literal = source.match(/const lessonLibrary = (\{[\s\S]*?\n  \});/);
if (!literal) throw new Error('Website lesson library not found');
const lessons = vm.runInNewContext('(' + literal[1] + ')', {}, { timeout: 1000 });
fs.writeFileSync(path.join(output, 'lessons.json'), JSON.stringify(lessons, null, 2) + '\n');
const quizSource = fs.readFileSync(path.join(root, 'js/quiz-participate.js'), 'utf8');
const questions = quizSource.match(/const CURATED_QUESTIONS = (\[[\s\S]*?\n  \]);/);
if (!questions) throw new Error('Curated quiz not found');
fs.writeFileSync(path.join(output, 'practice_questions.json'), JSON.stringify(
  vm.runInNewContext('(' + questions[1] + ')', {}, { timeout: 1000 }), null, 2) + '\n');
for (const name of ['logo.png', 'logo-white.png', 'icon.png']) {
  fs.copyFileSync(path.join(root, 'assets', name), path.join(output, name));
}
const config = fs.readFileSync(path.join(root, 'js/supabase.js'), 'utf8');
fs.writeFileSync(path.join(output, 'public_config.json'), JSON.stringify({
  supabaseUrl: config.match(/const projectUrl = '([^']+)'/)[1],
  supabaseKey: config.match(/const publishableKey = '([^']+)'/)[1],
  siteUrl: 'https://diri.online'
}, null, 2) + '\n');
console.log('Synced ' + Object.keys(lessons).length + ' lessons, brand assets and public configuration.');

// These small editorial pages have plain headings, paragraphs and list items.
// Copy text into native Flutter blocks without the website navigation/scripts.
function plainText(value) {
  const entities = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', copy: '©', rarr: '→'};
  return value.replaceAll('â€”', '—').replaceAll('â€“', '–').replaceAll('â€™', '’').replaceAll('â€œ', '“').replaceAll('â€', '”').replaceAll('Â©', '©').replaceAll('Â ', ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entity) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(parseInt(entity.slice(1), 10));
    return entities[entity] ?? whole;
  }).replace(/\s+/g, ' ').trim();
}
const resources = {};
for (const name of ['about', 'safety-guide', 'faq', 'contact', 'privacy-policy', 'terms', 'accessibility']) {
  const html = fs.readFileSync(path.join(root, name + '.html'), 'utf8');
  const section = html.slice(html.indexOf('<h1')).split(/<footer\b/i)[0]
    .replace(/<(script|style|form)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const blocks = [...section.matchAll(/<(h[1-6]|p|li|address)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((match) => ({type: match[1].startsWith('h') ? 'heading' : match[1] === 'li' ? 'bullet' : 'paragraph', text: plainText(match[2])}))
    .filter((block) => block.text);
  if (!blocks.length) throw new Error('No resource content found: ' + name);
  resources[name] = {title: blocks[0].text, blocks: blocks.slice(1)};
}
fs.writeFileSync(path.join(output, 'resources.json'), JSON.stringify(resources, null, 2) + '\n');
console.log('Synced ' + Object.keys(resources).length + ' native resource pages.');
