"use client"
import { useEffect, useState, type FC } from "react"
import Graph from "graphology"
import { SigmaContainer, useLoadGraph, useRegisterEvents } from "@react-sigma/core"
import "@react-sigma/core/lib/style.css"
import useSWR from "swr"
import { useDatabase } from "../useDatabase"
import { useWorkerLayoutForceAtlas2 } from '@react-sigma/layout-forceatlas2'
import { useLayoutNoverlap } from "@react-sigma/layout-noverlap"

import type Sigma from "sigma"

const sigmaStyle = { height: "100vh", width: "100vw" }

const Fa2Layout = () => {
  const { start, kill } = useWorkerLayoutForceAtlas2({
    settings: {
      slowDown: 10
    }
  })
  useEffect(() => {
    start()
    return () => {
      kill()
    }
  }, [start, kill])
  return null
}
// Component that load the graph
export const LoadGraph: FC<{ sigma: Sigma<NodeType, EdgeType> | null }> = ({ sigma }) => {
  const loadGraph = useLoadGraph()
  const registerEvents = useRegisterEvents()
  const { assign } = useLayoutNoverlap()
  const db = useDatabase()

  // const { data, isLoading } = useSWR(["station_g", db, station_gcd], async () => {
  //   return await db?.lineConnection(station_gcd)
  // })

  useEffect(() => {
    if (!db) return
    const graph = new Graph()
    graph.addNode("1130208", { x: 0, y: 0, size: 15, label: "新宿" })
    // graph.addNode("1130208_2", { x: 0, y: 0, size: 15, label: "新宿2" })
    // graph.addEdge("1130208", "1130208_2")
    loadGraph(graph)


    registerEvents({
      clickNode: async (event) => {
        // console.log(event)
        // const nodes = db?.lineConnection(event.node)
        const conn = await db?.lineConnection(event.node)
        conn?.map(connection => {
          const target = connection.s2.station_g_cd
          const label = connection.s2.station_name ?? "-"
          const color = `#${connection.line.line_color_c ?? "ccc"}`
          if (graph.hasNode(target)) {
            console.log("skip node", target)
            return
          }

          graph.addNode(target, { label, x: 0, y: 0, size: 15, color })
          graph.addEdge(event.node, target, { color })
          loadGraph(graph)
          assign()
        })
      }
    })
  }, [db, loadGraph])
  return null
}

type NodeType = { x: number; y: number; label: string; size: number }
type EdgeType = { label: string }

// Component that display the graph
export const DisplayGraph = () => {
  const [sigma, setSigma] = useState<Sigma<NodeType, EdgeType> | null>(null)

  return (
    <SigmaContainer style={sigmaStyle} ref={setSigma}>
      <LoadGraph sigma={sigma} />
      <Fa2Layout />
    </SigmaContainer>
  )
}
export default DisplayGraph