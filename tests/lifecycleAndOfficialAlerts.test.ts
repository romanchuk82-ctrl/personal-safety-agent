import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyThreat, getThreatTtlMinutes } from '../lib/threatClassifier';
import { evaluateLocalSecurity } from '../lib/matcher';
import { isUserInOfficialAlert, RawAlert } from '../lib/sources/alertsInUa';
import { UKRAINE_REGIONS_GEOJSON } from '../lib/ukraineRegions';

describe('ЗАДАЧА 1 — Життєвий цикл та TTL рухомих цілей', () => {
  it('Диференційовані operational TTL: короткі для рухомих цілей (5-8 хв)', () => {
    assert.equal(getThreatTtlMinutes('BALLISTIC'), 5);
    assert.equal(getThreatTtlMinutes('CRUISE_MISSILE'), 7);
    assert.equal(getThreatTtlMinutes('KAB'), 7);
    assert.equal(getThreatTtlMinutes('UAV_STRIKE', 'реактивний дрон на Київ'), 6);
    assert.equal(getThreatTtlMinutes('UAV_STRIKE', 'шахед на Васильків'), 8);
    assert.equal(getThreatTtlMinutes('ALL_CLEAR'), 0);
  });

  it('Подія 15-20 хвилин тому без свіжого підтвердження не є активною загрозою і не змінює GREEN на RED', () => {
    const now = Date.now();
    // Повідомлення 16 хвилин тому (без жодного свіжого підтвердження)
    const sixteenMinAgo = now - 16 * 60 * 1000;
    const oldMessages = [
      {
        id: 'msg-old-shahed',
        channel: 'monitorwarr',
        channelTitle: 'Monitor',
        authorityWeight: 0.95,
        text: 'Шахед на Крюківщину!',
        timeIso: new Date(sixteenMinAgo).toISOString(),
        unixTimestamp: sixteenMinAgo
      }
    ];

    // Користувач у Крюківщині (50.368, 30.367)
    const result = evaluateLocalSecurity(
      50.368,
      30.367,
      15.0,
      'Кирил',
      [],
      oldMessages
    );

    // Стан повинен залишатися СЕКТОР ЧИСТИЙ (GREEN)
    assert.equal(result.overallState, 'GREEN');
    assert.equal(result.hasLocalThreat, false);
    assert.equal(result.threatsCount, 0);
    assert.equal(result.confirmedThreatsList.length, 0);

    // Застаріла або очищена ціль присутня в історії
    assert.ok(result.historyEvents.length > 0 || result.threatEvents.some(t => t.status === 'cleared' || t.status === 'stale'));
    // Активних загроз у threatEvents немає
    const activeThreats = result.threatEvents.filter(t => t.status === 'active');
    assert.equal(activeThreats.length, 0);
  });

  it('Свіже підтвердження продовжує життя події (lastConfirmedAt refresh)', () => {
    const now = Date.now();
    // Перше повідомлення 10 хв тому, але нове підтвердження 2 хв тому
    const tenMinAgo = now - 10 * 60 * 1000;
    const twoMinAgo = now - 2 * 60 * 1000;

    const messages = [
      {
        id: 'msg-1',
        channel: 'monitorwarr',
        channelTitle: 'Monitor',
        authorityWeight: 0.95,
        text: 'Шахед курсом на Васильків',
        timeIso: new Date(tenMinAgo).toISOString(),
        unixTimestamp: tenMinAgo
      },
      {
        id: 'msg-2',
        channel: 'vanek_nikolaev',
        channelTitle: 'Николаевский Ванёк',
        authorityWeight: 0.95,
        text: 'Васильків - шахед все ще фіксується у вашому районі',
        timeIso: new Date(twoMinAgo).toISOString(),
        unixTimestamp: twoMinAgo
      }
    ];

    const result = evaluateLocalSecurity(
      50.178, // Васильків
      30.317,
      15.0,
      'Кирил',
      [],
      messages
    );

    // Завдяки свіжому підтвердженню ціль АКТИВНА
    const activeThreats = result.threatEvents.filter(t => t.status === 'active');
    assert.ok(activeThreats.length > 0);
    assert.equal(result.threatsCount, 1);
    assert.equal(result.overallState, 'RED');
    // lastConfirmedAt відповідає свіжому повідомленню
    assert.equal(activeThreats[0].ageMinutes, 2);
  });

  it('Явний відбій / збиття / знищення очищає подію одразу (CLEARED)', () => {
    const now = Date.now();
    const twoMinAgo = now - 2 * 60 * 1000;
    const oneMinAgo = now - 1 * 60 * 1000;

    // Спершу ціль, але за хвилину повідомлення про збиття
    const messages = [
      {
        id: 'msg-threat',
        channel: 'monitorwarr',
        channelTitle: 'Monitor',
        authorityWeight: 0.95,
        text: 'Шахед на Васильків',
        timeIso: new Date(twoMinAgo).toISOString(),
        unixTimestamp: twoMinAgo
      },
      {
        id: 'msg-clear',
        channel: 'monitorwarr',
        channelTitle: 'Monitor',
        authorityWeight: 0.95,
        text: 'Шахед збито над Васильковом! Чисто',
        timeIso: new Date(oneMinAgo).toISOString(),
        unixTimestamp: oneMinAgo
      }
    ];

    const result = evaluateLocalSecurity(
      50.178, // Васильків
      30.317,
      15.0,
      'Кирил',
      [],
      messages
    );

    // Стан повинен бути GREEN
    assert.equal(result.overallState, 'GREEN');
    assert.equal(result.hasLocalThreat, false);
    assert.equal(result.threatsCount, 0);
    assert.equal(result.confirmedThreatsList.length, 0);
  });
});

