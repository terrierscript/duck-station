import { Company } from "./Company"

const Page = async ({ params }: PageProps<"/station_g/[station_gcd]">) => {
  const { station_gcd } = await params
  return <Company />
}

export default Page