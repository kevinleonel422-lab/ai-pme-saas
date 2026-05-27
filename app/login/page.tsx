"use client";

import { useState, useEffect } from "react";
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
  // =========================
  // STATES
  // =========================

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState<any>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // =========================
  // USER AUTH
  // =========================

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    };

    getUser();
  }, []);

  // =========================
  // LOAD CHATS FROM CLOUD
  // =========================

  const loadChatsFromCloud = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      const formattedChats = data.map((chat: any) => ({
        id: chat.id,
        title: chat.title,
        messages: chat.messages,
      }));

      setChats(formattedChats);

      if (formattedChats.length > 0) {
        setCurrentChatId(formattedChats[0].id);
      }
    }
  };

  // =========================
  // AUTO LOAD WHEN USER READY
  // =========================

  useEffect(() => {
    if (user) {
      loadChatsFromCloud();
    }
  }, [user]);

  // =========================
  // ACTIVE CHAT
  // =========================

  const currentChat = chats.find(
    (chat) => chat.id === currentChatId
  );

  // =========================
  // CREATE NEW CHAT
  // =========================

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "Nouvelle conversation",
      messages: [],
    };

    setChats([newChat, ...chats]);
    setCurrentChatId(newChat.id);
  };

  // =========================
  // SAVE CHAT TO CLOUD
  // =========================

  const saveChatToCloud = async (
    title: string,
    messages: HistoryItem[]
  ) => {
    if (!user) return;

    const { error } = await supabase
      .from("chats")
      .insert([
        {
          user_id: user.id,
          title,
          messages,
        },
      ]);

    if (error) {
      console.error(error);
    }
  };

  // =========================
  // GENERATE IA RESPONSE
  // =========================

  const generateResponse = async () => {
    if (!message || !currentChatId) return;

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessName,
          businessType,
          message,
        }),
      });

      const data = await res.json();

      setResponse(data.result);

      const newMessage: HistoryItem = {
        message,
        response: data.result,
        date: new Date().toISOString(),
      };

      const updatedChats = chats.map((chat) => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [newMessage, ...chat.messages],
            title:
              chat.title === "Nouvelle conversation"
                ? message.slice(0, 25)
                : chat.title,
          };
        }

        return chat;
      });

      setChats(updatedChats);

      // SAVE CURRENT CHAT TO CLOUD
      const currentUpdatedChat = updatedChats.find(
        (c) => c.id === currentChatId
      );

      if (currentUpdatedChat) {
        await saveChatToCloud(
          currentUpdatedChat.title,
          currentUpdatedChat.messages
        );
      }

      setMessage("");

    } catch (error) {
      console.error(error);
      setResponse("Erreur lors de la génération.");
    }

    setLoading(false);
  };

  // =========================
  // COPY RESPONSE
  // =========================

  const copyResponse = async (text: string) => {
    await navigator.clipboard.writeText(text);
    alert("Réponse copiée !");
  };

  // =========================
  // UI
  // =========================

  return (
    <main className="min-h-screen flex bg-black text-white">

      {/* SIDEBAR */}
      <div className="w-80 border-r border-zinc-800 p-4 flex flex-col">

        <div className="mb-6">
          <h2 className="text-2xl font-bold">
            AI PME
          </h2>

          <p className="text-zinc-500 text-sm">
            {user?.email || "Non connecté"}
          </p>
        </div>

        <button
          onClick={createNewChat}
          className="w-full bg-white text-black p-3 rounded-2xl font-bold mb-6 hover:opacity-90 transition"
        >
          + Nouvelle conversation
        </button>

        <div className="space-y-2 overflow-y-auto">

          {chats.length === 0 && (
            <p className="text-zinc-500 text-sm">
              Aucune conversation
            </p>
          )}

          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setCurrentChatId(chat.id)}
              className={`p-3 rounded-2xl cursor-pointer transition ${
                chat.id === currentChatId
                  ? "bg-zinc-700"
                  : "bg-zinc-900 hover:bg-zinc-800"
              }`}
            >
              <p className="text-sm truncate">
                {chat.title}
              </p>
            </div>
          ))}

        </div>

      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex justify-center items-center p-6">

        <div className="w-full max-w-4xl bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl p-8 space-y-6">

          {/* HEADER */}
          <div>
            <h1 className="text-4xl font-bold mb-2">
              AI Assistant PME Réunion
            </h1>

            <p className="text-zinc-400">
              Réponses automatiques intelligentes pour commerces locaux.
            </p>
          </div>

          {/* FORM */}
          <div className="grid md:grid-cols-2 gap-4">

            <input
              className="w-full p-4 rounded-2xl bg-zinc-800 border border-zinc-700 outline-none focus:border-white transition"
              placeholder="Nom du commerce"
              value={businessName}
              onChange={(e) =>
                setBusinessName(e.target.value)
              }
            />

            <input
              className="w-full p-4 rounded-2xl bg-zinc-800 border border-zinc-700 outline-none focus:border-white transition"
              placeholder="Type de commerce"
              value={businessType}
              onChange={(e) =>
                setBusinessType(e.target.value)
              }
            />

          </div>

          {/* MESSAGE INPUT */}
          <textarea
            className="w-full p-4 rounded-2xl bg-zinc-800 border border-zinc-700 outline-none focus:border-white transition h-40 resize-none"
            placeholder="Écris le message du client..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          {/* BUTTON */}
          <button
            onClick={generateResponse}
            disabled={!currentChatId}
            className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:scale-[1.01] transition active:scale-95 disabled:opacity-50"
          >
            {loading
              ? "Génération..."
              : "Générer une réponse IA"}
          </button>

          {/* CHAT MESSAGES */}
          <div className="space-y-4">

            {currentChat?.messages.map((msg, index) => (
              <div
                key={index}
                className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6"
              >

                <div className="mb-4">
                  <p className="text-zinc-400 text-sm mb-1">
                    Client
                  </p>

                  <p>{msg.message}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">

                    <p className="text-zinc-400 text-sm">
                      IA
                    </p>

                    <button
                      onClick={() =>
                        copyResponse(msg.response)
                      }
                      className="text-xs bg-white text-black px-3 py-1 rounded-lg"
                    >
                      Copier
                    </button>

                  </div>

                  <p className="whitespace-pre-wrap leading-relaxed">
                    {msg.response}
                  </p>
                </div>

              </div>
            ))}

          </div>

          {/* LOADING */}
          {loading && (
            <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 animate-pulse">
              L'IA réfléchit...
            </div>
          )}

        </div>

      </div>

    </main>
  );
}