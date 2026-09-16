import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const SavedPlacesContext = createContext(null);

const getPlaceId = (place) => place?.id ?? place?.placeId;

export const SavedPlacesProvider = ({ children }) => {
  const [savedPlaces, setSavedPlaces] = useState([]);

  const isSaved = useCallback(
    (id) => {
      if (id === null || id === undefined) return false;

      return savedPlaces.some(
        (place) => String(getPlaceId(place)) === String(id),
      );
    },
    [savedPlaces],
  );

  const addSavedPlace = useCallback((place) => {
    const placeId = getPlaceId(place);

    if (placeId === null || placeId === undefined) return;

    setSavedPlaces((prev) => {
      const exists = prev.some(
        (item) => String(getPlaceId(item)) === String(placeId),
      );

      if (exists) return prev;

      return [...prev, place];
    });
  }, []);

  const removeSavedPlace = useCallback((id) => {
    if (id === null || id === undefined) return;

    setSavedPlaces((prev) =>
      prev.filter((place) => String(getPlaceId(place)) !== String(id)),
    );
  }, []);

  const toggleSavedPlace = useCallback(
    (place) => {
      const placeId = getPlaceId(place);

      if (placeId === null || placeId === undefined) return;

      if (isSaved(placeId)) {
        removeSavedPlace(placeId);
        return;
      }

      addSavedPlace(place);
    },
    [isSaved, addSavedPlace, removeSavedPlace],
  );

  const clearSavedPlaces = useCallback(() => {
    setSavedPlaces([]);
  }, []);

  const value = useMemo(
    () => ({
      savedPlaces,
      isSaved,
      addSavedPlace,
      removeSavedPlace,
      toggleSavedPlace,
      clearSavedPlaces,
    }),
    [
      savedPlaces,
      isSaved,
      addSavedPlace,
      removeSavedPlace,
      toggleSavedPlace,
      clearSavedPlaces,
    ],
  );

  return (
    <SavedPlacesContext.Provider value={value}>
      {children}
    </SavedPlacesContext.Provider>
  );
};

export const useSavedPlaces = () => {
  const context = useContext(SavedPlacesContext);

  if (!context) {
    throw new Error("useSavedPlaces must be used within SavedPlacesProvider");
  }

  return context;
};