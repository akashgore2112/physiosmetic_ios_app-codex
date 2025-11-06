// Dev note: If you still see a runtime error about __extends,
// clear Metro cache and ensure tslib is installed.
// Terminal:
//   npm i tslib@^2.6.3
//   npx expo start -c
export function assertTslibLoaded() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('tslib');
  } catch {
    // Dev visibility only; avoid throwing in production-like builds
    // eslint-disable-next-line no-console
    console.warn('[tslibGuard] tslib not installed/linked');
  }
}
