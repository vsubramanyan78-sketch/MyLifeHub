import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Dna,
  X,
  ShieldCheck,
  Thermometer,
  Zap,
  Activity,
  Layers,
  RefreshCw,
} from 'lucide-react';

interface NutritionScienceModalProps {
  ingredientName: string;
  onClose: () => void;
}

export const NutritionScienceModal: React.FC<NutritionScienceModalProps> = ({
  ingredientName,
  onClose,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBioData = async () => {
      setLoading(true);
      try {
        const resp = await fetch('/api/gemini/nutrition-science', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredientName }),
        });
        if (resp.ok) {
          const res = await resp.json();
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to get bioscience data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBioData();
  }, [ingredientName]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Dna className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Bioscience & Nutritional Chemistry
              </h3>
              <p className="text-[11px] text-slate-400">Ingredient: {ingredientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-xs text-slate-400">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
            <span>Analyzing molecular structure & nutritional chemistry...</span>
          </div>
        ) : data ? (
          <div className="space-y-4 mt-4 text-xs">
            {/* Macronutrients Grid */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                Macronutrient Density
              </span>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <span className="text-[10px] text-blue-400 font-bold block">Protein</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-xs mt-0.5 block">
                    {data.macronutrients?.protein || '—'}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] text-amber-400 font-bold block">Carbs</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-xs mt-0.5 block">
                    {data.macronutrients?.carbs || '—'}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[10px] text-rose-400 font-bold block">Lipids</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-xs mt-0.5 block">
                    {data.macronutrients?.fats || '—'}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400 font-bold block">Fiber</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-xs mt-0.5 block">
                    {data.macronutrients?.fiber || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Micronutrients & Bioactive Compounds */}
            {data.micronutrients?.length > 0 && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5 flex items-center space-x-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Key Micronutrients & Vitamins</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {data.micronutrients.map((m: string, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preservation Science */}
            {data.preservationScience && (
              <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/15 space-y-1">
                <span className="text-[10px] uppercase font-bold text-blue-500 tracking-wider flex items-center space-x-1">
                  <Thermometer className="w-3.5 h-3.5" />
                  <span>Biochemical Preservation Science</span>
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                  {data.preservationScience}
                </p>
              </div>
            )}

            {/* Biochemical Notes */}
            {data.biochemicalNotes && (
              <div className="p-3.5 rounded-2xl bg-purple-500/5 border border-purple-500/15 space-y-1">
                <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider flex items-center space-x-1">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Cellular & Phytochemical Impact</span>
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                  {data.biochemicalNotes}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            Could not retrieve bioscience data.
          </div>
        )}

        <div className="flex justify-end pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
