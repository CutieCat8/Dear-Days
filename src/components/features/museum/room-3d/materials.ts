import { createContext, useContext } from "react";
import { DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, Vector2 } from "three";

import { PALETTE, ROOM } from "./config";
import { fabricTextures, floorTextures, leafTexture, plaidTexture, plasterNormal, rugTexture, woodTextures } from "./textures";

function fabric(color: string, seed: number, normalScale = 0.9) {
  const { map, normal } = fabricTextures(color, seed);
  return new MeshStandardMaterial({ map, normalMap: normal, normalScale: new Vector2(normalScale, normalScale), roughness: 0.95, metalness: 0 });
}

function wood(color: string, seed: number, roughness = 0.62) {
  const { map, normal } = woodTextures(color, seed);
  return new MeshStandardMaterial({ map, normalMap: normal, normalScale: new Vector2(0.45, 0.45), roughness, metalness: 0 });
}

export function createMaterials() {
  const floor = floorTextures(ROOM.halfX * 2 + ROOM.wallThickness, ROOM.halfZ * 2 + ROOM.wallThickness);
  const plaster = plasterNormal();
  const leafMap = leafTexture();
  const plaid = plaidTexture();

  const materials = {
    floorTop: new MeshStandardMaterial({ map: floor.map, bumpMap: floor.bump, bumpScale: 1.2, roughness: 0.55, metalness: 0 }),
    floorEdge: wood(PALETTE.oakDark, 3, 0.7),
    wall: new MeshStandardMaterial({ color: PALETTE.wall, normalMap: plaster, normalScale: new Vector2(0.5, 0.5), roughness: 0.94 }),
    wallCap: new MeshStandardMaterial({ color: "#f8f1df", roughness: 0.85 }),
    baseboard: new MeshStandardMaterial({ color: PALETTE.baseboard, roughness: 0.5 }),

    oakLight: wood(PALETTE.oakLight, 21),
    oakMid: wood(PALETTE.oakMid, 22),
    oakDark: wood(PALETTE.oakDark, 23),
    walnut: wood(PALETTE.walnut, 24, 0.55),
    frameWood: wood("#a8764a", 25, 0.5),
    frameWoodDark: wood("#7d5535", 26, 0.5),
    frameWoodGlow: new MeshStandardMaterial({ map: woodTextures("#c8924f", 27).map, roughness: 0.45, emissive: "#ffb95a", emissiveIntensity: 0.38 }),

    fabricSage: fabric(PALETTE.sage, 41),
    fabricSageDark: fabric(PALETTE.sageDark, 42),
    fabricSageLight: fabric(PALETTE.sageLight, 43),
    fabricCream: fabric("#eadfc6", 44),
    plaid: new MeshStandardMaterial({ map: plaid, roughness: 1 }),
    rug: new MeshStandardMaterial({ map: rugTexture(), roughness: 1, bumpScale: 0 }),

    ceramic: new MeshPhysicalMaterial({ color: PALETTE.ceramic, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    ceramicSage: new MeshPhysicalMaterial({ color: "#a9b8a0", roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
    terracotta: new MeshStandardMaterial({ color: "#c9906b", roughness: 0.85 }),
    stoneWhite: new MeshStandardMaterial({ color: "#e3dccd", roughness: 0.8 }),
    soil: new MeshStandardMaterial({ color: "#4a3626", roughness: 1 }),

    glass: new MeshPhysicalMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.05,
      roughness: 0.08,
      metalness: 0,
      specularIntensity: 0.25,
      envMapIntensity: 0.2,
      depthWrite: false,
    }),
    brass: new MeshStandardMaterial({ color: PALETTE.brass, metalness: 0.85, roughness: 0.35 }),
    paper: new MeshStandardMaterial({ color: "#f3ead6", roughness: 0.9 }),
    pageEdge: new MeshStandardMaterial({ color: "#efe4cb", roughness: 0.95 }),
    lampShade: new MeshStandardMaterial({
      color: "#f6e7c3",
      emissive: "#ffcf86",
      emissiveIntensity: 0.55,
      roughness: 0.9,
      side: DoubleSide,
    }),
    cameraBody: new MeshStandardMaterial({ color: "#35363a", roughness: 0.5, metalness: 0.3 }),
    cameraLens: new MeshPhysicalMaterial({ color: "#16181c", roughness: 0.1, metalness: 0.4, clearcoat: 1 }),
    leaves: PALETTE.leaf.map(
      (color) => new MeshStandardMaterial({ color, map: leafMap, roughness: 0.5, side: DoubleSide }),
    ),
  };

  return materials;
}

export type RoomMaterials = ReturnType<typeof createMaterials>;

export const MaterialsContext = createContext<RoomMaterials | null>(null);

export function useMaterials() {
  const materials = useContext(MaterialsContext);
  if (!materials) throw new Error("useMaterials must be used inside <MaterialsContext.Provider>");
  return materials;
}
