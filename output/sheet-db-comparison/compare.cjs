const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const save = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2));
const source = read('output/sheet-db-comparison/source-sheet.json');
const header = source.values[0];
const sheet = source.values.slice(1).map((values, index) => ({sheetRow: index + 2, ...Object.fromEntries(header.map((key, column) => [key, values[column] ?? null]))})).filter(row => row.place_id != null || row.place_name);
const catalogFile = read('output/place-image-audit/catalog.json');
const catalog = catalogFile.places;
const photos = read('src/data/placeImages.json');
const oldLive = read('output/place-image-expansion/live-id-map.json');
const norm = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, '').toLowerCase();
const key = (region, name) => norm(region) + ':' + norm(name);
const catKey = row => key(row.region, row.name);
const sheetKey = row => key(row.region, row.place_name);
const index = (rows, keyOf) => {
  const result = new Map();
  for (const row of rows) result.set(keyOf(row), [...(result.get(keyOf(row)) || []), row]);
  return result;
};
const catIndex = index(catalog, catKey);
const sheetIndex = index(sheet, sheetKey);
const oldById = new Map(oldLive.map(row => [Number(row.id), row]));
const oldByKey = index(oldLive, catKey);
const photoById = new Map(photos.filter(row => row.placeId != null).map(row => [Number(row.placeId), row]));
const imageResolverCode = fs.readFileSync(path.join(root, 'src/utils/placeImageResolver.js'), 'utf8').replace(/^import verifiedImages[^\n]*\n/, '').replace(/^export /gm, '');
const resolve = new Function('verifiedImages', imageResolverCode + '\nreturn resolvePlaceImage;')(photos);
const distance = (lat, lng, record) => {
  if (![lat, lng, record.latitude, record.longitude].every(v => v !== null && v !== '' && Number.isFinite(Number(v)))) return null;
  const rad = Math.PI / 180;
  const dy = (Number(record.latitude) - Number(lat)) * rad;
  const dx = (Number(record.longitude) - Number(lng)) * rad;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.sin(dy / 2) ** 2 + Math.cos(Number(lat) * rad) * Math.cos(Number(record.latitude) * rad) * Math.sin(dx / 2) ** 2));
};
const round = number => number == null ? null : Math.round(number * 1000) / 1000;
const countryByRegion = Object.fromEntries(catalog.map(row => [row.region, row.countryCode]));
const comparisons = sheet.map(row => {
  const candidates = catIndex.get(sheetKey(row)) || [];
  const item = candidates.length === 1 ? candidates[0] : null;
  const imageCandidates = photos.filter(photo => [photo.placeName, ...(photo.aliases || [])].some(name => norm(name) === norm(row.place_name)) && [photo.region, ...(photo.regionAliases || [])].some(region => norm(region) === norm(row.region)));
  const input = {id: row.place_id, name: row.place_name, region: row.region, countryCode: countryByRegion[row.region], address: row.address, latitude: row.latitude, longitude: row.longitude};
  const resolved = resolve(input);
  const sameIdPhoto = photoById.get(Number(row.place_id));
  const old = oldById.get(Number(row.place_id));
  const oldSame = (oldByKey.get(sheetKey(row)) || [])[0];
  const diffs = item ? ['address', 'latitude', 'longitude', 'description'].filter(field => field === 'description' ? String(row.current_description ?? '').trim() !== String(item.description ?? '').trim() : field === 'address' ? String(row.address ?? '').trim() !== String(item.address ?? '').trim() : Number(row[field]) !== Number(item[field])) : [];
  const reasons = [];
  if (!resolved) {
    if (!imageCandidates.length) reasons.push('NO_CURATED_PHOTO');
    if (sameIdPhoto && !imageCandidates.includes(sameIdPhoto)) reasons.push('PHOTO_ID_POINTS_TO_ANOTHER_PLACE');
    if (imageCandidates.length) {
      if (imageCandidates.every(photo => row.address && norm(row.address) !== norm(photo.address))) reasons.push('ADDRESS_MISMATCH');
      if (imageCandidates.every(photo => distance(row.latitude, row.longitude, photo) > .25)) reasons.push('COORDINATES_OVER_250M');
      if (imageCandidates.some(photo => photo.placeId != null && Number(photo.placeId) !== Number(row.place_id))) reasons.push('PHOTO_PLACE_ID_CHANGED');
    }
  }
  return {
    sheetRow: row.sheetRow, placeId: row.place_id, region: row.region, placeName: row.place_name,
    catalogMatched: !!item, catalogSourceRow: item?.sourceRow ?? null,
    catalogDifferences: diffs, sheetAddress: row.address, catalogAddress: item?.address ?? null,
    sheetLatitude: row.latitude, sheetLongitude: row.longitude,
    catalogLatitude: item?.latitude ?? null, catalogLongitude: item?.longitude ?? null,
    catalogDistanceKm: item ? round(distance(row.latitude, row.longitude, item)) : null,
    sheetDescription: row.current_description, catalogDescription: item?.description ?? null,
    sheetCategory: row.place_category, catalogPlaceType: item?.placeType ?? null, catalogTheme: item?.theme ?? null,
    oldLiveSameIdPlace: old?.name ?? null, oldLiveSameIdRegion: old?.region ?? null,
    oldLiveSameIdIdentityMatches: old ? catKey(old) === sheetKey(row) : null,
    oldLiveSamePlaceId: oldSame?.id ?? null,
    photoCandidates: imageCandidates.map(photo => ({placeId: photo.placeId, name: photo.placeName, region: photo.region, address: photo.address, distanceKm: round(distance(row.latitude, row.longitude, photo)), imageUrl: photo.imageUrl})),
    photoAvailableByName: imageCandidates.length > 0, photoResolvedWithSheet: !!resolved,
    resolvedImage: resolved?.imageUrl ?? null, photoBlockReasons: reasons,
    conflictingIdPhoto: sameIdPhoto && !imageCandidates.includes(sameIdPhoto) ? {placeId: sameIdPhoto.placeId, name: sameIdPhoto.placeName, region: sameIdPhoto.region} : null,
  };
});
const sqlFile = path.resolve(root, '../noman-go/src/main/resources/data/places_insert.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');
const sqlRows = sql.split(/\r?\n/).map(line => line.trim()).filter(line => line.startsWith("('")).map((line, i) => {
  let value = '', quoted = false; const values = [];
  for (let j = 1; j < line.lastIndexOf(')'); j++) {
    const c = line[j];
    if (c === "'") { if (quoted && line[j + 1] === "'") {value += "'"; j++;} else quoted = !quoted; }
    else if (c === ',' && !quoted) {values.push(value.trim()); value = '';}
    else value += c;
  }
  values.push(value.trim());
  if (values.length !== 8) throw Error('Unexpected SQL row ' + (i + 1));
  const [region, name, theme, description, address, latitude, longitude, placeType] = values;
  return {sourceRow: i + 1, region, name, theme, description, address, latitude: Number(latitude), longitude: Number(longitude), placeType};
});
const sqlIndex = index(sqlRows, catKey);
const currentSqlDifferences = sheet.map(row => {
  const candidates = sqlIndex.get(sheetKey(row)) || [];
  const item = candidates.length === 1 ? candidates[0] : null;
  return {sheetRow: row.sheetRow, name: row.place_name, region: row.region, matched: !!item,
    differences: item ? ['address', 'latitude', 'longitude', 'description'].filter(field => field === 'description' ? String(row.current_description ?? '').trim() !== String(item.description ?? '').trim() : field === 'address' ? String(row.address ?? '').trim() !== String(item.address ?? '').trim() : Number(row[field]) !== Number(item[field])) : [],
    distanceKm: item ? round(distance(row.latitude, row.longitude, item)) : null};
});
const fields = ['address','latitude','longitude','description'];
const allEqual = rows => rows.filter(row => row.catalogMatched && !row.catalogDifferences.length).length;
const duplicateKeys = map => [...map.entries()].filter(([, rows]) => rows.length > 1).map(([key, rows]) => ({key, rows: rows.map(row => row.sheetRow || row.sourceRow)}));
const byRegion = [...new Set(sheet.map(row => row.region))].map(region => {
  const records = comparisons.filter(row => row.region === region);
  return {region, sheetCount: records.length, photoCatalogCount: catalog.filter(row => row.region === region).length,
    nameMatches: records.filter(row => row.catalogMatched).length, allFieldsEqual: allEqual(records),
    withPhoto: records.filter(row => row.photoAvailableByName).length, photoResolvable: records.filter(row => row.photoResolvedWithSheet).length};
});
const missingFromCatalog = comparisons.filter(row => !row.catalogMatched);
const catalogOnly = catalog.filter(row => !sheetIndex.has(catKey(row)));
const summary = {
  checkedOn: '2026-10-20', sheet: {id: source.spreadsheetId, tab: '01_existing_places', records: sheet.length, uniqueIds: new Set(sheet.map(row => row.place_id)).size, duplicatePlaceKeys: duplicateKeys(sheetIndex), categories: [...new Set(sheet.map(row => row.place_category))], nonEmptyNewDescriptions: sheet.filter(row => row.new_description).length, hasImageColumn: header.some(h => /image|photo/i.test(h))},
  photoSourceCatalog: {records: catalog.length, exactRegionAndNameMatches: comparisons.filter(row => row.catalogMatched).length, missingFromCatalog: missingFromCatalog.map(row => ({sheetRow: row.sheetRow, region: row.region, name: row.placeName})), catalogOnly: catalogOnly.map(row => ({sourceRow: row.sourceRow, region: row.region, name: row.name})), allComparableFieldsEqual: allEqual(comparisons), fieldDifferenceCounts: Object.fromEntries(fields.map(field => [field, comparisons.filter(row => row.catalogDifferences.includes(field)).length])), coordinatesOver250m: comparisons.filter(row => row.catalogDistanceKm > .25).length},
  currentSql: {records: sqlRows.length, nameMatches: currentSqlDifferences.filter(row => row.matched).length, allFieldsEqual: currentSqlDifferences.filter(row => row.matched && !row.differences.length).length, fieldDifferenceCounts: Object.fromEntries(fields.map(field => [field, currentSqlDifferences.filter(row => row.differences.includes(field)).length])), sha256MatchesPhotoSource: crypto.createHash('sha256').update(sql).digest('hex') === catalogFile.sourceSha256},
  photoMapping: {records: photos.length, recordsWithOldLiveId: photos.filter(row => row.placeId != null).length, sheetPlacesWithPhotoByName: comparisons.filter(row => row.photoAvailableByName).length, sheetPlacesWithoutCuratedPhoto: comparisons.filter(row => !row.photoAvailableByName).length, actualResolverMatchesWithSheetFields: comparisons.filter(row => row.photoResolvedWithSheet).length, blockReasonCounts: Object.fromEntries([...new Set(comparisons.flatMap(row => row.photoBlockReasons))].map(reason => [reason, comparisons.filter(row => row.photoBlockReasons.includes(reason)).length]))},
  oldLiveSnapshot: {date: '2026-10-14', records: oldLive.length, sheetIdsOverlapping: comparisons.filter(row => row.oldLiveSameIdIdentityMatches !== null).length, overlappingIdsSameIdentity: comparisons.filter(row => row.oldLiveSameIdIdentityMatches === true).length, overlappingIdsDifferentIdentity: comparisons.filter(row => row.oldLiveSameIdIdentityMatches === false).length, samePlacesIgnoringId: comparisons.filter(row => row.oldLiveSamePlaceId != null).length},
  byRegion,
};
save('comparison.json', {summary, records: comparisons, currentSqlDifferences});
const csvFields = ['sheetRow','placeId','region','placeName','catalogMatched','catalogDifferences','catalogDistanceKm','photoAvailableByName','photoResolvedWithSheet','photoBlockReasons','oldLiveSamePlaceId','sheetAddress','catalogAddress'];
const quote = value => '"' + String(Array.isArray(value) ? value.join('; ') : value ?? '').replace(/"/g, '""') + '"';
fs.writeFileSync(path.join(__dirname, 'comparison.csv'), '\uFEFF' + [csvFields.join(','), ...comparisons.map(row => csvFields.map(field => quote(row[field])).join(','))].join('\r\n'));
console.log(JSON.stringify(summary, null, 2));
console.log('Largest coordinate differences', JSON.stringify(comparisons.filter(row => row.catalogMatched).sort((a,b) => b.catalogDistanceKm - a.catalogDistanceKm).slice(0,8).map(row => ({row:row.sheetRow,id:row.placeId,region:row.region,name:row.placeName,distanceKm:row.catalogDistanceKm}))));
console.log('ID collision examples', JSON.stringify(comparisons.filter(row => row.conflictingIdPhoto).slice(0,5).map(row => ({row:row.sheetRow,id:row.placeId,sheetName:row.placeName,photoName:row.conflictingIdPhoto.name}))));
