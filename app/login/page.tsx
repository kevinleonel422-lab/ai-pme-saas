"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setLoading(true);

    if (isLogin) {
      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      alert("Compte créé !");
    }

    window.location.href = "/dashboard";
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="bg-zinc-900 p-8 rounded-3xl w-full max-w-md space-y-4">

        <h1 className="text-3xl font-bold">
          {isLogin ? "Connexion" : "Inscription"}
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-xl bg-zinc-800"
        />

        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded-xl bg-zinc-800"
        />

        <button
          onClick={handleAuth}
          disabled={loading}
          className="w-full bg-white text-black p-3 rounded-xl font-bold"
        >
          {loading
            ? "Chargement..."
            : isLogin
            ? "Se connecter"
            : "Créer un compte"}
        </button>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm text-zinc-400"
        >
          {isLogin
            ? "Créer un compte"
            : "Déjà un compte ?"}
        </button>

      </div>
    </main>
  );
}