function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-6">
            🌲
          </div>
          <h1 className="text-5xl font-bold text-slate-800 mb-4">Pine Hill Farm</h1>
          <div className="text-2xl text-slate-600 mb-6">Employee Portal</div>
          <div className="text-lg text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            Welcome to the Pine Hill Farm employee management system. 
            Access your schedule, manage time off, and stay connected with your team.
          </div>
          <a 
            href="/api/login" 
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-colors"
          >
            Sign In to Continue
          </a>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white p-8 rounded-xl shadow-sm text-center">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-2xl mx-auto mb-4">
              ⏰
            </div>
            <h3 className="text-xl font-semibold mb-4">Time Management</h3>
            <p className="text-slate-600 leading-relaxed">
              Request time off, view your schedule, and manage shift coverage with ease.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-sm text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-2xl mx-auto mb-4">
              💬
            </div>
            <h3 className="text-xl font-semibold mb-4">Communication</h3>
            <p className="text-slate-600 leading-relaxed">
              Stay updated with company announcements and team communications.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-sm text-center">
            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center text-2xl mx-auto mb-4">
              👥
            </div>
            <h3 className="text-xl font-semibold mb-4">Team Collaboration</h3>
            <p className="text-slate-600 leading-relaxed">
              Connect with your colleagues and access training materials.
            </p>
          </div>
        </div>
        
        <div className="text-center mt-16">
          <p className="text-slate-500">Need help? Contact your supervisor or IT support.</p>
        </div>
      </div>
    </div>
  );
}

export default App;
