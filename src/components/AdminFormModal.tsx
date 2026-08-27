"use client";

import { useEffect, useState } from "react";

export type ModalField = {
  key: string;
  label: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
};

export default function AdminFormModal({
  title,
  fields,
  confirmLabel = "확인",
  danger = false,
  onClose,
  onSubmit,
}: {
  title: string;
  fields: ModalField[];
  confirmLabel?: string;
  danger?: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.key, field.value ?? ""])),
  );

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/20 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true">
      <form
        className="w-[min(480px,100%)] rounded-[18px] border bg-white p-5 shadow-[0_22px_70px_rgba(20,38,30,0.18)]"
        onSubmit={(event) => {
          event.preventDefault();
          if (fields.some((field) => field.required && !values[field.key]?.trim())) return;
          onSubmit(values);
        }}
      >
        <h2 className="text-[20px] font-semibold tracking-[-0.025em]">{title}</h2>
        <div className="mt-5 grid gap-4">
          {fields.map((field) => (
            <label key={field.key} className="grid gap-1.5 text-[13px] font-semibold text-[#56635c]">
              {field.label}
              {field.multiline ? (
                <textarea
                  autoFocus={fields[0]?.key === field.key}
                  value={values[field.key] ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                  placeholder={field.placeholder}
                  className="min-h-[96px] resize-y rounded-[10px] border bg-white p-3 text-[15px] font-normal leading-6 text-[#17211d] outline-none focus:border-[#9fc9b8]"
                />
              ) : (
                <input
                  autoFocus={fields[0]?.key === field.key}
                  value={values[field.key] ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                  placeholder={field.placeholder}
                  className="h-11 rounded-[10px] border bg-white px-3 text-[15px] font-normal text-[#17211d] outline-none focus:border-[#9fc9b8]"
                />
              )}
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[10px] border bg-white px-4 py-2.5 text-[13px] font-semibold">취소</button>
          <button
            type="submit"
            className={`rounded-[10px] px-4 py-2.5 text-[13px] font-semibold text-white ${danger ? "bg-[#a65555]" : "bg-[#075f4e]"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
