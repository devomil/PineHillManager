export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-6">
          🌲
        </div>
        <h1 className="text-4xl font-bold text-slate-800 mb-4">Page Not Found</h1>
        <p className="text-lg text-slate-600 mb-8">The page you're looking for doesn't exist.</p>
        <a 
          href="/" 
          className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
}