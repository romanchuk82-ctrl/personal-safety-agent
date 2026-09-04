import { classifyThreat } from '../lib/threatClassifier';
import { extractGeoFromText } from '../lib/gazetteer';
import { evaluateLocalSecurity } from '../lib/matcher';

const realLiveMessages = [
  { text: '1 реактивный мопед курсом на/через Бровары/Киев - может быть громковат', ch: 'vanek_nikolaev' },
  { text: 'по первым 2 КАБам минус, еще 2 КАБа подлетают (пару минут) к Черноморску', ch: 'vanek_nikolaev' },
  { text: '1х Голосіївський р-н.', ch: 'monitorwarr' },
  { text: '1х Деміївка.', ch: 'monitorwarr' },
  { text: '1х Жуляни.', ch: 'monitorwarr' },
  { text: '1х Відрадний/Шулявка.', ch: 'monitorwarr' },
  { text: 'Реактивний на Трипілля, Київщина', ch: 'vanek_nikolaev' },
  { text: 'Реактивний на Крюківщину', ch: 'monitorwarr' },
  { text: 'БПЛА курсом на Вишневе', ch: 'eRadarrua' },
  { text: 'Шахеди на Бориспіль з півдня', ch: 'oper_radar' }
];

console.log('=== REAL MESSAGES AUDIT ===');
for (const item of realLiveMessages) {
  const cls = classifyThreat(item.text);
  const geo = extractGeoFromText(item.text);
  console.log(`\nMsg: "${item.text}" (@${item.ch})`);
  console.log(`  Category: ${cls.category}, isTactical: ${cls.isTacticalThreat}, sev: ${cls.severity}, ttl: ${cls.ttlMinutes}`);
  console.log(`  Geo locations: [${geo.locations.map(l => l.name).join(', ')}]`);
  console.log(`  Geo zones: [${geo.regionalZones.map(z => z.name).join(', ')}]`);
  console.log(`  Matched KW: [${geo.matchedKeywords.join(', ')}]`);
}
