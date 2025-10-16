export enum SubscriptionStatus {
  Active = 'Active',
  ExpiringSoon = 'Expiring Soon',
  Expired = 'Expired',
}

export enum AccountType {
  Share = 'Share',
  Private = 'Private',
}

export interface Customer {
  id: string;
  customerName: string;
  profileName: string;
  startDate: string; // ISO string format YYYY-MM-DD
  monthsPaid: number;
  amount: number;
  note: string;
  netflixEmail: string;
  accountType: AccountType;
}

export interface MonthlyRecord {
  month: string; // YYYY-MM
  activeUsers: number;
  totalIncome: number;
}