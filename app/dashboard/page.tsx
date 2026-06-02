"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  email: string;
  plan: "free" | "pro";
};

type Chat = {
  id: string;
  title: string;
  messages: any[];
};

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  // ======================
  // GET USER
  // ======================
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    };

    getUser();
  }, []);

  useEffect(() => {
  const getUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log("USER =", user);

    setUser(user);
  };

  getUser();
}, []);

  // ======================
  // LOAD DATA (PROFILE + CHATS)
  // ======================
  const loadData = async () => {
    if (!user) return;

    setLoading(true);

    // PROFILE (PLAN STRIPE)
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", user.email)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // CHATS
    const { data: chatsData } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (chatsData) {
      setChats(chatsData);
    }

    setLoading(false);
  };

  // reload when user ready
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // ======================
  // LOADING UI
  // ======================
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Chargement dashboard...
      </div>
    );
  }

  // ======================
  // UI
  // ======================
  return (
    <div className="min-h-screen bg-black text-white p-8">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Dashboard SaaS 🚀
        </h1>

        <p className="text-zinc-400">
          {user?.email}
        </p>
      </div>
       
       <button
         onClick={() =>
           window.location.href = "/dashboard/business"
        }
        className="w-full bg-green-500 text-black p-2 rounded-xl mt-2 font-bold hover:opacity-80"
      >
        Business Dashboard 💰
      </button>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

        {/* PLAN */}
        <div className="bg-zinc-900 p-6 rounded-xl">
          <p className="text-zinc-400 text-sm">
            Plan actuel
          </p>

          <p className="text-2xl font-bold">
            {profile?.plan?.toUpperCase() || "FREE"}
          </p>
        </div>

        {/* CHATS */}
        <div className="bg-zinc-900 p-6 rounded-xl">
          <p className="text-zinc-400 text-sm">
            Conversations
          </p>

          <p className="text-2xl font-bold">
            {chats.length}
          </p>
        </div>

        {/* STATUS */}
        <div className="bg-zinc-900 p-6 rounded-xl">
          <p className="text-zinc-400 text-sm">
            Statut
          </p>

          <p className="text-2xl font-bold">
            {profile?.plan === "pro"
              ? "Actif 💰"
              : "Gratuit 🆓"}
          </p>
        </div>

      </div>

      {/* CHAT HISTORY */}
      <div className="bg-zinc-900 p-6 rounded-xl">

        <h2 className="text-xl font-bold mb-4">
          Historique des conversations
        </h2>

        {chats.length === 0 ? (
          <p className="text-zinc-500">
            Aucune conversation
          </p>
        ) : (
          <div className="space-y-3">

            {chats.map((chat) => (
              <div
                key={chat.id}
                className="bg-zinc-800 p-4 rounded-lg"
              >
                <p className="font-bold">
                  {chat.title}
                </p>

                <p className="text-sm text-zinc-400">
                  {chat.messages?.length || 0} messages
                </p>
              </div>
            ))}

          </div>
        )}

      </div>

    </div>
  );
}