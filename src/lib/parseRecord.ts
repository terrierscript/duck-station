import * as arrow from 'apache-arrow'

// export const parseArrowTableSimple = (record: arrow.Table) => {
//   const records = record.toArray().map(t => {
//     return t.toJSON()
//   })
//   return JSON.parse(JSON.stringify(records))
// }

export const parseArrowTable = (record: arrow.Table) => {
  return record.toArray().map(t => {
    return JSON.parse(
      JSON.stringify(t, (_, value) => {
        if (typeof value === "bigint") {
          return Number(value)
        }
        return value
      })
    )
  })
}
