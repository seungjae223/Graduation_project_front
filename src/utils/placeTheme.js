// UI keys map to the current backend seed data; other theme values stay usable.
export const toApiTheme = theme => ({
  healing: "HEALING", activity: "ACTIVITY", food: "FOOD", photo: "PHOTO",
}[theme] || theme);
