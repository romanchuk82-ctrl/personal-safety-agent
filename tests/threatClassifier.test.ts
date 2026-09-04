import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyThreat } from '../lib/threatClassifier';
import { extractGeoFromText } from '../lib/gazetteer';
import { evaluateLocalSecurity } from '../lib/matcher';

describe('Threat Classifier & Ingestion Tests', () => {
  it('Розпізнає реактивні БПЛА та крилаті дрони', () => {
    const res1 = classifyThreat('реактивний на Трипілля');
    assert.equal(res1.category, 'UAV_STRIKE');
    assert.equal(res1.isTacticalThreat, true);

    const res2 = classifyThreat('1 реактивный мопед курсом на Бровары');
    assert.equal(res2.category, 'UAV_STRIKE');
    assert.equal(res2.isTacticalThreat, true);
  });

  it('Розпізнає скорочені вектори та прийменники руху', () => {
    const res = classifyThreat('на Вишневе');
    assert.equal(res.isTacticalThreat, true);
  });

  it('Витягує точну географію з українських відмінків та скорочень', () => {
    const geo1 = extractGeoFromText('реактивний на Трипілля');
    assert.ok(geo1.locations.some(l => l.name === 'Трипілля'));

    const geo2 = extractGeoFromText('реактивний на Крюківщину');
    assert.ok(geo2.locations.some(l => l.name === 'Крюківщина'));

    const geo3 = extractGeoFromText('1х Голосіївський р-н');
    assert.ok(geo3.locations.some(l => l.name.includes('Голосіївський')));

    const geo4 = extractGeoFromText('БПЛА на Київщині');
    assert.ok(geo4.regionalZones.some(z => z.oblast === 'Київська область'));
  });

  it('Правильно класифікує OBSERVATION проти CONFIRMED_THREAT за дистанцією', () => {
    const now = Date.now();
    const mockMessages = [
      {
        id: 'msg-1',
        channel: 'monitorwarr',
        channelTitle: 'Monitor',
        authorityWeight: 0.95,
        text: 'реактивний на Крюківщину',
        timeIso: new Date(now).toISOString(),
        unixTimestamp: now
      }
    ];

    const result = evaluateLocalSecurity(
      50.35,
      30.95,
      15.0,
      'Кирил',
      [],
      mockMessages
    );

    assert.equal(result.overallState, 'GREEN');
    assert.equal(result.threatsCount, 0); // 0 confirmed local threats in 15km
    assert.equal(result.observationsCount, 1); // 1 observation in total
    assert.equal(result.outsideZoneObservationsCount, 1); // 1 in surrounding 30-75km zone
    assert.ok(result.outsideZoneObservations.length === 1);
    assert.equal(result.outsideZoneObservations[0].eventType, 'OBSERVATION');
  });
});
