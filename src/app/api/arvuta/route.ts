import { NextResponse } from 'next/server';
import { getEraldisedByKatastritunnus, getEraldisElemendid } from '@/lib/metsaregister';
import { calculateForestValue } from '@/lib/calculator';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { katastritunnus } = body;

    if (!katastritunnus || typeof katastritunnus !== 'string') {
      return NextResponse.json(
        { error: 'Katastritunnus on nõutud ja peab olema tekst formaadis (nt "21401:001:0123")' },
        { status: 400 }
      );
    }

    // 1. Päri eraldised
    const eraldised = await getEraldisedByKatastritunnus(katastritunnus);

    if (!eraldised || eraldised.length === 0) {
      return NextResponse.json(
        { error: 'Selle katastritunnusega ei leitud Metsaregistrist ühtegi eraldist.' },
        { status: 404 }
      );
    }

    // 2. Päri eraldiste elemendid (puuliigid) ühe masspäringuga
    const eraldisIds = eraldised.map(e => e.properties.id).filter(id => id !== undefined);
    if (eraldisIds.length > 0) {
      const elemendid = await getEraldisElemendid(eraldisIds);
      // Seo elemendid vastava eraldisega
      for (const eraldis of eraldised) {
        eraldis.elemendid = elemendid.filter(el => el.properties.eraldis_id === eraldis.properties.id);
      }
    }

    // 3. Arvuta hind
    const calculation = calculateForestValue(eraldised);

    // 4. Arvuta BBOX (katastritunnuse ulatus) kaardi kuvamiseks
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const eraldis of eraldised) {
      if (eraldis.geometry && eraldis.geometry.coordinates) {
        const extractPoints = (coords: any[]) => {
          if (typeof coords[0] === 'number') {
            const [x, y] = coords;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          } else {
            for (const c of coords) extractPoints(c);
          }
        };
        extractPoints(eraldis.geometry.coordinates);
      }
    }
    
    let bbox = null;
    if (minX !== Infinity) {
      const width = Math.max(maxX - minX, 10);
      const height = Math.max(maxY - minY, 10);
      
      const cx = minX + width / 2;
      const cy = minY + height / 2;
      
      // Enforce the exact aspect ratio of our map container (1000 / 600)
      const targetAspect = 1000 / 600;
      const currentAspect = width / height;
      
      let targetW = width;
      let targetH = height;
      
      if (currentAspect > targetAspect) {
         // Current box is wider than target aspect, expand height
         targetH = targetW / targetAspect;
      } else {
         // Current box is taller than target aspect, expand width
         targetW = targetH * targetAspect;
      }
      
      // Add a 50% buffer around the padded box to ensure no corners are cropped
      const bufferW = targetW * 0.5;
      const bufferH = targetH * 0.5;
      
      const finalW = Math.max(targetW + bufferW, 200);
      const finalH = Math.max(targetH + bufferH, 120);
      
      bbox = [cx - finalW/2, cy - finalH/2, cx + finalW/2, cy + finalH/2];
    }

    // 5. Tagasta tulemus
    return NextResponse.json({
      success: true,
      katastritunnus,
      eraldisteArv: eraldised.length,
      bbox,
      ...calculation
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Serveri viga andmete töötlemisel' },
      { status: 500 }
    );
  }
}
