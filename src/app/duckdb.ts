import * as duckdb from '@duckdb/duckdb-wasm'
import { compressTextToGzip } from './compress'
import arrow from 'apache-arrow'
import z from 'zod'
import { CompanySchema, LineSchema } from './Schema'
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


  return db
}
const generateDb = async () => {
  const db = await buildDuckDbInstance()
  const conn = await db.connect()
  return { db, conn }
}

const parseRecord = (record: arrow.Table<any>) => {
  const records = record.toArray().map(t => t.toJSON())
  return JSON.parse(JSON.stringify(records))
}

export const database = async () => {
  const { db, conn } = await generateDb()
  const showTables = async () => {
    const list = await conn.query(`SHOW TABLES;`)

    console.log(`Tables:`, list.toArray().map(t => t.toJSON()))
  }

  const loadData = async () => {
    console.log("load")
    const dataset = [
      "company", "line_join", "line", "station"
    ]
    const host = "http://localhost:3001"
    for (let table of dataset) {
      const url = `${host}/station/${table}.csv`
      const filename = `${table}.csv`
      await db.registerFileURL(filename, url, duckdb.DuckDBDataProtocol.HTTP, false)
      const query = `CREATE TABLE ${table} AS SELECT * FROM read_csv('${url}', all_varchar=true);`
      await conn.query(query)

      // const sample = await conn.query(`SELECT * FROM ${table} LIMIT 1;`)
      // console.log(table, JSON.stringify(Object.keys(parseRecord(sample)[0])))
    }
  }
  await loadData()

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
      console.log(parsed)
      return parsed.success ? parsed.data : []
    }
  }
}
