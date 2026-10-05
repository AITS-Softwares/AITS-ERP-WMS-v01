export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-center text-white">
      <div>
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-slate-300">This page is not part of the WMS workspace.</p>
        <a href="/wms" className="mt-5 inline-block rounded-lg bg-blue-700 px-4 py-2 font-semibold hover:bg-blue-600">Go to WMS</a>
      </div>
    </main>
  );
}
