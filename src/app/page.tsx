"use client"

import dynamic from "next/dynamic"

const FreightChatProIntegrated = dynamic(() => import("./components/freight-chat-pro"), { ssr: false })

export default function FreightPage() {
  return <FreightChatProIntegrated />
}
