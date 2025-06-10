import AdminLayout from "@/components/admin-layout";
import AdminEmployeeManagement from "@/components/admin-employee-management";

export default function AdminEmployeesPage() {
  return (
    <AdminLayout currentTab="employees">
      <AdminEmployeeManagement />
    </AdminLayout>
  );
}