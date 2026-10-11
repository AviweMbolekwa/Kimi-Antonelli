// Resolve a CSS custom property (e.g. "--accent") to its computed colour string, for canvas/WebGL use.

export const readToken = (token) => {
  const probe = document.createElement('span');
  probe.style.cssText = `position:absolute;visibility:hidden;color:var(${token})`;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
};
