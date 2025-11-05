export function requireLoginGuard(
  isLoggedIn: boolean,
  onNotLoggedIn: () => void
): boolean {
  if (!isLoggedIn) {
    onNotLoggedIn();
    return false;
  }
  return true;
}

