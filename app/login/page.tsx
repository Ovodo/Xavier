"use client";

import { login } from "@/actions/auth-actions";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      // redirect() throws an error, which is expected behavior
      // The redirect will happen automatically
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      //   style={{
      //     minHeight: "",
      //     display: "flex",
      //     alignItems: "center",
      //     justifyContent: "center",
      //     fontFamily: "system-ui, -apple-system, sans-serif",
      //   }}
      className="flex w-full justify-center items-center"
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.06)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          padding: "48px 40px",
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          width: "100%",
          maxWidth: "400px",
          margin: "0 20px",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "32px",
          }}
        >
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "rgba(255, 255, 255, 0.92)",
              marginBottom: "8px",
            }}
          >
            Welcome Back
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255, 255, 255, 0.65)",
            }}
          >
            Sign in to access the dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="username"
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "rgba(255, 255, 255, 0.65)",
                marginBottom: "8px",
              }}
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 16px",
                fontSize: "15px",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "8px",
                outline: "none",
                transition: "border-color 0.15s",
                backgroundColor: loading
                  ? "rgba(0, 0, 0, 0.15)"
                  : "rgba(0, 0, 0, 0.25)",
                color: "rgba(255, 255, 255, 0.92)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255, 255, 255, 0.12)")
              }
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "rgba(255, 255, 255, 0.65)",
                marginBottom: "8px",
              }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 16px",
                fontSize: "15px",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "8px",
                outline: "none",
                transition: "border-color 0.15s",
                backgroundColor: loading
                  ? "rgba(0, 0, 0, 0.15)"
                  : "rgba(0, 0, 0, 0.25)",
                color: "rgba(255, 255, 255, 0.92)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255, 255, 255, 0.12)")
              }
            />
          </div>

          {error && (
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "14px",
                color: "#ef4444",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "16px",
              fontWeight: "600",
              color: "rgba(255, 255, 255, 0.92)",
              background: loading
                ? "rgba(255, 255, 255, 0.1)"
                : "linear-gradient(135deg, rgba(124, 58, 237, 0.35), rgba(6, 182, 212, 0.25))",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              transform: loading ? "scale(1)" : "scale(1)",
            }}
            onMouseEnter={(e) =>
              !loading && (e.currentTarget.style.filter = "brightness(1.08)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.filter = "brightness(1)")
            }
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div
          style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "13px",
            color: "rgba(255, 255, 255, 0.45)",
          }}
        >
          Xavier Dashboard v1.0
        </div>
      </div>
    </div>
  );
}
