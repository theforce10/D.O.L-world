import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect } from 'react'

export function CountUp({
  value,
  duration = 1.2,
  delay = 0,
  className,
}: {
  value: number
  duration?: number
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  const count = useMotionValue(reduce ? value : 0)
  const rounded = useTransform(count, (v) => Math.round(v).toString())

  useEffect(() => {
    if (reduce) {
      count.set(value)
      return
    }
    const controls = animate(count, value, { duration, delay, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [count, value, duration, delay, reduce])

  return (
    <span className={className}>
      <span className="sr-only">{value}</span>
      <motion.span aria-hidden>{rounded}</motion.span>
    </span>
  )
}
