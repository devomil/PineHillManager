import AdminLayout from "@/components/admin-layout";
import EmployeeContentStudio from "@/components/employee-content-studio";

export default function AdminEmployeeContentPage() {
  return (
    <AdminLayout currentTab="employee-content">
      <EmployeeContentStudio />
    </AdminLayout>
  );
}
