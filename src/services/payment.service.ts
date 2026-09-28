import api from '../config/api';
import { Member } from './member.service';

export interface Payment {
  _id: string;
  memberId: string;
  amount: number;
  method: string;
  date: string;
  invoiceNumber: string;
}

export const listPayments = async (memberId: string): Promise<Payment[]> => {
  const res = await api.get(`/api/members/${memberId}/payments`);
  return res.data.payments;
};

export const addPayment = async (
  memberId: string,
  input: { amount: number; method: string; date?: string }
): Promise<{ payment: Payment; member: Member }> => {
  const res = await api.post(`/api/members/${memberId}/payments`, input);
  return res.data;
};

export const deletePayment = async (memberId: string, paymentId: string): Promise<{ member: Member }> => {
  const res = await api.delete(`/api/members/${memberId}/payments/${paymentId}`);
  return res.data;
};
