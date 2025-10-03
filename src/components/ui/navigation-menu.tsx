
import * as React from "react"
import { NavLink } from "react-router-dom"

/**
 * Simplified, accessible Navigation Menu for a LEFT SIDEBAR.
 * Replaces the complex Radix NavigationMenu with a predictable vertical list,
 * full-height, scrollable, and high-contrast items.
 *
 * Exports keep the same names so existing imports won't break.
 */

type DivProps = React.HTMLAttributes<HTMLDivElement>
type UlProps = React.HTMLAttributes<HTMLUListElement>
type LiProps = React.LiHTMLAttributes<HTMLLIElement>
type AnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement>

/** Root container */
export const NavigationMenu = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className = "", ...props }, ref) => (
    <nav
      ref={ref}
      className={[
        "sidebar flex h-screen min-h-screen w-full max-w-xs flex-col",
        "border-r bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75",
        "px-3 py-4",
        "overflow-y-auto",
        className,
      ].join(" ")}
      {...props}
    />
  )
)
NavigationMenu.displayName = "NavigationMenu"

/** List wrapper (vertical) */
export const NavigationMenuList = React.forwardRef<HTMLUListElement, UlProps>(
  ({ className = "", ...props }, ref) => (
    <ul
      ref={ref}
      className={["flex flex-col gap-2", className].join(" ")}
      {...props}
    />
  )
)
NavigationMenuList.displayName = "NavigationMenuList"

/** Item */
export const NavigationMenuItem = React.forwardRef<HTMLLIElement, LiProps>(
  ({ className = "", ...props }, ref) => (
    <li ref={ref} className={["list-none", className].join(" ")} {...props} />
  )
)
NavigationMenuItem.displayName = "NavigationMenuItem"

/** Link (uses react-router NavLink for active styles) */
export const NavigationMenuLink = React.forwardRef<HTMLAnchorElement, AnchorProps & { to?: string }>(
  ({ className = "", to, href, children, ...props }, ref) => {
    const target = to ?? href ?? "#"
    return (
      <NavLink
        to={target as string}
        ref={ref as any}
        className={({ isActive }) =>
          [
            "flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
            "text-gray-800 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            isActive ? "bg-gray-100 font-medium" : "bg-transparent",
            className,
          ].join(" ")
        }
        {...(props as any)}
      >
        {children}
      </NavLink>
    )
  }
)
NavigationMenuLink.displayName = "NavigationMenuLink"

/** Trigger/Content/Indicator/Viewport are no-ops to keep API compatibility */
export const NavigationMenuTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className = "", children, ...props }, ref) => (
    <button
      ref={ref}
      className={[
        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm",
        "hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
      <span aria-hidden>▾</span>
    </button>
  )
)
NavigationMenuTrigger.displayName = "NavigationMenuTrigger"

export const NavigationMenuContent = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={["ml-2 border-l pl-3", className].join(" ")} {...props} />
  )
)
NavigationMenuContent.displayName = "NavigationMenuContent"

export const NavigationMenuIndicator = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={["hidden", className].join(" ")} {...props} />
  )
)
NavigationMenuIndicator.displayName = "NavigationMenuIndicator"

export const NavigationMenuViewport = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={["hidden", className].join(" ")} {...props} />
  )
)
NavigationMenuViewport.displayName = "NavigationMenuViewport"

/** Style helper (kept for API compatibility) */
export function navigationMenuTriggerStyle(extra = "") {
  return [
    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
    "hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    extra,
  ].join(" ")
}
