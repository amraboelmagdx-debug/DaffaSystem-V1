/** Inline script injected in root layout <head> to prevent theme flash (FOUC). */
export const THEME_STORAGE_KEY = "theme";

export function themeInitScript(storageKey = THEME_STORAGE_KEY, defaultTheme = "dark") {
  return `(function(){try{var k=${JSON.stringify(storageKey)};var d=${JSON.stringify(defaultTheme)};var t=localStorage.getItem(k)||d;if(t==="system"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}var r=document.documentElement;r.classList.remove("light","dark");r.classList.add(t);r.style.colorScheme=t}catch(e){}})();`;
}
