"use client"
import { Box, Button, Stack, Table } from "@mantine/core"
import { FC } from "react"
import useSWR from "swr"
import { database } from "./database"

export const SampleComponent: FC<{}> = () => {
  const r = useSWR(["listStation"], async () => {
    const { listCompany: listStation } = await database()
    return listStation()
  })
  if (!r.data) return <div>Loading...</div>
  return <Box>
    <Stack>
      <Table striped border={1}>
        <Table.Tbody>
          {r.data.map((row, i) => {
            console.log(row)
            return <Table.Tr key={i}>
              <Table.Td>{row.line.line_cd}</Table.Td>
              <Table.Td>{row.company.company_name}</Table.Td>
              <Table.Td>{row.company.e_status}</Table.Td>
              <Table.Td>{row.company.e_sort}</Table.Td>
              <Table.Td>{row.line.company_cd}</Table.Td>
              <Table.Td>{row.line.line_name}</Table.Td>
              <Table.Td>{row.line.line_name_k}</Table.Td>
              <Table.Td>{row.line.line_name_h}</Table.Td>
              <Table.Td>{row.line.line_color_c}</Table.Td>
              <Table.Td>{row.line.line_color_t}</Table.Td>
              <Table.Td>{row.line.line_type}</Table.Td>
              <Table.Td>{row.line.lon}</Table.Td>
              <Table.Td>{row.line.lat}</Table.Td>
              <Table.Td>{row.line.zoom}</Table.Td>
              <Table.Td>{row.line.e_status}</Table.Td>
              <Table.Td>{row.line.e_sort}</Table.Td>
            </Table.Tr>
          })}
        </Table.Tbody>
      </Table>
    </Stack>

  </Box>
}