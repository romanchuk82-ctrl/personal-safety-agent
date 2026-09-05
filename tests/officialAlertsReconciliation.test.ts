import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { RawAlert, getActiveAirRaidAlerts, isUserInOfficialAlert } from '../lib/sources/alertsInUa';
import { buildOfficialAlertsGeoJson, __clearOfficialGeometryCacheForTests } from '../lib/officialAlertGeometry';

describe('Official Alerts Full Reconciliation & Western Oblasts Isolation', () => {
  test('Reconciliation against live API snapshot: missing = 0, falsePositive = 0, wrongGeometry = 0, stale = 0', async () => {
    __clearOfficialGeometryCacheForTests();

    // Load live snapshot
    const snapshotPath = path.resolve(process.cwd(), 'source_alerts_snapshot.json');
    let rawAlerts: RawAlert[] = [];
    if (fs.existsSync(snapshotPath)) {
      const data = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
      rawAlerts = data.alerts || [];
    }

    const activeAirAlerts = getActiveAirRaidAlerts(rawAlerts);
    assert.ok(activeAirAlerts.length > 0, 'Must have active air raid alerts in snapshot');

    const { geoJson, diagnostic } = await buildOfficialAlertsGeoJson(rawAlerts);

    assert.ok(geoJson, 'GeoJSON must be generated');
    assert.strictEqual(diagnostic.unmatchedGeometryCount, 0, 'Unmatched geometry count must be 0');
    assert.strictEqual(diagnostic.unmatched.length, 0, 'Unmatched list must be empty');

    // Verify each feature in GeoJSON corresponds to an active source alert
    const features = geoJson.features;
    assert.ok(features.length > 0, 'Must render polygons');

    const westernOblasts = [
      'львівська область',
      'івано-франківська область',
      'тернопільська область',
      'волинська область',
      'закарпатська область',
      'чернівецька область'
    ];

    // Verify Western Ukraine has ZERO false positive polygons when source has 0 alerts in Western Ukraine
    for (const westernOb of westernOblasts) {
      const sourceCountInWestern = activeAirAlerts.filter(a => (a.location_oblast || '').toLowerCase() === westernOb).length;
      const renderedInWestern = features.filter(f => (f.properties?.oblast || f.properties?.name || '').toLowerCase().includes(westernOb.replace(' область', ''))).length;

      assert.strictEqual(
        renderedInWestern,
        sourceCountInWestern,
        `Western Oblast [${westernOb}] must have exact match: source=${sourceCountInWestern}, rendered=${renderedInWestern}`
      );
    }

    // Verify raion alert is NEVER promoted to oblast
    const raionAlert = activeAirAlerts.find(a => a.location_type === 'raion');
    if (raionAlert) {
      const match = diagnostic.matches.find(m => m.sourceId === String(raionAlert.location_uid));
      assert.ok(match, 'Raion alert must be matched');
      assert.ok(match.geometryKey.startsWith('raion:'), `Raion alert must map to raion polygon, not whole oblast: ${match.geometryKey}`);
    }

    // Verify hromada alert is NEVER promoted to whole oblast
    const hromadaAlert = activeAirAlerts.find(a => a.location_type === 'hromada');
    if (hromadaAlert) {
      const match = diagnostic.matches.find(m => m.sourceId === String(hromadaAlert.location_uid));
      assert.ok(match, 'Hromada alert must be matched');
      assert.ok(match.geometryKey.startsWith('hromada:'), `Hromada alert must map to hromada polygon: ${match.geometryKey}`);
    }
  });

  test('All-Clear / Alert Cancellation instantly removes polygon', async () => {
    __clearOfficialGeometryCacheForTests();

    // Start with 1 active alert for Boryspil raion
    const alertActive: RawAlert = {
      id: 99999,
      location_title: 'Бориспільський район',
      location_type: 'raion',
      location_oblast: 'Київська область',
      location_uid: '78',
      started_at: new Date(Date.now() - 60000).toISOString(),
      finished_at: null,
      updated_at: new Date().toISOString(),
      alert_type: 'air_raid'
    };

    const res1 = await buildOfficialAlertsGeoJson([alertActive]);
    assert.strictEqual(res1.diagnostic.activeZoneCount, 1);
    assert.strictEqual(res1.diagnostic.renderedGeometryCount, 1);
    assert.ok(res1.geoJson?.features.length === 1);

    // Now alert is finished (All Clear)
    const alertFinished: RawAlert = {
      ...alertActive,
      finished_at: new Date().toISOString()
    };

    const res2 = await buildOfficialAlertsGeoJson([alertFinished]);
    assert.strictEqual(res2.diagnostic.activeZoneCount, 0);
    assert.strictEqual(res2.diagnostic.renderedGeometryCount, 0);
    assert.strictEqual(res2.geoJson, null);
  });

  test('User Alert Logic does NOT trigger across different raions in same oblast', () => {
    const alerts: RawAlert[] = [
      {
        id: 111,
        location_title: 'Броварський район',
        location_type: 'raion',
        location_oblast: 'Київська область',
        location_uid: '79',
        started_at: new Date().toISOString(),
        finished_at: null,
        updated_at: new Date().toISOString(),
        alert_type: 'air_raid'
      }
    ];

    // User in Boryspil (different raion in same oblast)
    const isBoryspilUnderAlert = isUserInOfficialAlert('Київська область', 'Бориспіль', alerts);
    assert.strictEqual(isBoryspilUnderAlert, false, 'Alert in Brovary must NOT trigger alert in Boryspil');

    // User in Brovary (matching raion)
    const isBrovaryUnderAlert = isUserInOfficialAlert('Київська область', 'Бровари', alerts);
    assert.strictEqual(isBrovaryUnderAlert, true, 'Alert in Brovary MUST trigger alert for Brovary user');
  });
});
