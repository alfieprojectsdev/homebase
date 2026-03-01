export interface HeuristicBill {
  id: number;
  name: string;
  amount: number;
  dueDate: Date;
  status?: string;
  category?: string;
  residenceId?: number | null;
  createdAt?: Date;
}
