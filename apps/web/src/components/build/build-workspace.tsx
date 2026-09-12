"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";

import { BuildConsole } from "./build-console";
import { BuildTopBar } from "./build-top-bar";
import { CancelBuildModal } from "./cancel-build-modal";
import { ExecutionPipeline } from "./execution-pipeline";

export function BuildWorkspace() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="relative w-full">
      <div
        className={cn(
          "flex w-full flex-col transition-all duration-300",
          modalOpen
            ? "pointer-events-none opacity-40 blur-[3px]"
            : "opacity-100",
        )}
      >
        <BuildTopBar onRequestCancel={() => setModalOpen(true)} />
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-6 py-4">
          <ExecutionPipeline />
          <BuildConsole />
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-brand-dark/80 p-4 backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CancelBuildModal onClose={() => setModalOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
