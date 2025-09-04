import AdminLayout from "@/components/admin-layout";
import EnhancedMonthlyScheduler from "@/components/enhanced-monthly-scheduler";

export default function ShiftScheduling() {
  return (
    <AdminLayout currentTab="scheduling">
      <EnhancedMonthlyScheduler />
    </AdminLayout>
  );
}