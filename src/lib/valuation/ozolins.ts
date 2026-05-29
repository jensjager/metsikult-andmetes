import { OZOLINS_PARAMS, SPECIES_MAPPING } from './constants';

/**
 * R. Ozolinši tüvemoodustaja mudel ja selle kasutamine (Lisa 6)
 * Arvutab puu või selle osa (sortimendi) mahu, kasutades ametlikke polünoome.
 */
export function calculateAssortmentVolume(puuliik: string, h: number, d: number, alg: number, lop: number): number {
  const mappedLiik = SPECIES_MAPPING[puuliik] || "LV";
  const params = OZOLINS_PARAMS[mappedLiik] || OZOLINS_PARAMS["LV"];
  
  if (d < 8 || h < 5) return 0;

  const { a0, a1, a2, a3, a4, a5, a6, p, q, h0, d0 } = params;

  const abi1 = 1.3 / h;
  const abi2 = (((((a6 * abi1 + a5) * abi1 + a4) * abi1 + a3) * abi1 + a2) * abi1 + a1) * abi1 + a0;
  const abi3 = p * (h - h0) + q * (d - d0);
  const abi4 = 1 - 0.01 * abi3;
  const c1 = abi4 * a0;
  const c2 = abi4 * a1 / h;
  const c3 = (abi4 * a2 + abi3 * a0) / Math.pow(h, 2);
  const c4 = (abi4 * a3 + abi3 * a1) / Math.pow(h, 3);
  const c5 = (abi4 * a4 + abi3 * a2) / Math.pow(h, 4);
  const c6 = (abi4 * a5 + abi3 * a3) / Math.pow(h, 5);
  const c7 = (abi4 * a6 + abi3 * a4) / Math.pow(h, 6);
  const c8 = abi3 * a5 / Math.pow(h, 7);
  const c9 = abi3 * a6 / Math.pow(h, 8);
  
  const d1 = c1 * c1;
  const d2 = c1 * c2;
  const d3 = (c2 * c2 + 2 * c1 * c3) / 3;
  const d4 = (c1 * c4 + c2 * c3) / 2;
  const d5 = (c3 * c3 + 2 * c2 * c4 + 2 * c1 * c5) / 5;
  const d6 = (c1 * c6 + c2 * c5 + c3 * c4) / 3;
  const d7 = (c4 * c4 + 2 * c3 * c5 + 2 * c2 * c6 + 2 * c1 * c7) / 7;
  const d8 = (c1 * c8 + c2 * c7 + c3 * c6 + c4 * c5) / 4;
  const d9 = (c5 * c5 + 2 * c4 * c6 + 2 * c3 * c7 + 2 * c2 * c8 + 2 * c1 * c9) / 9;
  const d10 = (c2 * c9 + c3 * c8 + c4 * c7 + c5 * c6) / 5;
  const d11 = (c6 * c6 + 2 * c5 * c7 + 2 * c4 * c8 + 2 * c3 * c9) / 11;
  const d12 = (c4 * c9 + c5 * c8 + c6 * c7) / 6;
  const d13 = (c7 * c7 + 2 * c6 * c8 + 2 * c5 * c9) / 13;
  const d14 = (c6 * c9 + c7 * c8) / 7;
  const d15 = (c8 * c8 + 2 * c7 * c9) / 15;
  const d16 = c8 * c9 / 8;
  const d17 = (c9 * c9) / 17;

  const f = (x: number) => {
    return ((((((((((((((((d17 * x + d16) * x + d15) * x + d14) * x + d13) * x + d12) * x + d11) * x + d10) * x + d9) * x + d8) * x + d7) * x + d6) * x + d5) * x + d4) * x + d3) * x + d2) * x + d1) * x;
  };
  
  const abi5 = f(alg);
  const abi6 = f(lop);
  
  const v = (abi6 - abi5) * d * d * Math.PI / Math.pow((1 + (abi1 * abi1 - 0.01) * abi3) * abi2, 2) / 40000;
  return v;
}

/**
 * Arvutab terve puu mahu.
 */
export function calculateTotalTreeVolume(puuliik: string, h: number, d: number): number {
  if (d < 8 || h < 5) {
    return 0.000019 + 0.00001142 * Math.pow(d + 2, 2.61614) * Math.pow(h, 0.76489);
  }
  return calculateAssortmentVolume(puuliik, h, d, 0, h);
}
