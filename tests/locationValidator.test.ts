import test from 'node:test';
import assert from 'node:assert';
import { LocationValidator, RawGpsMeasurement, TrustedLocation } from '../lib/locationValidator';
import { calculateDistanceKm, findNearestLocation } from '../lib/gazetteer';

test('Location Confidence & Validation Layer (EW / GPS Spoofing Defense)', async (t) => {

  // Coordinates for tests
  const BORYSPIL = { lat: 50.3500, lng: 30.9500, name: 'Бориспіль / Аеропорт' };
  const KYIV_CENTER = { lat: 50.4501, lng: 30.5234, name: 'Київ (Центр / Хрещатик / Печерськ)' };
  const ZAPORIZHZHIA = { lat: 47.8388, lng: 35.1396, name: 'Запоріжжя' };
  const BLACK_SEA = { lat: 43.5000, lng: 35.0000, name: 'Чорне море (Поза межами)' };
  const RANDOM_SPOOF = { lat: 48.9000, lng: 38.5000, name: 'Схід / Спуфінг 450 км' };

  await t.test('Сценарій A: Нормальний стабільний GPS (Warmup -> Verified)', () => {
    const validator = new LocationValidator(null, 'AUTO');
    const baseTime = 1700000000000;

    // Sample 1
    const res1 = validator.processGpsMeasurement({
      lat: BORYSPIL.lat,
      lng: BORYSPIL.lng,
      accuracy: 12,
      timestamp: baseTime
    });
    assert.strictEqual(res1.confidenceState, 'UNCERTAIN', 'First sample should be UNCERTAIN (warmup)');
    assert.strictEqual(res1.trustedLocation.name.includes('Бориспіль'), true);

    // Sample 2
    const res2 = validator.processGpsMeasurement({
      lat: BORYSPIL.lat + 0.0001,
      lng: BORYSPIL.lng + 0.0001,
      accuracy: 10,
      timestamp: baseTime + 1000
    });
    assert.strictEqual(res2.confidenceState, 'UNCERTAIN', 'Second sample still warmup');

    // Sample 3 (Warmup completed with consistent cluster)
    const res3 = validator.processGpsMeasurement({
      lat: BORYSPIL.lat + 0.00015,
      lng: BORYSPIL.lng + 0.00005,
      accuracy: 8,
      timestamp: baseTime + 2000
    });
    assert.strictEqual(res3.confidenceState, 'VERIFIED', '3 consistent samples establish VERIFIED status');
    assert.strictEqual(res3.isAnomalous, false);
    assert.strictEqual(res3.trustedLocation.name.includes('Бориспіль'), true);
    assert.strictEqual(res3.trustedLocation.systemConfidenceScore >= 90, true);
  });

  await t.test('Сценарій B: Поступове погіршення точності (accuracy degradation)', () => {
    const validator = new LocationValidator(null, 'AUTO');
    const baseTime = 1700000000000;

    // Establish initial verified location in Boryspil
    validator.processGpsMeasurement({ lat: BORYSPIL.lat, lng: BORYSPIL.lng, accuracy: 10, timestamp: baseTime });
    validator.processGpsMeasurement({ lat: BORYSPIL.lat, lng: BORYSPIL.lng, accuracy: 10, timestamp: baseTime + 1000 });
    const initial = validator.processGpsMeasurement({ lat: BORYSPIL.lat, lng: BORYSPIL.lng, accuracy: 10, timestamp: baseTime + 2000 });
    assert.strictEqual(initial.confidenceState, 'VERIFIED');

    // Accuracy degrades to 250m
    const degraded = validator.processGpsMeasurement({
      lat: BORYSPIL.lat + 0.0005,
      lng: BORYSPIL.lng + 0.0005,
      accuracy: 250,
      timestamp: baseTime + 4000
    });
    assert.strictEqual(degraded.confidenceState, 'UNCERTAIN', 'Confidence drops to UNCERTAIN when accuracy is 250m');
    assert.strictEqual(degraded.trustedLocation.systemConfidenceScore < 70, true);
    assert.strictEqual(degraded.isAnomalous, false, 'Gradual degradation in same area is not an instant EW teleport anomaly');
  });

  await t.test('Сценарій C: Раптовий стрибок на сотні кілометрів (РЕБ / GPS Spoofing Jump)', () => {
    const validator = new LocationValidator(null, 'AUTO');
    const baseTime = 1700000000000;

    // Warmup in Boryspil
    validator.processGpsMeasurement({ lat: BORYSPIL.lat, lng: BORYSPIL.lng, accuracy: 10, timestamp: baseTime });
    validator.processGpsMeasurement({ lat: BORYSPIL.lat, lng: BORYSPIL.lng, accuracy: 10, timestamp: baseTime + 1000 });
    validator.processGpsMeasurement({ lat: BORYSPIL.lat, lng: BORYSPIL.lng, accuracy: 10, timestamp: baseTime + 2000 });

    // Sudden massive EW jump 450 km away after 3 seconds with false claimed accuracy 5m!
    const spoofResult = validator.processGpsMeasurement({
      lat: RANDOM_SPOOF.lat,
      lng: RANDOM_SPOOF.lng,
      accuracy: 5, // False nominal accuracy from spoofed signal!
      timestamp: baseTime + 5000
    });

    assert.strictEqual(spoofResult.isAnomalous, true, 'Must detect anomaly');
    assert.strictEqual(spoofResult.isUpdated, false, 'Must NOT update trusted location');
    assert.strictEqual(spoofResult.confidenceState, 'UNRELIABLE', 'Status must be UNRELIABLE');
    assert.strictEqual(spoofResult.trustedLocation.name.includes('Бориспіль'), true, 'Monitoring location MUST REMAIN in Boryspil');
    assert.strictEqual(spoofResult.trustedLocation.statusMessageUk.includes('Геолокація нестабільна'), true);
    assert.strictEqual(spoofResult.anomalyReasonUk?.includes('аномальний стрибок'), true);
  });

  await t.test('Сценарій D: Кілька суперечливих хаотичних координат під час роботи РЕБ', () => {
    const validator = new LocationValidator(null, 'AUTO');
    const baseTime = 1700000000000;

    // Setup Boryspil
    validator.processGpsMeasurement({ lat: BORYSPIL.lat, lng: BORYSPIL.lng, accuracy: 10, timestamp: baseTime });
    validator.processGpsMeasurement({ lat: BORYSPIL.lat, lng: BORYSPIL.lng, accuracy: 10, timestamp: baseTime + 1000 });
    validator.processGpsMeasurement({ lat: BORYSPIL.lat, lng: BORYSPIL.lng, accuracy: 10, timestamp: baseTime + 2000 });

    // Chaotic coordinates 1 (Odesa area)
    const c1 = validator.processGpsMeasurement({ lat: 46.48, lng: 30.72, accuracy: 20, timestamp: baseTime + 3000 });
    assert.strictEqual(c1.isAnomalous, true);
    assert.strictEqual(c1.trustedLocation.name.includes('Бориспіль'), true);

    // Chaotic coordinates 2 (Kharkiv area)
    const c2 = validator.processGpsMeasurement({ lat: 49.99, lng: 36.23, accuracy: 15, timestamp: baseTime + 5000 });
    assert.strictEqual(c2.isAnomalous, true);
    assert.strictEqual(c2.trustedLocation.name.includes('Бориспіль'), true);

    // Chaotic coordinates 3 (Out of Ukraine territory)
    const c3 = validator.processGpsMeasurement({ lat: BLACK_SEA.lat, lng: BLACK_SEA.lng, accuracy: 30, timestamp: baseTime + 7000 });
    assert.strictEqual(c3.isAnomalous, true);
    assert.strictEqual(c3.trustedLocation.name.includes('Бориспіль'), true);
  });

  await t.test('Сценарій E: GPS повертається до нормального стану (Boryspil recovery)', () => {
    const validator = new LocationValidator(null, 'AUTO');
    const baseTime = 1700000000000;

    // Setup Boryspil
    validator.processGpsMeasurement({ lat: BORYSPIL.lat, lng: BORYSPIL.lng, accuracy: 10, timestamp: baseTime });
    validator.processGpsMeasurement({ lat: BORYSPIL.lat, lng: BORYSPIL.lng, accuracy: 10, timestamp: baseTime + 1000 });
    validator.processGpsMeasurement({ lat: BORYSPIL.lat, lng: BORYSPIL.lng, accuracy: 10, timestamp: baseTime + 2000 });

    // EW Spoofing occurs
    validator.processGpsMeasurement({ lat: RANDOM_SPOOF.lat, lng: RANDOM_SPOOF.lng, accuracy: 5, timestamp: baseTime + 4000 });
    assert.strictEqual(validator.getTrustedLocation()?.confidenceState, 'UNRELIABLE');

    // Real signal in Boryspil returns!
    const recovered = validator.processGpsMeasurement({
      lat: BORYSPIL.lat + 0.0001,
      lng: BORYSPIL.lng + 0.0001,
      accuracy: 10,
      timestamp: baseTime + 8000
    });

    assert.strictEqual(recovered.isAnomalous, false);
    assert.strictEqual(recovered.confidenceState, 'VERIFIED', 'Should recover to VERIFIED');
    assert.strictEqual(recovered.trustedLocation.name.includes('Бориспіль'), true);
    assert.strictEqual(recovered.trustedLocation.statusMessageUk.includes('Бориспіль'), true);
  });

  await t.test('Сценарій F: Користувач реально їде автомобілем (Kyiv -> Boryspil at 80 km/h)', () => {
    const validator = new LocationValidator(null, 'AUTO');
    let currentTime = 1700000000000;

    // Start at Kyiv Darnytsia (lat: 50.3980, lng: 30.6340)
    validator.processGpsMeasurement({ lat: 50.3980, lng: 30.6340, accuracy: 12, timestamp: currentTime });
    validator.processGpsMeasurement({ lat: 50.3980, lng: 30.6340, accuracy: 10, timestamp: currentTime + 1000 });
    validator.processGpsMeasurement({ lat: 50.3980, lng: 30.6340, accuracy: 10, timestamp: currentTime + 2000 });
    currentTime += 2000;

    // Drive towards Boryspil over 10 minutes (driving 22 km/h - 90 km/h)
    // 5 progressive steps along highway
    const highwayPoints = [
      { lat: 50.3900, lng: 30.7000 }, // +4.7 km in 3 minutes (94 km/h)
      { lat: 50.3800, lng: 30.7800 }, // +5.7 km in 4 minutes (85 km/h)
      { lat: 50.3700, lng: 30.8500 }, // +5.0 km in 4 minutes (75 km/h)
      { lat: 50.3550, lng: 30.9200 }, // +5.2 km in 4 minutes (78 km/h)
      { lat: 50.3500, lng: 30.9500 }, // Boryspil Center (+2.2 km in 2 minutes)
    ];

    for (const pt of highwayPoints) {
      currentTime += 180000; // 3 minutes later
      const step = validator.processGpsMeasurement({
        lat: pt.lat,
        lng: pt.lng,
        accuracy: 15,
        timestamp: currentTime
      });
      assert.strictEqual(step.isAnomalous, false, 'Realistic highway drive must NOT be marked anomalous');
      assert.strictEqual(step.isUpdated, true, 'Trusted location must update smoothly');
    }

    assert.strictEqual(validator.getTrustedLocation()?.name.includes('Бориспіль'), true);
  });

  await t.test('Сценарій G: Location Locked + GPS стрибає (Locked location is immutable)', () => {
    const validator = new LocationValidator(null, 'AUTO');
    const baseTime = 1700000000000;

    // Arrived at Zaporizhzhia & verified
    validator.setManualLocation(ZAPORIZHZHIA.lat, ZAPORIZHZHIA.lng, 'Запоріжжя (Центр)', 'Запорізька область');
    validator.lockCurrentLocation();

    assert.strictEqual(validator.getLockMode(), 'LOCKED');
    assert.strictEqual(validator.getTrustedLocation()?.name, 'Запоріжжя (Центр)');

    // GPS now sends random fixes (Kyiv, Odesa, Black Sea)
    const spoof1 = validator.processGpsMeasurement({ lat: KYIV_CENTER.lat, lng: KYIV_CENTER.lng, accuracy: 5, timestamp: baseTime + 5000 });
    assert.strictEqual(spoof1.isUpdated, false);
    assert.strictEqual(spoof1.trustedLocation.name, 'Запоріжжя (Центр)');

    const spoof2 = validator.processGpsMeasurement({ lat: RANDOM_SPOOF.lat, lng: RANDOM_SPOOF.lng, accuracy: 10, timestamp: baseTime + 10000 });
    assert.strictEqual(spoof2.isUpdated, false);
    assert.strictEqual(spoof2.trustedLocation.name, 'Запоріжжя (Центр)');
  });

  await t.test('Сценарій H: Ручне встановлення точки (Manual Location from Gazetteer / Map)', () => {
    const validator = new LocationValidator(null, 'AUTO');

    // Manual set to Chernihiv
    const manual = validator.setManualLocation(51.4982, 31.2893, 'Чернігів (Центр)', 'Чернігівська область');
    assert.strictEqual(manual.lockMode, 'MANUAL');
    assert.strictEqual(manual.confidenceState, 'LOCKED');
    assert.strictEqual(manual.name, 'Чернігів (Центр)');
    assert.strictEqual(manual.isManualOrLocked, true);
    assert.strictEqual(manual.statusMessageUk.includes('Чернігів'), true);
  });

  await t.test('Сценарій I: Перезапуск та відновлення стану (Serialization / Deserialization)', () => {
    const validator1 = new LocationValidator(null, 'AUTO');
    validator1.setManualLocation(BORYSPIL.lat, BORYSPIL.lng, 'Бориспіль / Аеропорт', 'Київська область');
    const trusted1 = validator1.getTrustedLocation()!;

    // Serialize to JSON (as would happen with localStorage)
    const serialized = JSON.stringify(trusted1);
    const restoredData: TrustedLocation = JSON.parse(serialized);

    // Initialize new validator with restored data
    const validator2 = new LocationValidator(restoredData, restoredData.lockMode);
    assert.strictEqual(validator2.getLockMode(), 'MANUAL');
    assert.strictEqual(validator2.getTrustedLocation()?.name, 'Бориспіль / Аеропорт');
    assert.strictEqual(validator2.getTrustedLocation()?.confidenceState, 'LOCKED');
  });

});
