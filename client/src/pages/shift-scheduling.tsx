import AdminLayout from "@/components/admin-layout";
import EnhancedShiftScheduling from "@/components/enhanced-shift-scheduling";

export default function ShiftScheduling() {
  return (
    <AdminLayout currentTab="scheduling">
      <EnhancedShiftScheduling />
    </AdminLayout>
  );
}