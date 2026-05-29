import { Info, TrendingUp, Map, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface ResultData {
  success: boolean;
  katastritunnus: string;
  eraldisteArv: number;
  totalValue: number;
  currency: string;
  warning?: string;
  details: {
    eraldisId: string;
    pindala: number;
    value: number;
    note?: string;
    meta?: {
      [key: string]: any;
    };
    elemendid?: any[];
    sortimendid?: {
      palk: number;
      peenpalk: number;
      paberipuit: number;
      kuttepuit: number;
    };
  }[];
}

export default function ResultDisplay({ data }: { data: ResultData }) {
  const [expandedEraldis, setExpandedEraldis] = useState<string | null>(null);

  // Formateerime summa ilusti komadega ja lisame valuuta
  const formattedValue = new Intl.NumberFormat("et-EE", {
    style: "currency",
    currency: data.currency,
    maximumFractionDigits: 0,
  }).format(data.totalValue);

  return (
    <div className="glass-panel p-8 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <p className="text-forest-400 font-semibold tracking-wider text-sm uppercase mb-2">Hinnanguline väärtus</p>
        <h3 className="text-5xl md:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-white/60">
          {formattedValue}
        </h3>
        <p className="text-white/60 mt-3 text-sm">
          Katastritunnus: <span className="text-white font-medium">{data.katastritunnus}</span>
        </p>
      </div>

      {data.warning && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 rounded-xl flex gap-3 mb-6">
          <AlertTriangle size={20} className="text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-200/90 leading-relaxed">{data.warning}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-white/50 mb-1">
            <Map size={16} />
            <span className="text-xs uppercase font-semibold tracking-wider">Eraldised</span>
          </div>
          <p className="text-2xl font-bold">{data.eraldisteArv} tk</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-white/50 mb-1">
            <TrendingUp size={16} />
            <span className="text-xs uppercase font-semibold tracking-wider">Potentsiaal</span>
          </div>
          <p className="text-2xl font-bold text-forest-400">Kõrge</p>
        </div>
      </div>

      <div>
        <h4 className="text-lg font-semibold mb-4 border-b border-white/10 pb-2">Eraldiste detailid</h4>
        {/* Eemaldatud max-h, et sisu ei läheks katki ja kõik mahuks ära. Laseme lehel endal scrollida. */}
        <div className="flex flex-col gap-3">
          {data.details.map((eraldis, idx) => {
            const isExpanded = expandedEraldis === eraldis.eraldisId;
            return (
              <div key={idx} className={`bg-white/5 rounded-xl border border-white/10 transition-all duration-300 overflow-hidden ${isExpanded ? 'shadow-lg shadow-black/20 bg-white/10' : 'hover:bg-white/10'}`}>
                <div 
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  onClick={() => setExpandedEraldis(isExpanded ? null : eraldis.eraldisId)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white text-lg">Eraldis {eraldis.eraldisId}</span>
                      <span className="text-xs font-semibold text-forest-200 bg-forest-500/20 border border-forest-500/30 px-2.5 py-1 rounded-full">
                        {eraldis.pindala.toFixed(2)} ha
                      </span>
                    </div>
                    {eraldis.note && (
                      <div className="flex flex-row items-start gap-1.5 mt-2 text-white/50 text-sm">
                        <Info size={14} className="shrink-0 mt-0.5" />
                        <span>{eraldis.note}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/3">
                    <div className="font-mono text-forest-400 font-bold text-xl text-right">
                      {new Intl.NumberFormat("et-EE", { style: "currency", currency: data.currency, maximumFractionDigits: 0 }).format(eraldis.value)}
                    </div>
                    <div className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-white/10 text-white' : 'bg-transparent text-white/40 hover:bg-white/5 hover:text-white'}`}>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Laiendatud detailid: Kuvame KÕIK parameetrid, mis on olemas */}
                {isExpanded && eraldis.meta && (
                  <div className="px-5 pb-5 pt-4 bg-black/40 border-t border-white/10">
                    <h5 className="text-white/80 font-semibold mb-4 flex items-center gap-2">
                      Kõik registriandmed
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-5 gap-x-4">
                      {Object.entries(eraldis.meta)
                        .filter(([key, val]) => val !== null && val !== undefined && val !== "" && key !== 'shape')
                        .map(([key, val]) => (
                        <div key={key} className="flex flex-col">
                          <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-1 truncate" title={key.replace(/_/g, ' ')}>
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="font-medium text-white/90 text-sm break-words">
                            {typeof val === 'boolean' ? (val ? 'Jah' : 'Ei') : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Puuliikide tabel (kui on olemas) */}
                {isExpanded && eraldis.elemendid && eraldis.elemendid.length > 0 && (
                  <div className="px-5 pb-5 pt-0 bg-black/40">
                    <h5 className="text-white/80 font-semibold mb-3 mt-4 flex items-center gap-2 border-t border-white/10 pt-4">
                      Rinded ja puuliigid
                    </h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-white/80">
                        <thead className="text-xs uppercase bg-white/5 text-white/50">
                          <tr>
                            <th className="px-3 py-2 rounded-l-lg">Rinne</th>
                            <th className="px-3 py-2">Puuliik</th>
                            <th className="px-3 py-2 text-right">Vanus</th>
                            <th className="px-3 py-2 text-right">Kõrgus (m)</th>
                            <th className="px-3 py-2 text-right">Maht (tm/ha)</th>
                            <th className="px-3 py-2 text-right rounded-r-lg">Maht (tm)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eraldis.elemendid.map((el, i) => (
                            <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                              <td className="px-3 py-2">{el.rinne_kood || '-'}</td>
                              <td className="px-3 py-2 font-bold text-forest-400">{el.puuliik_kood || '-'}</td>
                              <td className="px-3 py-2 text-right">{el.vanus}</td>
                              <td className="px-3 py-2 text-right">{el.korgus}</td>
                              <td className="px-3 py-2 text-right text-white/50">{(el.tagavara || 0).toFixed(1)}</td>
                              <td className="px-3 py-2 text-right font-mono text-forest-300">{(el.tagavara_absoluutne || 0).toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Arvestuslik sortimenteerimine (Lisa 5) */}
                {isExpanded && eraldis.sortimendid && Object.keys(eraldis.sortimendid).length > 0 && (
                  <div className="px-5 pb-5 pt-0 bg-black/40">
                    <h5 className="text-white/80 font-semibold mb-3 mt-4 flex items-center gap-2 border-t border-white/10 pt-4">
                      Arvestuslik sortimenteerimine (Lisa 5)
                    </h5>
                    
                    {Object.entries(eraldis.sortimendid).map(([liik, andmed]) => {
                      if (typeof andmed === 'number' || !andmed) return null; // Kaitse vana andmestruktuuri eest
                      return (
                      <div key={liik} className="mb-4 last:mb-0">
                        <div className="text-sm font-medium text-white mb-2 flex items-center justify-between">
                          <span>Puuliik: <span className="text-forest-300 font-bold">{liik}</span></span>
                          <span className="text-white/60">{((andmed as any).value || 0).toLocaleString('et-EE', { style: 'currency', currency: 'EUR' })}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white/5 p-3 rounded-lg border border-white/10 text-center">
                            <div className="text-[10px] font-bold tracking-wider uppercase text-white/40 mb-1">Palk</div>
                            <div className="font-mono font-bold text-forest-300">{(andmed as any).palk.toFixed(1)} tm</div>
                          </div>
                          <div className="bg-white/5 p-3 rounded-lg border border-white/10 text-center">
                            <div className="text-[10px] font-bold tracking-wider uppercase text-white/40 mb-1">Peenpalk</div>
                            <div className="font-mono font-bold text-forest-300">{(andmed as any).peenpalk.toFixed(1)} tm</div>
                          </div>
                          <div className="bg-white/5 p-3 rounded-lg border border-white/10 text-center">
                            <div className="text-[10px] font-bold tracking-wider uppercase text-white/40 mb-1">Paberipuit</div>
                            <div className="font-mono font-bold text-forest-300">{(andmed as any).paberipuit.toFixed(1)} tm</div>
                          </div>
                          <div className="bg-white/5 p-3 rounded-lg border border-white/10 text-center">
                            <div className="text-[10px] font-bold tracking-wider uppercase text-white/40 mb-1">Küttepuit</div>
                            <div className="font-mono font-bold text-forest-300">{(andmed as any).kuttepuit.toFixed(1)} tm</div>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
