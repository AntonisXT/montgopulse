"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 1.02 }}
            transition={{
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1], // Custom Palantir-esque easing
            }}
            className="w-full h-full"
        >
            {children}
        </motion.div>
    );
}
