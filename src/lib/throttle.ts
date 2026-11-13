/** Runs fn at most once per `ms`, always including a trailing call so the last change is never missed. */
export function throttle(fn: () => void, ms: number): (() => void) & { cancel: () => void } {
  let last = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const run = () => {
    last = Date.now()
    timer = undefined
    fn()
  }
  const throttled = () => {
    if (timer) return
    const wait = ms - (Date.now() - last)
    if (wait <= 0) run()
    else timer = setTimeout(run, wait)
  }
  throttled.cancel = () => clearTimeout(timer)
  return throttled
}
