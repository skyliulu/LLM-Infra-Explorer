import {LanguageProvider} from './lib/LanguageContext';
import MainDashboard from './MainDashboard.jsx';

export default function App() {
  return <LanguageProvider><MainDashboard /></LanguageProvider>;
}
