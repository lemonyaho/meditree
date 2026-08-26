"use client";

import { FormEvent, useState } from "react";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setMessage("비밀번호가 올바르지 않습니다.");
        return;
      }

      window.location.href = "/admin";
    } catch {
      setMessage("로그인 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6">
      <label
        htmlFor="admin-password"
        className="mb-2 block text-[14px] font-semibold"
      >
        비밀번호
      </label>

      <input
        id="admin-password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        className="min-h-[50px] w-full rounded-[12px] border border-[#dfe6e2] px-4 text-[15px] outline-none focus:border-[#168269]"
      />

      {message && (
        <p className="mt-2 text-[14px] text-[#a45b5b]">{message}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 min-h-[50px] w-full rounded-[12px] bg-[#075f4e] text-[15px] font-bold text-white disabled:opacity-50"
      >
        {submitting ? "확인 중..." : "로그인"}
      </button>
    </form>
  );
}
