import React, { useState, useEffect, useMemo } from 'react';
import { Customer, SubscriptionStatus, AccountType, MonthlyRecord } from './types';
import Header from './components/Header';
import SummaryDashboard from './components/SummaryDashboard';
import CustomerTable from './components/CustomerTable';
import CustomerFormModal from './components/CustomerFormModal';
import EmailManagerModal from './components/EmailManagerModal';
import HistoryModal from './components/HistoryModal';
import EmailUsageModal from './components/EmailUsageModal';
import ImportModal from './components/ImportModal';

const SHARE_PRICE = 8500;
const PRIVATE_PRICE = 16000;

const App: React.FC = () => {
  // State for customers, initialized from localStorage or with default data
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const savedCustomers = localStorage.getItem('customers');
      if (savedCustomers) {
        const parsedCustomers = JSON.parse(savedCustomers);
        return parsedCustomers.map((c: any) => {
          const newCustomer = {
            ...c,
            profileName: c.profileName || '',
            note: c.note || c.contact || '',
            accountType: c.accountType || AccountType.Share,
          };
          delete newCustomer.contact;
          return newCustomer;
        });
      }
      return [];
    } catch (error) {
      console.error("Failed to parse customers from localStorage", error);
      return [];
    }
  });

  // State for Netflix emails, initialized from localStorage
  const [netflixEmails, setNetflixEmails] = useState<string[]>(() => {
    try {
      const savedEmails = localStorage.getItem('netflixEmails');
      return savedEmails ? JSON.parse(savedEmails) : ['netflix1@gmail.com', 'netflix2@gmail.com'];
    } catch (error)
    {
      console.error("Failed to parse emails from localStorage", error);
      return ['netflix1@gmail.com', 'netflix2@gmail.com'];
    }
  });
  
  // State for theme management
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
  });

  // State for modal visibility and editing logic
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isEmailUsageModalOpen, setIsEmailUsageModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  // State for filtering and sorting
  const [filterStatus, setFilterStatus] = useState<SubscriptionStatus | 'All'>('All');
  const [filterEmail, setFilterEmail] = useState<string>('All');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'expiryDate', direction: 'ascending' });

  // Effect to persist customers to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('customers', JSON.stringify(customers));
  }, [customers]);
  
  // Effect to persist emails to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('netflixEmails', JSON.stringify(netflixEmails));
  }, [netflixEmails]);
  
  // Effect to apply theme class and persist choice
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const handleToggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const calculateSubscriptionDetails = (customer: Customer) => {
    const startDate = new Date(customer.startDate);
    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + customer.monthsPaid);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const timeDiff = expiryDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

    let status = SubscriptionStatus.Active;
    if (daysLeft <= 0) {
      status = SubscriptionStatus.Expired;
    } else if (daysLeft <= 7) {
      status = SubscriptionStatus.ExpiringSoon;
    }
    
    return { expiryDate, daysLeft, status };
  };

  const processedCustomers = useMemo(() => {
     return customers.map(customer => ({
      ...customer,
      ...calculateSubscriptionDetails(customer),
    }));
  }, [customers]);

  const displayCustomers = useMemo(() => {
    let filteredCustomers = [...processedCustomers];

    if (filterStatus !== 'All') {
      filteredCustomers = filteredCustomers.filter(c => c.status === filterStatus);
    }

    if (filterEmail !== 'All') {
      filteredCustomers = filteredCustomers.filter(c => c.netflixEmail === filterEmail);
    }
    
    if (sortConfig.key) {
      filteredCustomers.sort((a, b) => {
        const valA = a[sortConfig.key as keyof typeof a];
        const valB = b[sortConfig.key as keyof typeof b];

        let comparison = 0;
        if (valA > valB) {
          comparison = 1;
        } else if (valA < valB) {
          comparison = -1;
        }
        
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }

    return filteredCustomers;
  }, [processedCustomers, filterStatus, filterEmail, sortConfig]);

  const historyData = useMemo(() => {
    const records: MonthlyRecord[] = [];
    const today = new Date();

    for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = d.getMonth();
        const monthString = `${year}-${String(month + 1).padStart(2, '0')}`;

        let activeUsers = 0;
        let totalIncome = 0;
        
        customers.forEach(customer => {
            const startDate = new Date(customer.startDate);
            const expiryDate = new Date(startDate);
            expiryDate.setMonth(expiryDate.getMonth() + customer.monthsPaid);
            const monthStartDate = new Date(year, month, 1);
            const monthEndDate = new Date(year, month + 1, 0);

            if (startDate <= monthEndDate && expiryDate > monthStartDate) {
                activeUsers++;
                const price = customer.accountType === AccountType.Private ? PRIVATE_PRICE : SHARE_PRICE;
                totalIncome += price;
            }
        });
        
        records.push({
            month: monthString,
            activeUsers: activeUsers,
            totalIncome: totalIncome,
        });
    }
    return records;
  }, [customers]);
  
  const handleSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleAddCustomerClick = () => {
    setCustomerToEdit(null);
    setIsCustomerModalOpen(true);
  };
  
  const handleEditCustomerClick = (customer: Customer) => {
    setCustomerToEdit(customer);
    setIsCustomerModalOpen(true);
  };

  const handleDeleteCustomer = (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
        setCustomers(customers.filter(c => c.id !== id));
    }
  };
  
  const handleSaveCustomer = (customerData: Omit<Customer, 'id'> | Customer) => {
    if ('id' in customerData) {
      setCustomers(customers.map(c => c.id === customerData.id ? customerData : c));
    } else {
      const newCustomer: Customer = {
        ...(customerData as Omit<Customer, 'id'>),
        id: new Date().getTime().toString(),
      };
      setCustomers([...customers, newCustomer]);
    }
    setIsCustomerModalOpen(false);
  };

  const handleSaveEmails = (updatedEmails: string[]) => {
    setNetflixEmails(updatedEmails);
    setIsEmailModalOpen(false);
  };
  
  const handleImportCustomers = (importedCustomers: Omit<Customer, 'id'>[]) => {
      const customersToAdd: Customer[] = importedCustomers.map((c, index) => ({
          ...c,
          profileName: c.profileName || '',
          amount: c.amount || 0,
          note: c.note || '',
          netflixEmail: c.netflixEmail || '',
          accountType: c.accountType || AccountType.Share,
          id: `${new Date().getTime()}-${index}`,
      }));

      setCustomers(prev => [...prev, ...customersToAdd]);
      setIsImportModalOpen(false);
      alert(`${customersToAdd.length} customer(s) have been imported successfully.`);
  };


  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200">
      <Header 
        onAddCustomer={handleAddCustomerClick}
        onManageEmails={() => setIsEmailModalOpen(true)}
        onViewHistory={() => setIsHistoryModalOpen(true)}
        onViewEmailUsage={() => setIsEmailUsageModalOpen(true)}
        onImportCustomers={() => setIsImportModalOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <SummaryDashboard customers={processedCustomers} />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Customers</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex items-center space-x-2">
                    <label htmlFor="status-filter" className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        Status:
                    </label>
                    <select
                        id="status-filter"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as SubscriptionStatus | 'All')}
                        className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 dark:text-neutral-200 bg-white dark:bg-neutral-900 ring-1 ring-inset ring-neutral-300 dark:ring-neutral-700 focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6"
                    >
                        <option value="All">All Statuses</option>
                        <option value={SubscriptionStatus.Active}>Active</option>
                        <option value={SubscriptionStatus.ExpiringSoon}>Expiring Soon</option>
                        <option value={SubscriptionStatus.Expired}>Expired</option>
                    </select>
                </div>
                 <div className="flex items-center space-x-2">
                    <label htmlFor="email-filter" className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        Email:
                    </label>
                    <select
                        id="email-filter"
                        value={filterEmail}
                        onChange={(e) => setFilterEmail(e.target.value)}
                        className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 dark:text-neutral-200 bg-white dark:bg-neutral-900 ring-1 ring-inset ring-neutral-300 dark:ring-neutral-700 focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6"
                    >
                        <option value="All">All Emails</option>
                        {netflixEmails.map(email => (
                           <option key={email} value={email}>{email}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

        <CustomerTable 
          customers={displayCustomers} 
          onEdit={handleEditCustomerClick}
          onDelete={handleDeleteCustomer}
          onSort={handleSort}
          sortConfig={sortConfig}
        />
      </main>

      <CustomerFormModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={handleSaveCustomer}
        customerToEdit={customerToEdit}
        netflixEmails={netflixEmails}
      />

      <EmailManagerModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        emails={netflixEmails}
        onSave={handleSaveEmails}
      />

      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        historyData={historyData}
      />

      <EmailUsageModal
        isOpen={isEmailUsageModalOpen}
        onClose={() => setIsEmailUsageModalOpen(false)}
        emails={netflixEmails}
        customers={customers}
      />
      
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportCustomers}
      />
    </div>
  );
};

export default App;