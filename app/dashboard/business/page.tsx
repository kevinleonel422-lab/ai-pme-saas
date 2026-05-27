"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function BusinessDashboard() {
  const [revenue, setRevenue] = useState(0);
  const [costs, setCosts] = useState(0);
  const [users, setUsers] = useState(0);
  const [mrr, setMrr] = useState(0);
  const [profit, setProfit] = useState(0);

  useEffect(() => {
    const load = async () => {
      // ======================
      // REVENUE
      // ======================
      const { data: rev } = await supabase
        .from("analytics")
        .select("*")
        .eq("type", "revenue");

      const totalRevenue =
        rev?.reduce((sum, r) => sum + Number(r.value), 0) || 0;

      // ======================
      // COSTS
      // ======================
      const { data: cost } = await supabase
        .from("analytics")
        .select("*")
        .eq("type", "ai_usage");

      const totalCost =
        cost?.reduce((sum, c) => sum + Number(c.value), 0) || 0;

      // ======================
      // USERS
      // ======================
      const { data: userData } = await supabase
        .from("profiles")
        .select("*");

      const totalUsers = userData?.length || 0;

      // ======================
      // MRR (approx)
      // ======================
      const proUsers =
        userData?.filter((u) => u.plan === "pro").length || 0;

      const monthlyRevenue = proUsers * 29;

      setRevenue(totalRevenue);
      setCosts(totalCost);
      setUsers(totalUsers);
      setMrr(monthlyRevenue);
      setProfit(monthlyRevenue - totalCost);
    };

    load();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">

      <h1 className="text-3xl font-bold mb-8">
        Business Dashboard 💰
      </h1>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <div className="bg-zinc-900 p-6 rounded-xl">
          <p className="text-zinc-400">MRR</p>
          <p className="text-2xl font-bold">
            €{mrr.toFixed(2)}
          </p>
        </div>

        <div className="bg-zinc-900 p-6 rounded-xl">
          <p className="text-zinc-400">Revenu total</p>
          <p className="text-2xl font-bold">
            €{revenue.toFixed(2)}
          </p>
        </div>

        <div className="bg-zinc-900 p-6 rounded-xl">
          <p className="text-zinc-400">Coûts IA</p>
          <p className="text-2xl font-bold">
            €{costs.toFixed(2)}
          </p>
        </div>

        <div className="bg-zinc-900 p-6 rounded-xl">
          <p className="text-zinc-400">Utilisateurs</p>
          <p className="text-2xl font-bold">
            {users}
          </p>
        </div>

      </div>

      {/* PROFIT */}
      <div className="mt-8 bg-zinc-900 p-6 rounded-xl">
        <p className="text-zinc-400">Profit estimé</p>
        <p className="text-4xl font-bold text-green-400">
          €{profit.toFixed(2)}
        </p>
      </div>

    </div>
  );
}