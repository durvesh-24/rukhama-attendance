export type EmployeeListItem = {
  id: string;
  employee_code: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  role: string;
  status: string;
  photo_url: string | null;
  has_photo: boolean;
  /** join date of the current period, or of the latest period if exited */
  join_date: string | null;
  /** exit date of the latest period when exited */
  exit_date: string | null;
};
