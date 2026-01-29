export interface StreamChatMessage {
  videoId: number;
  sender: string;
  content: string;
  ts?: string; // server šalje ISO string
}
