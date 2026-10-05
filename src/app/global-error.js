"use client";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body className="grid min-h-screen place-items-center bg-slate-950 p-6 text-center text-white">
        <main>
          <h1 className="text-2xl font-bold">WMS is temporarily unavailable</h1>
          <p className="mt-2 text-slate-300">Please try loading the page again.</p>
          <button type="button" onClick={reset} className="mt-5 rounded-lg bg-blue-700 px-4 py-2 font-semibold hover:bg-blue-600">Try again</button>
        </main>
      </body>
    </html>
  );
}
