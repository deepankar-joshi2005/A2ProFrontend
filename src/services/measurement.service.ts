import api from '../config/api';

export interface Measurement {
  _id: string;
  memberId: string;
  date: string;
  height: number | null;
  weight: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  leftThigh: number | null;
  rightThigh: number | null;
  leftArm: number | null;
  rightArm: number | null;
  age: number | null;
  neck: number | null;
  leftCalf: number | null;
  rightCalf: number | null;
  bodyFatPercent: number | null;
}

export type MeasurementInput = Partial<Omit<Measurement, '_id' | 'memberId'>>;

export const listMeasurements = async (memberId: string): Promise<Measurement[]> => {
  const res = await api.get(`/api/members/${memberId}/measurements`);
  return res.data.measurements;
};

export const addMeasurement = async (memberId: string, input: MeasurementInput): Promise<Measurement> => {
  const res = await api.post(`/api/members/${memberId}/measurements`, input);
  return res.data.measurement;
};

export const deleteMeasurement = async (memberId: string, measurementId: string): Promise<void> => {
  await api.delete(`/api/members/${memberId}/measurements/${measurementId}`);
};
