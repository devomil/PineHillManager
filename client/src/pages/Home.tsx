import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white text-xl">
              🌲
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Pine Hill Farm</h1>
              <p className="text-slate-600">Employee Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-700">Welcome, {user?.firstName || 'Employee'}</span>
            <a 
              href="/api/logout" 
              className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Sign Out
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xl mb-4">
              📅
            </div>
            <h3 className="text-lg font-semibold mb-2">My Schedule</h3>
            <p className="text-slate-600 text-sm mb-4">View your upcoming shifts and schedule</p>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors">
              View Schedule
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xl mb-4">
              🏖️
            </div>
            <h3 className="text-lg font-semibold mb-2">Time Off</h3>
            <p className="text-slate-600 text-sm mb-4">Request vacation days and personal time</p>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors">
              Request Time Off
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-xl mb-4">
              🔄
            </div>
            <h3 className="text-lg font-semibold mb-2">Shift Coverage</h3>
            <p className="text-slate-600 text-sm mb-4">Find coverage for your shifts</p>
            <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg transition-colors">
              Request Coverage
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-xl mb-4">
              📢
            </div>
            <h3 className="text-lg font-semibold mb-2">Announcements</h3>
            <p className="text-slate-600 text-sm mb-4">Company news and updates</p>
            <button 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors"
              onClick={() => {
                console.log("Home announcements button clicked");
                window.location.href = "/announcements";
              }}
            >
              View Announcements
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center text-xl mb-4">
              💬
            </div>
            <h3 className="text-lg font-semibold mb-2">Team Chat</h3>
            <p className="text-slate-600 text-sm mb-4">Connect with your colleagues</p>
            <button className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg transition-colors">
              Open Chat
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center text-xl mb-4">
              📋
            </div>
            <h3 className="text-lg font-semibold mb-2">Documents</h3>
            <p className="text-slate-600 text-sm mb-4">Access company documents and forms</p>
            <button className="w-full bg-slate-600 hover:bg-slate-700 text-white py-2 rounded-lg transition-colors">
              View Documents
            </button>
          </div>
        </div>

        <div className="mt-12 bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="text-xl">⏰</span>
              <div className="text-left">
                <div className="font-medium">Clock In/Out</div>
                <div className="text-sm text-slate-600">Track your work hours</div>
              </div>
            </button>
            
            <button className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="text-xl">📍</span>
              <div className="text-left">
                <div className="font-medium">Store Locations</div>
                <div className="text-sm text-slate-600">Lake Geneva & Watertown</div>
              </div>
            </button>
            
            <button className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="text-xl">❓</span>
              <div className="text-left">
                <div className="font-medium">Help & Support</div>
                <div className="text-sm text-slate-600">Contact your supervisor</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}