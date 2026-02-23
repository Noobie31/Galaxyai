import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
    return (
        <div style={{
            display: "flex",
            height: "100vh",
            width: "100vw",
            background: "#000",
            overflow: "hidden",
        }}>
            {/* Left: Clerk SignUp */}
            <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#000",
            }}>
                <SignUp />
            </div>

            {/* Right: decorative image panel */}
            <div style={{
                width: "45%",
                position: "relative",
                overflow: "hidden",
                borderRadius: "16px 0 0 16px",
                margin: "12px 12px 12px 0",
            }}>
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: "url(https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&q=80)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "brightness(0.6)",
                }} />
                <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(168,85,247,0.35) 100%)",
                }} />
                <div style={{
                    position: "absolute", bottom: 28, left: 28, right: 28,
                }}>
                    <p style={{
                        color: "rgba(255,255,255,0.65)",
                        fontSize: 14, lineHeight: 1.65, margin: 0,
                    }}>
                        Join thousands of creators building AI workflows with NextFlow.
                    </p>
                </div>
            </div>
        </div>
    )
}