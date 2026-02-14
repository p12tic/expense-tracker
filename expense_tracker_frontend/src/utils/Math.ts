export function checkIfVirtTableNeedsFetch(
  scrollTop: number,
  clientHeight: number,
  rowHeight: number,
  stateLength: number,
  minNotVisible: number,
): boolean {
  const lastVisibleIndex = Math.ceil((scrollTop + clientHeight) / rowHeight);
  return stateLength - lastVisibleIndex < minNotVisible;
}
