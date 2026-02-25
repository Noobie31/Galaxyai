// src/app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#080808",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "system-ui, -apple-system, sans-serif",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* ── Glassmorphism background blobs ── */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                {/* Top-left blob */}
                <div style={{
                    position: "absolute",
                    top: "-20%", left: "-10%",
                    width: 600, height: 600,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)",
                    filter: "blur(60px)",
                }} />
                {/* Bottom-right blob */}
                <div style={{
                    position: "absolute",
                    bottom: "-20%", right: "-10%",
                    width: 700, height: 700,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
                    filter: "blur(80px)",
                }} />
                {/* Center accent */}
                <div style={{
                    position: "absolute",
                    top: "40%", left: "45%",
                    width: 400, height: 400,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)",
                    filter: "blur(50px)",
                    transform: "translate(-50%, -50%)",
                }} />
                {/* Subtle grid overlay */}
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
                    backgroundSize: "48px 48px",
                }} />
            </div>

            {/* ── The card: two equal-width panels as one unified div ── */}
            <div style={{
                display: "flex",
                width: 760,
                minHeight: 480,
                borderRadius: 20,
                overflow: "hidden",
                // glassmorphism card border
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: `
          0 0 0 1px rgba(255,255,255,0.04) inset,
          0 32px 80px rgba(0,0,0,0.6),
          0 8px 24px rgba(0,0,0,0.4)
        `,
                backdropFilter: "blur(2px)",
                position: "relative",
                zIndex: 1,
            }}>
                {/* ── LEFT: Clerk sign-in form ── */}
                <div style={{
                    width: "50%",
                    background: "rgba(14,14,16,0.95)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "40px 36px",
                    boxSizing: "border-box",
                }}>
                    <SignIn
                        appearance={{
                            elements: {
                                // Outer card shell — transparent so our bg shows
                                card: {
                                    background: "transparent",
                                    boxShadow: "none",
                                    border: "none",
                                    padding: 0,
                                    width: "100%",
                                },
                                // Header
                                headerTitle: {
                                    color: "white",
                                    fontSize: 22,
                                    fontWeight: 700,
                                    letterSpacing: "-0.01em",
                                },
                                headerSubtitle: {
                                    color: "rgba(255,255,255,0.4)",
                                    fontSize: 13,
                                },
                                // Social buttons (Google, Apple, SSO)
                                socialButtonsBlockButton: {
                                    background: "white",
                                    border: "none",
                                    borderRadius: 10,
                                    color: "#111",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    height: 44,
                                    marginBottom: 8,
                                    "&:hover": { background: "#f0f0f0" },
                                },
                                socialButtonsBlockButtonText: {
                                    fontWeight: 500,
                                    color: "#111",
                                },
                                // Divider "OR"
                                dividerLine: { background: "rgba(255,255,255,0.1)" },
                                dividerText: { color: "rgba(255,255,255,0.3)", fontSize: 11 },
                                // Form inputs
                                formFieldInput: {
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 10,
                                    color: "white",
                                    fontSize: 13,
                                    height: 44,
                                    "&:focus": { border: "1px solid rgba(255,255,255,0.3)", outline: "none" },
                                },
                                formFieldLabel: {
                                    color: "rgba(255,255,255,0.55)",
                                    fontSize: 12,
                                },
                                // Primary button
                                formButtonPrimary: {
                                    background: "#2563eb",
                                    color: "white",
                                    borderRadius: 10,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    height: 44,
                                    border: "none",
                                    "&:hover": { background: "#1d4ed8" },
                                },
                                // Footer / links
                                footerActionText: { color: "rgba(255,255,255,0.35)", fontSize: 12 },
                                footerActionLink: { color: "#60a5fa", fontSize: 12 },
                                identityPreviewText: { color: "rgba(255,255,255,0.7)" },
                                identityPreviewEditButton: { color: "#60a5fa" },
                            },
                            variables: {
                                colorBackground: "transparent",
                                colorText: "white",
                                colorPrimary: "#2563eb",
                                colorInputBackground: "rgba(255,255,255,0.06)",
                                colorInputText: "white",
                                borderRadius: "10px",
                            },
                        }}
                    />
                </div>

                {/* ── Vertical divider between panels ── */}
                <div style={{
                    width: 1,
                    background: "rgba(255,255,255,0.08)",
                    flexShrink: 0,
                }} />

                {/* ── RIGHT: Visual / artwork panel ── */}
                <div style={{
                    width: "50%",
                    background: "rgba(10,10,14,0.97)",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}>
                    {/* Background gradient mesh */}
                    <div style={{
                        position: "absolute", inset: 0,
                        background: `
              radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.25) 0%, transparent 55%),
              radial-gradient(ellipse at 70% 80%, rgba(168,85,247,0.2) 0%, transparent 55%),
              radial-gradient(ellipse at 60% 40%, rgba(14,165,233,0.12) 0%, transparent 45%)
            `,
                    }} />

                    {/* Animated floating orb */}
                    <div style={{
                        position: "absolute",
                        width: 300, height: 300,
                        borderRadius: "50%",
                        background: `
              radial-gradient(circle at 35% 35%,
                rgba(180,200,255,0.95) 0%,
                rgba(120,160,255,0.7) 20%,
                rgba(80,100,240,0.5) 40%,
                rgba(40,60,180,0.3) 60%,
                transparent 75%
              )
            `,
                        boxShadow: `
              inset -20px -20px 40px rgba(0,0,50,0.3),
              inset 10px 10px 30px rgba(200,220,255,0.2),
              0 0 80px rgba(99,102,241,0.3)
            `,
                        animation: "float 6s ease-in-out infinite",
                    }}>
                        {/* Inner refraction ring */}
                        <div style={{
                            position: "absolute",
                            top: "15%", left: "10%",
                            width: "80%", height: "80%",
                            borderRadius: "50%",
                            border: "1px solid rgba(200,220,255,0.3)",
                            background: `
                radial-gradient(circle at 40% 30%,
                  rgba(255,255,255,0.15) 0%,
                  transparent 50%
                )
              `,
                        }} />
                        {/* Checkered inner sphere */}
                        <div style={{
                            position: "absolute",
                            bottom: "18%", right: "18%",
                            width: 80, height: 80,
                            borderRadius: "50%",
                            background: `
                conic-gradient(
                  #f59e0b 0deg, #000 0deg 45deg,
                  #f59e0b 45deg 90deg, #000 90deg 135deg,
                  #f59e0b 135deg 180deg, #000 180deg 225deg,
                  #f59e0b 225deg 270deg, #000 270deg 315deg,
                  #f59e0b 315deg 360deg
                )
              `,
                            boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
                            animation: "spin 8s linear infinite",
                        }} />
                    </div>

                    {/* Bottom branding */}
                    <div style={{
                        position: "absolute",
                        bottom: 28, left: 0, right: 0,
                        textAlign: "center",
                    }}>
                        <p style={{
                            color: "rgba(255,255,255,0.2)",
                            fontSize: 11,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            margin: 0,
                        }}>
                            NextFlow · Visual AI Workflows
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-16px) rotate(2deg); }
          66% { transform: translateY(8px) rotate(-1deg); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    )
}