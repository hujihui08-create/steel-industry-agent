import { ReactNode } from "react";

export function Section({
  id,
  title,
  desc,
  children,
}: {
  id?: string;
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 border-t border-neutral-200 py-16">
      <div className="mb-8">
        <div className="text-xs tracking-[0.18em] text-neutral-400 uppercase mb-2">
          {id}
        </div>
        <h2 className="text-neutral-900">{title}</h2>
        {desc && <p className="mt-2 max-w-2xl text-neutral-500">{desc}</p>}
      </div>
      <div>{children}</div>
    </section>
  );
}

export function Block({
  label,
  children,
  className = "",
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <div className="mb-3 text-xs text-neutral-400">{label}</div>
      )}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        {children}
      </div>
    </div>
  );
}
