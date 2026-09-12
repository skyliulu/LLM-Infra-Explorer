import {createContext, useContext, useState, useEffect} from 'react';
// In-memory configuration survives chapter unmounts. Timeline state deliberately does not.
export const ExperimentContext = createContext(null);
export function useExperimentState(key, initial) {
  const session = useContext(ExperimentContext);
  const [value,setValue] = useState(() => session && Object.hasOwn(session.values,key) ? session.values[key] : typeof initial==='function'?initial():initial);
  useEffect(()=>{if(session) session.values[key]=value;},[session,key,value]);
  return [value,setValue];
}
