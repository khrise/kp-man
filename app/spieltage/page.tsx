import { SpieltageClient } from "./spieltage-client"

export default async function SpieltageApp() {
  // This will be handled client-side since we're using localStorage
  // We'll pass the data fetching to the client component
  return <SpieltageClient />
}
