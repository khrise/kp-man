import React from "react"
import { cn } from "@/lib/utils"

interface CheckboxProps {
  id?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function Checkbox({ id, checked = false, onCheckedChange, disabled = false, className }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      disabled={disabled}
      className={cn("h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500", className)}
    />
  )
}
