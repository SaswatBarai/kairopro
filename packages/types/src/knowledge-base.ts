export interface SearchResult {
  chunkId: string;
  documentId: string;
  documentFilename: string;
  content: string;
  score: number;
  metadata: any;
}

export interface SearchResponse {
  results: SearchResult[];
}
