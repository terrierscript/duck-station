"use client"
import dynamic from "next/dynamic"

export const SigmaDynamic = dynamic(() => import("./SigmaPage"), {
  ssr: false
})

