const fs = require('fs');
const path = require('path');

const classesToReplace = [
  ['bg-gray-100', 'bg-gray-100 dark:bg-gray-900'],
  ['bg-white', 'bg-white dark:bg-gray-800'],
  ['bg-gray-50', 'bg-gray-50 dark:bg-gray-800/50'],
  ['text-gray-900', 'text-gray-900 dark:text-gray-100'],
  ['text-gray-800', 'text-gray-800 dark:text-gray-200'],
  ['text-gray-700', 'text-gray-700 dark:text-gray-300'],
  ['text-gray-600', 'text-gray-600 dark:text-gray-400'],
  ['text-gray-500', 'text-gray-500 dark:text-gray-400'],
  ['border-gray-100', 'border-gray-100 dark:border-gray-700'],
  ['border-gray-200', 'border-gray-200 dark:border-gray-700'],
  ['border-gray-300', 'border-gray-300 dark:border-gray-600'],
  ['hover:bg-gray-50', 'hover:bg-gray-50 dark:hover:bg-gray-700'],
  ['hover:bg-gray-100', 'hover:bg-gray-100 dark:hover:bg-gray-700'],
  ['bg-indigo-50 ', 'bg-indigo-50 dark:bg-indigo-900/40 '],
  ['text-indigo-700', 'text-indigo-700 dark:text-indigo-300'],
  ['text-indigo-600', 'text-indigo-600 dark:text-indigo-400'],
  ['bg-indigo-100', 'bg-indigo-100 dark:bg-indigo-900'],
  ['bg-emerald-50 ', 'bg-emerald-50 dark:bg-emerald-900/40 '],
  ['text-emerald-700', 'text-emerald-700 dark:text-emerald-300'],
  ['bg-orange-50 ', 'bg-orange-50 dark:bg-orange-900/40 '],
  ['text-orange-700', 'text-orange-700 dark:text-orange-300'],
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Prevent double replacement
      if (!content.includes('dark:bg-gray-900')) {
        for (const [search, replace] of classesToReplace) {
          // Use regex with word boundaries to avoid partial matches
          const regex = new RegExp(`\\b${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b(?!\\s*dark:)`, 'g');
          content = content.replace(regex, replace);
        }
        
        // Manual tweaks for specific files
        if (file === 'App.tsx') {
           // Add Moon/Sun to imports
           if (!content.includes('Moon, Sun')) {
              content = content.replace(/import \{ ([^}]+) \} from 'lucide-react';/, "import { $1, Moon, Sun } from 'lucide-react';");
           }
           
           // Add useTheme
           if (!content.includes('useTheme')) {
             content = content.replace("import { useAuth } from './contexts/AuthContext';", "import { useAuth } from './contexts/AuthContext';\nimport { useTheme } from './contexts/ThemeContext';");
           }
           
           // Extract useTheme inside MainLayout
           if (content.includes('function MainLayout() {') && !content.includes('const { theme, toggleTheme } = useTheme();')) {
             content = content.replace('const [activeTab, setActiveTab]', 'const { theme, toggleTheme } = useTheme();\n  const [activeTab, setActiveTab]');
             
             // Add button to header
             content = content.replace('</h1>\n          </div>\n        </div>\n      </header>', '</h1>\n          </div>\n        </div>\n        <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">\n          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}\n        </button>\n      </header>');
           }
        }
        
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processDir('mini-app/src');
console.log('Done refactoring dark mode classes');
