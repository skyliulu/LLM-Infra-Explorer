import React,{createContext,useContext,useEffect,useState} from 'react';

const ThemeContext=createContext(null);
const KEY='infra-explorer-theme';
const valid=value=>['light','dark','system'].includes(value);
export function ThemeProvider({children}){
 const [preference,setPreference]=useState(()=>{try{const value=localStorage.getItem(KEY);return valid(value)?value:'system';}catch{return 'system';}});
 const [systemDark,setSystemDark]=useState(()=>window.matchMedia('(prefers-color-scheme: dark)').matches);
 const theme=preference==='system'?(systemDark?'dark':'light'):preference;
 useEffect(()=>{const media=window.matchMedia('(prefers-color-scheme: dark)');const update=()=>setSystemDark(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;try{localStorage.setItem(KEY,preference);}catch{/* Session-only preference when storage is unavailable. */}},[theme,preference]);
 useEffect(()=>{const sync=event=>{if(event.key===KEY)setPreference(valid(event.newValue)?event.newValue:'system');};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
 return <ThemeContext.Provider value={{theme,preference,setPreference}}>{children}</ThemeContext.Provider>;
}
export const useTheme=()=>useContext(ThemeContext);
