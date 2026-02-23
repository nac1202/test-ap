"use client";

import { clsx } from "clsx";

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
    ariaLabel?: string;
}

export function Switch({ checked, onChange, className, ariaLabel }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            onClick={() => onChange(!checked)}
            className={clsx(
                "relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2",
                checked ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-slate-200 dark:bg-slate-700",
                className
            )}
        >
            <span className="sr-only">{ariaLabel || "設定を切り替える"}</span>
            <span
                aria-hidden="true"
                className={clsx(
                    "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out",
                    checked ? "translate-x-7" : "translate-x-0"
                )}
            />
        </button>
    );
}
