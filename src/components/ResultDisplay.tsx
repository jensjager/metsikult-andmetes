import { Info, TrendingUp, Map, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface ResultData {
  success: boolean;
  katastritunnus: string;
  eraldisteArv: number;
  totalValue: number;
  currency: string;
  warning?: string;
  bbox?: number[];
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
        <p className="text-primary-600 font-bold tracking-wider text-sm uppercase mb-2">Hinnanguline väärtus</p>
        <h3 className="text-5xl md:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-primary-900 to-primary-700">
          {formattedValue}
        </h3>
        <p className="text-primary-800/80 mt-3 text-sm">
          Katastritunnus: <span className="text-primary-900 font-bold">{data.katastritunnus}</span>
        </p>
      </div>

      {data.warning && (
        <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded-xl flex gap-3 mb-6 shadow-sm">
          <AlertTriangle size={20} className="text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800 leading-relaxed font-medium">{data.warning}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-primary-50 rounded-xl p-4 border border-primary-100 shadow-sm">
          <div className="flex items-center gap-2 text-primary-600 mb-1">
            <Map size={16} />
            <span className="text-xs uppercase font-bold tracking-wider">Eraldised</span>
          </div>
          <p className="text-2xl font-black text-primary-900">{data.eraldisteArv} tk</p>
        </div>
        <div className="bg-primary-50 rounded-xl p-4 border border-primary-100 shadow-sm">
          <div className="flex items-center gap-2 text-primary-600 mb-1">
            <TrendingUp size={16} />
            <span className="text-xs uppercase font-bold tracking-wider">Potentsiaal</span>
          </div>
          <p className="text-2xl font-black text-cta-600">Kõrge</p>
        </div>
      </div>

      <div>
        <h4 className="text-xl font-bold mb-4 border-b border-primary-100 pb-2 text-primary-900">Eraldiste detailid</h4>
        <div className="flex flex-col gap-3">
          {data.details.map((eraldis, idx) => {
            const isExpanded = expandedEraldis === eraldis.eraldisId;
            return (
              <div key={idx} className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-primary-300 shadow-md shadow-primary-900/5' : 'border-primary-100 shadow-sm hover:border-primary-300'}`}>
                <div 
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  onClick={() => setExpandedEraldis(isExpanded ? null : eraldis.eraldisId)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary-900 text-lg">Eraldis {eraldis.eraldisId}</span>
                      <span className="text-xs font-bold text-cta-700 bg-cta-100 border border-cta-200 px-2.5 py-1 rounded-full">
                        {eraldis.pindala.toFixed(2)} ha
                      </span>
                    </div>
                    {eraldis.note && (
                      <div className="flex flex-row items-start gap-1.5 mt-2 text-primary-600 text-sm font-medium">
                        <Info size={14} className="shrink-0 mt-0.5" />
                        <span>{eraldis.note}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/3">
                    <div className="font-mono text-primary-900 font-bold text-xl text-right">
                      {new Intl.NumberFormat("et-EE", { style: "currency", currency: data.currency, maximumFractionDigits: 0 }).format(eraldis.value)}
                    </div>
                    <div className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-primary-50 text-primary-900' : 'bg-transparent text-primary-400 hover:bg-primary-50 hover:text-primary-900'}`}>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Laiendatud detailid: Kuvame KÕIK parameetrid, mis on olemas */}
                {isExpanded && eraldis.meta && (
                  <div className="px-5 pb-5 pt-4 bg-primary-50/50 border-t border-primary-100">
                    <h5 className="text-primary-900 font-bold mb-4 flex items-center gap-2">
                      Kõik registriandmed
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-5 gap-x-4">
                      {Object.entries(eraldis.meta)
                        .filter(([key, val]) => val !== null && val !== undefined && val !== "" && key !== 'shape')
                        .map(([key, val]) => (
                        <div key={key} className="flex flex-col">
                          <span className="text-primary-500 text-[10px] uppercase font-bold tracking-wider mb-1 truncate" title={key.replace(/_/g, ' ')}>
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="font-semibold text-primary-900 text-sm break-words">
                            {typeof val === 'boolean' ? (val ? 'Jah' : 'Ei') : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Puuliikide tabel (kui on olemas) */}
                {isExpanded && eraldis.elemendid && eraldis.elemendid.length > 0 && (
                  <div className="px-5 pb-5 pt-0 bg-primary-50/50">
                    <h5 className="text-primary-900 font-bold mb-3 mt-4 flex items-center gap-2 border-t border-primary-100 pt-4">
                      Rinded ja puuliigid
                    </h5>
                    <div className="overflow-x-auto rounded-lg border border-primary-200">
                      <table className="w-full text-left text-sm text-primary-900">
                        <thead className="text-xs uppercase bg-primary-100 text-primary-700">
                          <tr>
                            <th className="px-3 py-3 font-bold">Rinne</th>
                            <th className="px-3 py-3 font-bold">Puuliik</th>
                            <th className="px-3 py-3 font-bold text-right">Vanus</th>
                            <th className="px-3 py-3 font-bold text-right">Kõrgus (m)</th>
                            <th className="px-3 py-3 font-bold text-right">Maht (tm/ha)</th>
                            <th className="px-3 py-3 font-bold text-right">Maht (tm)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eraldis.elemendid.map((el, i) => (
                            <tr key={i} className="border-b border-primary-100 last:border-0 hover:bg-primary-50 bg-white">
                              <td className="px-3 py-2.5 font-medium">{el.rinne_kood || '-'}</td>
                              <td className="px-3 py-2.5 font-bold text-primary-700">{el.puuliik_kood || '-'}</td>
                              <td className="px-3 py-2.5 text-right font-medium">{el.vanus}</td>
                              <td className="px-3 py-2.5 text-right font-medium">{el.korgus}</td>
                              <td className="px-3 py-2.5 text-right text-primary-600">{(el.tagavara || 0).toFixed(1)}</td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-primary-800">{(el.tagavara_absoluutne || 0).toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Arvestuslik sortimenteerimine (Lisa 5) */}
                {isExpanded && eraldis.sortimendid && Object.keys(eraldis.sortimendid).length > 0 && (
                  <div className="px-5 pb-5 pt-0 bg-primary-50/50">
                    <h5 className="text-primary-900 font-bold mb-3 mt-4 flex items-center gap-2 border-t border-primary-100 pt-4">
                      Arvestuslik sortimenteerimine (Lisa 5)
                    </h5>
                    
                    {Object.entries(eraldis.sortimendid).map(([liik, andmed]) => {
                      if (typeof andmed === 'number' || !andmed) return null;
                      return (
                      <div key={liik} className="mb-4 last:mb-0">
                        <div className="text-sm font-bold text-primary-900 mb-2 flex items-center justify-between">
                          <span>Puuliik: <span className="text-primary-600">{liik}</span></span>
                          <span className="text-primary-700 font-mono">{((andmed as any).value || 0).toLocaleString('et-EE', { style: 'currency', currency: 'EUR' })}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white p-3 rounded-lg border border-primary-100 shadow-sm text-center">
                            <div className="text-[10px] font-bold tracking-wider uppercase text-primary-500 mb-1">Palk</div>
                            <div className="font-mono font-bold text-primary-800">{(andmed as any).palk.toFixed(1)} tm</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-primary-100 shadow-sm text-center">
                            <div className="text-[10px] font-bold tracking-wider uppercase text-primary-500 mb-1">Peenpalk</div>
                            <div className="font-mono font-bold text-primary-800">{(andmed as any).peenpalk.toFixed(1)} tm</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-primary-100 shadow-sm text-center">
                            <div className="text-[10px] font-bold tracking-wider uppercase text-primary-500 mb-1">Paberipuit</div>
                            <div className="font-mono font-bold text-primary-800">{(andmed as any).paberipuit.toFixed(1)} tm</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-primary-100 shadow-sm text-center">
                            <div className="text-[10px] font-bold tracking-wider uppercase text-primary-500 mb-1">Küttepuit</div>
                            <div className="font-mono font-bold text-primary-800">{(andmed as any).kuttepuit.toFixed(1)} tm</div>
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

