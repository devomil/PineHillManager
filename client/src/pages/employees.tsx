import EmployeeRoster from "@/components/employee-roster";

export default function Employees() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Employee Management</h1>
        <p className="text-slate-500 mt-1">
          Manage employee roles and permissions for Pine Hill Farm
        </p>
      </div>

      {/* Employee Roster Component */}
      <EmployeeRoster />
    </div>
  );
}