describe('ЗАДАЧА 2 — Шар офіційних тривог та badge', () => {
  it('Офіційна тривога НЕ переводить GREEN у RED лише через оголошення сирени', () => {
    const mockOfficialAlerts: RawAlert[] = [
      {
        id: 101,
        location_title: 'Київська область',
        location_type: 'oblast',
        started_at: new Date().toISOString(),
        finished_at: null,
        updated_at: new Date().toISOString(),
        alert_type: 'air_raid',
        location_oblast: 'Київська область',
        location_uid: '10'
      }
    ];

    // Немає тактичних локальних повідомлень
    const result = evaluateLocalSecurity(
      50.368,
      30.367,
      15.0,
      'Кирил',
      mockOfficialAlerts,
      []
    );

    // Повинно залишатися GREEN, бо немає локальної тактичної цілі
    assert.equal(result.overallState, 'GREEN');
    assert.equal(result.hasLocalThreat, false);
  });

  it('isUserInOfficialAlert правильно визначає наявність офіційної тривоги для користувача', () => {
    const mockAlerts: RawAlert[] = [
      {
        id: 101,
        location_title: 'Київська область',
        location_type: 'oblast',
        started_at: new Date().toISOString(),
        finished_at: null,
        updated_at: new Date().toISOString(),
        alert_type: 'air_raid',
        location_oblast: 'Київська область',
        location_uid: '10'
      },
      {
        id: 102,
        location_title: 'м. Київ',
        location_type: 'city',
        started_at: new Date().toISOString(),
        finished_at: null,
        updated_at: new Date().toISOString(),
        alert_type: 'air_raid',
        location_oblast: 'м. Київ',
        location_uid: '11'
      }
    ];

    // Користувач у Крюківщині, Київська область -> ТАК
    const underAlertKyiv = isUserInOfficialAlert('Київська область', 'Крюківщина', mockAlerts);
    assert.equal(underAlertKyiv, true);

    // Користувач у Львові, Львівська область -> НІ (тривоги немає)
    const underAlertLviv = isUserInOfficialAlert('Львівська область', 'Львів', mockAlerts);
    assert.equal(underAlertLviv, false);

    // Після відбою (finished_at встановлено) тривога більше не активна
    const finishedAlerts: RawAlert[] = [
      {
        id: 101,
        location_title: 'Київська область',
        location_type: 'oblast',
        started_at: new Date(Date.now() - 3600000).toISOString(),
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        alert_type: 'air_raid',
        location_oblast: 'Київська область',
        location_uid: '10'
      }
    ];
    const afterClear = isUserInOfficialAlert('Київська область', 'Крюківщина', finishedAlerts);
    assert.equal(afterClear, false);
  });

  it('GeoJSON містить усі області України для підсвічування полігонів', () => {
    assert.ok(UKRAINE_REGIONS_GEOJSON.features.length >= 25);
    const names = UKRAINE_REGIONS_GEOJSON.features.map(f => f.properties.name);
    assert.ok(names.includes('Київська область'));
    assert.ok(names.includes('Харківська область'));
    assert.ok(names.includes('Дніпропетровська область'));
    assert.ok(names.includes('Одеська область'));
    assert.ok(names.includes('Львівська область'));
  });
});
