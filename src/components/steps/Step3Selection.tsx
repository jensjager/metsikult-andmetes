"use client";

import { useCalculator } from "@/lib/CalculatorContext";
import { ArrowRight, ArrowLeft, CheckSquare, Square } from "lucide-react";

export default function Step3Selection() {
  const { state, setSelectedEraldised, nextStep, prevStep } = useCalculator();
  const data = state.apiData || state.xmlData;

  if (!data) return null;

  const toggleSelection = (id: string) => {
    if (state.selectedEraldised.includes(id)) {
      setSelectedEraldised(state.selectedEraldised.filter(x => x !== id));
    } else {
      setSelectedEraldised([...state.selectedEraldised, id]);
    }
  };

  const selectAll = () => {
    setSelectedEraldised(data.details.map(d => d.eraldisId));
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
            Vali kõik
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {data.details.map((eraldis) => {
            const isSelected = state.selectedEraldised.includes(eraldis.eraldisId);
            return (
              <div 
                key={eraldis.eraldisId}
                onClick={() => toggleSelection(eraldis.eraldisId)}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected ? 'bg-primary-50 border-cta-500 shadow-sm' : 'bg-white border-primary-100 hover:border-primary-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`text-${isSelected ? 'cta-500' : 'primary-300'}`}>
                    {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                  </div>
                  <div>
                    <span className="font-bold text-primary-900 text-lg">Eraldis {eraldis.eraldisId}</span>
                    <div className="text-sm font-medium text-primary-600">{eraldis.pindala.toFixed(2)} ha</div>
                  </div>
                </div>
                <div className="font-mono text-primary-900 font-bold text-lg">
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
