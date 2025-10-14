"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface ParticipationCommentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: "confirmed" | "maybe" | "declined"
  onConfirm: (comment: string) => void
  translations: {
    title: string
    description: string
    commentLabel: string
    commentPlaceholder: string
    cancel: string
    confirm: string
  }
}

export function ParticipationCommentDialog({
  open,
  onOpenChange,
  status,
  onConfirm,
  translations,
}: ParticipationCommentDialogProps) {
  const [comment, setComment] = useState("")

  const handleConfirm = () => {
    onConfirm(comment)
    setComment("")
    onOpenChange(false)
  }

  const handleCancel = () => {
    setComment("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{translations.title}</DialogTitle>
          <DialogDescription>{translations.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="comment">{translations.commentLabel}</Label>
            <Textarea
              id="comment"
              placeholder={translations.commentPlaceholder}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {translations.cancel}
          </Button>
          <Button onClick={handleConfirm}>{translations.confirm}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
