import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState({
    ethereum: true,
    solana: false,
    bsc: false,
    base: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const sidebarItems = [
    {
      title: 'Ethereum',
      key: 'ethereum',
      items: [
        { name: 'DEX', path: '/ethereum/dex', steps: [
          { name: '1. Define Data Plan', path: '/ethereum/dex/step1', active: location.pathname === '/ethereum/dex/step1' },
          { name: '2. Template Setup', path: '/ethereum/dex/step2', active: location.pathname === '/ethereum/dex/step2' },
          { name: '3. Upload Log', path: '/ethereum/dex/step3', active: location.pathname === '/ethereum/dex/step3' },
          { name: '4. SQL Editor', path: '/ethereum/dex/step4', active: location.pathname === '/ethereum/dex/step4' },
          { name: '5. Ingestion Config', path: '/ethereum/dex/step5', active: location.pathname === '/ethereum/dex/step5' }
        ]},
        { name: 'Lending', path: '/ethereum/lending' },
        { name: 'Staking', path: '/ethereum/staking' }
      ]
    },
    {
      title: 'Solana',
      key: 'solana',
      items: []
    },
    {
      title: 'BSC',
      key: 'bsc', 
      items: []
    },
    {
      title: 'Base',
      key: 'base',
      items: []
    }
  ];

  const getCurrentStep = () => {
    const path = location.pathname;
    if (path.includes('step1')) return 1;
    if (path.includes('step2')) return 2;
    if (path.includes('step3')) return 3;
    if (path.includes('step4')) return 4;
    if (path.includes('step5')) return 5;
    return 1;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-primary-700">Protocol Studio</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {sidebarItems.map((section) => (
            <div key={section.key}>
              <button
                onClick={() => toggleSection(section.key)}
                className="flex items-center justify-between w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                {section.title}
                <ChevronDown 
                  className={`w-4 h-4 transition-transform ${expandedSections[section.key] ? 'rotate-180' : ''}`}
                />
              </button>
              
              {expandedSections[section.key] && (
                <div className="ml-4 mt-2 space-y-1">
                  {section.items.map((item) => (
                    <div key={item.name}>
                      <button
                        onClick={() => navigate(item.path)}
                        className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                      >
                        {item.name}
                      </button>
                      
                      {item.steps && (
                        <div className="ml-4 mt-1 space-y-1">
                          {item.steps.map((step, index) => (
                            <button
                              key={step.path}
                              onClick={() => navigate(step.path)}
                              className={`flex items-center w-full text-left px-3 py-1 text-xs rounded-md transition-colors ${
                                step.active 
                                  ? 'bg-primary-100 text-primary-700 font-medium' 
                                  : 'text-gray-500 hover:bg-gray-100'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 ${
                                step.active 
                                  ? 'bg-primary-600 text-white' 
                                  : getCurrentStep() > index + 1
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-300 text-gray-600'
                              }`}>
                                {index + 1}
                              </div>
                              {step.name.replace(/^\d+\.\s*/, '')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default Layout;