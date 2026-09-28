import api from '../config/api';

export interface Batch {
  _id: string;
  name: string;
  limit: number;
  openTime: string;
  closeTime: string;
  isActive: boolean;
}

export interface BatchInput {
  name: string;
  limit: number;
  openTime?: string;
  closeTime?: string;
}

export const listBatches = async (): Promise<Batch[]> => {
  const res = await api.get('/api/batches', { params: { all: 'true' } });
  return res.data.batches;
};

export const createBatch = async (input: BatchInput): Promise<Batch> => {
  const res = await api.post('/api/batches', input);
  return res.data.batch;
};

export const updateBatch = async (id: string, input: Partial<BatchInput>): Promise<Batch> => {
  const res = await api.patch(`/api/batches/${id}`, input);
  return res.data.batch;
};

export const deleteBatch = async (id: string): Promise<void> => {
  await api.delete(`/api/batches/${id}`);
};
