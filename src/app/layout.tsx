import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"

export const metadata: Metadata = {
  title: "NextFlow",
  description: "Visual LLM Workflow Builder",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="en">
        <body className="bg-[#0a0a0a] text-white font-sans antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}