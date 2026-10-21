import React from 'react';
import { Check } from 'lucide-react';

export default function Checkbox({ id, label, checked, onChange, className = '' }) {
    return (
        <label
            htmlFor={id}
            className={`flex items-start gap-2.5 cursor-pointer group select-none ${className}`}
        >
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="peer sr-only"
            />
            <span
                className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-150 peer-checked:bg-[#093c30] peer-checked:border-[#093c30] peer-focus-visible:ring-2 peer-focus-visible:ring-[#093c30]/30 ${
                    checked ? 'border-[#093c30] bg-[#093c30]' : 'border-slate-300 bg-white group-hover:border-slate-400'
                }`}
            >
                {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />}
            </span>
            {label && <span className="text-[13px] text-slate-600 leading-tight pt-px">{label}</span>}
        </label>
    );
}
