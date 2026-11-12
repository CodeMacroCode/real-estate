"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";

interface FadeUpProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function FadeUp({ children, delay = 0, className = "" }: FadeUpProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.25, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerGridProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerGrid({ children, className = "" }: StaggerGridProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerItem({ children, className = "" }: StaggerItemProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface InteractiveCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function InteractiveCard({ children, className = "", onClick }: InteractiveCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={shouldReduceMotion ? {} : { y: -4 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

interface TapButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export function TapButton({
  children,
  className = "",
  onClick,
  type = "button",
  disabled = false,
}: TapButtonProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileTap={shouldReduceMotion || disabled ? {} : { scale: 0.97 }}
      transition={{ duration: 0.1 }}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.button>
  );
}

interface LocalityChipMotionProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function LocalityChipMotion({ children, className = "", onClick }: LocalityChipMotionProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      whileHover={shouldReduceMotion ? {} : { y: -2 }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.button>
  );
}

