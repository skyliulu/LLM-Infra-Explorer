import {ThemeProvider} from './lib/ThemeContext';
import {LanguageProvider} from './lib/LanguageContext';
import MainDashboard from './MainDashboard.jsx';

export default function App() {
  return <ThemeProvider><LanguageProvider><MainDashboard /></LanguageProvider></ThemeProvider>;
}
