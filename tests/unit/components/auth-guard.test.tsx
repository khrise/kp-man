import React from "react"
import { render, screen } from "@testing-library/react"
import { AuthGuard } from "@/components/auth-guard"

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}))

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

const mockUseSession = useSession as jest.Mock
const mockUseRouter = useRouter as jest.Mock

describe("AuthGuard", () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({ push: jest.fn() })
  })

  it("renders children when the session is authenticated", () => {
    mockUseSession.mockReturnValue({ status: "authenticated" })
    render(<AuthGuard><span>Protected content</span></AuthGuard>)
    expect(screen.getByText("Protected content")).toBeInTheDocument()
  })

  it("renders a loading spinner while the session is loading", () => {
    mockUseSession.mockReturnValue({ status: "loading" })
    const { container } = render(<AuthGuard><span>Protected content</span></AuthGuard>)
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument()
    expect(container.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("renders nothing (null) when unauthenticated", () => {
    mockUseSession.mockReturnValue({ status: "unauthenticated" })
    const { container } = render(<AuthGuard><span>Protected content</span></AuthGuard>)
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument()
    expect(container.firstChild).toBeNull()
  })

  it("redirects to /admin/login when unauthenticated", () => {
    const push = jest.fn()
    mockUseRouter.mockReturnValue({ push })
    mockUseSession.mockReturnValue({ status: "unauthenticated" })
    render(<AuthGuard><span>X</span></AuthGuard>)
    expect(push).toHaveBeenCalledWith("/admin/login")
  })

  it("does not redirect while loading", () => {
    const push = jest.fn()
    mockUseRouter.mockReturnValue({ push })
    mockUseSession.mockReturnValue({ status: "loading" })
    render(<AuthGuard><span>X</span></AuthGuard>)
    expect(push).not.toHaveBeenCalled()
  })
})
