"use client";

import { useCalculator } from "@/lib/CalculatorContext";
import { ArrowRight, ArrowLeft, TrendingDown } from "lucide-react";

export default function Step5Costs() {
  const { nextStep, prevStep } = useCalculator();

  return (
    <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
      <div className="glass-panel p-8 rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary-50 rounded-xl text-primary-600">
            <TrendingDown size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary-900">Kulude arvutamine</h2>
            <p className="text-primary-600 text-sm mt-1">Määra raie- ja transpordikulud</p>
          </div>
        </div>

        <div className="bg-amber-light border border-amber-200 text-amber-800 p-6 rounded-xl text-center">
          <p className="font-medium">See funktsionaalsus on hetkel arenduses. Raiekulude kalkulatsioon lisatakse hiljem.</p>
        </div>
      </div>

      <div className="flex justify-between mt-4">
        <button onClick={prevStep} className="px-6 py-3 rounded-xl font-bold text-primary-700 bg-primary-100 hover:bg-primary-200 flex items-center gap-2 transition-colors">
          <ArrowLeft size={18} /> Tagasi
        </button>
        <button onClick={nextStep} className="glass-button px-8 py-3 rounded-xl font-bold flex items-center gap-2">
          Vaata Lõpptulemust <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
