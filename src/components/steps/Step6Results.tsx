"use client";

import { useCalculator } from "@/lib/CalculatorContext";
import { ArrowLeft, RefreshCw, BarChart } from "lucide-react";
import ResultDisplay from "../ResultDisplay";

export default function Step6Results() {
  const { state, prevStep, reset } = useCalculator();
  const data = state.apiData || state.xmlData;

  if (!data) return null;

  // Filter data based on selected eraldised
  const filteredDetails = data.details.filter(d => state.selectedEraldised.includes(d.eraldisId));
  const filteredTotal = filteredDetails.reduce((sum, d) => sum + d.value, 0);

  const filteredData = {
    ...data,
    eraldisteArv: filteredDetails.length,
    totalValue: filteredTotal,
    details: filteredDetails
  };

  return (
    <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-cta-100 rounded-xl text-cta-600">
          <BarChart size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-primary-900">Lõpptulemus</h2>
          <p className="text-primary-600 text-sm mt-1">Sinu valitud eraldiste puhasväärtus (ilma kuludeta)</p>
        </div>
      </div>

      <ResultDisplay data={filteredData} />

      <div className="flex justify-between mt-4">
        <button onClick={prevStep} className="px-6 py-3 rounded-xl font-bold text-primary-700 bg-primary-100 hover:bg-primary-200 flex items-center gap-2 transition-colors">
          <ArrowLeft size={18} /> Tagasi
        </button>
        <button onClick={reset} className="px-8 py-3 rounded-xl font-bold text-primary-900 bg-primary-100 hover:bg-primary-200 flex items-center gap-2 transition-colors">
          <RefreshCw size={18} /> Alusta Uuesti
        </button>
      </div>
    </div>
  );
}
