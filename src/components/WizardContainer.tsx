"use client";

import { useCalculator } from "@/lib/CalculatorContext";
import Step1Input from "./steps/Step1Input";
import Step2Overview from "./steps/Step2Overview";
import Step3Selection from "./steps/Step3Selection";
import Step4Storage from "./steps/Step4Storage";
import Step5Costs from "./steps/Step5Costs";
import Step6Results from "./steps/Step6Results";
import { Check } from "lucide-react";

export default function WizardContainer() {
	const { state } = useCalculator();

	const steps = [
		{ id: 1, title: "Sisend" },
		{ id: 2, title: "Ülevaade" },
		{ id: 3, title: "Eraldised" },
		{ id: 4, title: "Ladustamine" },
		{ id: 5, title: "Kulud" },
		{ id: 6, title: "Tulemused" },
	];

	return (
		<div className="w-full max-w-4xl mx-auto flex flex-col gap-8 pb-12 relative z-10">
			{/* Progress Bar */}
			<div className="glass-panel p-6 rounded-2xl mb-4 bg-white/80 backdrop-blur-sm">
				<div className="flex items-center justify-between">
					{steps.map((step, idx) => {
						const isActive = state.currentStep === step.id;
						const isCompleted = state.currentStep > step.id;

						return (
							<div
								key={step.id}
								className="flex flex-col items-center gap-2 relative flex-1"
							>
								<div className="flex items-center w-full justify-center">
									<div
										className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm z-10 transition-colors ${
											isActive
												? "bg-primary-800 text-white shadow-sm ring-4 ring-primary-50"
												: isCompleted
													? "bg-emerald-500 text-white"
													: "bg-slate-100 text-slate-400"
										}`}
									>
										{isCompleted ? <Check size={18} /> : step.id}
									</div>
									{/* Connecting Line */}
									{idx < steps.length - 1 && (
										<div className="absolute top-5 left-[50%] w-full h-[2px] bg-slate-100 -z-0">
											<div
												className={`h-full transition-all duration-500 ${isCompleted ? "bg-emerald-500 w-full" : "w-0"}`}
											/>
										</div>
									)}
								</div>
								<span
									className={`text-[11px] font-bold uppercase tracking-wider hidden md:block ${isActive ? "text-primary-900" : isCompleted ? "text-emerald-600" : "text-slate-400"}`}
								>
									{step.title}
								</span>
							</div>
						);
					})}
				</div>
			</div>

			{/* Step Content */}
			<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
				{state.currentStep === 1 && <Step1Input />}
				{state.currentStep === 2 && <Step2Overview />}
				{state.currentStep === 3 && <Step3Selection />}
				{state.currentStep === 4 && <Step4Storage />}
				{state.currentStep === 5 && <Step5Costs />}
				{state.currentStep === 6 && <Step6Results />}
			</div>
		</div>
	);
}
