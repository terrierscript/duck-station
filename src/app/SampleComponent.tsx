"use client"
import { Box, Button, Stack } from "@mantine/core"
import { FC } from "react"
import useSWR from "swr"
import { opfsTest } from "./duckdb"
export const SampleComponent: FC<{}> = () => {
  useSWR(["opfsTest"], () => {
    console.log("run")
    return opfsTest()
  })
  return <Box>
    <Stack>
      <Box>hello</Box>
      <Button>XXXXXXXX</Button>
    </Stack>

  </Box>
}