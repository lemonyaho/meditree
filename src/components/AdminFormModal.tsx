"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

export type AdminFormField = {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
};

export default function AdminFormModal({
  open,
  title,
  description,
  fields,
  submitLabel = "확인",
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description?: string;
  fields: AdminFormField[];
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const resetKey = useMemo(
    () =>
      fields
        .map(
          (field) =>
            `${field.name}:${field.defaultValue ?? ""}`,
        )
        .join("|"),
    [fields],
  );

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;

    setValues(
      Object.fromEntries(
        fields.map((field) => [
          field.name,
          field.defaultValue ?? "",
        ]),
      ),
    );
  }, [open, resetKey]);

  if (!open) return null;

  function submit(event: FormEvent) {
    event.preventDefault();

    const invalid = fields.some(
      (field) =>
        field.required && !values[field.name]?.trim(),
    );

    if (invalid) return;

    onSubmit(values);
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/25 p-5 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="w-[min(460px,100%)] rounded-[20px] border bg-white p-5 shadow-[0_24px_70px_rgba(18,34,27,0.18)]"
      >
        <h2 className="text-[23px] font-semibold tracking-[-0.035em]">
          {title}
        </h2>

        {description && (
          <p className="mt-2 text-[14px] leading-6 text-[#7c8781]">
            {description}
          </p>
        )}

        <div className="mt-5 grid gap-4">
          {fields.map((field, index) => (
            <label key={field.name} className="grid gap-2">
              <span className="text-[13px] font-semibold text-[#5e6963]">
                {field.label}
              </span>

              <input
                autoFocus={index === 0}
                value={values[field.name] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field.name]: event.target.value,
                  }))
                }
                placeholder={field.placeholder}
                className="min-h-[48px] rounded-[11px] border bg-[#fbfcfb] px-3.5 text-[15px] outline-none focus:border-[#8ebda6]"
              />
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border px-4 py-2.5 text-[14px] text-[#68736d]"
          >
            취소
          </button>

          <button
            type="submit"
            className="rounded-[10px] bg-[#075f4e] px-5 py-2.5 text-[14px] font-bold text-white"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
