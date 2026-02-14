
export interface VoterData {
  name: string;
  age: number | string;
  gender: string;
  address: string;
  epic_number: string;
}

export interface ExtractionResult {
  voters: VoterData[];
}

export enum ExtractionStatus {
  IDLE = 'IDLE',
  READING_PDF = 'READING_PDF',
  EXTRACTING = 'EXTRACTING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface AppState {
  status: ExtractionStatus;
  progress: number;
  data: VoterData[];
  error?: string;
  fileName?: string;
}
