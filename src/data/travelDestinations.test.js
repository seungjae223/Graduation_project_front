import {
  COUNTRY_REGIONS,
  TRAVEL_DESTINATIONS,
  findTravelDestinationByRegion,
  getCountryRegion,
  getTravelDestination,
  getTravelDestinationContext,
  getTravelDestinationsByCountryRegion,
} from "./travelDestinations";

describe("travel destination catalog", () => {
  test("keeps destination ids and backend region values unique", () => {
    expect(new Set(COUNTRY_REGIONS.map(item => item.id)).size).toBe(COUNTRY_REGIONS.length);
    expect(new Set(TRAVEL_DESTINATIONS.map(item => item.id)).size).toBe(TRAVEL_DESTINATIONS.length);

    const regionValues = TRAVEL_DESTINATIONS.flatMap(item => item.regionValues);
    expect(new Set(regionValues).size).toBe(regionValues.length);
  });

  test("maps current backend regions to destination context", () => {
    const tokyo = findTravelDestinationByRegion("도쿄");

    expect(tokyo).toEqual(expect.objectContaining({
      id: "tokyo",
      name: "도쿄",
      countryRegionId: "japan",
    }));
    expect(getTravelDestinationContext(tokyo)?.countryRegion).toEqual(
      expect.objectContaining({ id: "japan", name: "일본", scope: "overseas" })
    );
  });

  test("treats Hong Kong as a country/region grouping instead of forcing a country label", () => {
    const hongKong = getTravelDestination("hong-kong");

    expect(getCountryRegion(hongKong.countryRegionId)).toEqual(
      expect.objectContaining({ name: "홍콩", scope: "overseas" })
    );
    expect(hongKong.regionValues).toEqual(["홍콩"]);
  });

  test("supports country/region -> destination navigation", () => {
    expect(getTravelDestinationsByCountryRegion("korea").map(item => item.name)).toEqual(
      expect.arrayContaining(["서울", "부산", "제주", "경주"])
    );
    expect(getTravelDestinationsByCountryRegion("japan").map(item => item.name)).toEqual(
      expect.arrayContaining(["도쿄", "오사카"])
    );
  });
});
