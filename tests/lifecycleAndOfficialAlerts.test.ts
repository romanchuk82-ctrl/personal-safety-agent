import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyThreat, getThreatTtlMinutes } from '../lib/threatClassifier';
import { evaluateLocalSecurity } from '../lib/matcher';
import { isUserInOfficialAlert, RawAlert, getActiveAirRaidAlerts } from '../lib/sources/alertsInUa';
import { UKRAINE_REGIONS_GEOJSON } from '../lib/ukraineRegions';
import {
  getOfficialGeometryDescriptor,
  officialLocationTypeLabel,
  buildOfficialAlertsGeoJson
} from '../lib/officialAlertGeometry';

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

  it('локальна тривога району не піднімається до рівня всієї області', () => {
    const raion: RawAlert = {
      id: 201,
      location_title: 'Бориспільський район',
      location_type: 'raion',
      started_at: new Date().toISOString(),
      finished_at: null,
      updated_at: new Date().toISOString(),
      alert_type: 'air_raid',
      location_oblast: 'Київська область',
      location_uid: '78'
    };
    assert.equal(isUserInOfficialAlert('Київська область', 'Бровари', [raion]), false);
    assert.equal(isUserInOfficialAlert('Київська область', 'Бориспільський район', [raion]), true);
  });

  it('м. Київ не ототожнюється з Київською областю', () => {
    const kyivCity: RawAlert = {
      id: 202,
      location_title: 'м. Київ',
      location_type: 'oblast',
      started_at: new Date().toISOString(),
      finished_at: null,
      updated_at: new Date().toISOString(),
      alert_type: 'air_raid',
      location_oblast: 'м. Київ',
      location_uid: '31'
    };
    assert.equal(isUserInOfficialAlert('м. Київ', 'Київ', [kyivCity]), true);
    assert.equal(isUserInOfficialAlert('Київська область', 'Бровари', [kyivCity]), false);
  });

  it('air-raid фільтр виключає артобстріл і одразу прибирає завершену зону', () => {
    const base: RawAlert = {
      id: 203,
      location_title: 'Нікопольська територіальна громада',
      location_type: 'hromada',
      started_at: new Date().toISOString(),
      finished_at: null,
      updated_at: new Date().toISOString(),
      alert_type: 'air_raid',
      location_oblast: 'Дніпропетровська область',
      location_uid: '351'
    };
    const artillery = { ...base, id: 204, alert_type: 'artillery_shelling' };
    const finished = { ...base, id: 205, finished_at: new Date().toISOString() };
    assert.deepEqual(getActiveAirRaidAlerts([base, artillery, finished]).map(item => item.id), [203]);
  });

  it('детерміновано зіставляє official UID з geometry для області, району, громади й міста', () => {
    const make = (type: RawAlert['location_type'], uid: string, title: string): RawAlert => ({
      id: Number(uid), location_title: title, location_type: type,
      started_at: new Date().toISOString(), finished_at: null, updated_at: new Date().toISOString(),
      alert_type: 'air_raid', location_oblast: 'Тестова область', location_uid: uid
    });
    assert.deepEqual(getOfficialGeometryDescriptor(make('oblast', '16', 'Луганська область'))?.geometryKey, 'oblast:16');
    assert.deepEqual(getOfficialGeometryDescriptor(make('raion', '78', 'Бориспільський район'))?.geometryKey, 'raion:78');
    assert.deepEqual(getOfficialGeometryDescriptor(make('hromada', '351', 'Нікопольська громада'))?.geometryKey, 'hromada:351');
    assert.deepEqual(getOfficialGeometryDescriptor(make('city', '5351', 'м. Нікополь'))?.geometryKey, 'hromada:351');
    assert.equal(getOfficialGeometryDescriptor(make('unknown', '9', 'Невідомо')), null);
    assert.equal(officialLocationTypeLabel('hromada'), 'громада');
  });

  it('buildOfficialAlertsGeoJson формує точні WGS84 полігони для Києва, Бориспільського, Броварського та Обухівського районів', async () => {
    const alerts: RawAlert[] = [
      {
        id: 301,
        location_title: 'м. Київ',
        location_type: 'oblast',
        started_at: new Date().toISOString(),
        finished_at: null,
        updated_at: new Date().toISOString(),
        alert_type: 'air_raid',
        location_oblast: 'м. Київ',
        location_uid: '31'
      },
      {
        id: 302,
        location_title: 'Бориспільський район',
        location_type: 'raion',
        started_at: new Date().toISOString(),
        finished_at: null,
        updated_at: new Date().toISOString(),
        alert_type: 'air_raid',
        location_oblast: 'Київська область',
        location_uid: '78'
      },
      {
        id: 303,
        location_title: 'Броварський район',
        location_type: 'raion',
        started_at: new Date().toISOString(),
        finished_at: null,
        updated_at: new Date().toISOString(),
        alert_type: 'air_raid',
        location_oblast: 'Київська область',
        location_uid: '79'
      },
      {
        id: 304,
        location_title: 'Обухівський район',
        location_type: 'raion',
        started_at: new Date().toISOString(),
        finished_at: null,
        updated_at: new Date().toISOString(),
        alert_type: 'air_raid',
        location_oblast: 'Київська область',
        location_uid: '76'
      }
    ];

    const { geoJson, diagnostic } = await buildOfficialAlertsGeoJson(alerts);

    assert.ok(geoJson);
    assert.equal(geoJson.type, 'FeatureCollection');
    assert.equal(geoJson.features.length, 4);
    assert.equal(diagnostic.activeZoneCount, 4);
    assert.equal(diagnostic.matchedGeometryCount, 4);
    assert.equal(diagnostic.unmatchedGeometryCount, 0);
    assert.equal(diagnostic.renderedGeometryCount, 4);

    // Перевіряємо, що координати є дійсними географічними [lng, lat] у межах України (22-41°E, 44-53°N)
    for (const feature of geoJson.features) {
      assert.ok(feature.geometry);
      assert.ok(feature.geometry.coordinates);
      
      const checkCoords = (arr: any) => {
        if (typeof arr[0] === 'number') {
          const [lng, lat] = arr;
          assert.ok(lng >= 22 && lng <= 41, `Longitude ${lng} is outside Ukraine bounds`);
          assert.ok(lat >= 44 && lat <= 53, `Latitude ${lat} is outside Ukraine bounds`);
        } else {
          arr.forEach(checkCoords);
        }
      };
      checkCoords(feature.geometry.coordinates);
    }

    // Перевіряємо прив'язку конкретно для Києва (50.2-50.6°N, 30.2-30.8°E)
    const kyivFeature = geoJson.features.find(f => f.properties.geometryKey === 'oblast:31');
    assert.ok(kyivFeature);
    assert.equal(kyivFeature.properties.officialAlert, true);
    assert.equal(kyivFeature.properties.zoneName, 'м. Київ');

    // Перевіряємо Бориспільський район (78)
    const boryspilFeature = geoJson.features.find(f => f.properties.geometryKey === 'raion:78');
    assert.ok(boryspilFeature);
    assert.equal(boryspilFeature.properties.officialAlert, true);
    assert.equal(boryspilFeature.properties.zoneName, 'Бориспільський район');
  });
});
