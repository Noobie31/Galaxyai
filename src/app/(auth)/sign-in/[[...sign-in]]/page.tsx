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

            {/* Right: decorative image panel */}
            <div style={{
                width: "45%",
                position: "relative",
                overflow: "hidden",
                borderRadius: "16px 0 0 16px",
                margin: "12px 12px 12px 0",
                display: "flex",
            }}>
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: "url(https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "brightness(0.65)",
                }} />
                <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(135deg, rgba(255,100,50,0.25) 0%, rgba(100,50,200,0.35) 100%)",
                }} />
                <div style={{
                    position: "absolute", bottom: 28, left: 28, right: 28,
                }}>
                    <p style={{
                        color: "rgba(255,255,255,0.65)",
                        fontSize: 14, lineHeight: 1.65, margin: 0,
                    }}>
                        Build powerful AI workflows with nodes. Connect every tool and model into complex automated pipelines.
                    </p>
                </div>
            </div>
        </div>
    )
}