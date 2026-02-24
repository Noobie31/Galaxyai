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
                    backgroundImage: "url(https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=85)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "brightness(0.72)",
                }} />
                {/* Subtle dark overlay */}
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
                        Join thousands of creators building AI workflows with NextFlow.
                    </p>
                </div>
            </div>
        </div>
    )
}