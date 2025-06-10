import AdminLayout from "@/components/admin-layout";
import SystemSupport from "@/pages/system-support";

export default function AdminTraining() {
  return (
    <AdminLayout currentTab="training">
      <SystemSupport />
    </AdminLayout>
  );
}