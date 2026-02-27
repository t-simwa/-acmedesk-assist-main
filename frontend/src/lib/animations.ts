import { type Variants } from "framer-motion";

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" }
  },
  exit: { opacity: 0 }
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  },
  exit: { opacity: 0, y: -10 }
};

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  exit: { opacity: 0, y: -10 }
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }
  },
  exit: { opacity: 0, scale: 0.95 }
};

export const staggerChildren: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0
    }
  },
  exit: { opacity: 0 }
};

export const counterUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" }
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } }
};

export const listItem: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: { 
      delay: i * 0.08,
      duration: 0.3, 
      ease: "easeOut" 
    }
  })
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.4, 
      ease: [0.34, 1.56, 0.64, 1] 
    }
  },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
};

export const toastVariants: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" }
  },
  exit: { opacity: 0, x: 50, transition: { duration: 0.2 } }
};

export const hoverLift: Variants = {
  rest: { y: 0, transition: { duration: 0.2 } },
  hover: { 
    y: -4,
    transition: { duration: 0.2, ease: "easeOut" }
  }
};

export const shimmer: Variants = {
  hidden: { backgroundPosition: "200% 0" },
  visible: { 
    backgroundPosition: "-200% 0",
    transition: { 
      repeat: Infinity, 
      duration: 1.5, 
      ease: "linear" 
    }
  }
};

export const pulse: Variants = {
  hidden: { scale: 1, opacity: 1 },
  visible: { 
    scale: 1.02,
    opacity: 1,
    transition: { 
      repeat: Infinity, 
      duration: 2, 
      ease: "easeInOut" 
    }
  }
};

export const accordionVariants: Variants = {
  hidden: { 
    height: 0, 
    opacity: 0,
    transition: { duration: 0.2 }
  },
  visible: { 
    height: "auto", 
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  },
  exit: { 
    height: 0, 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

export interface AnimationConfig {
  duration?: number;
  delay?: number;
  ease?: number[] | "easeIn" | "easeOut" | "easeInOut" | "linear" | "circIn" | "circOut" | "circInOut" | "backIn" | "backOut" | "backInOut" | "anticipate";
}

export function createCustomAnimation(config: AnimationConfig): Variants {
  const { duration = 0.4, delay = 0, ease = "easeOut" } = config;
  
  return {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration, delay, ease }
    },
    exit: { opacity: 0, transition: { duration: duration * 0.5 } }
  };
}
