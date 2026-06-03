'use client';

interface Skill {
  icon: string;
  name: string;
  meta: string;
  uses: number;
  saved?: string;
}

interface SkillLibraryProps {
  title: string;
  items: Skill[];
  showSaved?: boolean;
}

export default function SkillLibrary({ title, items, showSaved = false }: SkillLibraryProps) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4.5">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3.5">{title}</h3>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2.5 py-2 border-b border-slate-800 last:border-b-0">
            <div className="text-lg min-w-fit">{item.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-200">{item.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{item.meta}</div>
            </div>
            <div className="text-right whitespace-nowrap">
              <div className="text-xs font-semibold text-indigo-400">{item.uses} lần dùng</div>
              {showSaved && item.saved && (
                <div className="text-xs text-emerald-400 font-semibold">⏱ {item.saved}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
