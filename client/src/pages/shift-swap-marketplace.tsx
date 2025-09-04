import AdminLayout from "@/components/admin-layout";
import ShiftSwapMarketplace from "@/components/shift-swap-marketplace";

export default function ShiftSwapMarketplacePage() {
  return (
    <AdminLayout currentTab="swaps">
      <ShiftSwapMarketplace />
    </AdminLayout>
  );
}