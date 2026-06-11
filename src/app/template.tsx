"use client";

import { motion } from "framer-motion";

/**
 * App Router template - re-mounts on every navigation, so this gives a
 * subtle fade-up on each page change. Keeps nav feeling smooth instead of
 * snapping. Fast (180ms) + easeOut so it never feels sluggish.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
