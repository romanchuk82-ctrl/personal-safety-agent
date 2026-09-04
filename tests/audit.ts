import { classifyThreat } from '../lib/threatClassifier';
import { extractGeoFromText } from '../lib/gazetteer';
import { evaluateLocalSecurity } from '../lib/matcher';

const userTestPhrases = [
  'реактивний на Трипілля',
  'реактивний на Крюківщину',
  'БПЛА на Київщині',
  'рухається у напрямку Києва',
  'курс на Бориспіль',
  'на Вишневе',
  'шахеди курсом на Обухів',
  'реактивна ціль повз Бровари на Київ',
  'реактивний на Васильків',
  'пуск КАБ в напрямку Харкова',
  'Реактивний на Трипілля, Київщина',
  'Крюківщина - в укриття!',
  'Бровари, ціль у напрямку міста',
  'Обухів/Українка шахеди з півдня',
  'швидкісна ціль на Київ через Васильків'
];

console.log('=== TESTING USER PHRASES ON CURRENT CODEBASE ===');
for (const phrase of userTestPhrases) {
  const cls = classifyThreat(phrase);
  const geo = extractGeoFromText(phrase);
  console.log('--------------------------------------------------');
  console.log('Phrase: "' + phrase + '"');
  console.log('  Classification: cat=' + cls.category + ' | isTactical=' + cls.isTacticalThreat + ' | sev=' + cls.severity + ' | kw=[' + cls.rawKeywordsMatched.join(', ') + ']');
  console.log('  Geo Locations: [' + geo.locations.map(l => l.name).join(', ') + ']');
  console.log('  Geo Zones: [' + geo.regionalZones.map(z => z.name).join(', ') + ']');
  console.log('  Matched KW: [' + geo.matchedKeywords.join(', ') + ']');
}
