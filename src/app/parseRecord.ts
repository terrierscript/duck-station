import * as arrow from 'apache-arrow'

export const parseArrowTableSimple = (record: arrow.Table) => {
  const records = record.toArray().map(t => {
    return t.toJSON()
  })
  return JSON.parse(JSON.stringify(records))
}


const parseValue = (val: any) => {
  if (typeof val === "bigint") {
    return Number(val)
  }
  return val
}


export const parseArrowTable = (record: arrow.Table) => {
  return JSON.parse(JSON.stringify(record.toArray(), (_, value) => {
    if (typeof value === "bigint") {
      return Number(value)
    }
    return value
  }))
}
