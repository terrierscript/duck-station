"use client"
import useSWRImmutable from "swr/immutable"
import { useDatabase } from "../useDatabase"
import { Box, Group, Paper, Tree, type TreeNodeData } from "@mantine/core"
import { IconChevronDown, IconChevronRight, IconPointFilled } from '@tabler/icons-react'
import type { DatabaseResponse } from "../../lib/database"

const convertToTree = (data?: DatabaseResponse<"companyLineStationTree">) => {
  return data?.map(c => ({
    value: c.company.company_cd!,
    label: c.company.company_name,
    children: c.station_line?.map(sl => ({
      label: sl.line?.line_name,
      value: sl.line?.line_cd!,
      children: sl.station?.map(s => ({
        label: s.station_name,
        value: s.station_cd!
      }))
    }))
  }))
}
const Page = () => {
  const database = useDatabase()
  const companyLiens = useSWRImmutable(["r", database], () => {
    return database?.companyLineStationTree()
  })
  const treeData: TreeNodeData[] = convertToTree(companyLiens.data) || []

  return <Box>
    <Tree data={treeData} renderNode={({ node, expanded, elementProps, hasChildren }) => {
      return <Group {...elementProps}>
        {hasChildren ? (
          expanded
            ? <IconChevronDown />
            : <IconChevronRight />
        ) : (
          <IconPointFilled />
        )}
        <Paper p={4} m={2} >{node.label}</Paper>
      </Group>
    }} />

  </Box>
}
export default Page