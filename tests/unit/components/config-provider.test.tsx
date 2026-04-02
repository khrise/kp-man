import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { ConfigProvider, useConfig } from "@/components/config-provider"

jest.mock("@/app/actions/config", () => ({
  getClubName: jest.fn(),
}))

import { getClubName } from "@/app/actions/config"

const mockGetClubName = getClubName as jest.Mock

function ConfigConsumer() {
  const { config, loading } = useConfig()
  if (loading) return <span>loading</span>
  return <span>club: {config?.clubName ?? "none"}</span>
}

describe("ConfigProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("provides the club name from the server action", async () => {
    mockGetClubName.mockResolvedValueOnce("Tennis Club X")
    render(
      <ConfigProvider>
        <ConfigConsumer />
      </ConfigProvider>,
    )
    await waitFor(() => expect(screen.getByText("club: Tennis Club X")).toBeInTheDocument())
  })

  it("falls back to Sports Club when the server action throws", async () => {
    mockGetClubName.mockRejectedValueOnce(new Error("DB unavailable"))
    render(
      <ConfigProvider>
        <ConfigConsumer />
      </ConfigProvider>,
    )
    await waitFor(() => expect(screen.getByText("club: Sports Club")).toBeInTheDocument())
  })

  it("shows a loading spinner before the config resolves", () => {
    mockGetClubName.mockReturnValueOnce(new Promise(() => {})) // never resolves
    const { container } = render(
      <ConfigProvider>
        <ConfigConsumer />
      </ConfigProvider>,
    )
    expect(container.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("provides config values to consumers through context", async () => {
    mockGetClubName.mockResolvedValueOnce("My Club")
    render(
      <ConfigProvider>
        <ConfigConsumer />
      </ConfigProvider>,
    )
    await waitFor(() => expect(screen.getByText("club: My Club")).toBeInTheDocument())
    expect(screen.queryByText("loading")).not.toBeInTheDocument()
  })
})
