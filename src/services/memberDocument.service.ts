import { Platform } from 'react-native';
import api from '../config/api';

export interface MemberDocument {
  _id: string;
  memberId: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
}

export const listMemberDocuments = async (memberId: string): Promise<MemberDocument[]> => {
  const res = await api.get(`/api/members/${memberId}/documents`);
  return res.data.documents;
};

export const uploadMemberDocument = async (memberId: string, fileUri: string): Promise<MemberDocument> => {
  const formData = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(fileUri)).blob();
    formData.append('document', blob, 'document.jpg');
  } else {
    formData.append('document', { uri: fileUri, name: 'document.jpg', type: 'image/jpeg' } as any);
  }
  const res = await api.post(`/api/members/${memberId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.document;
};

export const deleteMemberDocument = async (memberId: string, documentId: string): Promise<void> => {
  await api.delete(`/api/members/${memberId}/documents/${documentId}`);
};
