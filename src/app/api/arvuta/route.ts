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

    // 3. Tagasta tulemus (ilma, et kasutaja näeks arvutuskäiku/valemeid)
    return NextResponse.json({
      success: true,
      katastritunnus,
      eraldisteArv: eraldised.length,
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
