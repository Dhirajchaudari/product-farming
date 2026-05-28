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
