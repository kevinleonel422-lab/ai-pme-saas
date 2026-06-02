"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Message = {
  id: string;
  sender: string;
  message: string;
  response: string;
  created_at: string;
};

export default function ConversationsPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // ====================================
  // LOAD MESSAGES
  // ====================================
  const loadMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (data) {
      setMessages(data);
    }

    setLoading(false);
  };

  // ====================================
  // REALTIME SUBSCRIPTION
  // ====================================
  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel("messages-live")

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          setMessages((prev) => {
            const exists = prev.find(
              (msg) => msg.id === payload.new.id
            );

            if (exists) return prev;

            return [payload.new as Message, ...prev];
          });
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-6">

      <div className="max-w-5xl mx-auto">

        <div className="mb-8">
          <h1 className="text-4xl font-bold">
            Conversations WhatsApp
          </h1>

          <p className="text-zinc-400 mt-2">
            Messages reçus et réponses IA en temps réel.
          </p>
        </div>

        {loading ? (
          <div className="text-zinc-500">
            Chargement...
          </div>
        ) : (
          <div className="space-y-4">

            {messages.map((msg) => (
              <div
                key={msg.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
              >

                <div className="flex items-center justify-between mb-4">

                  <div className="text-sm text-zinc-400">
                    {msg.sender}
                  </div>

                  <div className="text-xs text-zinc-500">
                    {new Date(
                      msg.created_at
                    ).toLocaleString()}
                  </div>

                </div>

                <div className="space-y-4">

                  <div>
                    <div className="text-sm text-zinc-500 mb-1">
                      Client
                    </div>

                    <div className="bg-zinc-800 rounded-xl p-4">
                      {msg.message}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-zinc-500 mb-1">
                      IA
                    </div>

                    <div className="bg-green-950 border border-green-800 rounded-xl p-4">
                      {msg.response}
                    </div>
                  </div>

                </div>

              </div>
            ))}

          </div>
        )}

      </div>

    </main>
  );
}