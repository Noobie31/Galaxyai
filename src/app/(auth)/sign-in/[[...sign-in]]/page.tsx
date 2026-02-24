import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
    return (
        <div style={{
            display: "flex",
            height: "100vh",
            width: "100vw",
            background: "#000",
            overflow: "hidden",
        }}>
            {/* Left: Clerk SignIn */}
            <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#000",
            }}>
                <SignIn />
            </div>

            {/* Right: full-height landscape image panel */}
            <div style={{
                width: "45%",
                position: "relative",
                overflow: "hidden",
                borderRadius: "16px 0 0 16px",
                margin: "12px 12px 12px 0",
            }}>
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: "url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "brightness(0.72)",
                }} />
                {/* Subtle dark overlay for text readability */}
                <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.5) 100%)",
                }} />
                <div style={{
                    position: "absolute", bottom: 32, left: 32, right: 32,
                }}>
                    <p style={{
                        color: "rgba(255,255,255,0.6)",
                        fontSize: 14, lineHeight: 1.7, margin: 0,
                    }}>
                        Build powerful AI workflows with nodes. Connect every tool and model into complex automated pipelines.
                    </p>
                </div>
            </div>
        </div>
    )
}