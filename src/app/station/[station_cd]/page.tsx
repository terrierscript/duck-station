import { Station } from "./Station"

const Page = async ({ params }: PageProps<"/station/[station_cd]">) => {
  const { station_cd } = await params
  return (
    <Station station_cd={station_cd} />
  )
}
export default Page