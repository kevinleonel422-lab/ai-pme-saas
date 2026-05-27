"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type HistoryItem = {
  message: string;
  response: string;
  date: string;
};

type Chat = {
  id: string;
  title: string;
  messages: HistoryItem[];
};

export default function Home() {
  // ======================
  // STATE
  // ======================
  const [user, setUser] = useState<any>(null);

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [usageCount, setUsageCount] = useState(0);

  // ======================
  // AUTH USER
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

  // ======================
  // LOAD CHATS CLOUD
  // ======================
  const loadChatsFromCloud = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const formatted = data.map((c: any) => ({
        id: c.id,
        title: c.title,
        messages: c.messages,
      }));

      setChats(formatted);

      if (formatted.length > 0) {
        setCurrentChatId(formatted[0].id);
      }
    }
  };

  useEffect(() => {
    if (user) loadChatsFromCloud();
  }, [user]);

  // ======================
  // CURRENT CHAT
  // ======================
  const currentChat = chats.find((c) => c.id === currentChatId);

  // ======================
  // NEW CHAT
  // ======================
  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "Nouvelle conversation",
      messages: [],
    };

    setChats([newChat, ...chats]);
    setCurrentChatId(newChat.id);
  };

  // ======================
  // SAVE CLOUD
  // ======================
  const saveChatToCloud = async (
    title: string,
    messages: HistoryItem[]
  ) => {
    if (!user) return;

    await supabase.from("chats").insert([
      {
        user_id: user.id,
        title,
        messages,
      },
    ]);
  };

  // ======================
  // STRIPE CHECKOUT
  // ======================
  const subscribe = async () => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user?.email }),
    });

    const data = await res.json();

    window.location.href = data.url;
  };

  // ======================
  // GENERATE IA
  // ======================
  const generateResponse = async () => {
    if (!message || !currentChatId) return;

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName,
        businessType,
        message,
        userId: user?.id,
        email: user?.email,
     }),
   });

    // freemium limit
    if (plan === "free" && usageCount >= 10) {
      alert("Limite atteinte. Passe PRO 🚀");
      return;
    }

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          businessType,
          message,
        }),
      });

      const data = await res.json();

      setResponse(data.result);

      const newMsg: HistoryItem = {
        message,
        response: data.result,
        date: new Date().toISOString(),
      };

      const updatedChats = chats.map((chat) => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [newMsg, ...chat.messages],
            title:
              chat.title === "Nouvelle conversation"
                ? message.slice(0, 25)
                : chat.title,
          };
        }
        return chat;
      });

      setChats(updatedChats);
      setUsageCount((p) => p + 1);

      const updated = updatedChats.find(
        (c) => c.id === currentChatId
      );

      if (updated) {
        await saveChatToCloud(updated.title, updated.messages);
      }

      setMessage("");
    } catch (err) {
      setResponse("Erreur IA");
    }

    setLoading(false);
  };

  // ======================
  // COPY
  // ======================
  const copyResponse = async (text: string) => {
    await navigator.clipboard.writeText(text);
    alert("Copié !");
  };

  // ======================
  // UI
  // ======================
  return (
    <main className="min-h-screen flex bg-black text-white">

      {/* SIDEBAR */}
      <div className="w-80 border-r border-zinc-800 p-4">

        <div className="mb-4">
          <h2 className="text-xl font-bold">AI PME SaaS</h2>
          <p className="text-xs text-zinc-500">
            {user?.email || "Non connecté"}
          </p>
        </div>

        {/* PLAN */}
        <div className="mb-4 p-3 bg-zinc-900 rounded-xl">
          <p>Plan: {plan.toUpperCase()}</p>

          {plan === "free" && (
            <p className="text-xs text-zinc-500">
              {usageCount}/10 messages
            </p>
          )}
        </div>

        {/* ACTIONS */}
        <button
          onClick={createNewChat}
          className="w-full bg-white text-black p-2 rounded-xl mb-2"
        >
          + Nouvelle conversation
        </button>

        <button
          onClick={subscribe}
          className="w-full bg-yellow-400 text-black p-2 rounded-xl mb-4 font-bold"
        >
          Passer PRO 🚀
        </button>
        <button
          onClick={() => window.location.href = "/dashboard"}
          className="w-full bg-zinc-800 text-white p-2 rounded-xl mb-2"
        >
          Dashboard 📊
        </button>
        {/* CHATS */}
        <div className="space-y-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setCurrentChatId(chat.id)}
              className={`p-3 rounded-xl cursor-pointer ${
                chat.id === currentChatId
                  ? "bg-zinc-700"
                  : "bg-zinc-900"
              }`}
            >
              <p className="text-sm truncate">
                {chat.title}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex justify-center p-6">

        <div className="w-full max-w-4xl space-y-6">

          <h1 className="text-3xl font-bold">
            AI Assistant PME Réunion
          </h1>

          <input
            className="w-full p-3 bg-zinc-800 rounded-xl"
            placeholder="Nom commerce"
            value={businessName}
            onChange={(e) =>
              setBusinessName(e.target.value)
            }
          />

          <input
            className="w-full p-3 bg-zinc-800 rounded-xl"
            placeholder="Type commerce"
            value={businessType}
            onChange={(e) =>
              setBusinessType(e.target.value)
            }
          />

          <textarea
            className="w-full p-3 bg-zinc-800 rounded-xl h-32"
            placeholder="Message client"
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
          />

          <button
            onClick={generateResponse}
            disabled={plan === "free" && usageCount >= 10}
            className="w-full bg-white text-black p-3 rounded-xl font-bold"
          >
            {loading
              ? "Génération..."
              : plan === "free" && usageCount >= 10
              ? "Limite atteinte - PRO requis"
              : "Envoyer IA"}
          </button>

          {/* CHAT */}
          <div className="space-y-4">
            {currentChat?.messages.map((m, i) => (
              <div
                key={i}
                className="bg-zinc-800 p-4 rounded-xl"
              >
                <p className="text-sm text-zinc-400">
                  Client
                </p>
                <p>{m.message}</p>

                <p className="text-sm text-zinc-400 mt-2">
                  IA
                </p>

                <p className="whitespace-pre-wrap">
                  {m.response}
                </p>

                <button
                  onClick={() =>
                    copyResponse(m.response)
                  }
                  className="mt-2 text-xs bg-white text-black px-2 py-1 rounded"
                >
                  Copier
                </button>
              </div>
            ))}
          </div>

          {loading && (
            <div className="bg-zinc-800 p-4 rounded-xl animate-pulse">
              L'IA réfléchit...
            </div>
          )}

        </div>
      </div>
    </main>
  );
}