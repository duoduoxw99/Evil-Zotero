import { useEffect, useRef } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

type Props = {
  isOn: boolean;
  onToggle: () => void;
};

export default function ModeToggleButton({ isOn, onToggle }: Props) {
  const containerRef = useRef<HTMLButtonElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 150 };
  const translateX = useSpring(mouseX, springConfig);
  const translateY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const relX = (e.clientX - centerX) / (window.innerWidth / 2);
      const relY = (e.clientY - centerY) / (window.innerHeight / 2);

      const maxMove = isOn ? 15 : 20;
      mouseX.set(relX * maxMove);
      mouseY.set(relY * maxMove);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY, isOn]);

  const angryPathLeft = "M 10 45 C 10 25, 60 20, 90 55 C 70 95, 10 85, 10 45 Z";
  const angryPathRight = "M 90 45 C 90 25, 40 20, 10 55 C 30 95, 90 85, 90 45 Z";
  const cutePath = "M 50 50 m -40, 0 a 40,40 0 1,0 80,0 a 40,40 0 1,0 -80,0";

  const transition = { duration: 0.8, ease: [0.4, 0, 0.2, 1] as const };

  return (
    <motion.button 
      ref={containerRef}
      onClick={onToggle}
      animate={{ 
        backgroundColor: isOn ? "#ffffff" : "#000000",
        scale: isOn ? 1.05 : 1
      }}
      transition={transition}
      className={`relative w-64 h-64 rounded-full shadow-2xl flex items-center justify-center overflow-hidden cursor-pointer border-4 ${isOn ? 'border-neutral-200' : 'border-transparent'}`}
    >
      <div className="flex gap-6 items-center justify-center w-full px-4 z-10">

        {/* 左眼 */}
        <div className="w-24 h-24">
          <svg viewBox="0 0 100 100">
            <defs>
              <clipPath id="left-eye-clip">
                <motion.path 
                  animate={{ d: isOn ? cutePath : angryPathLeft }}
                  transition={transition}
                />
              </clipPath>
            </defs>

            <motion.path 
              animate={{ 
                d: isOn ? cutePath : angryPathLeft,
                fill: isOn ? "#f0f0f0" : "#ffffff"
              }}
              transition={transition}
            />

            <g clipPath="url(#left-eye-clip)">
              <motion.g style={{ x: translateX, y: translateY }}>
                <motion.circle cx="50" cy="50" r={isOn ? 22 : 18} fill="black"/>
              </motion.g>
            </g>
          </svg>
        </div>

        {/* 右眼 */}
        <div className="w-24 h-24">
          <svg viewBox="0 0 100 100">
            <defs>
              <clipPath id="right-eye-clip">
                <motion.path 
                  animate={{ d: isOn ? cutePath : angryPathRight }}
                  transition={transition}
                />
              </clipPath>
            </defs>

            <motion.path 
              animate={{ 
                d: isOn ? cutePath : angryPathRight,
                fill: isOn ? "#f0f0f0" : "#ffffff"
              }}
              transition={transition}
            />

            <g clipPath="url(#right-eye-clip)">
              <motion.g style={{ x: translateX, y: translateY }}>
                <motion.circle cx="50" cy="50" r={isOn ? 22 : 18} fill="black"/>
              </motion.g>
            </g>
          </svg>
        </div>
      </div>
    </motion.button>
  );
}