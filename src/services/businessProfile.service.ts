import api from '../config/api';

export interface BusinessProfile {
  businessName: string;
  contactPerson: string;
  phone: string;
  address: string;
}

export const getBusinessProfile = async (): Promise<BusinessProfile> => {
  const res = await api.get('/api/business-profile');
  return res.data.profile;
};

export const saveBusinessProfile = async (input: BusinessProfile): Promise<BusinessProfile> => {
  const res = await api.put('/api/business-profile', input);
  return res.data.profile;
};
