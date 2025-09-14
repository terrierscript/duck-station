import * as duckdb from '@duckdb/duckdb-wasm'
import { compressTextToGzip } from './compress'
import arrow from 'apache-arrow'
import z from 'zod'
import { CompanySchema, LineSchema, StationSchema } from './Schema'


const buildDuckDbInstance = async () => {
  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles()

  // Select a bundle based on browser checks
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES)

  const worker_url = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
  )

  // Instantiate the asynchronus version of DuckDB-Wasm
  const worker = new Worker(worker_url)
  const logger = new duckdb.ConsoleLogger()
  const db = new duckdb.AsyncDuckDB(logger, worker)
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  URL.revokeObjectURL(worker_url)

  try {
    await db.open({
      path: "opfs://train.db",
      accessMode: duckdb.DuckDBAccessMode.READ_WRITE
    })
  } catch {
    console.log("fallback")
    await db.open({})
  }

  return db
}

const parseRecord = (record: arrow.Table<any>) => {
  const records = record.toArray().map(t => t.toJSON())
  return JSON.parse(JSON.stringify(records))
}

const host = "http://localhost:3001"
const dataset = [
  { table: "company", url: `${host}/station/company.csv` },
  { table: "line_join", url: `${host}/station/line_join.csv` },
  { table: "line", url: `${host}/station/line.csv` },
  { table: "station", url: `${host}/station/station.csv` },
]

const createTableQuery = (table: string, url: string) => {
  return `CREATE OR REPLACE TABLE ${table} AS SELECT * FROM read_csv('${url}', all_varchar=true);`
}
export const database = async () => {

  const db = await buildDuckDbInstance()
  const conn = await db.connect()

  const setupDatabase = async () => {
    const debugDump = async () => {
      // schema作るのに便利
      for (const { table, url } of dataset) {
        console.log(createTableQuery(table, url))
      }
      for (const { table, url } of dataset) {
        const sample = await conn.query(`SELECT * FROM ${table} LIMIT 1;`)
        console.log(table, JSON.stringify(Object.keys(parseRecord(sample)[0])))
      }

    }
    const showTables = async () => {
      const list = await conn.query(`SHOW TABLES;`)

      return list.toArray().map(t => t.toJSON()).map(t => t.table_name)
    }

    const createTable = async (table: string, url: string) => {
      console.log(`Create table ${table}`)
      const filename = `${table}.csv`

      await db.registerFileURL(filename, url, duckdb.DuckDBDataProtocol.HTTP, false)
      await conn.query(createTableQuery(table, url))

    }

    const loadAllData = async () => {
      console.log("load")
      const existTable = await showTables()
      // await conn.query(`CREATE TABLE dummy (id INTEGER PRIMARY KEY, name TEXT);`)
      // await conn.query(`DROP TABLE dummy;`)
      for (const { table, url } of dataset) {
        if (existTable.includes(table)) {
          continue
        }
        await createTable(table, url)
      }
    }
    await loadAllData()
  }
  await setupDatabase()

  return {
    listStation: async () => {
      const result = await conn.query(`
        SELECT line, company 
        FROM line
        LEFT JOIN company ON line.company_cd = company.company_cd
      `)
      const record = parseRecord(result)
      const schema = z.array(z.object({
        line: LineSchema,
        company: CompanySchema
      }))
      const parsed = schema.safeParse(record)
      return parsed.success ? parsed.data : []
    },
    lineConnection: async (stationCd: string) => {
      const result = await conn.query(`
        SELECT s1, l1, l2, s2
        FROM station AS s1
        LEFT JOIN line_join AS l1 ON l1.station_cd1 = s1.station_cd
        LEFT JOIN line_join AS l2 ON l2.station_cd1 = s1.station_cd
        LEFT JOIN station AS s2 ON l2.station_cd2 = s2.station_cd
        WHERE s1.station_cd = ${stationCd}
        `)
      // LEFT JOIN station AS s2 ON l1.station_cd2 = s2.station_cd
      const record = parseRecord(result)
      console.log(record)
      return record
      // return parsed.success ? parsed.data : []
    },
    searchAny: async (query: string) => {
      const result = await conn.query(`
        SELECT station
        FROM station
        WHERE station_name LIKE '%${query}%'
      `)
      // LEFT JOIN station AS s2 ON l1.station_cd2 = s2.station_cd
      const record = parseRecord(result)
      const schema = z.array(z.object({
        station: StationSchema
      }))
      const parsed = schema.safeParse(record)
      return parsed.success ? parsed.data.map(s => s.station) : []
    }
  }
}

type Database = Awaited<ReturnType<typeof database>>
export type StationResult = Awaited<ReturnType<Database["searchAny"]>>
