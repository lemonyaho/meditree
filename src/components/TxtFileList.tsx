"use client";

import type { TxtFile } from "@/lib/txt-content";

export default function TxtFileList({
  title,
  files,
  selectedId,
  query,
  onQueryChange,
  onSelect,
  onAdd,
  getIndicator,
}: {
  title: string;
  files: TxtFile[];
  selectedId?: string;
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
  getIndicator?: (file: TxtFile) => {
    color: string;
    glow?: string;
    label?: string;
  } | null;
}) {
  const normalized = query.trim().toLowerCase();

  const visible = normalized
    ? files.filter((file) =>
        `${file.name} ${file.content}`.toLowerCase().includes(normalized),
      )
    : files;

  return (
    <aside className="min-w-0 self-start rounded-[18px] border bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <strong className="truncate text-[15px]">{title}</strong>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-[8px] border px-2.5 py-1.5 text-[13px] font-semibold text-[#168269]"
        >
          + TXT
        </button>
      </div>

      <div className="mb-3 flex min-h-[42px] items-center rounded-[10px] border bg-[#fafcfb] px-3">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="이 폴더에서 검색"
          className="w-full min-w-0 bg-transparent text-[13px] outline-none"
        />
      </div>

      <div className="grid gap-1">
        {visible.map((file) => {
          const active = file.id === selectedId;

          return (
            <button
              key={file.id}
              type="button"
              onClick={() => onSelect(file.id)}
              className={`flex min-h-[44px] min-w-0 items-center gap-2 rounded-[9px] px-3 text-left text-[14px] transition ${
                active
                  ? "bg-[#eaf4e8] font-semibold text-[#075f4e]"
                  : "text-[#56625b] hover:bg-[#f4f7f5]"
              }`}
            >
              {(() => {
                const indicator = getIndicator?.(file);

                if (!indicator) {
                  return (
                    <span className="shrink-0 text-[11px] font-bold text-[#9aa39e]">
                      TXT
                    </span>
                  );
                }

                return (
                  <span
                    className="h-[9px] w-[9px] shrink-0 rounded-full"
                    title={indicator.label}
                    style={{
                      background: indicator.color,
                      boxShadow: indicator.glow
                        ? `0 0 8px 2px ${indicator.glow}`
                        : undefined,
                    }}
                  />
                );
              })()}
              <span className="truncate">{file.name}</span>
            </button>
          );
        })}

        {visible.length === 0 && (
          <p className="px-3 py-5 text-center text-[13px] text-[#929b96]">
            비어있음
          </p>
        )}
      </div>
    </aside>
  );
}
