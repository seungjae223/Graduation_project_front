import searchToX from "react-useanimations/lib/searchToX";

const source = searchToX.animationData;

// Replay the beginning of Search/X and return to the magnifier before it closes.
const searchIcon = {
  animationData: {
    ...source,
    op: 14,
    assets: [{ id: "magnifier", layers: source.layers }],
    layers: [{
      ind: 1,
      ty: 0,
      refId: "magnifier",
      ip: 0,
      op: 14,
      ks: {
        a: { a: 0, k: [0, 0, 0] },
        p: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
        r: { a: 0, k: 0 },
        o: { a: 0, k: 100 },
      },
      tm: {
        a: 1,
        k: [{ t: 0, s: [0] }, { t: 6, s: [6 / source.fr] }, { t: 13, s: [0] }],
      },
    }],
  },
};

export default searchIcon;
