
import { SigmaDynamic } from "./SigmaDynamic"

const Page = async ({ params }: PageProps<"/station_gg/[station_gcd]">) => {

  const { station_gcd } = await params
  return <SigmaDynamic station_gcd={station_gcd} />
}
export default Page