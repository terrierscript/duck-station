import * as duckdb from '@duckdb/duckdb-wasm'
import arrow from 'apache-arrow'
import z from 'zod'
import { CompanySchema, LineJoinSchema, LineSchema, StationSchema } from './Schema'
import { buildDuckDbInstance } from '../app/buildDuckDbInstance'
import { parseArrowTable } from './parseRecord'


const parseArray = <T, U extends z.ZodType<T>>(result: arrow.Table<any>, schema: U): z.core.output<U> | null => {
  const record = parseArrowTable(result)
  const parsedRecord = schema.safeParse(record)
  if (parsedRecord.success === false) {
    console.log(record)
    console.warn(z.treeifyError(parsedRecord.error))
    console.warn(z.flattenError(parsedRecord.error))
    // console.warn(z.prettifyError(parsedRecord.error))
    return null
  }
  const data: z.core.output<U> = parsedRecord.data
  return data
}


const createTableQuery = (table: string, url: string) => {
  return `CREATE OR REPLACE TABLE ${table} AS SELECT * FROM read_csv('${url}', all_varchar=true);`
}

export const database = async (host: string) => {

  const dataset = [
    { table: "company", url: `${host}/station/company.csv` },
    { table: "line_join", url: `${host}/station/line_join.csv` },
    { table: "line", url: `${host}/station/line.csv` },
    { table: "station", url: `${host}/station/station.csv` },
  ]
  const db = await buildDuckDbInstance()
  const conn = await db.connect()

  const debugDump = async () => {
    // schema作るのに便利
    for (const { table, url } of dataset) {
      console.log(createTableQuery(table, url))
    }
    for (const { table, url } of dataset) {
      const sample = await conn.query(`SELECT * FROM ${table} LIMIT 1;`)
      console.log(table, parseArrowTable(sample)[0])
    }

  }
  const showTables = async () => {
    const list = await conn.query(`SHOW TABLES;`)

    return list.toArray().map(t => t.toJSON()).map(t => t.name)
  }

  const createTable = async (table: string, url: string) => {
    console.log(`Create table ${table}`)
    const filename = `${table}.csv`

    await db.registerFileURL(filename, url, duckdb.DuckDBDataProtocol.HTTP, false)
    await conn.query(createTableQuery(table, url))

  }

  const loadAllData = async () => {
    const existTable = await showTables()
    for (const { table, url } of dataset) {
      if (existTable.includes(table)) continue
      await createTable(table, url)
    }
  }

  await loadAllData()
  await debugDump()

  return {
    listCompany: async () => {
      const r = await conn.query(`SELECT * FROM company LIMIT 1;`)
      console.log(r.toArray().map(t => Object.keys(t.toJSON())))
      // const result = await conn.query(`
      //   SELECT company.*, line.* FROM company JOIN line ON line.company_cd = company.company_cd LIMIT 1
      // `)
      // const record = parseArrowTable(result)
      // const result2 = await conn.query(`
      //   SELECT company, line FROM company JOIN line ON line.company_cd = company.company_cd LIMIT 1
      // `)
      // const record2 = parseArrowTable(result2)
      // const result = await conn.query(`
      //   SELECT line, company 
      //   FROM line
      //   LEFT JOIN company ON line.company_cd = company.company_cd
      // `)
      // console.log(JSON.stringify(record, null, 2))
      // console.log(JSON.stringify(record2, null, 2))
      // const schema = z.array(z.object({
      //   line: LineSchema,
      //   company: CompanySchema
      // }))

      // return parseArray(result, schema)
    },
    listStation: async () => {
      const result = await conn.query(`
        SELECT 
          station.station_g_cd, 
          ARRAY_AGG(DISTINCT station.station_name) AS station_names,
          ARRAY_AGG(station) AS stations
        FROM station
        GROUP BY station.station_g_cd
        `)

      const schema = z.array(z.object({
        station_g_cd: z.string().nullish(),
        station_names: z.array(z.string()).nullish(),
        stations: z.array(StationSchema).nullish()
      }))

      return parseArray(result, schema)
    },
    getStationByGcd: async (stationGCd: string) => {
      const result = await conn.query(`
        SELECT 
          station.station_g_cd, 
          ARRAY_AGG(DISTINCT station.station_name) AS station_names,
          ARRAY_AGG(station) AS stations
        FROM station
        WHERE station.station_g_cd = ${stationGCd}
        GROUP BY station.station_g_cd
        `)

      const schema = z.array(z.object({
        station_g_cd: z.string().nullish(),
        station_names: z.array(z.string()).nullish(),
        stations: z.array(StationSchema).nullish()
      }))

      return parseArray(result, schema)
    },

    lineConnection2: async (stationGCd: string) => {
      const pp = await conn.prepare(`
        WITH 
        both_lines AS (
          SELECT line_cd, from_station_cd: station_cd1, dest_station_cd: station_cd2 FROM line_join
          UNION BY NAME
          SELECT line_cd, from_station_cd: station_cd2, dest_station_cd: station_cd1 FROM line_join
        )
        SELECT dest_station AS station, line
        FROM station AS from_station
          JOIN both_lines ON both_lines.from_station_cd = from_station.station_cd
          JOIN station AS dest_station ON dest_station.station_cd = both_lines.dest_station_cd
          JOIN line ON dest_station.line_cd = line.line_cd
        WHERE from_station.station_g_cd = $1
        `)
      const result = await pp.query(stationGCd)

      const schema = z.array(z.object({
        station: StationSchema,
        line: LineSchema,
      }))
      return parseArray(result, schema)
      // return parsed.success ? parsed.data : []
    },
    searchStation: async (query: string) => {
      const result = await conn.query(`
        SELECT station
        FROM station
        WHERE station_name LIKE '%${query}%'
      `)
      const schema = z.array(z.object({
        station: StationSchema
      }))
      return parseArray(result, schema)
    },
    companyLineStationTree: async () => {
      const result = await conn.query(`
        WITH station_line AS (
          SELECT 
            ANY_VALUE(line) AS line, 
            ARRAY_AGG(station) AS station
          FROM station LEFT JOIN line ON station.line_cd = line.line_cd
          GROUP BY line.line_cd
        )
        SELECT 
          ANY_VALUE(company) AS company, 
          ARRAY_AGG(station_line) AS station_line
        FROM company LEFT JOIN station_line ON company.company_cd = station_line.line.company_cd
        GROUP BY company.company_cd
      `)
      const schema = z.array(z.object({
        company: CompanySchema,
        station_line: z.array(z.object({
          line: LineSchema.nullish(),
          station: z.array(StationSchema).nullish()
        }))
      }))
      return parseArray(result, schema)
    },
    testNested: async () => {

      const result = await conn.query(`
        SELECT 
          1 AS v_int,
          1.2::FLOAT AS v_float,
          NULL AS v_null,
          {"a":2, "b":'c', "d":NULL} AS v_struct, 
          [1,2,3] AS v_list,
          ['abc','def'] AS v_str_list,
          map([1, 2], ['a', 'b']) AS v_map,
          DATE '1992-03-27' - INTERVAL 5 DAY AS v_date,
          TIME '12:34' AS v_time,
          'infinity'::DATE AS v_infinity,
          true AS v_boolean,
          { "a": { 
            "b":'c',
            "d": {
              "e": map([1,2],['a','b']) ,
              "f": DATE '1992-03-27' - INTERVAL 5 DAY,
              "g": {
                "h": false
              }
            }
          }} AS v_nested,
        `)

      const r = parseArrowTable(result)
      console.log("R", r[0])
      // console.log("R", r[0], JSON.stringify(r[0], null, 2))
      return r
    },
  }
}

type Database = Awaited<ReturnType<typeof database>>
export type DatabaseResponse<T extends keyof Database> = Awaited<ReturnType<Database[T]>>
