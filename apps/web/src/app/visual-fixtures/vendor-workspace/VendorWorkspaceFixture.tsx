"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { VendorWorkspaceNavigation } from "@/components/workspace/VendorWorkspaceNavigation";
import SalesDesk from "@/components/sales/SalesDesk";
import SalesReports from "@/components/sales/SalesReports";
import VendorInventory from "@/components/workspace/VendorInventory";
import StoreManager from "@/components/stores/StoreManager";
import PricingEditorFixture from "./PricingEditorFixture";
import VaultCopyCostCard from '@/components/vault/VaultCopyCostCard';
import { supabase } from "@/lib/supabaseClient";

export default function VendorWorkspaceFixture() {
  const [ready, setReady] = useState(false);
  const view = useSearchParams().get("view");
  const costEnabled = useSearchParams().get('costEnabled') !== '0';
  const owner = "00000000-0000-4000-8000-000000000001";
  const routePath = view === "store" ? "/account/store" : view === "inventory" ? "/account/store/inventory" : view === "reports" ? "/account/store/reports" : "/account/store/sales";
  useEffect(() => {
    // Synthetic credentials are valid only against intercepted local fixture Auth.
    const token = `e30.${btoa(JSON.stringify({ exp: 4000000000, sub: owner }))}.fixture`;
    void supabase.auth.setSession({ access_token: token, refresh_token: "fixture-only" })
      .then(() => setReady(true));
  }, []);
  return <div style={{ maxWidth: 1400, margin: "auto", padding: "12px 16px 110px" }} data-vendor-workspace-fixture>
    <p>Local fixture · Sample sales · No live transactions</p>
    <Link href="/visual-fixtures/vendor-workspace">Fixture Desk</Link>{" · "}<Link href="/visual-fixtures/vendor-workspace?view=reports">Fixture Reports</Link>
    {" · "}<Link href="/visual-fixtures/vendor-workspace?view=inventory">Fixture Inventory</Link>
    <VendorWorkspaceNavigation routePath={routePath} />
    {ready ? view === 'cost' ? <VaultCopyCostCard key={`cost-${costEnabled}`} ownerId={owner} instanceId="00000000-0000-4000-8000-000000000010" enabled={costEnabled} /> : view === "pricing" ? <PricingEditorFixture /> : view === "store" ? <StoreManager siteOrigin="https://fixture.invalid" /> : view === "inventory" ? <VendorInventory ownerId={owner} /> : view === "reports" ? <SalesReports ownerId={owner} /> : <SalesDesk /> : <p>Preparing sample workspace…</p>}
    <button onClick={() => void supabase.auth.signOut({ scope: "local" })}>Fixture sign out</button>
    <VendorWorkspaceNavigation mobile routePath={routePath} />
  </div>;
}
