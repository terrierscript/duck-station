"use client"
import useSWR from "swr"
import { useDatabase } from "../useDatabase"
import { Box, Button, Group, Loader, Table } from "@mantine/core"
import { database } from "../database"
import { Connection } from "./[station_gcd]/Connection"

const StationGroupPage = () => {
  const db = useDatabase()
  const stationGroup = useSWR(["stationGroup", db], async () => {
    const data = await db?.listStation()
    const tn = await db?.testNested()
    console.log({ tn })
    return data
  })
  if (stationGroup.isLoading) {
    return <Group>
      <Loader />
      <Box>よみこみちゅう</Box>
    </Group>
  }
  return <Box>
    <Table>
      <Table.Tbody>
        {stationGroup.data?.map((group, index) => (
          <Table.Tr key={index}>
            <Table.Td>{group.station_g_cd}</Table.Td>
            <Table.Td>
              {group.station_g_cd
                && group.station_names
                && <Connection station_names={group.station_names} station_gcd={group.station_g_cd} />}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  </Box>
}
export default StationGroupPage