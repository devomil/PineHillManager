import UserProfile from "@/components/user-profile";

export default function Profile() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500 mt-1">
          Manage your personal information and work details
        </p>
      </div>

      {/* User Profile Component */}
      <UserProfile />
    </div>
  );
}