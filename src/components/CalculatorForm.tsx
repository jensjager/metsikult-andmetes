"use client";

import { useState, useRef, useEffect } from "react";
import { TreePine, Calculator, AlertCircle, Loader2, HelpCircle } from "lucide-react";
import ResultDisplay from "@/components/ResultDisplay";

// Skeleton Loader Component
function SkeletonLoader() {
  return (
    <div className="glass-panel p-8 rounded-2xl animate-pulse flex flex-col gap-6">
      <div className="text-center mb-4">
        <div className="h-4 bg-primary-100 rounded w-40 mx-auto mb-4"></div>
        <div className="h-16 bg-primary-100 rounded-xl w-64 mx-auto mb-4"></div>
        <div className="h-4 bg-primary-100 rounded w-48 mx-auto"></div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="h-24 bg-primary-50 rounded-xl"></div>
        <div className="h-24 bg-primary-50 rounded-xl"></div>
      </div>
      <div className="h-8 bg-primary-100 rounded w-48 mb-2"></div>
      <div className="h-20 bg-primary-50 rounded-xl mb-2"></div>
      <div className="h-20 bg-primary-50 rounded-xl"></div>
    </div>
  );
}

export default function CalculatorForm() {
  const [katastritunnus, setKatastritunnus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to results when data loads
  useEffect(() => {
    if (result && resultsRef.current) {
      // Add a slight delay to ensure rendering is complete
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [result]);

  const formatKatastritunnus = (value: string) => {
    // Eemalda kõik mittanumbrid
    const digits = value.replace(/\D/g, '');
    
    // Formateeri XXXXX:XXX:XXXX
    let formatted = digits;
    if (digits.length > 5) {
      formatted = digits.slice(0, 5) + ':' + digits.slice(5);
    }
    if (digits.length > 8) {
      formatted = formatted.slice(0, 9) + ':' + digits.slice(8);
    }
    
    return formatted.slice(0, 14); // Max pikkus 14 märki
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatKatastritunnus(e.target.value);
    setKatastritunnus(formatted);
    
    // Clear error if user starts typing again
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValidFormat = /^\d{5}:\d{3}:\d{4}$/.test(katastritunnus);
    
    if (!katastritunnus.trim()) {
      setError("Palun sisesta katastritunnus.");
      return;
    } else if (!isValidFormat && katastritunnus.length > 0) {
      setError("Katastritunnus peab olema formaadis 12345:001:0001");
      return;
    }

    setError(null);
    setResult(null);
    setIsLoading(true);

    // Scroll to the loading skeleton slightly down
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);

    try {
      const res = await fetch("/api/arvuta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ katastritunnus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Päring ebaõnnestus");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Midagi läks valesti andmete laadimisel.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-8 pb-12">
      <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-2xl flex flex-col gap-6 relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-primary-50 rounded-xl text-primary-600">
            <TreePine size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-primary-900">Hinda metsa väärtust</h2>
            <p className="text-primary-800/60 text-sm mt-1">Sisesta katastritunnus, et pärida Metsaregistrist andmed</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between ml-1">
            <label htmlFor="katastritunnus" className="text-sm font-bold text-primary-900">
              Katastritunnus
            </label>
            <a 
              href="https://minu.kataster.ee" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1 font-medium transition-colors"
              title="Otsi katastritunnust Maa-ameti geoportaalist"
            >
              <HelpCircle size={14} />
              Kust ma selle leian?
            </a>
          </div>
          <input
            id="katastritunnus"
            type="text"
            value={katastritunnus}
            onChange={handleInputChange}
            placeholder="12345:001:0001"
            className={`glass-input w-full px-5 py-4 rounded-xl text-xl font-mono tracking-wider placeholder:text-primary-800/30 transition-all ${error ? 'border-red-400 bg-red-50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]' : ''}`}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || (katastritunnus.length > 0 && katastritunnus.length < 14)}
          className="glass-button w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:pointer-events-none disabled:bg-primary-300"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={22} />
              Arvutan...
            </>
          ) : (
            <>
              <Calculator size={22} />
              Arvuta hind
            </>
          )}
        </button>
      </form>

      <div ref={resultsRef} className="scroll-mt-8">
        {isLoading && <SkeletonLoader />}
        {!isLoading && result && <ResultDisplay data={result} />}
      </div>
    </div>
  );
}
