const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '../..');
const source = JSON.parse(fs.readFileSync(path.join(__dirname, 'source-sheet.json'), 'utf8'));
const [headers, ...values] = source.values;
const rows = values.map((row, i) => ({sheetRow: i + 2, ...Object.fromEntries(headers.map((header, column) => [header, row[column] ?? null]))}));
const normalize = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, '').toLowerCase();
assert.equal(rows.length, 600);
assert(rows.every(row => Number.isSafeInteger(row.place_id) && row.place_id > 0));
assert.equal(new Set(rows.map(row => row.place_id)).size, rows.length);
assert.equal(new Set(rows.map(row => `${row.region}:${row.place_name}`)).size, rows.length);
const manifestPath = path.join(root, 'src/data/placeImages.json');
const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'before-placeImages.json'), 'utf8'));
const current = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const loadResolver = records => {
  const code = fs.readFileSync(path.join(root, 'src/utils/placeImageResolver.js'), 'utf8')
    .replace(/^import verifiedImages[^\n]*\n/, '').replace(/^export /gm, '');
  return new Function('verifiedImages', code + '\nreturn resolvePlaceImage;')(records);
};
const input = row => ({id: row.place_id, name: row.place_name, region: row.region, address: row.address, latitude: row.latitude, longitude: row.longitude});
const beforeResolve = loadResolver(before);
const plan = [];
const updated = before.map(photo => {
  const candidates = rows.filter(row => [photo.placeName, ...(photo.aliases || [])].some(name => normalize(name) === normalize(row.place_name)) &&
    [photo.region, ...(photo.regionAliases || [])].some(region => normalize(region) === normalize(row.region)));
  assert.equal(candidates.length, 1, `Ambiguous sheet identity: ${photo.identityKey}`);
  const row = candidates[0];
  assert.equal(row.address, photo.address, `Address mismatch: ${photo.identityKey}`);
  assert.equal(Number(row.latitude), photo.latitude, `Latitude mismatch: ${photo.identityKey}`);
  assert.equal(Number(row.longitude), photo.longitude, `Longitude mismatch: ${photo.identityKey}`);
  assert(fs.existsSync(path.join(root, 'public', photo.imageUrl)), `Missing photo: ${photo.imageUrl}`);
  const previouslyBlocked = !beforeResolve(input(row));
  plan.push({sheetRow: row.sheetRow, name: row.place_name, region: row.region, oldPlaceId: photo.placeId, placeId: row.place_id, previouslyBlocked, imageUrl: photo.imageUrl});
  return {...photo, placeId: row.place_id, verification: {...photo.verification,
    basis: 'provided SQL geography; exact subject and Commons file reviewed; place IDs matched by name, region, address and coordinates to supplied Google Sheet (2026-10-20)'}};
});
assert.equal(updated.length, 333);
assert.equal(new Set(updated.map(photo => photo.placeId)).size, updated.length);
const afterResolve = loadResolver(updated);
for (const row of rows) {
  const previous = beforeResolve(input(row));
  const result = afterResolve(input(row));
  if (previous) assert.equal(result?.imageUrl, previous.imageUrl, `Existing photo changed: ${row.place_name}`);
}
for (const item of plan) {
  const result = afterResolve(input(rows.find(row => row.place_id === item.placeId)));
  assert.equal(result?.imageUrl, item.imageUrl, `Photo not resolved: ${item.name}`);
}
assert.equal(plan.filter(item => item.previouslyBlocked).length, 80);
// All fields unrelated to ID provenance must remain byte-for-byte equal as data.
const protectedFields = photo => {const {placeId, verification, ...other} = photo; const {basis, ...verificationMetadata} = verification; return {...other, verification: verificationMetadata};};
assert.deepEqual(updated.map(protectedFields), before.map(protectedFields));
const report = {
  source: {spreadsheetId: source.spreadsheetId, sheetId: source.sheetId, tab: '01_existing_places', range: source.range, checkedOn: source.fetchedOn},
  sheetPlaces: rows.length, photos: updated.length,
  idsChanged: plan.filter(item => item.oldPlaceId !== item.placeId).length,
  oldIdsReassigned: plan.filter(item => item.oldPlaceId != null && item.oldPlaceId !== item.placeId).length,
  previouslyUnassignedIds: plan.filter(item => item.oldPlaceId == null).length,
  formerlyBlockedPhotos: plan.filter(item => item.previouslyBlocked).length,
  photosResolvedBefore: rows.filter(row => beforeResolve(input(row))).length,
  photosResolvedAfter: rows.filter(row => afterResolve(input(row))).length,
  remainingWithoutPhoto: rows.filter(row => !afterResolve(input(row))).length,
  oldPhotosPreserved: true, allPhotoFilesExist: true, duplicateIds: 0,
  mapping: plan,
};
if (process.argv.includes('--apply')) {
  assert.deepEqual(current, before, 'Manifest changed since baseline; refuse to overwrite');
  fs.writeFileSync(manifestPath, JSON.stringify(updated, null, 2));
  fs.writeFileSync(path.join(__dirname, 'result.json'), JSON.stringify(report, null, 2));
}
const {mapping, ...summary} = report;
console.log(JSON.stringify(summary, null, 2));
