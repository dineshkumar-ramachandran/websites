"use client";

export function LogoutButton() {
  return (
    <button
      type="button"
      className="block w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-ivory-300 hover:bg-plum-700"
      onClick={async () => {
        await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logout: true }) });
        window.location.href = "/admin/login";
      }}
    >
      Sign out
    </button>
  );
}
