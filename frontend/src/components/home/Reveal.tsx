import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/*
 * One shared entrance for the landing page's below-fold sections: a short
 * fade-up the first time they scroll into view, on the iOS decelerate curve
 * the shell already ships (`--ease-out` / 0.32,0.72,0,1). Reduced-motion
 * visitors get the same markup with no animation — the tab bar, drawer and
 * drops feed all opt out the same way.
 */
export const Reveal: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
    >
      {children}
    </motion.div>
  );
};

export default Reveal;
