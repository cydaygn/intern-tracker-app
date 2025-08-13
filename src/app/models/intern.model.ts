export interface Intern {
  id?: number;
  first_name: string;
  last_name: string;
  school: string;
  department: string;
  start_date: string;
  end_date?: string;
  status: string;
  contact: string;
  email: string;
  cv_path?: string;
  photo_path?: string;
}
