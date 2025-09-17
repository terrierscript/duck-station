"use client"
import { Box, Loader } from "@mantine/core"
import type { FC } from "react"
import useSWR from "swr"
import { useDatabase } from "../useDatabase"

export const Company: FC<{}> = ({ }) => {
  const db = useDatabase()
  const { data, isLoading } = useSWR(["company", db], async () => {
    return await db?.listCompany()
  })
  if (isLoading) return <Loader />

  return <Box>
  </Box>

}