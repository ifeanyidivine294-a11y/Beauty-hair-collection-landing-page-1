export interface LeadFormData {
  fullName: string;
  email: string;
  phone: string;
}

export interface LeadRecord {
  leadId: string;
  fullName: string;
  email: string;
  phone: string;
  submissionDate: string;
  submissionTime: string;
  leadSource: string;
  submissionStatus: string;
}
