export interface EmployeeRecord {
  id: string;
  fullName: string;
  email: string;
  employeeCode: string;
  jobTitle: string;
  department: string;
  country: string;
  salary: number;
  currency: string;
  dateOfJoining: string;
  employmentType: string;
  status: string;
  managerName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListFilters {
  search?: string;
  department?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface EmployeeListPage {
  items: EmployeeRecord[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
