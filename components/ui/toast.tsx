import * as React from "react"
import { motion } from "framer-motion"

interface ToastProps {
  children: React.ReactNode
  variant?: "default" | "success" | "error"
  className?: string
}

export const Toast: React.FC<ToastProps> = ({ children, variant = "default", className = "" }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className={`p-4 rounded-lg shadow-lg ${className}`}
    >
      {children}
    </motion.div>
  )
}
