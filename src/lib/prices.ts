/**
 * Metsa puuliikide baashinnakiri (EUR / tm)
 * 
 * Siin saad mugavalt hallata erinevate puuliikide tihumeetri hinda.
 * Puuliikide koodid:
 * KU - Kuusk
 * MA - Mänd
 * KS - Kask
 * HB - Haab
 * LM - Sanglepp (Must lepp)
 * LV - Hall lepp
 * SA - Saar
 * TA - Tamm
 * 
 * Kui puuliiki ei leita nimekirjast, kasutatakse DEFAULT_PRICE väärtust.
 */

export const SPECIES_PRICES: Record<string, number> = {
  "MA": 65,  // Mänd
  "KU": 60,  // Kuusk
  "KS": 45,  // Kask
  "HB": 30,  // Haab
  "LM": 40,  // Must lepp
  "LV": 25,  // Hall lepp
  "SA": 70,  // Saar
  "TA": 90,  // Tamm
};

// Vaikimisi hind tihumeetri kohta, kui puuliiki pole hinnakirjas
export const DEFAULT_PRICE_PER_TM = 35;

// Vaikimisi baashind hektari kohta, kui tihumeetrid (tagavara) täielikult puuduvad
export const DEFAULT_PRICE_PER_HA = 3000;
