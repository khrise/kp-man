"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const AccordionContext = React.createContext<{
  collapsible?: boolean
  type?: "single" | "multiple"
} | null>(null)

const AccordionItemContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
  disabled?: boolean
} | null>(null)

interface AccordionProps {
  children: React.ReactNode
  type?: "single" | "multiple"
  collapsible?: boolean
  className?: string
}

const Accordion = React.forwardRef<
  HTMLDivElement,
  AccordionProps
>(({ className, children, type = "single", collapsible = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("", className)}
    {...props}
  >
    <AccordionContext.Provider value={{ collapsible, type }}>
      {children}
    </AccordionContext.Provider>
  </div>
))
Accordion.displayName = "Accordion"

interface AccordionItemProps {
  children: React.ReactNode
  value: string
  disabled?: boolean
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  AccordionItemProps
>(({ className, children, disabled, open = false, onOpenChange, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props}>
    <AccordionItemContext.Provider value={{ open, onOpenChange: onOpenChange || (() => {}), disabled }}>
      {children}
    </AccordionItemContext.Provider>
  </div>
))
AccordionItem.displayName = "AccordionItem"

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  className?: string
}

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  AccordionTriggerProps
>(({ className, children, ...props }, ref) => {
  const itemContext = React.useContext(AccordionItemContext)
  
  if (!itemContext) {
    throw new Error("AccordionTrigger must be used within an AccordionItem")
  }

  const { open, onOpenChange, disabled } = itemContext

  return (
    <button
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      onClick={() => onOpenChange(!open)}
      disabled={disabled}
      aria-expanded={open}
      data-state={open ? "open" : "closed"}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </button>
  )
})
AccordionTrigger.displayName = "AccordionTrigger"

interface AccordionContentProps {
  children: React.ReactNode
  className?: string
  /**
   * Maximum height when accordion is open. Use Tailwind CSS max-height classes.
   * @default "max-h-96"
   * @example "max-h-96" | "max-h-none" | "max-h-screen"
   */
  maxHeight?: string
}

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  AccordionContentProps
>(({ className, children, maxHeight = "max-h-96", ...props }, ref) => {
  const itemContext = React.useContext(AccordionItemContext)
  
  if (!itemContext) {
    throw new Error("AccordionContent must be used within an AccordionItem")
  }

  const { open } = itemContext

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden text-sm transition-all duration-200 ease-in-out",
        open ? `${maxHeight} opacity-100` : "max-h-0 opacity-0"
      )}
      data-state={open ? "open" : "closed"}
      {...props}
    >
      <div className={cn("pb-4 pt-0", className)}>
        {children}
      </div>
    </div>
  )
})
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }