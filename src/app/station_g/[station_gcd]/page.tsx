import { Connection } from "./Connection"

const Page = async ({ params }: PageProps<"/station_g/[station_gcd]">) => {
  const { station_gcd } = await params
  return <Connection station_gcd={station_gcd} />
}

export default Page