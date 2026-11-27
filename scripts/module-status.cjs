const fs = require('node:fs');
const path = require('node:path');
const { modules } = require('../module-verification.js');
const entries = Object.values(modules);
const escape = value => String(value || '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const text = '# DachWerk Pro – aktueller Abnahmestand\n\n' +
  'Automatisch aus `module-verification.js` erzeugt. Änderungen mit `npm run status:write` übernehmen.\n\n' +
  `**${entries.filter(m => m.verified).length}/${entries.length} Module GRÜN.** Veröffentlichung, bestandene lokale Tests und fachliche Produktionsabnahme sind getrennte Nachweise.\n\n` +
  '| Nr. | Modul | Status | Nachweis / noch offen |\n|---|---|---|---|\n' +
  entries.map(m => `| ${String(m.number).padStart(2, '0')} | ${escape(m.name)} | ${m.verified ? 'GRÜN' : 'ROT'} | ${escape(m.verified ? m.evidence : m.remaining)} |`).join('\n') + '\n';
const target = path.resolve(__dirname, '../ABNAHMESTAND.md');
if (process.argv.includes('--check')) {
  if (fs.readFileSync(target, 'utf8') !== text) throw Error('Abnahmestand veraltet: npm run status:write ausführen.');
  console.log('Acceptance report agrees with all 36 module records.');
} else fs.writeFileSync(target, text);
