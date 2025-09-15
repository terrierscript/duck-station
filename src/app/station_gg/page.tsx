"use client"

import dynamic from "next/dynamic"

const SigmaDynamic = dynamic(() => import("./SigmaPage"), {
  ssr: false
})

const Page = () => {
  return <SigmaDynamic />
}
export default Page