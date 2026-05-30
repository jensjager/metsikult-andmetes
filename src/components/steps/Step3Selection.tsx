"use client";

import { useCalculator } from "@/lib/CalculatorContext";
import { ArrowRight, ArrowLeft, CheckSquare, Square } from "lucide-react";
import { useEffect } from "react";

export default function Step3Selection() {
  const { state, setSelectedEraldised, nextStep, prevStep } = useCalculator();
  const data = state.apiData || state.xmlData;

  const checkRaieStatus = (stand: any) => {
    const m = stand.meta || {};
    const arenguklass = (m.arengukl_kood || m.arenguklass || "").toLowerCase().trim();
    const vanus = parseInt(m.keskm_vanus || m.vanus || "0", 10);
    
    // Fetch official raievanus directly from the API or XML
    const raievanus = parseInt(m.raievanus || m.kk_raievanus || m.kkraievanus || m.kaalutud_raievanus || m.keskm_raievanus || m.keskmRaievanus || "0", 10);

    if (raievanus <= 0) {
      return {
        lubatud: false,
        viga: true,
        pohjus: "Metsaregistrist puudub ametlik raievanus!",
        raievanus: 0,
        vanus
      };
    }

    const isKups = arenguklass.includes("küps") || arenguklass.includes("kups") || arenguklass === "kü" || arenguklass === "ku";

    if (isKups) {
      return {
        lubatud: true,
        pohjus: "LUBATUD (Küps mets)",
        raievanus,
        vanus
      };
    }

    if (vanus >= raievanus) {
      return {
        lubatud: true,
        pohjus: `LUBATUD (Vanus ${vanus} a >= raievanus ${raievanus} a)`,
        raievanus,
        vanus
      };
    }

    return {
      lubatud: false,
      pohjus: `Raievanus ${raievanus} a, praegu ${vanus} a`,
      raievanus,
      vanus
    };
  };

  // Filter out non-allowed selections automatically if they are somehow loaded from state
  useEffect(() => {
    if (data && data.details) {
      const lubatudSelected = state.selectedEraldised.filter(id => {
        const eraldis = data.details.find(d => d.eraldisId === id);
        return eraldis ? checkRaieStatus(eraldis).lubatud : false;
      });
      if (lubatudSelected.length !== state.selectedEraldised.length) {
        setSelectedEraldised(lubatudSelected);
      }
    }
  }, [data, state.selectedEraldised, setSelectedEraldised]);

  if (!data) return null;

  const toggleSelection = (id: string) => {
    const eraldis = data.details.find(d => d.eraldisId === id);
    if (eraldis && !checkRaieStatus(eraldis).lubatud) {
      return; // Do not toggle if felling is prohibited
    }

    if (state.selectedEraldised.includes(id)) {
      setSelectedEraldised(state.selectedEraldised.filter(x => x !== id));
    } else {
      setSelectedEraldised([...state.selectedEraldised, id]);
    }
  };

  const selectAll = () => {
    const lubatudIds = data.details
      .filter(d => checkRaieStatus(d).lubatud)
      .map(d => d.eraldisId);
    setSelectedEraldised(lubatudIds);
  };

  return (
    <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
      <div className="glass-panel p-8 rounded-2xl">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-primary-900">Eraldiste valik</h2>
            <p className="text-primary-600 text-sm mt-1">Vali eraldised, mida soovid raiuda</p>
          </div>
          <button onClick={selectAll} className="text-sm font-bold text-cta-600 hover:text-cta-700 underline">
            Vali kõik lubatud
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {data.details.map((eraldis) => {
            const isSelected = state.selectedEraldised.includes(eraldis.eraldisId);
            const statusInfo = checkRaieStatus(eraldis);
            const isLubatud = statusInfo.lubatud;

            return (
              <div 
                key={eraldis.eraldisId}
                onClick={() => isLubatud && toggleSelection(eraldis.eraldisId)}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  !isLubatud 
                    ? 'opacity-65 cursor-not-allowed select-none bg-slate-50/80 border-slate-200' 
                    : isSelected 
                      ? 'bg-primary-50 border-cta-500 shadow-sm' 
                      : 'bg-white border-primary-100 hover:border-primary-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`text-${!isLubatud ? 'primary-200' : isSelected ? 'cta-500' : 'primary-300'}`}>
                    {isSelected && isLubatud ? <CheckSquare size={24} /> : <Square size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary-900 text-lg">Eraldis {eraldis.eraldisId}</span>
                      {!isLubatud && (
                        <span 
                          className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-red-50 text-red-600 border border-red-200 rounded shrink-0 animate-pulse"
                          title={statusInfo.pohjus}
                        >
                          Raie keelatud
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-primary-600">
                      {eraldis.pindala.toFixed(2)} ha
                      {!isLubatud && (
                        <span className="ml-2 text-red-500 font-semibold text-xs">({statusInfo.pohjus})</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className={`font-mono font-bold text-lg ${!isLubatud ? 'text-primary-400 line-through decoration-red-300' : 'text-primary-900'}`}>
                  {new Intl.NumberFormat("et-EE", { style: "currency", currency: data.currency || "EUR", maximumFractionDigits: 0 }).format(eraldis.value)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between mt-4">
        <button onClick={prevStep} className="px-6 py-3 rounded-xl font-bold text-primary-700 bg-primary-100 hover:bg-primary-200 flex items-center gap-2 transition-colors">
          <ArrowLeft size={18} /> Tagasi
        </button>
        <button 
          onClick={nextStep} 
          disabled={state.selectedEraldised.length === 0}
          className="glass-button px-8 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:bg-primary-300"
        >
          Määra Ladustamine <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
