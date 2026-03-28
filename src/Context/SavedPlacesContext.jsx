import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const SavedPlacesContext = createContext(null);

export const SavedPlacesProvider = ({ children }) => {
  const [savedPlaces, setSavedPlaces] = useState(() => {
    const stored = localStorage.getItem("savedPlaces");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem("savedPlaces", JSON.stringify(savedPlaces));
  }, [savedPlaces]);

  const isSaved = (id) => savedPlaces.some((place) => place.id === id);

  const toggleSavedPlace = (place) => {
    setSavedPlaces((prev) => {
      const exists = prev.some((item) => item.id === place.id);
      if (exists) {
        return prev.filter((item) => item.id !== place.id);
      }
      return [...prev, place];
    });
  };

  const clearSavedPlaces = () => {
    setSavedPlaces([]);
  };

  const value = useMemo(
    () => ({
      savedPlaces,
      isSaved,
      toggleSavedPlace,
      clearSavedPlaces,
    }),
    [savedPlaces]
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