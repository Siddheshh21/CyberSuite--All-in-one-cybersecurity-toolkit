import React from "react";
import { motion } from "framer-motion";

export default function BreachSummaryCard({ result }){
  const { found, count, email, summary } = result;
  const headline = found ? `Oh no — your email has been found in ${count} breach${count>1? "es": ""}!` : "Good news — no breaches found!";
  const border = found ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50";
  const recency = summary?.recency_highlight;

  // Component removed: no longer needed for new UI
}
