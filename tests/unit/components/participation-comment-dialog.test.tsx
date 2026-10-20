import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ParticipationCommentDialog } from "@/components/participation-comment-dialog"

const translations = {
  title: "Add Comment",
  description: "Leave a comment about your participation",
  commentLabel: "Comment",
  commentPlaceholder: "Type your comment here",
  cancel: "Cancel",
  confirm: "Confirm",
}

describe("ParticipationCommentDialog", () => {
  it("renders the dialog title and description when open", () => {
    render(
      <ParticipationCommentDialog
        open={true}
        onOpenChange={jest.fn()}
        onConfirm={jest.fn()}
        translations={translations}
      />,
    )
    expect(screen.getByText("Add Comment")).toBeInTheDocument()
    expect(screen.getByText("Leave a comment about your participation")).toBeInTheDocument()
  })

  it("calls onConfirm with the entered text when the confirm button is clicked", async () => {
    const onConfirm = jest.fn()
    const user = userEvent.setup()
    render(
      <ParticipationCommentDialog
        open={true}
        onOpenChange={jest.fn()}
        onConfirm={onConfirm}
        translations={translations}
      />,
    )
    await user.type(screen.getByPlaceholderText("Type your comment here"), "See you there!")
    await user.click(screen.getByRole("button", { name: "Confirm" }))
    expect(onConfirm).toHaveBeenCalledWith("See you there!")
  })

  it("calls onConfirm with empty string when no comment is entered", async () => {
    const onConfirm = jest.fn()
    const user = userEvent.setup()
    render(
      <ParticipationCommentDialog
        open={true}
        onOpenChange={jest.fn()}
        onConfirm={onConfirm}
        translations={translations}
      />,
    )
    await user.click(screen.getByRole("button", { name: "Confirm" }))
    expect(onConfirm).toHaveBeenCalledWith("")
  })

  it("calls onOpenChange(false) and clears comment when cancel is clicked", async () => {
    const onOpenChange = jest.fn()
    const onConfirm = jest.fn()
    const user = userEvent.setup()
    render(
      <ParticipationCommentDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        translations={translations}
      />,
    )
    await user.type(screen.getByPlaceholderText("Type your comment here"), "Draft text")
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("resets the comment field after confirm", async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <ParticipationCommentDialog
        open={true}
        onOpenChange={jest.fn()}
        onConfirm={jest.fn()}
        translations={translations}
      />,
    )
    await user.type(screen.getByPlaceholderText("Type your comment here"), "hello")
    await user.click(screen.getByRole("button", { name: "Confirm" }))

    // Re-open the dialog – the textarea should be empty
    rerender(
      <ParticipationCommentDialog
        open={true}
        onOpenChange={jest.fn()}
        onConfirm={jest.fn()}
        translations={translations}
      />,
    )
    expect(screen.getByPlaceholderText("Type your comment here")).toHaveValue("")
  })
})
