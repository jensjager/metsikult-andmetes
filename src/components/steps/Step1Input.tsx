"use client";

import { useState } from "react";
import { Search, FileText, Upload, AlertCircle, Loader2, HelpCircle } from "lucide-react";
import { useCalculator } from "@/lib/CalculatorContext";

export default function Step1Input() {
  const { state, setKatastritunnus, setApiData, setXmlData, nextStep } = useCalculator();
  const [kat, setKat] = useState(state.katastritunnus);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatKatastritunnus = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 5) formatted = digits.slice(0, 5) + ':' + digits.slice(5);
    if (digits.length > 8) formatted = formatted.slice(0, 9) + ':' + digits.slice(8);
    return formatted.slice(0, 14);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatKatastritunnus(e.target.value);
    setKat(formatted);
    if (error) setError(null);
  };

  const handleApiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValidFormat = /^\d{5}:\d{3}:\d{4}$/.test(kat);
    
    if (!kat.trim() || (!isValidFormat && kat.length > 0)) {
      setError("Katastritunnus peab olema formaadis 12345:001:0001");
      return;
    }

    setError(null);
    setIsLoading(true);
    setKatastritunnus(kat);

    try {
      const res = await fetch("/api/arvuta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ katastritunnus: kat }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Päring ebaõnnestus");

      setApiData(data);
      nextStep();
    } catch (err: any) {
      setError(err.message || "Midagi läks valesti andmete laadimisel.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");

        const eraldisedElements = xmlDoc.getElementsByTagName("eraldis");
        const kinnistuNrNode = xmlDoc.getElementsByTagName("kinnistuNr")[0] || xmlDoc.getElementsByTagName("katastritunnus")[0];
        const extractedKat = kinnistuNrNode ? kinnistuNrNode.textContent || "XML-Fail" : "XML-Fail";
        setKatastritunnus(extractedKat);

        const details = [];
        let totalPindala = 0;

        for (let i = 0; i < eraldisedElements.length; i++) {
          const eraldis = eraldisedElements[i];
          const nr = eraldis.getElementsByTagName("number")[0]?.textContent || eraldis.getElementsByTagName("eraldisId")[0]?.textContent || String(i + 1);
          const pindala = parseFloat(eraldis.getElementsByTagName("pindala")[0]?.textContent || "1.0");
          totalPindala += pindala;
          
          details.push({
            eraldisId: nr,
            pindala: pindala,
            value: pindala * 2500,
            note: "Loetud XML failist",
            meta: { Allikas: "XML Üleslaadimine" }
          });
        }

        const totalValue = details.reduce((sum, d) => sum + d.value, 0);

        const parsedData = {
          success: true,
          katastritunnus: extractedKat,
          eraldisteArv: details.length,
          totalValue: totalValue,
          currency: "EUR",
          details: details,
          warning: "Andmed loeti edukalt XML failist. Väärtused on hinnangulised."
        };

        setXmlData(parsedData);
        nextStep();
      } catch (err) {
        setError("Viga XML faili lugemisel. Kas see on õiges formaadis?");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col items-center w-full animate-in slide-in-from-right-4 duration-300">
      
      <div className="text-center mb-8 max-w-lg">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Vali sisestusmeetod</h2>
        <p className="text-slate-500 text-sm">Alustamiseks sisesta katastritunnus käsitsi või lae üles metsaregistri andmefail.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3 w-full max-w-3xl mb-6 shadow-sm">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        
        {/* Method 1: API */}
        <form onSubmit={handleApiSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col hover:border-emerald-400 hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-emerald-500 transition-colors duration-300"></div>
          
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-slate-50 rounded-lg text-slate-700 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
              <Search size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Metsaregistri Päring</h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">Otsepäring Maa-ameti andmebaasist</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 flex-grow justify-center mb-6">
            <div className="flex items-center justify-between">
              <label htmlFor="katastritunnus" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Katastritunnus
              </label>
              <a href="https://minu.kataster.ee" target="_blank" className="text-[11px] text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium transition-colors">
                <HelpCircle size={12} /> Leia enda oma
              </a>
            </div>
            <input
              id="katastritunnus" type="text" value={kat} onChange={handleInputChange}
              placeholder="12345:001:0001"
              className="w-full px-4 py-3 rounded-lg text-base font-mono tracking-wider border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-300 bg-slate-50 focus:bg-white"
            />
          </div>

          <button type="submit" disabled={isLoading} className="w-full py-3 rounded-lg font-semibold text-white bg-slate-900 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-300 mt-auto">
            {isLoading ? <><Loader2 className="animate-spin" size={18} /> Laadin...</> : "Päri andmed"}
          </button>
        </form>

        {/* Method 2: XML Upload */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col hover:border-emerald-400 hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-emerald-500 transition-colors duration-300"></div>
          
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-slate-50 rounded-lg text-slate-700 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
              <FileText size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Faili Laadimine</h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">Impordi metsaregister.xsd formaadis fail</p>
            </div>
          </div>

          <label className="relative flex-grow flex flex-col items-center justify-center w-full min-h-[140px] border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 transition-colors cursor-pointer group/upload mt-auto">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <Upload className="w-8 h-8 mb-3 text-slate-400 group-hover/upload:text-emerald-600 transition-colors" strokeWidth={1.5} />
              <p className="mb-1 text-sm text-slate-900"><span className="font-semibold">Klõpsa siia</span> faili valimiseks</p>
              <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium mt-1">.XML fail (max 10MB)</p>
            </div>
            <input type="file" className="hidden" accept=".xml" onChange={handleFileUpload} />
          </label>
        </div>

      </div>
    </div>
  );
}
