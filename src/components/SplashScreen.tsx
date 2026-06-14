//src/components/SplashScreen.tsx

'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  show: boolean
}

export default function SplashScreen({
  show,
}: Props) {

  return (
    <AnimatePresence>

      {show && (

        <motion.div
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.03,
          }}
          transition={{
            duration: 0.7,
            ease: 'easeInOut',
          }}
          className="
            fixed
            inset-0
            z-[9999]
            overflow-hidden
            bg-[#060816]
            flex
            items-center
            justify-center
          "
        >
             <div
                className="
        absolute
        top-[-120px]
        right-[-100px]
        w-[280px]
        h-[280px]
        rounded-full
        bg-cyan-500/20
        blur-3xl
      "
            />
            <div
                className="
        absolute
        bottom-[-120px]
        left-[-100px]
        w-[280px]
        h-[280px]
        rounded-full
        bg-violet-500/20
        blur-3xl
      "
            />
            <div
                className="
        absolute
        inset-0
        bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_40%)]
      "
            />

          {/* BACKGROUND GLOW */}
          <div className="absolute inset-0 overflow-hidden">

            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.4, 0.7, 0.4],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
              }}
              className="
                absolute
                -top-40
                -left-40
                w-96
                h-96
                bg-white/10
                rounded-full
                blur-3xl
              "
            />

            <motion.div
              animate={{
                scale: [1.1, 1, 1.1],
                opacity: [0.5, 0.2, 0.5],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
              }}
              className="
                absolute
                bottom-0
                right-0
                w-[400px]
                h-[400px]
                bg-violet-400/20
                rounded-full
                blur-3xl
              "
            />

          </div>

          {/* CONTENT */}
          <div className="relative z-10 flex flex-col items-center px-6">

            {/* LOGO */}
<motion.div
  initial={{
    opacity: 0,
    scale: 0.7,
    y: 20,
  }}
  animate={{
    opacity: 1,
    scale: 1,
    y: 0,
  }}
  transition={{
    duration: 0.8,
    ease: 'easeOut',
  }}
  className="
    relative
    w-28
    h-28
    sm:w-32
    sm:h-32
    rounded-[2rem]
    bg-white/10
    backdrop-blur-2xl
    border
    border-white/20
    flex
    items-center
    justify-center
    shadow-[0_20px_80px_rgba(255,255,255,0.15)]
  "
>

  {/* GLOW */}
  <motion.div
    animate={{
      scale: [1, 1.15, 1],
      opacity: [0.3, 0.6, 0.3],
    }}
    transition={{
      duration: 3,
      repeat: Infinity,
    }}
    className="
      absolute
      inset-0
      rounded-[2rem]
      bg-white/10
      blur-xl
    "
  />

  {/* ICON ANIMATION */}
  <motion.div
    animate={{
      y: [0, -8, 0],
      rotate: [0, -4, 4, 0],
    }}
    transition={{
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
    className="relative z-10"
  >

    <motion.span
      animate={{
        opacity: [0.8, 1, 0.8],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
      }}
      className="
        text-5xl
        sm:text-6xl
        font-black
        text-white
        tracking-tight
      "
    >
      D
    </motion.span>

  </motion.div>

</motion.div>

            {/* SUBTITLE */}
            <motion.p
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 0.7,
              }}
              transition={{
                delay: 0.4,
              }}
              className="
                mt-2
                text-sm
                sm:text-base
                text-white/70
                text-center
              "
            >
              Fast • Secure • Modern
            </motion.p>

            {/* LOADING */}
            <div className="mt-10 w-52 sm:w-64">

              <div className="
                h-1.5
                rounded-full
                overflow-hidden
                bg-white/10
                backdrop-blur-xl
              ">

                <motion.div
                  initial={{
                    width: 0,
                  }}
                  animate={{
                    width: '100%',
                  }}
                  transition={{
                    duration: 2,
                    ease: 'easeInOut',
                  }}
                  className="
                    h-full
                    rounded-full
                    bg-white
                  "
                />

              </div>

            </div>

          </div>

        </motion.div>

      )}

    </AnimatePresence>
  )
}