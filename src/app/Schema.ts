import z from "zod"

const companyKeys = ["company_cd", "rr_cd", "company_name", "company_name_k", "company_name_h", "company_name_r", "company_url", "company_type", "e_status", "e_sort"] as const

export const CompanySchema = z.record(z.enum(companyKeys), z.string().nullable())

const lineJoinKeys = ["line_cd", "station_cd1", "station_cd2"] as const
export const LineJoinSchema = z.record(z.enum(lineJoinKeys), z.string().nullable())

const lineKeys = ["line_cd", "company_cd", "line_name", "line_name_k", "line_name_h", "line_color_c", "line_color_t", "line_type", "lon", "lat", "zoom", "e_status", "e_sort"] as const
export const LineSchema = z.record(z.enum(lineKeys), z.string().nullable())

const stationKeys = ["station_cd", "station_g_cd", "station_name", "station_name_k", "station_name_r", "line_cd", "pref_cd", "post", "address", "lon", "lat", "open_ymd", "close_ymd", "e_status", "e_sort"] as const
export const StationSchema = z.record(z.enum(stationKeys), z.string().nullable())
