"use client";

export default function TxtEditor({
  pathLabel,
  fileName,
  content,
  onContentChange,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: {
  pathLabel: string;
  fileName: string;
  content: string;
  onContentChange: (value: string) => void;
  onRename: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  function downloadCurrentTxt() {
    const blob = new Blob([content], {
      type: "text/plain;charset=UTF-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fileName.toLowerCase().endsWith(".txt")
      ? fileName
      : `${fileName}.txt`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-[18px] border bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            {pathLabel
              .split("/")
              .slice(0, -1)
              .map((part, index) => (
                <span
                  key={`${part}-${index}`}
                  className="text-[13px] text-[#8b9590]"
                >
                  {part.trim()}
                  <span className="ml-2 text-[#bcc3bf]">/</span>
                </span>
              ))}

            <strong className="min-w-0 truncate text-[18px] font-semibold tracking-[-0.025em] text-[#17211d]">
              {fileName}
            </strong>
          </div>

          <p className="mt-1 truncate text-[11px] text-[#a0a8a3]">
            Export 파일명: {fileName}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {onMoveUp && (
            <button
              type="button"
              disabled={!canMoveUp}
              onClick={onMoveUp}
              className="rounded-[9px] border px-3 py-2 text-[13px] disabled:opacity-30"
              title="위로"
            >
              ↑
            </button>
          )}

          {onMoveDown && (
            <button
              type="button"
              disabled={!canMoveDown}
              onClick={onMoveDown}
              className="rounded-[9px] border px-3 py-2 text-[13px] disabled:opacity-30"
              title="아래로"
            >
              ↓
            </button>
          )}

          <button
            type="button"
            onClick={downloadCurrentTxt}
            className="rounded-[9px] border border-[#bed7c9] bg-[#eef7f0] px-3.5 py-2 text-[13px] font-bold text-[#075f4e]"
            title={`${fileName} 파일로 내보내기`}
          >
            Export TXT ↓
          </button>

          <button
            type="button"
            onClick={onRename}
            className="rounded-[9px] border px-3 py-2 text-[13px]"
          >
            이름 변경
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="rounded-[9px] border border-[#ead5d5] px-3 py-2 text-[13px] text-[#a15b5b]"
          >
            삭제
          </button>
        </div>
      </header>

      <textarea
        aria-label={`${fileName} 편집`}
        value={content}
        onChange={(event) => onContentChange(event.target.value)}
        spellCheck={false}
        className="block min-h-[620px] w-full max-w-full resize-y overflow-x-auto bg-[#fbfcfb] p-5 font-mono text-[15px] leading-7 outline-none"
      />
    </section>
  );
}
