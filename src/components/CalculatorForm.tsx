"use client";

import { useState } from "react";
import { TreePine, Calculator, AlertCircle, Loader2 } from "lucide-react";
import ResultDisplay from "@/components/ResultDisplay";

export default function CalculatorForm() {
  const [katastritunnus, setKatastritunnus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!katastritunnus.trim()) {
      setError("Palun sisesta katastritunnus.");
      return;
    }

    setError(null);
    setResult(null);
    setIsLoading(true);

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
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-2xl flex flex-col gap-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-forest-600/20 rounded-xl text-forest-500">
            <TreePine size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Hinda metsa väärtust</h2>
            <p className="text-white/60 text-sm mt-1">Sisesta katastritunnus, et pärida Metsaregistrist andmed</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="katastritunnus" className="text-sm font-medium text-white/80 ml-1">
            Katastritunnus (nt. 21401:001:0123)
          </label>
          <input
            id="katastritunnus"
            type="text"
            value={katastritunnus}
            onChange={(e) => setKatastritunnus(e.target.value)}
            placeholder="Kujul: 12345:001:0001"
            className="glass-input w-full px-5 py-4 rounded-xl text-lg font-medium tracking-wide placeholder:text-white/20"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl flex items-center gap-3">
            <AlertCircle size={18} className="text-red-400 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="glass-button w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={22} />
              Arvutan väärtust...
            </>
          ) : (
            <>
              <Calculator size={22} />
              Arvuta hind
            </>
          )}
        </button>
      </form>

      {result && <ResultDisplay data={result} />}
    </div>
  );
}
