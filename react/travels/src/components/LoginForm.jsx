import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const LoginForm = ({ onLogin }) => {
  const [form, setForm] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:8000/api/login/",
        form
      );

      onLogin(res.data.access, res.data.user_id);
      navigate("/");
    } catch {
      setMessage("Login failed");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10 p-5 border rounded">
      <h2 className="text-center font-semibold mb-4">Login</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          name="username"
          placeholder="Username"
          className="w-full border px-2 py-1 rounded"
          onChange={(e) =>
            setForm({ ...form, username: e.target.value })
          }
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          className="w-full border px-2 py-1 rounded"
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />

        <button className="w-full bg-black text-white py-1 rounded">
          Login
        </button>

        {message && (
          <p className="text-center text-red-600 text-sm">
            {message}
          </p>
        )}
      </form>
    </div>
  );
};

export default LoginForm;
