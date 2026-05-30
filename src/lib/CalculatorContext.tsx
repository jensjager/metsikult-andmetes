"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ResultData {
  success: boolean;
  katastritunnus: string;
  eraldisteArv: number;
  totalValue: number;
  originalTotalValue?: number;
  avertedLoss?: number;
  satelliteAudited?: boolean;
  currency: string;
  warning?: string;
  bbox?: number[];
  details: any[];
}

interface CalculatorState {
  currentStep: number;
  katastritunnus: string;
  xmlData: ResultData | null;
  apiData: ResultData | null;
  selectedEraldised: Record<string, 'LR' | 'HR' | 'X'>;
  storageLocation: any;
  costs: any;
  satelliteAuditPeriod: 'registry' | 'active';
  realSatData: Record<string, { status: 'HEALTHY' | 'THINNED' | 'CLEARCUT' | 'UNKNOWN'; ndvi: number | null; ndpi: number | null } | null>;
}

interface CalculatorContextType {
  state: CalculatorState;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setKatastritunnus: (val: string) => void;
  setApiData: (data: ResultData | null) => void;
  setXmlData: (data: ResultData | null) => void;
  setSelectedEraldised: (ids: Record<string, 'LR' | 'HR' | 'X'>) => void;
  setStorageLocation: (loc: any) => void;
  setCosts: (costs: any) => void;
  setSatelliteAuditPeriod: (period: 'registry' | 'active') => void;
  setRealSatData: (data: Record<string, { status: 'HEALTHY' | 'THINNED' | 'CLEARCUT' | 'UNKNOWN'; ndvi: number | null; ndpi: number | null } | null>) => void;
  reset: () => void;
}

const defaultState: CalculatorState = {
  currentStep: 1,
  katastritunnus: "",
  xmlData: null,
  apiData: null,
  selectedEraldised: {},
  storageLocation: null,
  costs: null,
  satelliteAuditPeriod: 'registry', // default is 'registry' to avoid mock changes, user requested lowkey UI instead
  realSatData: {},
};

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CalculatorState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("calculatorState");
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("calculatorState", JSON.stringify(state));
    }
  }, [state, isLoaded]);

  const updateState = (updates: Partial<CalculatorState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const setStep = (step: number) => updateState({ currentStep: step });
  const nextStep = () => updateState({ currentStep: Math.min(5, state.currentStep + 1) });
  const prevStep = () => updateState({ currentStep: Math.max(1, state.currentStep - 1) });
  
  const setKatastritunnus = (val: string) => updateState({ katastritunnus: val });
  const setApiData = (data: ResultData | null) => updateState({ apiData: data, xmlData: null });
  const setXmlData = (data: ResultData | null) => updateState({ xmlData: data, apiData: null, katastritunnus: data ? data.katastritunnus : state.katastritunnus });
  const setSelectedEraldised = (ids: Record<string, 'LR' | 'HR' | 'X'>) => updateState({ selectedEraldised: ids });
  const setStorageLocation = (loc: any) => updateState({ storageLocation: loc });
  const setCosts = (costs: any) => updateState({ costs });
  const setSatelliteAuditPeriod = (period: 'registry' | 'active') => updateState({ satelliteAuditPeriod: period });
  const setRealSatData = (data: Record<string, { status: 'HEALTHY' | 'THINNED' | 'CLEARCUT' | 'UNKNOWN'; ndvi: number | null; ndpi: number | null } | null>) => updateState({ realSatData: data });

  const reset = () => {
    setState(defaultState);
    localStorage.removeItem("calculatorState");
  };

  return (
    <CalculatorContext.Provider
      value={{
        state,
        setStep,
        nextStep,
        prevStep,
        setKatastritunnus,
        setApiData,
        setXmlData,
        setSelectedEraldised,
        setStorageLocation,
        setCosts,
        setSatelliteAuditPeriod,
        setRealSatData,
        reset,
      }}
    >
      {children}
    </CalculatorContext.Provider>
  );
}

export function useCalculator() {
  const context = useContext(CalculatorContext);
  if (context === undefined) {
    throw new Error("useCalculator must be used within a CalculatorProvider");
  }
  return context;
}
